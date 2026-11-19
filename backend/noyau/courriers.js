// Construction des mails : mail « liste » (texte) et mail « À poster sur WhatsApp » avec un bouton wa.me.
import { echapper } from '../../site/sorties/js/logique/html.js';
import { lienWhatsApp, sansEmojis } from '../../site/sorties/js/logique/modeles.js';

// Mail à la liste : le texte brut (messageries sans HTML) et une version mise en forme, plus grande, où la date de
// chaque sortie ressort et où le lien d'une sortie tient, court, sur la ligne de son pictogramme.
const URL_TEXTE = /https?:\/\/[^\s<]+/g;
const LIGNE_SORTIE = /^🚵 (.+?) – (.+)$/;
const LIGNE_LIEN_SORTIE = /^👉 (https?:\/\/\S+)$/;

function lienHtml(url, libelle = url) {
  return `<a href="${url}">${libelle}</a>`;
}

function ligneHtml(ligne) {
  const retrait = /^\s+\S/.test(ligne);
  const brute = ligne.trim();
  if (!brute) return '<div style="height:12px"></div>';
  const e = echapper(brute);
  let contenu;
  const sortie = e.match(LIGNE_SORTIE);
  const lienSortie = e.match(LIGNE_LIEN_SORTIE);
  if (sortie) contenu = `🚵 <b style="font-size:19px">${sortie[1]}</b> – ${sortie[2]}`;
  else if (lienSortie) contenu = `👉 ${lienHtml(lienSortie[1], "Voir la sortie et s'inscrire")}`;
  else contenu = e.replace(URL_TEXTE, (u) => lienHtml(u));
  return `<div${retrait ? ' style="padding-left:28px"' : ''}>${contenu}</div>`;
}

export function courrierListe(objet, texte) {
  const html = '<div style="font-family:Arial,sans-serif;font-size:16px;line-height:1.5;color:#1a2338">'
    + String(texte).split('\n').map(ligneHtml).join('')
    + '</div>';
  return { objet, texte, html };
}

export function courrierWhatsApp(texteBrut, numero) {
  const texte = sansEmojis(texteBrut);
  const lien = lienWhatsApp(texte, numero);
  const html = '<div style="font-family:Arial,sans-serif;font-size:15px;color:#1a2338">'
    + '<p>Message prêt à poster sur WhatsApp :</p>'
    + `<blockquote style="border-left:4px solid #25d366;margin:0 0 16px;padding:8px 12px;background:#f3f7f4">${echapper(texte).replace(/\n/g, '<br>')}</blockquote>`
    + `<p><a href="${echapper(lien)}" style="display:inline-block;background:#25d366;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:24px">📲 Envoyer sur WhatsApp</a></p>`
    + '<p style="color:#666;font-size:12px">Le bouton ouvre WhatsApp avec le message déjà rédigé : il reste à appuyer sur Envoyer.</p>'
    + '</div>';
  return { objet: 'À poster sur WhatsApp', texte: `${texte}\n\nEnvoyer sur WhatsApp : ${lien}`, html };
}
