// Actions sur les sorties, les discussions et les traces GPX.
import { estPasse } from '../../site/sorties/js/logique/dates.js';
import { peutModifier, peutChangerHoraire } from '../../site/sorties/js/logique/droits.js';
import { estVrai, erreurMetier } from './schema.js';
import { horodatage, personnesDuCompte, trouverSortie } from './actions-adherent.js';

const TAILLE_MAX_TRACE = 5 * 1024 * 1024;
const LONGUEUR_MAX_MESSAGE = 1000;
const CHAMPS_MODIFIABLES = ['date', 'heure', 'titre', 'point_rdv', 'lieu', 'km', 'dplus', 'description'];

function interdit() {
  return erreurMetier('interdit', 'Action réservée au créateur ou à un administrateur.');
}

function invalide(message) {
  return erreurMetier('champs_invalides', message);
}

function nettoyer(v, max) {
  return String(v == null ? '' : v).trim().slice(0, max);
}

function verifierChamps(o) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(o.date)) throw invalide('Date invalide.');
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(o.heure)) throw invalide('Heure invalide.');
  if (!o.titre) throw invalide('Le titre est obligatoire.');
  if (!o.point_rdv) throw invalide('Le point de rendez-vous est obligatoire.');
}

function sortiePourDroits(s) {
  return { ...s, a_notifier: estVrai(s.a_notifier) };
}

export function messageSysteme(ctx, sortieId, texte) {
  ctx.depot.ajouter('Discussions', [{
    id: ctx.services.uuid(), sortie_id: sortieId, auteur_nom: 'Sorties VTT', telephone: '', texte, trace_id: '',
    horodatage: horodatage(ctx), supprime: false, systeme: true,
  }]);
}

export function actionSortieCreer(ctx, u, req) {
  const s = {
    date: nettoyer(req.date, 10), heure: nettoyer(req.heure, 5), titre: nettoyer(req.titre, 80), point_rdv: nettoyer(req.point_rdv, 120),
    lieu: nettoyer(req.lieu, 120), km: nettoyer(req.km, 6), dplus: nettoyer(req.dplus, 6), description: nettoyer(req.description, 1000),
  };
  verifierChamps(s);
  if (estPasse(s.date, s.heure, ctx.services.maintenant())) throw invalide('Cette date est déjà passée.');
  const miennes = personnesDuCompte(ctx, u);
  const ids = req.personne_ids || [];
  const personnes = ids.map((id) => miennes.find((p) => p.id === id));
  if (personnes.some((p) => !p)) throw erreurMetier('personne_inconnue', 'Personne inconnue dans votre compte.');
  const id = ctx.services.uuid();
  const maintenant = horodatage(ctx);
  ctx.depot.ajouter('Sorties', [{
    id, ...s, type: 'libre', regle_id: '', ordre: '', trace_regle_id: '', createur_tel: u.telephone, createur_nom: u.nom,
    statut: 'ouverte', motif_annulation: '', a_notifier: false, annulation_notifiee: false, modifie_par: '', modifie_le: '',
    traces_masquees: '', cree_le: maintenant,
  }]);
  ctx.depot.ajouter('Inscriptions', personnes.map((p) => ({ sortie_id: id, personne_id: p.id, nom_affiche: p.nom_affiche, telephone: u.telephone, horodatage: maintenant })));
  return { id };
}

export function actionSortieModifier(ctx, u, req) {
  const s = trouverSortie(ctx, req.sortie_id);
  if (!peutModifier(sortiePourDroits(s), u)) throw interdit();
  const champs = {};
  for (const c of CHAMPS_MODIFIABLES) if (req[c] !== undefined) champs[c] = nettoyer(req[c], c === 'description' ? 1000 : 120);
  verifierChamps({ ...s, ...champs });
  ctx.depot.modifier('Sorties', (x) => x.id === s.id, { ...champs, modifie_par: u.nom, modifie_le: horodatage(ctx) });
  return null;
}

export function actionSortieHoraire(ctx, u, req) {
  const s = trouverSortie(ctx, req.sortie_id);
  if (!peutChangerHoraire(sortiePourDroits(s), u)) throw interdit();
  const heure = nettoyer(req.heure, 5);
  verifierChamps({ ...s, heure });
  ctx.depot.modifier('Sorties', (x) => x.id === s.id, { heure, modifie_par: u.nom, modifie_le: horodatage(ctx) });
  messageSysteme(ctx, s.id, `${u.nom} a changé l'horaire : ${heure}.`);
  return null;
}

export function actionSortieAnnuler(ctx, u, req) {
  const s = trouverSortie(ctx, req.sortie_id);
  if (!peutModifier(sortiePourDroits(s), u)) throw interdit();
  if (s.statut === 'annulee') return null;
  const motif = nettoyer(req.motif, 200);
  const saPropreSortieLibre = s.type === 'libre' && s.createur_tel === u.telephone;
  ctx.depot.modifier('Sorties', (x) => x.id === s.id, {
    statut: 'annulee', motif_annulation: motif, a_notifier: u.admin_verifie && !saPropreSortieLibre, annulation_notifiee: false,
    modifie_par: u.nom, modifie_le: horodatage(ctx),
  });
  messageSysteme(ctx, s.id, motif ? `Sortie annulée : ${motif}.` : 'Sortie annulée.');
  return null;
}

