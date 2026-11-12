// Modèles de messages et liens WhatsApp (spec fonctionnelle §4.9, spec technique §3 Modeles).
import { libelleJour } from './dates.js';

export const MODELES_DEFAUT = {
  rappel_mail_objet: 'Sorties VTT : les inscriptions du week-end sont ouvertes',
  rappel_mail_corps: "Les sorties du week-end sont ouvertes !\n📱 Vous avez l'appli : ouvrez-la depuis votre écran d'accueil.\n🌐 Pas encore installée : {{lien}}",
  rappel_whatsapp: "Les sorties du week-end sont ouvertes !\n📱 Vous avez l'appli : ouvrez-la depuis votre écran d'accueil.\n🌐 Pas encore installée : {{lien}}",
  annulation_mail_objet: 'Sorties VTT : annulation',
  annulation_mail_corps: "Sortie(s) annulée(s) :\n{{liste_annulations}}\n📱 Détails dans l'appli (écran d'accueil).\n🌐 Pas encore installée : {{lien}}",
  annulation_whatsapp: "Sortie(s) annulée(s) :\n{{liste_annulations}}\n📱 Détails dans l'appli (écran d'accueil).\n🌐 Pas encore installée : {{lien}}",
};

export function remplirModele(texte, valeurs) {
  return String(texte).replace(/\{\{(\w+)\}\}/g, (m, cle) => (cle in valeurs ? String(valeurs[cle]) : m));
}

export function lienWhatsApp(texte, numero) {
  const chiffres = numero ? String(numero).replace(/\D/g, '') : '';
  return `https://wa.me/${chiffres}?text=${encodeURIComponent(texte)}`;
}

export function listeAnnulations(sorties) {
  return sorties
    .map((s) => `• ${libelleJour(s.date)} ${s.heure} – ${s.titre}${s.motif_annulation ? ` (${s.motif_annulation})` : ''}`)
    .join('\n');
}
