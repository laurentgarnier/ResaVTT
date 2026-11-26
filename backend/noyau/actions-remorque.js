// Réservation de la remorque du club (docs/superpowers/specs/2026-11-26-remorque-design.md).
// Une période (du … au …, jours inclus) est demandée par un adhérent, puis validée ou refusée par un gestionnaire
// (adhérent dont l'email figure dans le paramètre remorque_gestionnaires, identité vérifiée par code mail).
import { aujourdhuiLocal } from '../../site/sorties/js/logique/dates.js';
import { lireCleValeur, erreurMetier, PARAMETRES_DEFAUT } from './schema.js';
import { exigerAdminVerifie } from './actions-admin.js';

const PRISESRq = ['demandee', 'validee', 'bloquee']; // statuts qui occupent la remorque
const MOTIFS_BLOCAGE = { club: 'utilisation par le club', indisponible: 'non disponible' };
const DATERq = /^\d{4}-\d{2}-\d{2}$/;

function parametresRq(ctx) {
  return { ...PARAMETRES_DEFAUT, ...lireCleValeur(ctx.depot.lire('Parametres')) };
}

export function remorqueActive(ctx) {
  return String(parametresRq(ctx).remorque_active).trim().toLowerCase() === 'oui';
}

export function emailsGestionnaires(ctx) {
  return String(parametresRq(ctx).remorque_gestionnaires || '').split(/[,;\s]+/).map((e) => e.trim().toLowerCase()).filter((e) => e.includes('@'));
}

export function estGestionnaire(ctx, u) {
  return Boolean(u && u.email) && emailsGestionnaires(ctx).includes(String(u.email).trim().toLowerCase());
}

function exigerOuverteRq(ctx) {
  if (!remorqueActive(ctx)) throw erreurMetier('remorque_fermee', "La réservation de la remorque n'est pas ouverte.");
}

function exigerGestionnaireRq(ctx, u) {
  if (!estGestionnaire(ctx, u)) throw erreurMetier('interdit', 'Réservé aux gestionnaires de la remorque.');
  if (!u.identite_verifiee) throw erreurMetier('identite_non_verifiee', 'Saisissez le code reçu par email pour gérer la remorque.');
}

const dateValideRq = (d) => DATERq.test(String(d)) && new Date(`${d}T12:00:00Z`).toISOString().slice(0, 10) === d;
const chevaucheRq = (a, b) => a.debut <= b.fin && b.debut <= a.fin;
const texteRq = (v, max) => String(v == null ? '' : v).trim().slice(0, max);

function datesValidesRq(ctx, req, { passe = false } = {}) {
  const debut = String(req.debut || '');
  const fin = String(req.fin || '');
  const aujourdhui = aujourdhuiLocal(ctx.services.maintenant());
  if (!dateValideRq(debut) || !dateValideRq(fin) || fin < debut || (!passe && debut < aujourdhui)) {
    throw erreurMetier('dates_invalides', 'Dates invalides : choisissez un début à partir d\'aujourd\'hui et une fin après le début.');
  }
  return { debut, fin };
}

const dateFrRq = (iso) => { const [a, m, j] = String(iso).split('-'); return `${j}/${m}/${a}`; };
const periodeFrRq = (r) => (r.debut === r.fin ? `le ${dateFrRq(r.debut)}` : `du ${dateFrRq(r.debut)} au ${dateFrRq(r.fin)}`);

function lienPageRq(ctx) {
  const url = String(parametresRq(ctx).url_appli || '').trim();
  return url ? `\n\n${url.replace(/#.*$/, '')}#/remorque` : '';
}

// Les avis par mail accompagnent l'action sans la conditionner : la demande reste enregistrée si l'envoi échoue.
function avertirRq(ctx, destinataires, objet, corps) {
  const liste = [].concat(destinataires).filter(Boolean);
  if (!liste.length) return;
  try {
    ctx.services.mail(liste.join(', '), objet, corps + lienPageRq(ctx));
  } catch (e) {
    ctx.journal('remorque', `Mail « ${objet} » non envoyé : ${e && e.message ? e.message : e}`);
  }
}

function emailAdherentRq(ctx, telephone) {
  const a = ctx.adherents.lire().find((x) => x.telephone === telephone);
  return a && a.email ? String(a.email).trim() : '';
}

function ligneRq(ctx, id) {
  const r = ctx.depot.lire('Remorque').find((x) => x.id === id);
  if (!r) throw erreurMetier('introuvable', 'Demande introuvable.');
  return r;
}

function verifierLibreRq(ctx, periode, statuts, sauf) {
  const conflit = ctx.depot.lire('Remorque').find((r) => r.id !== sauf && statuts.includes(r.statut) && chevaucheRq(r, periode));
  if (conflit) throw erreurMetier('periode_prise', `La remorque n'est pas libre ${periodeFrRq(conflit)}.`);
}

function traiterParRq(ctx, u, id, champs) {
  ctx.depot.modifier('Remorque', (r) => r.id === id, { ...champs, traite_par: u.nom, traite_le: ctx.services.maintenant().toISOString() });
}

