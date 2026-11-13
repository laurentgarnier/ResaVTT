// Dernier calendrier reçu, gardé sur l'appareil : à l'ouverture, l'appli l'affiche tout de suite
// puis le remplace par la version du serveur dès qu'elle arrive.
const CLE = 'sorties-vtt-calendrier';

export function enregistrerCalendrier(cal, jeton) {
  try { localStorage.setItem(CLE, JSON.stringify({ jeton, cal })); } catch (e) { /* stockage plein ou indisponible */ }
}

// Valable seulement pour la même session et le même jour : la veille, les sorties « passées » seraient fausses.
export function lireCalendrierEnCache(jeton, aujourdhui) {
  try {
    const brut = localStorage.getItem(CLE);
    if (!brut) return null;
    const { jeton: j, cal } = JSON.parse(brut);
    return j === jeton && cal && cal.aujourdhui === aujourdhui ? cal : null;
  } catch (e) {
    return null;
  }
}

export function oublierCalendrier() {
  try { localStorage.removeItem(CLE); } catch (e) { /* rien à faire */ }
}
