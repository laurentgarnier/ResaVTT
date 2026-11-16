// Modèles de messages et liens WhatsApp (spec fonctionnelle §4.9, spec technique §3 Modeles).
import { libelleJour } from './dates.js';

export const MODELES_DEFAUT = {
  rappel_individuel_objet: 'Sorties VTT : {{nom}}',
  rappel_individuel_texte: "Les inscriptions sont ouvertes !\n{{liste_sorties}}\n📱 Vous avez l'appli : ouvrez-la depuis votre écran d'accueil.\n🌐 Pas encore installée : {{lien}}",
  rappel_groupe_objet: 'Sorties VTT : {{nom}}',
  rappel_groupe_texte: "Les inscriptions sont ouvertes !\n{{liste_sorties}}\n📱 Vous avez l'appli : ouvrez-la depuis votre écran d'accueil.\n🌐 Pas encore installée : {{lien}}",
  partage_whatsapp: 'Nouvelle sortie : {{titre}}\n{{date}} {{heure}} – {{point_rdv}}\n{{distances}}\n{{meteo}}\nInscriptions : {{lien_sortie}}',
  annulation_partage_whatsapp: 'Sortie annulée : {{titre}}\n{{date}} {{heure}} – {{point_rdv}}\nMotif : {{motif}}\nDétails : {{lien_sortie}}',
  annulation_mail_objet: 'Sorties VTT : annulation',
  annulation_mail_corps: "Sortie(s) annulée(s) :\n{{liste_annulations}}\n📱 Détails dans l'appli (écran d'accueil).\n🌐 Pas encore installée : {{lien}}",
  annulation_whatsapp: "Sortie(s) annulée(s) :\n{{liste_annulations}}\n📱 Détails dans l'appli (écran d'accueil).\n🌐 Pas encore installée : {{lien}}",
};

export function remplirModele(texte, valeurs) {
  return String(texte).replace(/\{\{(\w+)\}\}/g, (m, cle) => (cle in valeurs ? String(valeurs[cle]) : m));
}

// Les emojis s'affichent en caractères inconnus dans WhatsApp chez certains : ils sont retirés, avec l'espace qui suit.
export function sansEmojis(texte) {
  return String(texte).replace(/(?:\p{Extended_Pictographic}|[\u200D\uFE0F\u20E3])+ ?/gu, '');
}

export function lienWhatsApp(texte, numero) {
  const chiffres = numero ? String(numero).replace(/\D/g, '') : '';
  return `https://wa.me/${chiffres}?text=${encodeURIComponent(sansEmojis(texte))}`;
}

export function listeAnnulations(sorties) {
  return sorties
    .map((s) => `• ${libelleJour(s.date)} ${s.heure} – ${s.titre}${s.motif_annulation ? ` (${s.motif_annulation})` : ''}`)
    .join('\n');
}