// Pour le bandeau (dans la réponse du calendrier) : page ouverte et, pour un gestionnaire, nombre de demandes en attente.
export function etatRemorque(ctx, u) {
  if (!remorqueActive(ctx)) return { active: false };
  if (!estGestionnaire(ctx, u)) return { active: true };
  return { active: true, attente: ctx.depot.lire('Remorque').filter((r) => r.statut === 'demandee').length };
}

export function actionRemorqueLire(ctx, u) {
  exigerOuverteRq(ctx);
  const gestionnaire = estGestionnaire(ctx, u);
  const voitTout = gestionnaire && u.identite_verifiee;
  const lignes = ctx.depot.lire('Remorque').sort((a, b) => String(a.debut).localeCompare(String(b.debut)));
  const vue = (r) => {
    const a_moi = r.demandeur_tel === u.telephone && r.statut !== 'bloquee';
    const p = { id: r.id, debut: r.debut, fin: r.fin, statut: r.statut, motif: r.statut === 'bloquee' ? r.motif : '', a_moi };
    if (voitTout || a_moi) Object.assign(p, { demandeur_nom: r.demandeur_nom || '', commentaire: r.commentaire || '' });
    return p;
  };
  const data = {
    aujourdhui: aujourdhuiLocal(ctx.services.maintenant()),
    est_gestionnaire: gestionnaire,
    verifie: gestionnaire && Boolean(u.identite_verifiee),
    periodes: lignes.filter((r) => PRISESRq.includes(r.statut)).map(vue),
    mes_demandes: lignes.filter((r) => r.demandeur_tel === u.telephone && r.statut !== 'bloquee').reverse()
      .map((r) => ({ id: r.id, debut: r.debut, fin: r.fin, statut: r.statut, commentaire: r.commentaire || '', motif: r.motif || '' })),
  };
  if (voitTout) {
    data.a_valider = lignes.filter((r) => r.statut === 'demandee').map(vue);
    data.blocages = lignes.filter((r) => r.statut === 'bloquee' && r.fin >= data.aujourdhui).map(vue);
  }
  return data;
}

export function actionRemorqueDemander(ctx, u, req) {
  exigerOuverteRq(ctx);
  const periode = datesValidesRq(ctx, req);
  verifierLibreRq(ctx, periode, PRISESRq);
  const r = {
    id: ctx.services.uuid(), ...periode, statut: 'demandee', motif: '', commentaire: texteRq(req.commentaire, 300),
    demandeur_tel: u.telephone, demandeur_nom: u.nom, traite_par: '', traite_le: '', cree_le: ctx.services.maintenant().toISOString(),
  };
  ctx.depot.ajouter('Remorque', [r]);
  avertirRq(ctx, emailsGestionnaires(ctx), `Demande de remorque : ${u.nom}, ${periodeFrRq(r)}`,
    `${u.nom} demande la remorque ${periodeFrRq(r)}.${r.commentaire ? `\nPour : ${r.commentaire}` : ''}\n\nÀ valider ou refuser dans l'appli (page Remorque).`);
  return { id: r.id };
}

export function actionRemorqueAnnuler(ctx, u, req) {
  exigerOuverteRq(ctx);
  const r = ligneRq(ctx, req.id);
  if (r.demandeur_tel !== u.telephone || r.statut === 'bloquee') throw erreurMetier('interdit', 'Seul le demandeur peut annuler sa demande.');
  if (!['demandee', 'validee'].includes(r.statut) || r.fin < aujourdhuiLocal(ctx.services.maintenant())) {
    throw erreurMetier('statut_invalide', 'Cette demande ne peut plus être annulée.');
  }
  ctx.depot.modifier('Remorque', (x) => x.id === r.id, { statut: 'annulee' });
  avertirRq(ctx, emailsGestionnaires(ctx), `Remorque : demande annulée (${u.nom}, ${periodeFrRq(r)})`,
    `${u.nom} a annulé sa ${r.statut === 'validee' ? 'réservation' : 'demande'} de la remorque ${periodeFrRq(r)}.`);
  return { annulee: true };
}

function deciderRq(ctx, u, req, statut) {
  exigerOuverteRq(ctx);
  exigerGestionnaireRq(ctx, u);
  const r = ligneRq(ctx, req.id);
  if (r.statut !== 'demandee') throw erreurMetier('statut_invalide', 'Cette demande a déjà été traitée.');
  const motif = statut === 'refusee' ? texteRq(req.motif, 300) : '';
  traiterParRq(ctx, u, r.id, { statut, motif });
  avertirRq(ctx, emailAdherentRq(ctx, r.demandeur_tel),
    statut === 'validee' ? 'Remorque : réservation validée' : 'Remorque : demande refusée',
    statut === 'validee'
      ? `Bonjour ${r.demandeur_nom},\n\nVotre réservation de la remorque ${periodeFrRq(r)} est validée par ${u.nom}.`
      : `Bonjour ${r.demandeur_nom},\n\nVotre demande de la remorque ${periodeFrRq(r)} n'a pas pu être acceptée.${motif ? `\nMotif : ${motif}` : ''}`);
  return { statut };
}

