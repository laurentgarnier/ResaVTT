// Encart d'aide à l'installation de l'appli sur l'écran d'accueil.
const CONSEIL_GENERIQUE = 'Si le bouton n’apparaît pas, ouvrez ce lien dans Chrome ou Safari.';

export function plateformeDepuis(userAgent) {
  if (/iPhone|iPad|iPod/i.test(userAgent)) return 'ios';
  if (/Android/i.test(userAgent)) return 'android';
  return 'autre';
}

export function renderEncartInstallation({ plateforme, installee, invitePossible = false }) {
  if (installee) return '';
  let consigne;
  if (plateforme === 'ios') consigne = 'Touchez <b>Partager</b> (le carré avec une flèche), puis <b>« Sur l\'écran d\'accueil »</b>.';
  else if (plateforme === 'android') consigne = invitePossible ? '' : 'Ouvrez le menu ⋮ du navigateur, puis <b>« Installer l\'application »</b> ou <b>« Ajouter à l\'écran d\'accueil »</b>.';
  else consigne = 'Votre navigateur propose l\'installation dans sa barre d\'adresse ou son menu.';
  return `<div class="installer">
    <b>📲 Installez l'appli</b> pour l'ouvrir comme une application, sans ressaisir votre numéro.
    ${consigne ? `<div style="margin-top:4px">${consigne}</div>` : ''}
    ${invitePossible ? '<button class="btn p" data-action="installer">Installer l\'appli</button>' : ''}
    <div class="petit mut" style="margin-top:4px">${CONSEIL_GENERIQUE}</div>
    <button class="lien-plus" data-action="plus-tard">Plus tard</button>
  </div>`;
}
