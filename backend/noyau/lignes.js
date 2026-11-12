// Conversion entre les valeurs d'une feuille Google Sheets et des objets indexés par en-tête.

function deuxChiffres(n) {
  return String(n).padStart(2, '0');
}

function valeurCellule(v) {
  if (v === '' || v == null) return '';
  if (typeof v === 'boolean') return v;
  if (v instanceof Date || Object.prototype.toString.call(v) === '[object Date]') {
    if (v.getFullYear() === 1899) return `${deuxChiffres(v.getHours())}:${deuxChiffres(v.getMinutes())}`;
    return `${v.getFullYear()}-${deuxChiffres(v.getMonth() + 1)}-${deuxChiffres(v.getDate())}`;
  }
  if (typeof v === 'number') {
    if (Number.isInteger(v) && /^[67]\d{8}$/.test(String(v))) return '+33' + v;
    return String(v);
  }
  return String(v);
}

export function objetsIndexes(valeurs) {
  if (!valeurs || valeurs.length < 2) return [];
  const entetes = valeurs[0].map((e) => String(e).trim());
  const res = [];
  for (let i = 1; i < valeurs.length; i++) {
    const ligne = valeurs[i];
    if (!ligne.some((v) => v !== '' && v != null)) continue;
    const objet = {};
    entetes.forEach((e, j) => { if (e) objet[e] = valeurCellule(ligne[j]); });
    res.push({ rang: i + 1, objet });
  }
  return res;
}

export function lignesEnObjets(valeurs) {
  return objetsIndexes(valeurs).map((l) => l.objet);
}

export function objetEnLigne(entetes, objet) {
  return entetes.map((e) => {
    const v = objet[e];
    if (v === undefined || v === null) return '';
    return typeof v === 'boolean' ? v : String(v);
  });
}
