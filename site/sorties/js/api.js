// Client de l'API Apps Script : POST text/plain (pas de préflight CORS), jeton en localStorage, nouvelles tentatives.
import { CONFIG } from '../config.js';

const CLE_JETON = 'sorties-vtt-jeton';
// Seul « serveur occupé » est sûr à réessayer : la requête n'a pas été traitée.
// Une erreur réseau n'est réessayée que pour une lecture (une écriture a pu être enregistrée avant la coupure).
const ERREURS_A_REESSAYER = ['occupe'];
const ACTIONS_LECTURE = ['calendrier', 'discussion_lire', 'trace_lire', 'admin_lire', 'admin_geocoder'];

export class ErreurApi extends Error {
  constructor(code, message, extra = {}) {
    super(message);
    this.code = code;
    Object.assign(this, extra);
  }
}

export function lireJeton() {
  try { return localStorage.getItem(CLE_JETON); } catch (e) { return null; }
}

export function enregistrerJeton(jeton) {
  try { localStorage.setItem(CLE_JETON, jeton); } catch (e) { /* stockage indisponible : session non mémorisée */ }
}

export function effacerJeton() {
  try { localStorage.removeItem(CLE_JETON); } catch (e) { /* rien à faire */ }
}

const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

export async function appeler(action, params = {}, options = {}) {
  const {
    fetchImpl = (...a) => globalThis.fetch(...a),
    url = CONFIG.urlApi,
    delais = [400, 1200],
    surDeconnexion = () => {},
    surCalendrier = () => {},
    surDebut = () => {},
    surFin = () => {},
  } = options;
  surDebut();
  try {
    return await envoyer(action, params, { fetchImpl, url, delais, surDeconnexion, surCalendrier });
  } finally {
    surFin();
  }
}

async function envoyer(action, params, { fetchImpl, url, delais, surDeconnexion, surCalendrier }) {
  const jeton = lireJeton();
  const corps = JSON.stringify({ action, ...(jeton ? { jeton } : {}), ...params });
  let derniere = null;
  for (let essai = 0; essai <= delais.length; essai++) {
    if (essai > 0) await attendre(delais[essai - 1]);
    let r;
    try {
      const rep = await fetchImpl(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: corps, redirect: 'follow' });
      r = await rep.json();
    } catch (e) {
      derniere = new ErreurApi('reseau', 'Connexion impossible. Vérifiez votre réseau.');
      if (!ACTIONS_LECTURE.includes(action)) throw derniere;
      continue;
    }
    if (r.ok) {
      if (r.calendrier) surCalendrier(r.calendrier);
      return r.data;
    }
    const { ok, erreur, message, ...extra } = r;
    void ok;
    derniere = new ErreurApi(erreur, message || 'Erreur.', extra);
    if (erreur === 'non_connecte') {
      effacerJeton();
      surDeconnexion();
      throw derniere;
    }
    if (!ERREURS_A_REESSAYER.includes(erreur)) throw derniere;
  }
  throw derniere;
}