export const actionRemorqueValider = (ctx, u, req) => deciderRq(ctx, u, req, 'validee');
export const actionRemorqueRefuser = (ctx, u, req) => deciderRq(ctx, u, req, 'refusee');

export function actionRemorqueBloquer(ctx, u, req) {
  exigerOuverteRq(ctx);
  exigerGestionnaireRq(ctx, u);
  const motif = String(req.motif || '');
  if (!MOTIFS_BLOCAGE[motif]) throw erreurMetier('motif_invalide', 'Motif : utilisation par le club ou non disponible.');
  const periode = datesValidesRq(ctx, req);
  verifierLibreRq(ctx, periode, ['validee', 'bloquee']);
  const r = {
    id: ctx.services.uuid(), ...periode, statut: 'bloquee', motif, commentaire: texteRq(req.commentaire, 300),
    demandeur_tel: '', demandeur_nom: '', traite_par: u.nom, traite_le: ctx.services.maintenant().toISOString(), cree_le: ctx.services.maintenant().toISOString(),
  };
  for (const d of ctx.depot.lire('Remorque').filter((x) => x.statut === 'demandee' && chevaucheRq(x, periode))) {
    traiterParRq(ctx, u, d.id, { statut: 'refusee', motif: `Remorque ${MOTIFS_BLOCAGE[motif]}` });
    avertirRq(ctx, emailAdherentRq(ctx, d.demandeur_tel), 'Remorque : demande refusée',
      `Bonjour ${d.demandeur_nom},\n\nVotre demande de la remorque ${periodeFrRq(d)} n'a pas pu être acceptée.\nMotif : remorque ${MOTIFS_BLOCAGE[motif]}.`);
  }
  ctx.depot.ajouter('Remorque', [r]);
  return { id: r.id };
}

export function actionRemorqueDebloquer(ctx, u, req) {
  exigerOuverteRq(ctx);
  exigerGestionnaireRq(ctx, u);
  const r = ligneRq(ctx, req.id);
  if (r.statut !== 'bloquee') throw erreurMetier('statut_invalide', "Cette période n'est pas bloquée.");
  traiterParRq(ctx, u, r.id, { statut: 'annulee' });
  return { annulee: true };
}

// Purge : une période terminée depuis la durée de conservation perd le nom, le téléphone et le commentaire ;
// dates et statut restent pour les statistiques.
export function anonymiserRemorque(ctx, limite) {
  ctx.depot.modifier('Remorque', (r) => r.fin < limite && (r.demandeur_tel || r.demandeur_nom || r.commentaire),
    { demandeur_tel: '', demandeur_nom: '', commentaire: '' });
}

// ---- Statistiques (assemblée générale) ----

const jourSuivantRq = (iso) => new Date(Date.parse(`${iso}T12:00:00Z`) + 86400000).toISOString().slice(0, 10);

// Jours de la période [debut, fin] qui tombent dans l'année.
function joursDansAnneeRq(r, annee) {
  const jours = [];
  const debut = r.debut > `${annee}-01-01` ? r.debut : `${annee}-01-01`;
  const fin = r.fin < `${annee}-12-31` ? r.fin : `${annee}-12-31`;
  for (let j = debut; j <= fin; j = jourSuivantRq(j)) jours.push(j);
  return jours;
}

export function statistiquesRemorque(lignes, annee) {
  const dansAnnee = lignes.filter((r) => DATERq.test(String(r.debut)) && DATERq.test(String(r.fin)) && joursDansAnneeRq(r, annee).length);
  const de = (statut) => dansAnnee.filter((r) => r.statut === statut);
  const validees = de('validee');
  const jours_par_mois = Array(12).fill(0);
  for (const r of validees) for (const j of joursDansAnneeRq(r, annee)) jours_par_mois[Number(j.slice(5, 7)) - 1]++;
  const joursBloques = (motif) => de('bloquee').filter((r) => r.motif === motif).reduce((n, r) => n + joursDansAnneeRq(r, annee).length, 0);
  const annees = new Set();
  for (const r of lignes) if (DATERq.test(String(r.debut))) for (let a = Number(r.debut.slice(0, 4)); a <= Number(String(r.fin).slice(0, 4)); a++) annees.add(a);
  annees.add(annee);
  return {
    annee,
    annees: [...annees].sort((a, b) => b - a),
    reservations: validees.length,
    jours_pret: jours_par_mois.reduce((a, b) => a + b, 0),
    adherents: new Set(validees.map((r) => r.demandeur_tel).filter(Boolean)).size,
    refusees: de('refusee').length,
    annulees: de('annulee').filter((r) => !MOTIFS_BLOCAGE[r.motif]).length, // un blocage levé n'est pas une demande annulée
    jours_bloques_club: joursBloques('club'),
    jours_bloques_indisponible: joursBloques('indisponible'),
    jours_par_mois,
  };
}

export function actionRemorqueStats(ctx, u, req) {
  exigerAdminVerifie(u);
  const annee = Number(req.annee) || Number(aujourdhuiLocal(ctx.services.maintenant()).slice(0, 4));
  return statistiquesRemorque(ctx.depot.lire('Remorque'), annee);
}
