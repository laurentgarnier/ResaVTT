// Point d'entrée de l'appli : session, routeur par hash, en-tête, rafraîchissement.
import { CONFIG } from '../config.js';
import { appeler, lireJeton, enregistrerJeton, effacerJeton } from './api.js';
import { echapper } from './logique/html.js';
import { renderConnexion, brancherConnexion } from './ui/connexion.js';
import { renderGrille, renderJour } from './ui/calendrier.js';
import { renderSortie, brancherSortie } from './ui/sortie.js';
import { chargerMeteo, meteoParDate, heuresDuJour } from './ui/meteo-vue.js';
import { valeursParDefaut, sortiesMemeCreneau, renderFormulaire, brancherFormulaire, renderPersonnes, brancherPersonnes } from './ui/formulaire.js';
import { creneau as creneauDe } from './logique/dates.js';
import { renderAdmin, renderCode, brancherAdmin, brancherCode } from './ui/admin.js';

const etat = { cal: null };
const vue = () => document.getElementById('vue');

const modeNavigateur = () => !window.matchMedia('(display-mode: standalone)').matches && !navigator.standalone;

export function toast(texte) {
  const t = document.getElementById('toast');
  t.textContent = texte;
  t.classList.add('visible');
  clearTimeout(toast.minuteur);
  toast.minuteur = setTimeout(() => t.classList.remove('visible'), 3500);
}

function aller(hash) {
  if (location.hash === hash) router();
  else location.hash = hash;
}

const actions = {
  etat,
  toast,
  aller,
  appeler: (action, params) => appeler(action, params, { surDeconnexion: () => afficherConnexion('Votre session a expiré, reconnectez-vous.') }),
  rafraichir: async () => { await chargerCalendrier(); router(); },
  connecte: async (jeton) => { enregistrerJeton(jeton); await chargerCalendrier(); aller('#/'); },
  afficherConnexion,
};

function afficherBarre() {
  const b = document.getElementById('barre');
  const cal = etat.cal;
  b.innerHTML = `<a class="logo" href="#/">🚵 Sorties <span>VTT</span></a><span class="sp"></span>
    ${cal ? `<span class="chip optionnel">Connecté : ${echapper(cal.moi.nom)}</span>
      <a class="chip" href="#/personnes">👪 Personnes</a>
      ${cal.est_admin ? '<a class="chip" href="#/admin">⚙ Admin</a>' : ''}
      <a class="chip optionnel" href="#/deconnexion">Déconnexion</a>` : ''}`;
}

function afficherConnexion(erreur = '') {
  etat.cal = null;
  afficherBarre();
  vue().innerHTML = renderConnexion({ modeNavigateur: modeNavigateur(), indiceDemo: CONFIG.indiceDemo, erreur });
  brancherConnexion(vue(), actions);
}

async function chargerCalendrier() {
  etat.cal = await actions.appeler('calendrier');
  afficherBarre();
}

const ECRAN_LARGE = '(min-width: 900px)';

async function meteoCourante() {
  const p = etat.cal.parametres;
  const hourly = await chargerMeteo(p.commune_lat, p.commune_lon);
  return { parDate: meteoParDate(hourly, etat.cal.jours.filter((j) => !j.passe).map((j) => j.date)), hourly };
}

function premierJourUtile() {
  return etat.cal.aujourdhui;
}

async function afficherCalendrier(racine) {
  const meteo = await meteoCourante();
  if (window.matchMedia(ECRAN_LARGE).matches) {
    racine.innerHTML = renderGrille(etat.cal, meteo.parDate);
  } else {
    afficherJour(racine, premierJourUtile(), meteo);
  }
}

function afficherJour(racine, date, meteo) {
  racine.innerHTML = renderJour(etat.cal, date, meteo.parDate, date === etat.cal.aujourdhui ? heuresDuJour(meteo.hourly, date) : null);
  const onglet = racine.querySelector('.onglet.on');
  if (onglet) onglet.scrollIntoView({ inline: 'center', block: 'nearest' });
}

async function afficherSortie(racine, id) {
  const sortie = etat.cal.jours.flatMap((j) => j.sorties).find((s) => s.id === id);
  if (!sortie) {
    racine.innerHTML = '<p class="mut">Cette sortie n\'existe plus.</p><a class="btn o" href="#/">Retour au calendrier</a>';
    return;
  }
  racine.innerHTML = renderSortie(sortie, [], etat.cal.personnes);
  brancherSortie(racine, actions, sortie);
  window.scrollTo(0, 0);
}

