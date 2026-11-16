// Fonctions de l'installation sur les comptes de l'association (outils/installer.js), testées à part.

// Identifiant d'un fichier Google à partir de son lien (…/d/<id>/edit) ou de l'identifiant lui-même.
export function idDepuisLien(texte) {
  const t = String(texte || '').trim();
  const m = t.match(/\/d\/([\w-]{10,})/);
  if (m) return m[1];
  return /^[\w-]+$/.test(t) ? t : '';
}

// « Deployed <id> @<version> » : réponse de clasp create-deployment.
export function idDeploiementDepuisSortie(sortie) {
  const m = String(sortie).match(/Deployed\s+([\w-]+)\s+@\d+/);
  return m ? m[1] : '';
}

export function urlApi(idDeploiement) {
  return `https://script.google.com/macros/s/${idDeploiement}/exec`;
}

// site/sorties/config.js pour la production : adresse de la nouvelle API, plus d'indice de connexion de démo.
export function configPourProduction(contenu, url) {
  const motif = /(enLocal \? '\/api' : ')[^']*(')/;
  if (!motif.test(contenu)) throw new Error("config.js : adresse de l'API introuvable");
  return contenu.replace(motif, `$1${url}$2`).replace(/indiceDemo: '[^']*',/, "indiceDemo: '',");
}

// Adresse publique de l'appli sur GitHub Pages : https://<compte>.github.io/<dépôt>/sorties/, ou à la racine pour
// un dépôt nommé <compte>.github.io.
export function adresseAppliDepuisDepot(urlDepot) {
  const m = String(urlDepot).match(/github\.com[/:]([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/);
  if (!m) return '';
  const compte = m[1].toLowerCase();
  const depot = m[2];
  return depot.toLowerCase() === `${compte}.github.io` ? `https://${compte}.github.io/sorties/` : `https://${compte}.github.io/${depot}/sorties/`;
}

// Fichier envoyé avec le code Apps Script : initialiser() s'en sert pour se brancher sur le fichier adhérents.
export function fichierInstallationGas(adherentsId) {
  return `// Écrit par npm run installer : fichier adhérents de l'association.\nvar INSTALLATION_ADHERENTS_ID = '${adherentsId}';\n`;
}
