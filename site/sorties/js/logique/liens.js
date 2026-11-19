// Liens courts vers une sortie, pour les messages (mail, WhatsApp) : …/sorties/#/s/<code>.
// Le code (6 caractères) se calcule à partir de l'identifiant de la sortie ; l'appli retrouve la sortie dans son
// calendrier en recalculant le code de chacune. Aucun service extérieur. Les anciens liens #/sortie/<id> marchent
// toujours.

// FNV-1a 32 bits, ramené à 6 caractères en base 36.
export function codeCourt(id) {
  let h = 0x811c9dc5;
  const s = String(id);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return (h % 2176782336).toString(36).padStart(6, '0'); // 36^6
}

export function lienSortie(urlAppli, id) {
  return urlAppli ? `${String(urlAppli).replace(/\/?$/, '/')}#/s/${codeCourt(id)}` : '';
}

export function idDuCodeCourt(jours, code) {
  for (const j of jours || []) for (const s of j.sorties || []) if (codeCourt(s.id) === code) return s.id;
  return null;
}
