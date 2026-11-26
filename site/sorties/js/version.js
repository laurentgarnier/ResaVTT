// Numéro de version de l'appli, affiché en pied de page. Il suit celui du service worker (sw.js, VERSION
// 'sorties-vtt-v<n>') : à augmenter ensemble à chaque publication (un test vérifie qu'ils concordent).
export const VERSION_APPLI = '33';

export function libelleVersion() {
  return `Version ${VERSION_APPLI}`;
}
