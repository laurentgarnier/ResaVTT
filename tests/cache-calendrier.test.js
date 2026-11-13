import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { enregistrerCalendrier, lireCalendrierEnCache, oublierCalendrier } from '../site/sorties/js/cache-calendrier.js';

const stockage = new Map();
globalThis.localStorage = {
  getItem: (k) => (stockage.has(k) ? stockage.get(k) : null),
  setItem: (k, v) => stockage.set(k, String(v)),
  removeItem: (k) => stockage.delete(k),
};
beforeEach(() => stockage.clear());

const cal = { aujourdhui: '2026-11-13', jours: [{ date: '2026-11-13', sorties: [] }] };

test('le dernier calendrier est relu pour la même session et le même jour', () => {
  enregistrerCalendrier(cal, 'J1');
  assert.deepEqual(lireCalendrierEnCache('J1', '2026-11-13'), cal);
});

test("rien n'est relu pour une autre session, un autre jour, ou après oubli", () => {
  enregistrerCalendrier(cal, 'J1');
  assert.equal(lireCalendrierEnCache('J2', '2026-11-13'), null);
  assert.equal(lireCalendrierEnCache('J1', '2026-11-14'), null);
  oublierCalendrier();
  assert.equal(lireCalendrierEnCache('J1', '2026-11-13'), null);
});

test('un contenu illisible ou un stockage indisponible ne bloque pas', () => {
  stockage.set('sorties-vtt-calendrier', '{pas du json');
  assert.equal(lireCalendrierEnCache('J1', '2026-11-13'), null);
  const sauve = globalThis.localStorage;
  globalThis.localStorage = { getItem() { throw new Error('bloqué'); }, setItem() { throw new Error('bloqué'); }, removeItem() { throw new Error('bloqué'); } };
  try {
    enregistrerCalendrier(cal, 'J1');
    assert.equal(lireCalendrierEnCache('J1', '2026-11-13'), null);
    oublierCalendrier();
  } finally {
    globalThis.localStorage = sauve;
  }
});