function afficherCreation(racine, date) {
  const cal = etat.cal;
  const maintenant = new Date();
  const creneau = date === cal.aujourdhui && maintenant.getHours() >= 11 ? 'apres_midi' : 'matin';
  const valeurs = valeursParDefaut(date, creneau, cal.moi, cal.parametres);
  racine.innerHTML = renderFormulaire({ mode: 'creer', valeurs, personnes: cal.personnes, sortiesMemeCreneau: sortiesMemeCreneau(cal, date, creneau), creneau });
  brancherFormulaire(racine, actions, { mode: 'creer', sortie: { date }, cal });
}

function afficherModification(racine, id) {
  const sortie = etat.cal.jours.flatMap((j) => j.sorties).find((s) => s.id === id);
  if (!sortie || !sortie.peut_modifier) { location.hash = '#/'; return; }
  racine.innerHTML = renderFormulaire({ mode: 'modifier', valeurs: sortie, personnes: [], sortiesMemeCreneau: [], creneau: creneauDe(sortie.heure) });
  brancherFormulaire(racine, actions, { mode: 'modifier', sortie, cal: etat.cal });
}

function afficherPersonnes(racine) {
  racine.innerHTML = renderPersonnes(etat.cal.personnes);
  brancherPersonnes(racine, actions);
}

async function afficherAdmin(racine, onglet) {
  if (!etat.cal.est_admin) {
    toast('Réservé aux administrateurs.');
    location.hash = '#/';
    return;
  }
  if (!etat.cal.admin_verifie) {
    const ecranCode = (options) => { racine.innerHTML = renderCode(options); };
    ecranCode({ envoye: false });
    brancherCode(racine, actions, ecranCode);
    return;
  }
  let options = {};
  const afficher = async () => {
    const d = await actions.appeler('admin_lire');
    racine.innerHTML = renderAdmin(d, onglet, options);
    brancherAdmin(racine, actions, d, (o) => { options = o; reconstruire(); });
  };
  // Chaque réaffichage repart d'un élément neuf pour ne pas cumuler les écouteurs.
  const reconstruire = () => {
    const neuf = racine.cloneNode(false);
    racine.replaceWith(neuf);
    racine = neuf;
    afficher().catch((e) => toast(e.message));
  };
  await afficher();
}

const ROUTES = [
  { motif: /^#\/admin(?:\/(recurrences|fermetures|parametres|messages))?$/, afficher: (racine, m) => afficherAdmin(racine, m[1] || 'recurrences') },
  { motif: /^#\/creer\/(\d{4}-\d{2}-\d{2})$/, afficher: (racine, m) => afficherCreation(racine, m[1]) },
  { motif: /^#\/modifier\/(.+)$/, afficher: (racine, m) => afficherModification(racine, decodeURIComponent(m[1])) },
  { motif: /^#\/personnes$/, afficher: (racine) => afficherPersonnes(racine) },
  { motif: /^#\/$/, afficher: (racine) => afficherCalendrier(racine) },
  { motif: /^#\/jour\/(\d{4}-\d{2}-\d{2})$/, afficher: async (racine, m) => afficherJour(racine, m[1], await meteoCourante()) },
  { motif: /^#\/sortie\/(.+)$/, afficher: (racine, m) => afficherSortie(racine, decodeURIComponent(m[1])) },
];

async function router() {
  if (!lireJeton()) return afficherConnexion();
  const hash = location.hash || '#/';
  if (hash === '#/deconnexion') {
    try { await actions.appeler('deconnexion'); } catch (e) { /* jeton déjà invalide */ }
    effacerJeton();
    location.hash = '#/';
    return afficherConnexion();
  }
  try {
    if (!etat.cal) await chargerCalendrier();
  } catch (e) {
    if (e.code !== 'non_connecte') vue().innerHTML = `<p class="erreur">${echapper(e.message)}</p><button class="btn o" onclick="location.reload()">Réessayer</button>`;
    return undefined;
  }
  // Une vue reconstruite repart d'un élément neuf : les écouteurs de la vue précédente disparaissent avec lui.
  const ancienne = vue();
  const neuve = ancienne.cloneNode(false);
  ancienne.replaceWith(neuve);
  for (const r of ROUTES) {
    const m = hash.match(r.motif);
    if (m) return r.afficher(neuve, m);
  }
  location.hash = '#/';
  return undefined;
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && lireJeton() && etat.cal) actions.rafraichir().catch(() => {});
});
window.addEventListener('hashchange', router);
router();

export { actions };
