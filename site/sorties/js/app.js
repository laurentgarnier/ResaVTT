// Point d'entrée de l'appli : session, routeur par hash, en-tête, rafraîchissement.
import { CONFIG } from '../config.js';
import { appeler, lireJeton, enregistrerJeton, effacerJeton } from './api.js';
import { echapper } from './logique/html.js';
import { renderConnexion, brancherConnexion } from './ui/connexion.js';
import { renderGrille, renderJour } from './ui/calendrier.js';
import { renderFrise, renderAgenda } from './ui/calendrier-variantes.js';
import { messagePartageSortie, messageAnnulationSortie } from './logique/partage.js';
import { lienWhatsApp } from './logique/modeles.js';
import { surveillerMisesAJour } from './maj-appli.js';
import { lireAffichage, enregistrerAffichage, renderSelecteurAffichage, THEMES } from './ui/affichage.js';
import { renderSortie, brancherSortie, arreterDiscussion } from './ui/sortie.js';
import { chargerMeteo, meteoParDate, heuresDuJour } from './ui/meteo-vue.js';
import { valeursParDefaut, sortiesMemeCreneau, renderFormulaire, brancherFormulaire, renderPersonnes, brancherPersonnes } from './ui/formulaire.js';
import { creneau as creneauDe } from './logique/dates.js';
import { renderAdmin, renderCode, brancherAdmin, brancherCode } from './ui/admin.js';
import { renderRemorque, brancherRemorque } from './ui/remorque.js';
import { renderEncartInstallation, plateformeDepuis } from './ui/installation.js';
import { reaffichageAutomatiquePermis, destinationApresConnexion, doitRelireCalendrier, calendrierAChange, INTERVALLE_CALENDRIER_MS, destinationLienCourt } from './ui/navigation.js';
import { creerAttente } from './ui/attente.js';
import { enregistrerCalendrier, lireCalendrierEnCache, oublierCalendrier } from './cache-calendrier.js';
import { aujourdhuiLocal } from './logique/dates.js';
import { libelleVersion } from './version.js';
import { nomAppliAffiche, logoAppli, CLE_NOM_APPLI } from './ui/nom-appli.js';

const etat = { cal: null, calRecuA: 0 };

// Affichage à l'essai : mise en page du calendrier et thème, propres à l'appareil.
const stockageLocal = (() => {
  try { return window.localStorage; } catch (e) { return { getItem: () => null, setItem: () => {} }; }
})();
let affichage = lireAffichage(stockageLocal);

function appliquerTheme() {
  document.documentElement.dataset.theme = affichage.theme;
  document.documentElement.dataset.espacement = affichage.espacement;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = THEMES.find((t) => t.id === affichage.theme).couleur;
}
appliquerTheme();
document.getElementById('version-appli').textContent = libelleVersion();

// Nom de l'association : onglet du navigateur, bandeau, appli installée (iPhone : balise apple-mobile-web-app-title ;
// Android : manifeste servi par le service worker avec ce nom, rangé dans le cache sorties-vtt-reglages).
let nomAppli = nomAppliAffiche(null, stockageLocal.getItem(CLE_NOM_APPLI));
function appliquerNomAppli(nom) {
  document.title = nom;
  const meta = document.querySelector('meta[name="apple-mobile-web-app-title"]');
  if (meta) meta.content = nom;
  if (nom === nomAppli && stockageLocal.getItem(CLE_NOM_APPLI) === nom) return;
  nomAppli = nom;
  try { stockageLocal.setItem(CLE_NOM_APPLI, nom); } catch (e) { /* stockage indisponible */ }
  if (typeof caches !== 'undefined') caches.open('sorties-vtt-reglages').then((c) => c.put('nom-appli', new Response(nom))).catch(() => {});
}
appliquerNomAppli(nomAppli);

