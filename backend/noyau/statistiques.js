// Statistiques annuelles. Les sorties ne sont gardées que quelques semaines (conservation_mois) ;
// avant suppression, chacune laisse une ligne anonyme dans l'onglet Bilan (date, heure, statut, nombre de participants).
import { creneau, estPasse, jourSemaine } from '../../site/sorties/js/logique/dates.js';
import { exigerAdminVerifie } from './actions-admin.js';

function nombreInscrits(ctx) {
  const n = {};
  for (const i of ctx.depot.lire('Inscriptions')) n[i.sortie_id] = (n[i.sortie_id] || 0) + 1;
  return n;
}

function ligneBilan(s, inscrits) {
  return { sortie_id: s.id, date: s.date, heure: s.heure, statut: s.statut, participants: String(inscrits[s.id] || 0) };
}

// À appeler avant de supprimer des sorties : une sortie déjà présente dans le bilan n'y est pas recopiée.
export function archiverSorties(ctx, sorties) {
  const deja = new Set(ctx.depot.lire('Bilan').map((b) => b.sortie_id));
  const inscrits = nombreInscrits(ctx);
  ctx.depot.ajouter('Bilan', sorties.filter((s) => !deja.has(s.id)).map((s) => ligneBilan(s, inscrits)));
}

// Sorties du bilan et sorties encore présentes, réunies (la sortie présente l'emporte), déjà parties à cet instant.
function sortiesParties(ctx, maintenant) {
  const inscrits = nombreInscrits(ctx);
  const parId = new Map(ctx.depot.lire('Bilan').map((b) => [b.sortie_id, b]));
  for (const s of ctx.depot.lire('Sorties')) parId.set(s.id, ligneBilan(s, inscrits));
  return [...parId.values()].filter((b) => /^\d{4}-\d{2}-\d{2}$/.test(String(b.date)) && estPasse(b.date, b.heure, maintenant));
}

export function calculerStatistiques(lignes, annee) {
  const res = {
    annee, sorties: 0, annulees: 0, participants: 0,
    par_mois: Array.from({ length: 12 }, (_, i) => ({ mois: i + 1, sorties: 0, participants: 0 })),
    par_demi_journee: Array.from({ length: 7 }, (_, jour) => ({ jour, matin: 0, apres_midi: 0 })),
  };
  for (const l of lignes) {
    if (Number(l.date.slice(0, 4)) !== annee) continue;
    if (l.statut === 'annulee') { res.annulees++; continue; }
    const n = Number(l.participants) || 0;
    const mois = res.par_mois[Number(l.date.slice(5, 7)) - 1];
    res.sorties++;
    res.participants += n;
    mois.sorties++;
    mois.participants += n;
    res.par_demi_journee[jourSemaine(l.date)][creneau(l.heure)] += n;
  }
  return res;
}

export function actionAdminStats(ctx, u, params) {
  exigerAdminVerifie(u);
  const maintenant = ctx.services.maintenant();
  const lignes = sortiesParties(ctx, maintenant);
  const anneeCourante = maintenant.getFullYear();
  const annees = [...new Set([anneeCourante, ...lignes.map((l) => Number(l.date.slice(0, 4)))])].sort((a, b) => b - a);
  const demandee = Number(params.annee);
  const annee = annees.includes(demandee) ? demandee : anneeCourante;
  return { ...calculerStatistiques(lignes, annee), annees };
}
