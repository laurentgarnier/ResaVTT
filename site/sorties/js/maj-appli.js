// Mises à jour de l'appli installée. Sur iPhone, ouvrir l'appli depuis l'écran d'accueil la réveille souvent sans
// recharger la page : le navigateur ne cherche alors aucune nouvelle version. On la cherche donc à chaque retour au
// premier plan, et dès qu'une nouvelle version a pris la main, on recharge pour l'afficher (plus tard si une saisie
// est en cours, au moment où l'appli passe en arrière-plan).
export function surveillerMisesAJour(navigateur, doc, lieu) {
  const sw = navigateur.serviceWorker;
  const dejaControlee = Boolean(sw.controller); // sinon, première installation : rien à recharger
  let aRecharger = false;
  let recharge = false;
  const recharger = () => {
    if (recharge) return;
    recharge = true;
    lieu.reload();
  };
  sw.addEventListener('controllerchange', () => {
    if (!dejaControlee) return;
    if (doc.querySelector('form')) aRecharger = true;
    else recharger();
  });
  doc.addEventListener('visibilitychange', () => {
    if (doc.visibilityState === 'hidden') {
      if (aRecharger) recharger();
      return;
    }
    sw.ready.then((inscription) => inscription.update()).catch(() => {});
  });
}
