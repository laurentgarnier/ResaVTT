// Configuration de l'appli. urlApi : URL du déploiement Apps Script (se termine par /exec).
// En local (localhost), l'appli parle au serveur de développement (outils/serveur-dev.js) sur /api,
// sauf si localStorage['sorties-vtt-api'] contient une autre URL.
const enLocal = typeof location !== 'undefined' && /^(localhost|127\.0\.0\.1)$/.test(location.hostname);

function surcharge() {
  try {
    return typeof localStorage !== 'undefined' ? localStorage.getItem('sorties-vtt-api') : null;
  } catch (e) {
    return null;
  }
}

export const CONFIG = {
  urlApi: surcharge() || (enLocal ? '/api' : 'https://script.google.com/macros/s/AKfycbzMk1Tc5Y-4GzT7KFrH2FnKGBYzMgFKlKKqPyywApi1QjyQMIcNqzvhL_WEuco826kmkQ/exec'),
  urlAppli: '',
  indiceDemo: 'Démo : essayez 06 00 00 00 02 (Ben) ou votre propre numéro (administrateur).',
};
