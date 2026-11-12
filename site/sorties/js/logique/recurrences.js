// Génération des sorties récurrentes (spec technique §6.3).
import { jourSemaine, semainesEntre } from './dates.js';

function fermetureCouvre(f, regleId, date) {
  return f.debut <= date && date <= f.fin && (!f.regle_id || f.regle_id === regleId);
}

function idRecurrente(regleId, date, ordre) {
  return `R:${regleId}:${date}:${ordre}`;
}

export function genererSorties(regles, regleSorties, fermetures, dates, idsExistants, maintenantIso) {
  const nouvelles = [];
  for (const r of regles) {
    if (!r.active || r.active === 'FALSE') continue;
    const frequence = Number(r.frequence_semaines) || 1;
    const lignes = regleSorties.filter((rs) => rs.regle_id === r.id).sort((a, b) => Number(a.ordre) - Number(b.ordre));
    for (const date of dates) {
      if (jourSemaine(date) !== Number(r.jour)) continue;
      if (date < r.date_depart) continue;
      if (semainesEntre(r.date_depart, date) % frequence !== 0) continue;
      if (fermetures.some((f) => fermetureCouvre(f, r.id, date))) continue;
      for (const l of lignes) {
        const id = idRecurrente(r.id, date, l.ordre);
        if (idsExistants.has(id)) continue;
        nouvelles.push({
          id, date, heure: r.heure, titre: l.titre, point_rdv: r.point_rdv,
          lieu: l.lieu || '', km: l.km || '', dplus: l.dplus || '', description: l.description || '',
          type: 'recurrente', regle_id: r.id, ordre: String(l.ordre), trace_regle_id: l.trace_id || '',
          createur_tel: '', createur_nom: '', statut: 'ouverte', motif_annulation: '',
          a_notifier: false, annulation_notifiee: false, modifie_par: '', modifie_le: '',
          traces_masquees: '', cree_le: maintenantIso,
        });
      }
    }
  }
  return nouvelles;
}

export function sortiesAAnnulerPourFermeture(f, sorties) {
  return sorties
    .filter((s) => s.type === 'recurrente' && s.statut === 'ouverte' && fermetureCouvre(f, s.regle_id, s.date))
    .map((s) => s.id);
}
