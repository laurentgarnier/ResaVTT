// Règles de droits (spec fonctionnelle §3 et §4.4).
import { estPasse } from './dates.js';

export function peutModifier(sortie, u) {
  if (!u) return false;
  if (u.est_admin && u.admin_verifie) return true;
  return sortie.type === 'libre' && !!sortie.createur_tel && sortie.createur_tel === u.telephone;
}

export function peutChangerHoraire(sortie, u) {
  if (sortie.statut === 'annulee') return false;
  return sortie.type === 'recurrente' || peutModifier(sortie, u);
}

export function inscriptionsOuvertes(sortie, maintenant) {
  return sortie.statut !== 'annulee' && !estPasse(sortie.date, sortie.heure, maintenant);
}
