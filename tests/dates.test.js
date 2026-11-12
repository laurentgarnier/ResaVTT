import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fenetre, jourSemaine, semainesEntre, creneau, estPasse, lundiDe, ajouterJours, aujourdhuiLocal, libelleJour } from '../site/sorties/js/logique/dates.js';

test('fenetre part du lundi et dure 14 jours', () => {
  const f = fenetre('2026-11-12');
  assert.equal(f.length, 14);
  assert.equal(f[0], '2026-11-09');
  assert.equal(f[13], '2026-11-22');
});

test("fenetre traverse le changement d'heure et la fin d'année", () => {
  assert.deepEqual(fenetre('2026-10-25').slice(0, 2), ['2026-10-19', '2026-10-20']);
  assert.equal(fenetre('2026-12-31')[13], '2027-01-10');
  assert.equal(new Set(fenetre('2026-10-25')).size, 14);
});

test('jourSemaine, semainesEntre, creneau', () => {
  assert.equal(jourSemaine('2026-11-14'), 5);
  assert.equal(jourSemaine('2026-11-09'), 0);
  assert.equal(semainesEntre('2026-11-07', '2026-11-21'), 2);
  assert.equal(creneau('12:59'), 'matin');
  assert.equal(creneau('13:00'), 'apres_midi');
});

test('estPasse compare date et heure locales', () => {
  const m = new Date(2026, 10, 14, 9, 1);
  assert.equal(estPasse('2026-11-14', '09:00', m), true);
  assert.equal(estPasse('2026-11-14', '09:30', m), false);
});

test('lundiDe, ajouterJours, aujourdhuiLocal, libelleJour', () => {
  assert.equal(lundiDe('2026-11-15'), '2026-11-09');
  assert.equal(ajouterJours('2026-02-28', 1), '2026-03-01');
  assert.equal(aujourdhuiLocal(new Date(2026, 0, 5, 23, 30)), '2026-01-05');
  assert.equal(libelleJour('2026-11-14'), 'Samedi 14 novembre');
});
