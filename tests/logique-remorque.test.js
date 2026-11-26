import { test } from 'node:test';
import assert from 'node:assert/strict';
import { semainesDuMois, periodeDuJour, moisVoisin, libelleMois } from '../site/sorties/js/logique/remorque.js';

test('semaines du mois : lundi → dimanche, cases vides hors du mois', () => {
  const s = semainesDuMois('2026-11'); // 1er novembre 2026 : un dimanche
  assert.equal(s.length, 6);
  assert.deepEqual(s[0], [null, null, null, null, null, null, '2026-11-01']);
  assert.deepEqual(s[1][0], '2026-11-02');
  assert.deepEqual(s.at(-1), ['2026-11-30', null, null, null, null, null, null]);
  const fevrier = semainesDuMois('2027-02'); // 1er février 2027 : un lundi, 28 jours
  assert.equal(fevrier.length, 4);
  assert.equal(fevrier[0][0], '2027-02-01');
  assert.equal(fevrier[3][6], '2027-02-28');
});

test('période du jour : bornes incluses, la plus contraignante en premier', () => {
  const periodes = [
    { id: 'a', debut: '2026-11-20', fin: '2026-11-22', statut: 'demandee' },
    { id: 'b', debut: '2026-11-25', fin: '2026-11-25', statut: 'validee' },
  ];
  assert.equal(periodeDuJour('2026-11-20', periodes).id, 'a');
  assert.equal(periodeDuJour('2026-11-22', periodes).id, 'a');
  assert.equal(periodeDuJour('2026-11-23', periodes), null);
  assert.equal(periodeDuJour('2026-11-25', periodes).id, 'b');
});

test('mois voisins sans limite, libellé français', () => {
  assert.equal(moisVoisin('2026-12', 1), '2027-01');
  assert.equal(moisVoisin('2026-01', -1), '2025-12');
  assert.equal(moisVoisin('2031-06', 0), '2031-06');
  assert.equal(libelleMois('2026-11'), 'Novembre 2026');
});
