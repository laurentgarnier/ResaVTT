// Calendrier de la remorque : mois découpé en semaines (lundi → dimanche), période qui occupe un jour.
const NOMS_MOIS_REMORQUE = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

const deux = (n) => String(n).padStart(2, '0');

// mois : « AAAA-MM ». Chaque semaine a 7 cases : la date (AAAA-MM-JJ) ou null hors du mois.
export function semainesDuMois(mois) {
  const [a, m] = mois.split('-').map(Number);
  const nbJours = new Date(Date.UTC(a, m, 0)).getUTCDate();
  const decalage = (new Date(Date.UTC(a, m - 1, 1)).getUTCDay() + 6) % 7; // lundi = 0
  const cases = [...Array(decalage).fill(null), ...Array.from({ length: nbJours }, (_, i) => `${a}-${deux(m)}-${deux(i + 1)}`)];
  while (cases.length % 7) cases.push(null);
  const semaines = [];
  for (let i = 0; i < cases.length; i += 7) semaines.push(cases.slice(i, i + 7));
  return semaines;
}

const ORDRE_STATUTS_REMORQUE = { validee: 0, bloquee: 1, demandee: 2 };

export function periodeDuJour(date, periodes) {
  const occupantes = periodes.filter((p) => p.debut <= date && date <= p.fin);
  occupantes.sort((a, b) => (ORDRE_STATUTS_REMORQUE[a.statut] ?? 9) - (ORDRE_STATUTS_REMORQUE[b.statut] ?? 9));
  return occupantes[0] || null;
}

export function moisVoisin(mois, decalage) {
  const [a, m] = mois.split('-').map(Number);
  const d = new Date(Date.UTC(a, m - 1 + decalage, 1));
  return `${d.getUTCFullYear()}-${deux(d.getUTCMonth() + 1)}`;
}

export function libelleMois(mois) {
  const [a, m] = mois.split('-').map(Number);
  return `${NOMS_MOIS_REMORQUE[m - 1]} ${a}`;
}
