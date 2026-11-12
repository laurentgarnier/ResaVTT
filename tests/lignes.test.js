import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lignesEnObjets, objetsIndexes, objetEnLigne } from '../backend/noyau/lignes.js';

test('lignesEnObjets normalise vides, nombres et dates', () => {
  const o = lignesEnObjets([
    ['date', 'heure', 'telephone', 'actif', 'km'],
    [new Date(2026, 10, 14), new Date(1899, 11, 30, 9, 30), 612345678, true, 31.2],
  ]);
  assert.deepEqual(o, [{ date: '2026-11-14', heure: '09:30', telephone: '+33612345678', actif: true, km: '31.2' }]);
  assert.deepEqual(lignesEnObjets([['a', 'b'], ['', 'x'], ['', '']]), [{ a: '', b: 'x' }]);
  assert.deepEqual(lignesEnObjets([]), []);
  assert.deepEqual(lignesEnObjets([['a']]), []);
});

test('objetsIndexes donne le rang de ligne dans la feuille malgré les lignes vides', () => {
  const r = objetsIndexes([['a'], ['x'], [''], ['y']]);
  assert.deepEqual(r.map((l) => [l.rang, l.objet.a]), [[2, 'x'], [4, 'y']]);
});

test('objetEnLigne suit les en-têtes, garde les booléens, vide les absents', () => {
  assert.deepEqual(objetEnLigne(['a', 'b', 'c', 'd'], { a: 'x', b: true, d: 3 }), ['x', true, '', '3']);
});
