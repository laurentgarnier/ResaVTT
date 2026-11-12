// Construction des mails : mail « liste » (texte) et mail « À poster sur WhatsApp » avec un bouton wa.me.
import { echapper } from '../../site/sorties/js/logique/html.js';
import { lienWhatsApp } from '../../site/sorties/js/logique/modeles.js';

export function courrierListe(objet, texte) {
  return { objet, texte };
}

export function courrierWhatsApp(texte, numero) {
  const lien = lienWhatsApp(texte, numero);
  const html = '<div style="font-family:Arial,sans-serif;font-size:15px;color:#1a2338">'
    + '<p>Message prêt à poster sur WhatsApp :</p>'
    + `<blockquote style="border-left:4px solid #25d366;margin:0 0 16px;padding:8px 12px;background:#f3f7f4">${echapper(texte).replace(/\n/g, '<br>')}</blockquote>`
    + `<p><a href="${echapper(lien)}" style="display:inline-block;background:#25d366;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:24px">📲 Envoyer sur WhatsApp</a></p>`
    + '<p style="color:#666;font-size:12px">Le bouton ouvre WhatsApp avec le message déjà rédigé : il reste à appuyer sur Envoyer.</p>'
    + '</div>';
  return { objet: 'À poster sur WhatsApp', texte: `${texte}\n\nEnvoyer sur WhatsApp : ${lien}`, html };
}
