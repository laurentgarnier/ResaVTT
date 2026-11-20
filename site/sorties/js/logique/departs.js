// Points de départ d'une sortie récurrente (conception : docs/superpowers/specs/2026-11-20-departs-multiples-design.md).
// Le premier départ est l'heure et le point de rendez-vous de la sortie ; les autres sont dans autres_departs, un par
// ligne « HH:MM lieu ». Les départs sont nommés d1, d2, d3… dans cet ordre.

export function lireDeparts(texte) {
  return String(texte || '').split('\n').map((l) => l.trim().match(/^(\d{1,2}):(\d{2})\s+(.+)$/))
    .filter(Boolean)
    .map((m) => ({ heure: `${m[1].padStart(2, '0')}:${m[2]}`, point_rdv: m[3].trim() }));
}

export function departsDe(sortie) {
  return [{ heure: sortie.heure, point_rdv: sortie.point_rdv }, ...lireDeparts(sortie.autres_departs)]
    .map((d, i) => ({ id: `d${i + 1}`, ...d }));
}

export function libelleDeparts(sortie) {
  return departsDe(sortie).map((d) => [d.heure, d.point_rdv].filter(Boolean).join(' ')).join(' · ');
}

// Inscriptions d'avant les départs multiples : sans depart_id, elles partent du premier.
export function departInscription(inscription) {
  return inscription.depart_id || 'd1';
}
