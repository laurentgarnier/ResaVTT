// Choix d'affichage à l'essai (mise en page du calendrier, thème, espacement), mémorisé sur l'appareil.
import { echapper } from '../logique/html.js';

export const DISPOSITIONS = [
  { id: 'classique', libelle: 'Classique', aide: 'Grille de 2 semaines (ou un jour sur téléphone)' },
  { id: 'frise', libelle: 'Frise', aide: 'Les jours côte à côte, à faire glisser' },
  { id: 'agenda', libelle: 'Agenda', aide: 'Liste à partir d\'aujourd\'hui, mes sorties en tête' },
];

export const THEMES = [
  { id: 'nuit', libelle: 'Nuit', couleur: '#121a2b' },
  { id: 'clair', libelle: 'Clair', couleur: '#f1f3f6' },
  { id: 'contraste', libelle: 'Contraste', couleur: '#05070b' },
  { id: 'club', libelle: 'Club', couleur: '#b3000c' },
  { id: 'ardoise', libelle: 'Ardoise', couleur: '#1e2633' },
];

// Aéré : jours bien séparés, moins de cadres imbriqués, agenda plus large sur PC.
export const ESPACEMENTS = [
  { id: 'compact', libelle: 'Compact', aide: 'Affichage dense, le plus d\'informations à l\'écran' },
  { id: 'aere', libelle: 'Aéré', aide: 'Jours bien séparés, moins de cadres ; agenda sur toute la largeur sur PC' },
];

const CLE = 'sorties-vtt-affichage';
const DEFAUT = { disposition: 'agenda', theme: 'club', espacement: 'compact' };

export function lireAffichage(stockage) {
  let lu = {};
  try { lu = JSON.parse(stockage.getItem(CLE) || '{}') || {}; } catch (e) { lu = {}; }
  return {
    disposition: DISPOSITIONS.some((d) => d.id === lu.disposition) ? lu.disposition : DEFAUT.disposition,
    theme: THEMES.some((t) => t.id === lu.theme) ? lu.theme : DEFAUT.theme,
    espacement: ESPACEMENTS.some((e) => e.id === lu.espacement) ? lu.espacement : DEFAUT.espacement,
  };
}

export function enregistrerAffichage(stockage, affichage) {
  try { stockage.setItem(CLE, JSON.stringify(affichage)); } catch (e) { /* stockage indisponible : le choix vaut pour la session */ }
}

// Choix de mise en page, thème et espacement : dans la fenêtre « Affichage » ou dans la page Profil.
export function renderChoixAffichage(affichage) {
  const bouton = (attr, id, libelle, actif, aide) => `<button type="button" ${attr}="${id}" aria-pressed="${actif}"${aide ? ` title="${echapper(aide)}"` : ''}>${echapper(libelle)}</button>`;
  return `<div class="petit mut">Mise en page du calendrier</div>
    <div class="choix">${DISPOSITIONS.map((d) => bouton('data-disposition', d.id, d.libelle, d.id === affichage.disposition, d.aide)).join('')}</div>
    <div class="petit mut">Thème</div>
    <div class="choix">${THEMES.map((t) => bouton('data-theme-choix', t.id, t.libelle, t.id === affichage.theme)).join('')}</div>
    <div class="petit mut">Espacement</div>
    <div class="choix">${ESPACEMENTS.map((e) => bouton('data-espacement', e.id, e.libelle, e.id === affichage.espacement, e.aide)).join('')}</div>
    <div class="petit mut">Le choix ne vaut que pour cet appareil.</div>`;
}

export function renderSelecteurAffichage(affichage) {
  return `<div class="selecteur-affichage" role="dialog" aria-label="Affichage">${renderChoixAffichage(affichage)}</div>`;
}

// Choix touché (bouton de renderChoixAffichage) → changement à appliquer, ou null.
export function choixAffichage(bouton) {
  if (!bouton) return null;
  if (bouton.dataset.disposition) return { disposition: bouton.dataset.disposition };
  if (bouton.dataset.espacement) return { espacement: bouton.dataset.espacement };
  if (bouton.dataset.themeChoix) return { theme: bouton.dataset.themeChoix };
  return null;
}