export function actionDiscussionLire(ctx, u, req) {
  const depuis = req.depuis || '';
  return ctx.depot.lire('Discussions')
    .filter((m) => m.sortie_id === req.sortie_id && !estVrai(m.supprime) && String(m.horodatage) > depuis)
    .sort((a, b) => String(a.horodatage).localeCompare(String(b.horodatage)))
    .map((m) => ({
      id: m.id, auteur_nom: m.auteur_nom, texte: m.texte, trace_id: m.trace_id || '', horodatage: m.horodatage,
      systeme: estVrai(m.systeme), a_moi: !estVrai(m.systeme) && m.telephone === u.telephone,
    }));
}

export function actionDiscussionEcrire(ctx, u, req) {
  trouverSortie(ctx, req.sortie_id);
  const texte = String(req.texte || '').trim();
  if (!texte || texte.length > LONGUEUR_MAX_MESSAGE) throw erreurMetier('texte_invalide', 'Message vide ou trop long (1 000 caractères maximum).');
  const id = ctx.services.uuid();
  ctx.depot.ajouter('Discussions', [{
    id, sortie_id: req.sortie_id, auteur_nom: u.nom, telephone: u.telephone, texte, trace_id: req.trace_id || '',
    horodatage: horodatage(ctx), supprime: false, systeme: false,
  }]);
  return { id };
}

export function actionDiscussionSupprimer(ctx, u, req) {
  const m = ctx.depot.lire('Discussions').find((x) => x.id === req.message_id);
  if (!m) throw erreurMetier('message_inconnu', 'Message introuvable.');
  if (m.telephone !== u.telephone && !u.admin_verifie) throw erreurMetier('interdit', "Seul l'auteur ou un administrateur peut supprimer ce message.");
  ctx.depot.modifier('Discussions', (x) => x.id === m.id, { supprime: true });
  return null;
}

export function actionTraceAjouter(ctx, u, req) {
  const s = trouverSortie(ctx, req.sortie_id);
  const nom = nettoyer(req.nom_fichier, 120);
  const contenu = String(req.contenu || '');
  if (!/\.gpx$/i.test(nom)) throw erreurMetier('fichier_invalide', 'Seuls les fichiers .gpx sont acceptés.');
  if (contenu.length > TAILLE_MAX_TRACE) throw erreurMetier('fichier_trop_gros', 'Fichier trop gros (5 Mo maximum).');
  if (!/^\s*(<\?xml|<gpx)/.test(contenu)) throw erreurMetier('fichier_invalide', "Ce fichier n'est pas un GPX valide.");
  const viaDiscussion = !!req.via_discussion;
  if (!viaDiscussion && !peutModifier(sortiePourDroits(s), u)) throw interdit();
  const id = ctx.services.uuid();
  const driveId = ctx.services.fichiers.enregistrer(nom, contenu);
  ctx.depot.ajouter('Traces', [{
    id, sortie_id: viaDiscussion ? '' : s.id, regle_id: '', nom_fichier: nom, drive_id: driveId,
    km: nettoyer(req.km, 6), dplus: nettoyer(req.dplus, 6), ajoute_par_tel: u.telephone, ajoute_par_nom: u.nom, horodatage: horodatage(ctx),
  }]);
  return { id };
}

export function actionTraceLire(ctx, _u, req) {
  const t = ctx.depot.lire('Traces').find((x) => x.id === req.trace_id);
  if (!t) throw erreurMetier('trace_inconnue', 'Trace introuvable.');
  return { nom_fichier: t.nom_fichier, contenu: ctx.services.fichiers.lire(t.drive_id) };
}

export function actionTraceSupprimer(ctx, u, req) {
  const s = trouverSortie(ctx, req.sortie_id);
  const t = ctx.depot.lire('Traces').find((x) => x.id === req.trace_id);
  // La trace doit appartenir à cette sortie (ou être la trace par défaut de sa règle).
  const rattachee = t && (t.sortie_id === s.id || (t.regle_id && !t.sortie_id && t.id === s.trace_regle_id));
  if (!rattachee) throw erreurMetier('trace_inconnue', 'Trace introuvable.');
  const peutSortie = peutModifier(sortiePourDroits(s), u);
  if (t.regle_id && !t.sortie_id) {
    if (!peutSortie) throw interdit();
    const masquees = String(s.traces_masquees || '').split(',').filter(Boolean);
    if (!masquees.includes(t.id)) masquees.push(t.id);
    ctx.depot.modifier('Sorties', (x) => x.id === s.id, { traces_masquees: masquees.join(',') });
    return null;
  }
  if (!peutSortie && t.ajoute_par_tel !== u.telephone) throw interdit();
  ctx.depot.supprimer('Traces', (x) => x.id === t.id);
  if (!String(t.drive_id).startsWith('demo:')) ctx.services.fichiers.supprimer(t.drive_id);
  return null;
}