function basculerSelecteur(ouvrir) {
  const existant = document.querySelector('.selecteur-affichage');
  if (existant) existant.remove();
  if (!ouvrir) return;
  document.getElementById('barre').insertAdjacentHTML('afterend', renderSelecteurAffichage(affichage));
  document.querySelector('.selecteur-affichage').addEventListener('click', (ev) => {
    const b = ev.target.closest('button');
    if (!b) return;
    const choix = b.dataset.disposition ? { disposition: b.dataset.disposition }
      : b.dataset.espacement ? { espacement: b.dataset.espacement } : { theme: b.dataset.themeChoix };
    affichage = { ...affichage, ...choix };
    enregistrerAffichage(stockageLocal, affichage);
    appliquerTheme();
    basculerSelecteur(true);
    if (b.dataset.disposition && etat.cal) router();
  });
}

document.addEventListener('click', (ev) => {
  if (ev.target.closest('#bouton-affichage')) basculerSelecteur(!document.querySelector('.selecteur-affichage'));
  else if (!ev.target.closest('.selecteur-affichage')) basculerSelecteur(false);
});
const attente = creerAttente();

// Ces écritures demandent le calendrier à jour dans leur réponse : pas de second aller-retour pour réafficher.
const ECRITURES = ['connexion', 'inscription', 'sortie_creer', 'sortie_modifier', 'sortie_horaire', 'sortie_annuler', 'trace_ajouter',
  'trace_supprimer', 'personnes_enregistrer', 'admin_code_verifier', 'admin_enregistrer',
  'remorque_demander', 'remorque_annuler', 'remorque_valider', 'remorque_refuser', 'remorque_bloquer', 'remorque_debloquer'];
// Appels de fond (rafraîchissement de la discussion) : pas d'indicateur d'attente.
const SILENCIEUSES = ['discussion_lire'];
const FRAICHEUR = 2000; // ms : un calendrier reçu depuis moins longtemps n'est pas redemandé
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
  appeler: (action, params = {}) => appeler(action, ECRITURES.includes(action) ? { ...params, avec_calendrier: true } : params, {
    surDeconnexion: () => afficherConnexion('Votre session a expiré, reconnectez-vous.'),
    surCalendrier: recevoirCalendrier,
    ...(SILENCIEUSES.includes(action) ? {} : { surDebut: attente.debut, surFin: attente.fin }),
  }),
  rafraichir: async () => {
    if (Date.now() - etat.calRecuA > FRAICHEUR) await chargerCalendrier();
    router();
  },
  // La réponse de connexion apporte déjà le calendrier : il n'est redemandé que s'il manque.
  connecte: async (jeton) => {
    enregistrerJeton(jeton);
    if (etat.cal && Date.now() - etat.calRecuA <= FRAICHEUR) enregistrerCalendrier(etat.cal, jeton);
    else await chargerCalendrier();
    aller(destinationApresConnexion(location.hash));
  },
  afficherConnexion,
};

// Bouton « Remorque » si la page est ouverte ; pour un gestionnaire, pastille du nombre de demandes en attente.
function boutonRemorque(r) {
  if (!r || !r.active) return '';
  const pastille = r.attente ? `<span class="pastille-attente" aria-label="${r.attente} demande${r.attente > 1 ? 's' : ''} en attente">${r.attente}</span>` : '';
  return `<a class="chip chip-remorque" href="#/remorque">🚚<span class="optionnel"> Remorque</span>${pastille}</a>`;
}

function afficherBarre() {
  const b = document.getElementById('barre');
  const cal = etat.cal;
  b.innerHTML = `<a class="logo" href="#/">${logoAppli(nomAppli)}</a><span class="sp"></span>
    <button type="button" class="chip" id="bouton-affichage" aria-label="Affichage">🎨<span class="optionnel"> Affichage</span></button>
    ${cal ? `<span class="chip optionnel">Connecté : ${echapper(cal.moi.nom)}</span>
      <a class="chip" href="#/personnes">👪 Personnes</a>
      ${boutonRemorque(cal.remorque)}
      ${cal.est_admin ? '<a class="chip" href="#/admin">⚙ Admin</a>' : ''}
      <a class="chip optionnel" href="#/deconnexion">Déconnexion</a>` : ''}`;
}

function afficherConnexion(erreur = '') {
  etat.cal = null;
  oublierCalendrier();
  afficherBarre();
  vue().innerHTML = renderConnexion({ modeNavigateur: modeNavigateur(), indiceDemo: CONFIG.indiceDemo, erreur, nom: nomAppli });
  brancherConnexion(vue(), actions);
}

