import { test } from 'node:test';
import assert from 'node:assert/strict';
import { entreesMenuBas, entreeActive } from '../site/sorties/js/logique/menu-bas.js';

const cal = (autres = {}) => ({ moi: { nom: 'Marie Durand' }, est_admin: false, remorque: { active: false }, ...autres });

test('adhérent sans remorque : Sorties seulement, puis ses initiales vers le profil', () => {
  const m = entreesMenuBas(cal());
  assert.deepEqual(m.entrees.map((e) => e.id), ['sorties']);
  assert.deepEqual(m.profil, { href: '#/profil', initiales: 'MD', nom: 'Marie Durand' });
});

test('remorque ouverte : entrée Remorque, avec le nombre de demandes en attente pour un gestionnaire', () => {
  assert.deepEqual(entreesMenuBas(cal({ remorque: { active: true } })).entrees.map((e) => [e.id, e.pastille]), [['sorties', 0], ['remorque', 0]]);
  const g = entreesMenuBas(cal({ remorque: { active: true, attente: 3 } }));
  assert.equal(g.entrees.find((e) => e.id === 'remorque').pastille, 3);
});

test('administrateur : entrée Admin en dernier', () => {
  const m = entreesMenuBas(cal({ est_admin: true, remorque: { active: true } }));
  assert.deepEqual(m.entrees.map((e) => e.href), ['#/', '#/remorque', '#/admin']);
});

test('entrée active selon l\'écran affiché', () => {
  assert.equal(entreeActive('#/'), 'sorties');
  assert.equal(entreeActive(''), 'sorties');
  assert.equal(entreeActive('#/sortie/abc'), 'sorties');
  assert.equal(entreeActive('#/jour/2026-11-27'), 'sorties');
  assert.equal(entreeActive('#/remorque/2026-12'), 'remorque');
  assert.equal(entreeActive('#/admin/stats'), 'admin');
  assert.equal(entreeActive('#/profil'), 'profil');
  assert.equal(entreeActive('#/personnes'), 'profil');
});
