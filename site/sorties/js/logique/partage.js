// Message WhatsApp que le créateur d'une sortie libre envoie au club : la sortie, la météo prévue pour sa
// demi-journée et le lien d'inscription. Composé dans le téléphone, sans appel au serveur, d'après le modèle réglé
// par l'admin (Modeles.partage_whatsapp, reçu avec le calendrier).
import { libelleJour } from './dates.js';
import { ligneMeteoTexte } from './meteo.js';
import { remplirModele, MODELES_DEFAUT } from './modeles.js';

// Une ligne du modèle faite seulement de repères qui se retrouvent vides (ex. {{distances}}) disparaît.
const QUE_DES_REPERES = /^\s*(\{\{\w+\}\}\s*)+$/;

export function messagePartageSortie(sortie, plageMeteo, urlAppli, modele) {
  const adresse = String(urlAppli).replace(/\/?$/, '/');
  const valeurs = {
    titre: sortie.titre,
    date: libelleJour(sortie.date),
    heure: sortie.heure,
    point_rdv: sortie.point_rdv,
    distances: [sortie.km && `${sortie.km} km`, sortie.dplus && `${sortie.dplus} m D+`].filter(Boolean).join(' · '),
    meteo: ligneMeteoTexte(plageMeteo),
    lien_sortie: `${adresse}#/sortie/${encodeURIComponent(sortie.id)}`,
    lien: adresse,
    createur: sortie.createur_nom || '',
  };
  return String(modele || MODELES_DEFAUT.partage_whatsapp).split('\n')
    .map((ligne) => ({ ligne, rempli: remplirModele(ligne, valeurs) }))
    .filter(({ ligne, rempli }) => !(QUE_DES_REPERES.test(ligne) && !rempli.trim()))
    .map(({ rempli }) => rempli)
    .join('\n');
}
