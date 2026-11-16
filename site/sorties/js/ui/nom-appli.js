// Nom de l'association, réglé par l'admin (Paramètres, nom_appli) : titre de l'onglet, bandeau, nom de l'appli installée.
import { echapper } from '../logique/html.js';

export const NOM_APPLI_DEFAUT = 'Sorties VTT';
export const CLE_NOM_APPLI = 'sorties-vtt-nom';

// Celui du serveur s'il est connu, sinon le dernier vu sur l'appareil (avant connexion, à l'ouverture), sinon le défaut.
export function nomAppliAffiche(cal, nomStocke) {
  const duServeur = cal && cal.parametres && String(cal.parametres.nom_appli || '').trim();
  return duServeur || String(nomStocke || '').trim() || NOM_APPLI_DEFAUT;
}

// Logo du bandeau : le dernier mot en couleur d'accent, comme « Sorties VTT ».
export function logoAppli(nom) {
  const mots = String(nom).trim().split(/\s+/);
  const dernier = mots.pop();
  return `🚵 ${mots.length ? `${echapper(mots.join(' '))} ` : ''}<span>${echapper(dernier)}</span>`;
}
