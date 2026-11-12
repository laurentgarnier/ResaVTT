// Normalisation unique des numéros de téléphone français (spec technique §6.1).
export function normaliserTelephone(saisie) {
  if (typeof saisie !== 'string') return null;
  let s = saisie.replace(/[^\d+]/g, '');
  if (s.startsWith('0033')) s = '+33' + s.slice(4);
  else if (/^0\d{9}$/.test(s)) s = '+33' + s.slice(1);
  return /^\+33[1-9]\d{8}$/.test(s) ? s : null;
}
