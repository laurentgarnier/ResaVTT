// Règles de navigation partagées par l'appli.

// Au retour dans l'appli, on ne reconstruit que le calendrier : un écran de saisie (formulaire, message,
// administration) verrait sinon ses champs vidés.
export function reaffichageAutomatiquePermis(hash) {
  return !hash || hash === '#/' || /^#\/jour\//.test(hash);
}

// Un lien reçu (mail, WhatsApp) mène à un écran précis : on y arrive après s'être connecté.
export function destinationApresConnexion(hash) {
  return !hash || hash === '#/deconnexion' ? '#/' : hash;
}

// Calendrier à l'écran : relu régulièrement pour suivre les inscriptions faites depuis d'autres appareils.
export const INTERVALLE_CALENDRIER_MS = 30000;

export function doitRelireCalendrier({ visible, connecte, hash, recuIlYa }) {
  return visible && connecte && reaffichageAutomatiquePermis(hash) && recuIlYa >= INTERVALLE_CALENDRIER_MS - 1000;
}

// Le calendrier n'est redessiné que si ses jours ont changé : sinon rien ne bouge à l'écran.
export function calendrierAChange(avant, apres) {
  return !avant || JSON.stringify(avant.jours) !== JSON.stringify(apres.jours);
}
