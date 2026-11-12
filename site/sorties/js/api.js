// Client de l'API Apps Script : POST text/plain (pas de préflight CORS), jeton en localStorage, nouvelles tentatives.
import { CONFIG } from '../config.js';

const CLE_JETON = 'sorties-vtt-jeton';
const ERREURS_A_REESSAYER = ['erreur_interne'];

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
  } = options;
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
      continue;
    }
    if (r.ok) return r.data;
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
