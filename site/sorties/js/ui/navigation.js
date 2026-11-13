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
