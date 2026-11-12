import { test } from 'node:test';
import assert from 'node:assert/strict';
import { genererSorties, sortiesAAnnulerPourFermeture } from '../site/sorties/js/logique/recurrences.js';
import { fenetre } from '../site/sorties/js/logique/dates.js';

const R = { id: 'sm', nom: 'Samedi matin', jour: 5, heure: '09:00', point_rdv: 'Place de la mairie', frequence_semaines: 1, date_depart: '2026-01-03', active: true };
const RS = [1, 2, 3].map((o, i) => ({ regle_id: 'sm', ordre: o, titre: ['Cool', 'Inter', 'Sportif'][i] }));
const F = fenetre('2026-11-12');

test('3 sorties par samedi de la fenêtre', () => {
  const s = genererSorties([R], RS, [], F, new Set(), 'x');
  assert.deepEqual(s.map((x) => x.id), ['R:sm:2026-11-14:1', 'R:sm:2026-11-14:2', 'R:sm:2026-11-14:3', 'R:sm:2026-11-21:1', 'R:sm:2026-11-21:2', 'R:sm:2026-11-21:3']);
  assert.equal(s[1].titre, 'Inter');
  assert.equal(s[1].heure, '09:00');
  assert.equal(s[1].point_rdv, 'Place de la mairie');
  assert.equal(s[1].type, 'recurrente');
  assert.equal(s[1].statut, 'ouverte');
  assert.equal(s[1].regle_id, 'sm');
});

test('fréquence 2 semaines, date de départ, règle inactive', () => {
  const r = { ...R, id: 'mar', jour: 1, heure: '18:30', frequence_semaines: 2, date_depart: '2026-11-17' };
  const rs = [{ regle_id: 'mar', ordre: 1, titre: 'Nocturne' }];
  assert.deepEqual(genererSorties([r], rs, [], F, new Set(), 'x').map((x) => x.date), ['2026-11-17']);
  assert.deepEqual(genererSorties([{ ...r, date_depart: '2026-11-03' }], rs, [], F, new Set(), 'x').map((x) => x.date), ['2026-11-17']);
  assert.equal(genererSorties([{ ...r, active: false }], rs, [], F, new Set(), 'x').length, 0);
});

test('fermeture et sorties existantes ne sont pas régénérées', () => {
  const f = { id: 'f', debut: '2026-11-14', fin: '2026-11-14', regle_id: '', motif: 'Chasse' };
  const s = genererSorties([R], RS, [f], F, new Set(['R:sm:2026-11-21:1']), 'x');
  assert.deepEqual(s.map((x) => x.id), ['R:sm:2026-11-21:2', 'R:sm:2026-11-21:3']);
});

test("fermeture d'une autre règle sans effet", () => {
  const f = { id: 'f', debut: '2026-11-14', fin: '2026-11-14', regle_id: 'autre', motif: 'x' };
  assert.equal(genererSorties([R], RS, [f], F, new Set(), 'x').length, 6);
});

test('sortiesAAnnulerPourFermeture limite à la règle et à la période', () => {
  const sorties = [
    ...genererSorties([R], RS, [], F, new Set(), 'x'),
    { id: 'R:dm:2026-11-22:1', date: '2026-11-22', type: 'recurrente', statut: 'ouverte', regle_id: 'dm' },
    { id: 'libre1', date: '2026-11-21', type: 'libre', statut: 'ouverte', regle_id: '' },
  ];
  sorties[3].statut = 'annulee';
  const f = { id: 'f', debut: '2026-11-21', fin: '2026-11-22', regle_id: 'sm', motif: 'x' };
  assert.deepEqual(sortiesAAnnulerPourFermeture(f, sorties), ['R:sm:2026-11-21:2', 'R:sm:2026-11-21:3']);
  const toutes = { ...f, regle_id: '' };
  assert.deepEqual(sortiesAAnnulerPourFermeture(toutes, sorties), ['R:sm:2026-11-21:2', 'R:sm:2026-11-21:3', 'R:dm:2026-11-22:1']);
});
