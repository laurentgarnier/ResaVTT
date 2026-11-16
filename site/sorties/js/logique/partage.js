// Message WhatsApp que le créateur d'une sortie libre envoie au club : la sortie, la météo prévue pour sa
// demi-journée et le lien d'inscription. Composé dans le téléphone, sans appel au serveur.
import { libelleJour } from './dates.js';
import { ligneMeteoTexte } from './meteo.js';

export function messagePartageSortie(sortie, plageMeteo, urlAppli) {
  const distances = [sortie.km && `${sortie.km} km`, sortie.dplus && `${sortie.dplus} m D+`].filter(Boolean).join(' · ');
  const lien = `${String(urlAppli).replace(/\/?$/, '/')}#/sortie/${encodeURIComponent(sortie.id)}`;
  return [
    `🚵 Nouvelle sortie : ${sortie.titre}`,
    `${libelleJour(sortie.date)} ${sortie.heure} – ${sortie.point_rdv}`,
    distances,
    ligneMeteoTexte(plageMeteo),
    `👉 Inscriptions : ${lien}`,
  ].filter(Boolean).join('\n');
}
