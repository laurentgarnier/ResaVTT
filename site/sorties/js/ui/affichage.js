// Choix d'affichage à l'essai (mise en page du calendrier et thème), mémorisé sur l'appareil.
import { echapper } from '../logique/html.js';

export const DISPOSITIONS = [
  { id: 'classique', libelle: 'Classique', aide: 'Grille de 2 semaines (ou un jour sur téléphone)' },
  { id: 'frise', libelle: 'Frise', aide: 'Les jours côte à côte, à faire glisser' },
  { id: 'agenda', libelle: 'Agenda', aide: 'Liste à partir d\'aujourd\'hui, mes sorties en tête' },
];

export const THEMES = [
  { id: 'nuit', libelle: 'Nuit', couleur: '#121a2b' },
  { id: 'clair', libelle: 'Clair', couleur: '#f4f6f2' },
  { id: 'foret', libelle: 'Forêt', couleur: '#0f1f1a' },
];

const CLE = 'sorties-vtt-affichage';
const DEFAUT = { disposition: 'classique', theme: 'nuit' };

export function lireAffichage(stockage) {
  let lu = {};
  try { lu = JSON.parse(stockage.getItem(CLE) || '{}') || {}; } catch (e) { lu = {}; }
  return {
    disposition: DISPOSITIONS.some((d) => d.id === lu.disposition) ? lu.disposition : DEFAUT.disposition,
    theme: THEMES.some((t) => t.id === lu.theme) ? lu.theme : DEFAUT.theme,
  };
}

export function enregistrerAffichage(stockage, affichage) {
  try { stockage.setItem(CLE, JSON.stringify(affichage)); } catch (e) { /* stockage indisponible : le choix vaut pour la session */ }
}

export function renderSelecteurAffichage(affichage) {
  const bouton = (attr, id, libelle, actif, aide) => `<button type="button" ${attr}="${id}" aria-pressed="${actif}"${aide ? ` title="${echapper(aide)}"` : ''}>${echapper(libelle)}</button>`;
  return `<div class="selecteur-affichage" role="dialog" aria-label="Affichage">
    <div class="petit mut">Mise en page du calendrier</div>
    <div class="choix">${DISPOSITIONS.map((d) => bouton('data-disposition', d.id, d.libelle, d.id === affichage.disposition, d.aide)).join('')}</div>
    <div class="petit mut">Thème</div>
    <div class="choix">${THEMES.map((t) => bouton('data-theme-choix', t.id, t.libelle, t.id === affichage.theme)).join('')}</div>
    <div class="petit mut">À l'essai : le choix ne vaut que pour cet appareil.</div>
  </div>`;
}
