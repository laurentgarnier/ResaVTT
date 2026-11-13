// Indicateurs d'attente : barre animée en haut d'écran tant qu'un échange est en cours,
// et le bouton qui l'a déclenché passe en « occupé » (roue + désactivé) jusqu'à la réponse.
const DELAI_CLIC = 1500; // ms : au-delà, l'échange n'est plus attribué au dernier bouton touché

export function creerAttente(doc = document) {
  let enCours = 0;
  let occupes = [];
  let dernier = null;
  let instant = 0;
  const retenir = (b) => { if (b) { dernier = b; instant = Date.now(); } };
  doc.addEventListener('click', (e) => retenir(e.target.closest && e.target.closest('button, .btn, .chip')), true);
  doc.addEventListener('submit', (e) => retenir(e.submitter || e.target.querySelector('[type="submit"]')), true);

  return {
    debut() {
      enCours++;
      doc.body.classList.add('en-attente');
      if (dernier && dernier.isConnected && Date.now() - instant < DELAI_CLIC && !occupes.includes(dernier)) {
        dernier.classList.add('occupe');
        dernier.setAttribute('aria-busy', 'true');
        if (dernier.tagName === 'BUTTON') dernier.disabled = true;
        occupes.push(dernier);
      }
    },
    fin() {
      enCours = Math.max(0, enCours - 1);
      if (enCours) return;
      doc.body.classList.remove('en-attente');
      for (const b of occupes) {
        b.classList.remove('occupe');
        b.removeAttribute('aria-busy');
        if (b.tagName === 'BUTTON') b.disabled = false;
      }
      occupes = [];
      dernier = null;
    },
  };
}
