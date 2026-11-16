// Messages WhatsApp que le créateur d'une sortie libre envoie lui-même au club : à la création (la sortie, la météo
// prévue pour sa demi-journée et le lien d'inscription) et à l'annulation. Composés dans le téléphone, sans appel au
// serveur, d'après les modèles réglés par l'admin (Modeles.partage_whatsapp et annulation_partage_whatsapp, reçus
// avec le calendrier).
import { libelleJour } from './dates.js';
import { ligneMeteoTexte } from './meteo.js';
import { remplirModele, MODELES_DEFAUT } from './modeles.js';

const REPERE = /\{\{(\w+)\}\}/g;

// Une ligne qui contient des repères, tous vides (ex. « Motif : {{motif}} » sans motif), disparaît. Une ligne sans
// repère, même vide, est gardée ; une ligne avec un repère inconnu (faute de frappe) aussi, pour qu'on la voie.
function remplirLignes(modele, valeurs) {
  return String(modele).split('\n')
    .filter((ligne) => {
      const reperes = [...ligne.matchAll(REPERE)].map((m) => m[1]);
      if (!reperes.length || reperes.some((cle) => !(cle in valeurs))) return true;
      return reperes.some((cle) => String(valeurs[cle] ?? '').trim());
    })
    .map((ligne) => remplirModele(ligne, valeurs))
    .join('\n');
}

function valeursSortie(sortie, urlAppli) {
  const adresse = String(urlAppli).replace(/\/?$/, '/');
  return {
    titre: sortie.titre,
    date: libelleJour(sortie.date),
    heure: sortie.heure,
    point_rdv: sortie.point_rdv,
    distances: [sortie.km && `${sortie.km} km`, sortie.dplus && `${sortie.dplus} m D+`].filter(Boolean).join(' · '),
    lien_sortie: `${adresse}#/sortie/${encodeURIComponent(sortie.id)}`,
    lien: adresse,
    createur: sortie.createur_nom || '',
  };
}

export function messagePartageSortie(sortie, plageMeteo, urlAppli, modele) {
  return remplirLignes(modele || MODELES_DEFAUT.partage_whatsapp, { ...valeursSortie(sortie, urlAppli), meteo: ligneMeteoTexte(plageMeteo) });
}

export function messageAnnulationSortie(sortie, urlAppli, modele) {
  return remplirLignes(modele || MODELES_DEFAUT.annulation_partage_whatsapp, { ...valeursSortie(sortie, urlAppli), motif: sortie.motif_annulation || '' });
}
