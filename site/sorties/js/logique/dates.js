// Dates en texte AAAA-MM-JJ, heures HH:MM. Arithmétique en UTC pour ignorer l'heure d'été.
const MS_JOUR = 86400000;

function versUtc(date) {
  const [a, m, j] = date.split('-').map(Number);
  return Date.UTC(a, m - 1, j);
}

function depuisUtc(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

export function ajouterJours(date, n) {
  return depuisUtc(versUtc(date) + n * MS_JOUR);
}

export function jourSemaine(date) {
  return (new Date(versUtc(date)).getUTCDay() + 6) % 7;
}

export function lundiDe(date) {
  return ajouterJours(date, -jourSemaine(date));
}

export function fenetre(aujourdhui) {
  const lundi = lundiDe(aujourdhui);
  return Array.from({ length: 14 }, (_, i) => ajouterJours(lundi, i));
}

export function semainesEntre(a, b) {
  return Math.round((versUtc(b) - versUtc(a)) / (7 * MS_JOUR));
}

export function aujourdhuiLocal(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function creneau(heure) {
  return heure < '13:00' ? 'matin' : 'apres_midi';
}

export function estPasse(date, heure, maintenant) {
  const [a, m, j] = date.split('-').map(Number);
  const [h, mi] = (heure || '00:00').split(':').map(Number);
  return new Date(a, m - 1, j, h, mi).getTime() <= maintenant.getTime();
}

const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

export function libelleJour(date) {
  const [, m, j] = date.split('-').map(Number);
  return `${JOURS[jourSemaine(date)]} ${j} ${MOIS[m - 1]}`;
}
