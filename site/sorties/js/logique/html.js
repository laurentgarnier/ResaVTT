// Outils d'affichage : échappement HTML (tout texte saisi par un utilisateur passe par ici).
const COULEURS_AVATAR = ['#c0457a', '#5765d6', '#2e9a6c', '#1f8fb0', '#d6573a', '#a0832b', '#7a52c7', '#e07a1f'];

export function echapper(s) {
  if (s == null) return '';
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function initiales(nom) {
  const mots = String(nom || '?').trim().split(/\s+/);
  const s = mots.length > 1 ? mots[0][0] + mots[1][0] : mots[0].slice(0, 2);
  return s.toUpperCase();
}

export function couleurAvatar(nom) {
  let h = 0;
  for (const c of String(nom)) h = (h * 31 + c.codePointAt(0)) >>> 0;
  return COULEURS_AVATAR[h % COULEURS_AVATAR.length];
}
