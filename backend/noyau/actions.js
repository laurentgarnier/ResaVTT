// Routeur des actions de l'API (spec technique §4) : contrôle du jeton, droits relus à chaque appel.
import { estVrai } from './schema.js';
import { actionConnexion, actionDeconnexion, actionCalendrier, actionPersonnesEnregistrer, actionInscription } from './actions-adherent.js';
import { actionAdminCodeDemander, actionAdminCodeVerifier, actionAdminLire, actionAdminEnregistrer, actionAdminGeocoder, actionRappelEnvoyerMaintenant } from './actions-admin.js';
import { actionAdminStats } from './statistiques.js';
import { actionSortieCreer, actionSortieModifier, actionSortieHoraire, actionSortieAnnuler, actionDiscussionLire, actionDiscussionEcrire, actionDiscussionSupprimer, actionTraceAjouter, actionTraceLire, actionTraceSupprimer } from './actions-sorties.js';

// Construite à l'appel (et non au chargement) : Apps Script ne garantit pas l'ordre de chargement des fichiers.
function tableActions() {
  return {
    connexion: actionConnexion,
    deconnexion: actionDeconnexion,
    calendrier: actionCalendrier,
    personnes_enregistrer: actionPersonnesEnregistrer,
    inscription: actionInscription,
    sortie_creer: actionSortieCreer,
    sortie_modifier: actionSortieModifier,
    sortie_horaire: actionSortieHoraire,
    sortie_annuler: actionSortieAnnuler,
    discussion_lire: actionDiscussionLire,
    discussion_ecrire: actionDiscussionEcrire,
    discussion_supprimer: actionDiscussionSupprimer,
    trace_ajouter: actionTraceAjouter,
    trace_lire: actionTraceLire,
    trace_supprimer: actionTraceSupprimer,
    admin_code_demander: actionAdminCodeDemander,
    admin_code_verifier: actionAdminCodeVerifier,
    admin_lire: actionAdminLire,
    admin_enregistrer: actionAdminEnregistrer,
    admin_geocoder: actionAdminGeocoder,
    admin_stats: actionAdminStats,
    rappel_envoyer_maintenant: actionRappelEnvoyerMaintenant,
  };
}

const ACTIONS_PUBLIQUES = ['connexion'];

function utilisateurCourant(requete, ctx) {
  if (!requete.jeton) return null;
  const hash = ctx.services.hacher(requete.jeton);
  const jeton = ctx.depot.lire('Jetons').find((j) => j.jeton_hash === hash);
  if (!jeton) return null;
  const adherent = ctx.adherents.lire().find((a) => a.telephone === jeton.telephone && estVrai(a.actif));
  if (!adherent) return null;
  const aujourdhui = ctx.services.maintenant().toISOString().slice(0, 10);
  if (String(jeton.derniere_utilisation).slice(0, 10) !== aujourdhui) {
    ctx.depot.modifier('Jetons', (j) => j.jeton_hash === hash, { derniere_utilisation: ctx.services.maintenant().toISOString() });
  }
  const est_admin = estVrai(adherent.admin);
  return {
    telephone: adherent.telephone, nom: adherent.nom, email: adherent.email || '',
    est_admin, admin_verifie: est_admin && estVrai(jeton.admin_verifie), jeton_hash: hash,
  };
}

export function traiter(requete, ctx) {
  try {
    const action = tableActions()[requete.action];
    if (!action) return { ok: false, erreur: 'action_inconnue', message: 'Action inconnue.' };
    let u = null;
    if (!ACTIONS_PUBLIQUES.includes(requete.action)) {
      u = utilisateurCourant(requete, ctx);
      if (!u) return { ok: false, erreur: 'non_connecte', message: 'Veuillez vous reconnecter.' };
    }
    const data = action(ctx, u, requete);
    const reponse = { ok: true, data: data === undefined ? null : data };
    // Après une écriture, le calendrier à jour part dans la même réponse : l'appli évite un second aller-retour.
    if (requete.avec_calendrier && requete.action !== 'calendrier') {
      const apres = utilisateurCourant(requete, ctx);
      if (apres) reponse.calendrier = actionCalendrier(ctx, apres);
    }
    return reponse;
  } catch (e) {
    if (e && e.code) return { ok: false, erreur: e.code, message: e.message, ...e.extra };
    ctx.journal('erreur', `${requete.action} : ${e && e.stack ? e.stack : e}`);
    return { ok: false, erreur: 'erreur_interne', message: 'Erreur technique, réessayez.' };
  }
}
