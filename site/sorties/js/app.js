// Point d'entrée de l'appli : session, routeur par hash, en-tête, rafraîchissement.
import { CONFIG } from '../config.js';
import { appeler, lireJeton, enregistrerJeton, effacerJeton } from './api.js';
import { echapper } from './logique/html.js';
import { renderConnexion, brancherConnexion } from './ui/connexion.js';

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
      <a class="chip" href="#/deconnexion">Déconnexion</a>` : ''}`;
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

const ROUTES = [];

export function ajouterRoute(motif, afficher) {
  ROUTES.push({ motif, afficher });
}

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
  for (const r of ROUTES) {
    const m = hash.match(r.motif);
    if (m) return r.afficher(vue(), actions, m);
  }
  return afficherAccueilProvisoire();
}

function afficherAccueilProvisoire() {
  vue().innerHTML = `<p>Bonjour ${echapper(etat.cal.moi.nom)} : ${etat.cal.jours.reduce((n, j) => n + j.sorties.length, 0)} sorties sur 2 semaines.</p>`;
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && lireJeton() && etat.cal) actions.rafraichir().catch(() => {});
});
window.addEventListener('hashchange', router);
router();

export { actions };
