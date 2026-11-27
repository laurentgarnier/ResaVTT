// Barre de menu fixe en bas de l'écran (option CONFIG.menuBas) : entrées selon les droits, initiales vers le profil.
import { initiales } from './html.js';

export function entreesMenuBas(cal) {
  const entrees = [{ id: 'sorties', href: '#/', icone: '🚵', libelle: 'Sorties', pastille: 0 }];
  if (cal.remorque && cal.remorque.active) {
    entrees.push({ id: 'remorque', href: '#/remorque', icone: '🚚', libelle: 'Remorque', pastille: Number(cal.remorque.attente) || 0 });
  }
  if (cal.est_admin) entrees.push({ id: 'admin', href: '#/admin', icone: '⚙', libelle: 'Admin', pastille: 0 });
  return { entrees, profil: { href: '#/profil', initiales: initiales(cal.moi.nom), nom: cal.moi.nom } };
}

export function entreeActive(hash) {
  const h = hash || '#/';
  if (h.startsWith('#/remorque')) return 'remorque';
  if (h.startsWith('#/admin')) return 'admin';
  if (h.startsWith('#/profil') || h.startsWith('#/personnes')) return 'profil';
  return 'sorties';
}
