// Rappels par récurrence et rappels groupés (conception : docs/superpowers/specs/2026-11-16-rappels-par-recurrence-design.md).
// Le rappel individuel est rangé dans la récurrence (colonnes rappel_* de Regles), les rappels groupés dans l'onglet Rappels.
import { aujourdhuiLocal, jourSemaine, estPasse } from '../../site/sorties/js/logique/dates.js';
import { MODELES_DEFAUT } from '../../site/sorties/js/logique/modeles.js';
import { estVrai } from './schema.js';

const HORIZON_JOURS = 7;

// Nouvelle récurrence : rappel 2 jours avant la sortie, à 18:00, par mail et WhatsApp.
export function reglagesRappelDefaut(jourSortie) {
  return {
    rappel_actif: true,
    rappel_jour: String((Number(jourSortie) - 2 + 7) % 7),
    rappel_heure: '18:00',
    rappel_mail: true,
    rappel_whatsapp: true,
    rappel_objet: MODELES_DEFAUT.rappel_individuel_objet,
    rappel_texte: MODELES_DEFAUT.rappel_individuel_texte,
  };
}

function idsDuGroupe(groupe) {
  return String(groupe.regle_ids || '').split(',').map((id) => id.trim()).filter(Boolean);
}

// Rappels à considérer : les groupes actifs (limités à leurs récurrences actives existantes), puis les rappels
// individuels actifs des récurrences actives qu'aucun groupe actif ne couvre.
export function rappelsProgrammes(regles, groupes) {
  const actives = new Map(regles.filter((r) => estVrai(r.active)).map((r) => [r.id, r]));
  const couvertes = new Set();
  const res = [];
  for (const g of groupes.filter((x) => estVrai(x.actif))) {
    const ids = idsDuGroupe(g);
    ids.forEach((id) => couvertes.add(id));
    const regleIds = ids.filter((id) => actives.has(id));
    if (!regleIds.length) continue;
    res.push({
      type: 'G', id: g.id, nom: g.nom, regle_ids: regleIds, jour: Number(g.jour), heure: g.heure,
      mail: estVrai(g.mail), whatsapp: estVrai(g.whatsapp), objet: g.objet, texte: g.texte,
    });
  }
  for (const r of actives.values()) {
    if (couvertes.has(r.id) || !estVrai(r.rappel_actif)) continue;
    res.push({
      type: 'R', id: r.id, nom: r.nom, regle_ids: [r.id], jour: Number(r.rappel_jour), heure: r.rappel_heure,
      mail: estVrai(r.rappel_mail), whatsapp: estVrai(r.rappel_whatsapp), objet: r.rappel_objet, texte: r.rappel_texte,
    });
  }
  return res;
}

function heureMinute(d) {
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

export function estDu(rappel, maintenant) {
  return jourSemaine(aujourdhuiLocal(maintenant)) === Number(rappel.jour) && heureMinute(maintenant) >= String(rappel.heure);
}

// Pour chaque récurrence : ses sorties non annulées qui partent après maintenant et au plus 7 jours après,
// en ne gardant que celles de sa prochaine date.
export function sortiesAAnnoncer(sorties, regleIds, maintenant) {
  const limite = new Date(maintenant.getTime() + HORIZON_JOURS * 86400000);
  const dateLimite = aujourdhuiLocal(limite);
  const res = [];
  for (const id of regleIds) {
    const candidates = sorties.filter((s) => s.regle_id === id && s.statut !== 'annulee' && s.date <= dateLimite
      && !estPasse(s.date, s.heure, maintenant) && estPasse(s.date, s.heure, limite));
    if (!candidates.length) continue;
    const prochaine = candidates.reduce((m, s) => (s.date < m ? s.date : m), candidates[0].date);
    res.push(...candidates.filter((s) => s.date === prochaine));
  }
  return res.sort((a, b) => (a.date + a.heure).localeCompare(b.date + b.heure));
}