function recevoirCalendrier(cal) {
  etat.cal = cal;
  appliquerNomAppli(nomAppliAffiche(cal, nomAppli));
  etat.calRecuA = Date.now();
  enregistrerCalendrier(cal, lireJeton());
  afficherBarre();
}

async function chargerCalendrier() {
  recevoirCalendrier(await actions.appeler('calendrier'));
}

// À l'ouverture : le dernier calendrier connu s'affiche aussitôt, la version du serveur le remplace dès qu'elle arrive.
function partirDuCache() {
  const enCache = lireCalendrierEnCache(lireJeton(), aujourdhuiLocal(new Date()));
  if (!enCache) return false;
  etat.cal = enCache;
  afficherBarre();
  chargerCalendrier()
    .then(() => { if (reaffichageAutomatiquePermis(location.hash)) router(); })
    .catch(() => {});
  return true;
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

// Frise et agenda : un seul écran pour l'accueil et pour un jour donné, qu'on fait défiler jusqu'à ce jour.
function afficherVariante(racine, date, meteo) {
  const heuresDe = (d) => heuresDuJour(meteo.hourly, d);
  racine.innerHTML = affichage.disposition === 'frise' ? renderFrise(etat.cal, meteo.parDate, heuresDe) : renderAgenda(etat.cal, meteo.parDate, heuresDe);
  const cible = racine.querySelector(`#jour-${date}`);
  if (!cible) return;
  if (affichage.disposition === 'frise') {
    const frise = racine.querySelector('.frise');
    frise.scrollLeft = cible.offsetLeft - frise.offsetLeft - 8;
  } else if (date !== etat.cal.aujourdhui) {
    cible.scrollIntoView({ block: 'start' });
  }
}

async function afficherCalendrier(racine) {
  const meteo = await meteoCourante();
  if (affichage.disposition !== 'classique') {
    afficherVariante(racine, etat.cal.aujourdhui, meteo);
  } else if (window.matchMedia(ECRAN_LARGE).matches) {
    racine.innerHTML = renderGrille(etat.cal, meteo.parDate, (d) => heuresDuJour(meteo.hourly, d));
  } else {
    afficherJour(racine, premierJourUtile(), meteo);
  }
  afficherEncartInstallation(racine);
}

// Installation : l'invite Android est conservée pour un bouton « Installer l'appli ».
let inviteInstallation = null;
window.addEventListener('beforeinstallprompt', (ev) => { ev.preventDefault(); inviteInstallation = ev; });

function afficherEncartInstallation(racine) {
  let masque = false;
  try { masque = localStorage.getItem('sorties-vtt-installation-plus-tard') === '1'; } catch (e) { /* sans stockage */ }
  if (masque) return;
  const html = renderEncartInstallation({ plateforme: plateformeDepuis(navigator.userAgent), installee: !modeNavigateur(), invitePossible: !!inviteInstallation });
  if (!html) return;
  racine.insertAdjacentHTML('afterbegin', html);
  racine.querySelector('.installer').addEventListener('click', async (ev) => {
    const b = ev.target.closest('button');
    if (!b) return;
    if (b.dataset.action === 'installer' && inviteInstallation) {
      inviteInstallation.prompt();
      await inviteInstallation.userChoice;
      inviteInstallation = null;
    }
    try { localStorage.setItem('sorties-vtt-installation-plus-tard', '1'); } catch (e) { /* sans stockage */ }
    b.closest('.installer').remove();
  });
}

function afficherJour(racine, date, meteo) {
  if (affichage.disposition !== 'classique') return afficherVariante(racine, date, meteo);
  racine.innerHTML = renderJour(etat.cal, date, meteo.parDate, heuresDuJour(meteo.hourly, date));
  const onglet = racine.querySelector('.onglet.on');
  if (onglet) onglet.scrollIntoView({ inline: 'center', block: 'nearest' });
}

async function afficherSortie(racine, id) {
  const sortie = etat.cal.jours.flatMap((j) => j.sorties).find((s) => s.id === id);
  if (!sortie) {
    racine.innerHTML = '<p class="mut">Cette sortie n\'existe plus.</p><a class="btn o" href="#/">Retour au calendrier</a>';
    return;
  }
  // Message de partage : tout de suite sans météo, complété dès que la prévision (souvent déjà en cache) est là.
  const urlAppli = location.href.split('#')[0];
  const nouvelle = etat.sortieCreee === id;
  etat.sortieCreee = null;
  const modele = etat.cal.modele_partage;
  const annulationRecente = etat.sortieAnnulee === id;
  etat.sortieAnnulee = null;
  racine.innerHTML = renderSortie(sortie, [], etat.cal.personnes, {
    partage: { texte: messagePartageSortie(sortie, null, urlAppli, modele) }, nouvelle,
    partageAnnulation: { texte: messageAnnulationSortie(sortie, urlAppli, etat.cal.modele_annulation) }, annulationRecente,
  });
  brancherSortie(racine, actions, sortie);
  window.scrollTo(0, 0);
  const bouton = sortie.statut === 'annulee' ? null : racine.querySelector('a.btn.whatsapp');
  if (bouton) {
    meteoCourante().then((m) => {
      const plage = m.parDate && m.parDate[sortie.date] ? m.parDate[sortie.date][creneauDe(sortie.heure)] : null;
      if (plage) bouton.href = lienWhatsApp(messagePartageSortie(sortie, plage, urlAppli, modele));
    }).catch(() => {});
  }
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

async function afficherAdmin(racine, onglet, initiales = {}) {
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
  if (onglet === 'stats') {
    const [stats, remorque] = await Promise.all([
      actions.appeler('admin_stats', { annee: initiales.annee }),
      actions.appeler('remorque_stats', { annee: initiales.annee }).catch(() => null),
    ]);
    const montrer = remorque && ((etat.cal.remorque && etat.cal.remorque.active) || remorque.reservations || remorque.refusees || remorque.annulees);
    racine.innerHTML = renderAdmin({ ...stats, remorque: montrer ? remorque : null }, 'stats');
    return;
  }
  let options = initiales;
  const afficher = async () => {
    const d = await actions.appeler('admin_lire');
    racine.innerHTML = renderAdmin(d, onglet, options);
    if (options.regleEditee || options.rappelEdite) window.scrollTo(0, 0);
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

async function afficherRemorque(racine, mois) {
  if (!etat.cal.remorque || !etat.cal.remorque.active) {
    racine.innerHTML = '<p class="mut">La réservation de la remorque n’est pas ouverte.</p><a class="btn o" href="#/">Retour au calendrier</a>';
    return;
  }
  let options = { mois: mois || etat.cal.aujourdhui.slice(0, 7), choix: {}, code: {} };
  const afficher = async () => {
    const d = await actions.appeler('remorque_lire');
    racine.innerHTML = renderRemorque(d, options);
    brancherRemorque(racine, actions, d, options, (o) => { options = o; reconstruire(); });
  };
  // Chaque réaffichage repart d'un élément neuf pour ne pas cumuler les écouteurs.
  const reconstruire = () => {
    const y = window.scrollY;
    const neuf = racine.cloneNode(false);
    racine.replaceWith(neuf);
    racine = neuf;
    afficher().then(() => window.scrollTo(0, y)).catch((e) => toast(e.message));
  };
  await afficher();
}

const ROUTES = [
  { motif: /^#\/remorque(?:\/(\d{4}-\d{2}))?$/, afficher: (racine, m) => afficherRemorque(racine, m[1]) },
  { motif: /^#\/admin\/recurrences\/(.+)$/, afficher: (racine, m) => afficherAdmin(racine, 'recurrences', { regleEditee: decodeURIComponent(m[1]) }) },
  { motif: /^#\/admin\/rappels\/(.+)$/, afficher: (racine, m) => afficherAdmin(racine, 'rappels', { rappelEdite: decodeURIComponent(m[1]) }) },
  { motif: /^#\/admin\/stats(?:\/(\d{4}))?$/, afficher: (racine, m) => afficherAdmin(racine, 'stats', { annee: m[1] ? Number(m[1]) : undefined }) },
  { motif: /^#\/admin(?:\/(recurrences|fermetures|rappels|parametres|messages))?$/, afficher: (racine, m) => afficherAdmin(racine, m[1] || 'parametres') },
  { motif: /^#\/creer\/(\d{4}-\d{2}-\d{2})$/, afficher: (racine, m) => afficherCreation(racine, m[1]) },
  { motif: /^#\/modifier\/(.+)$/, afficher: (racine, m) => afficherModification(racine, decodeURIComponent(m[1])) },
  { motif: /^#\/personnes$/, afficher: (racine) => afficherPersonnes(racine) },
  { motif: /^#\/$/, afficher: (racine) => afficherCalendrier(racine) },
  { motif: /^#\/jour\/(\d{4}-\d{2}-\d{2})$/, afficher: async (racine, m) => afficherJour(racine, m[1], await meteoCourante()) },
  { motif: /^#\/sortie\/(.+)$/, afficher: (racine, m) => afficherSortie(racine, decodeURIComponent(m[1])) },
  // Lien court des messages : remplacé dans l'historique par l'adresse de la fiche.
  {
    motif: /^#\/s\/([0-9a-z]+)$/,
    afficher: (racine, m) => {
      const destination = destinationLienCourt(etat.cal, m[1]);
      if (destination) location.replace(destination);
      else racine.innerHTML = '<p class="mut">Cette sortie n\'est plus au calendrier.</p><a class="btn o" href="#/">Retour au calendrier</a>';
    },
  },
];

async function router() {
  attente.debut();
  try {
    return await routerSansAttente();
  } finally {
    attente.fin();
  }
}

async function routerSansAttente() {
  if (!lireJeton()) return afficherConnexion();
  const hash = location.hash || '#/';
  if (hash === '#/deconnexion') {
    try { await actions.appeler('deconnexion'); } catch (e) { /* jeton déjà invalide */ }
    effacerJeton();
    location.hash = '#/';
    return afficherConnexion();
  }
  try {
    if (!etat.cal && !partirDuCache()) await chargerCalendrier();
  } catch (e) {
    if (e.code !== 'non_connecte') vue().innerHTML = `<p class="erreur">${echapper(e.message)}</p><button class="btn o" onclick="location.reload()">Réessayer</button>`;
    return undefined;
  }
  arreterDiscussion();
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

// Calendrier à l'écran (toutes mises en page) : relu toutes les 30 s, sans indicateur d'attente, pour suivre les
// inscriptions et désinscriptions faites depuis d'autres appareils. Redessiné seulement s'il a changé, en gardant la
// position de défilement et les sections dépliées.
async function relireCalendrierALEcran() {
  const hash = location.hash;
  if (!etat.cal || !doitRelireCalendrier({ visible: document.visibilityState === 'visible', connecte: !!lireJeton(), hash, recuIlYa: Date.now() - etat.calRecuA })) return;
  const avant = etat.cal;
  recevoirCalendrier(await appeler('calendrier', {}, { surDeconnexion: () => afficherConnexion('Votre session a expiré, reconnectez-vous.') }));
  if (location.hash !== hash || !calendrierAChange(avant, etat.cal) || document.querySelector('.selecteur-affichage')) return;
  await reafficherSansBouger();
}

async function reafficherSansBouger() {
  const y = window.scrollY;
  const frise = vue().querySelector('.frise');
  const x = frise ? frise.scrollLeft : null;
  const ouverts = [...vue().querySelectorAll('details')].map((d) => d.open);
  await routerSansAttente();
  vue().querySelectorAll('details').forEach((d, i) => { if (i < ouverts.length) d.open = ouverts[i]; });
  const friseNeuve = vue().querySelector('.frise');
  if (friseNeuve && x !== null) friseNeuve.scrollLeft = x;
  window.scrollTo(0, y);
}

setInterval(() => { relireCalendrierALEcran().catch(() => {}); }, INTERVALLE_CALENDRIER_MS);

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible' || !lireJeton() || !etat.cal) return;
  if (reaffichageAutomatiquePermis(location.hash)) actions.rafraichir().catch(() => {});
  else chargerCalendrier().catch(() => {});
});
window.addEventListener('hashchange', router);
if ('serviceWorker' in navigator && location.hostname !== 'localhost') {
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(() => {});
  surveillerMisesAJour(navigator, document, location);
}
router();

export { actions };
