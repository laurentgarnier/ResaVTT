// Nom de l'association, réglé par l'admin (Paramètres, nom_appli) : titre de l'onglet, bandeau, nom de l'appli installée.
import { echapper } from '../logique/html.js';

export const NOM_APPLI_DEFAUT = 'Sorties VTT';
export const CLE_NOM_APPLI = 'sorties-vtt-nom';

// Celui du serveur s'il est connu, sinon le dernier vu sur l'appareil (avant connexion, à l'ouverture), sinon le défaut.
export function nomAppliAffiche(cal, nomStocke) {
  const duServeur = cal && cal.parametres && String(cal.parametres.nom_appli || '').trim();
  return duServeur || String(nomStocke || '').trim() || NOM_APPLI_DEFAUT;
}

// Bandeau : le logo du club (icones/icone-192.png, tirée de icones/logo.png) puis le nom, d'une seule couleur.
export function logoAppli(nom) {
  return `<img class="logo-img" src="icones/icone-192.png" alt="" width="28" height="28"><span class="logo-nom">${echapper(String(nom).trim())}</span>`;
}
