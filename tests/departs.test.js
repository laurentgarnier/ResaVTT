import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lireDeparts, departsDe, libelleDeparts, departInscription } from '../site/sorties/js/logique/departs.js';
import { genererSorties } from '../site/sorties/js/logique/recurrences.js';
import { ONGLETS } from '../backend/noyau/schema.js';

test('autres départs : un par ligne « HH:MM lieu », lignes vides ou sans heure ignorées, heure normalisée', () => {
  assert.deepEqual(lireDeparts('09:30 Parking gare\n\n  9:45  Église \nsans heure\n'), [
    { heure: '09:30', point_rdv: 'Parking gare' },
    { heure: '09:45', point_rdv: 'Église' },
  ]);
  assert.deepEqual(lireDeparts(''), []);
  assert.deepEqual(lireDeparts(undefined), []);
});

test("départs d'une sortie : le premier est l'heure et le point de rendez-vous de la sortie, puis les autres (d2, d3…)", () => {
  const s = { heure: '09:00', point_rdv: 'PDL', autres_departs: '09:30 Parking gare' };
  assert.deepEqual(departsDe(s), [
    { id: 'd1', heure: '09:00', point_rdv: 'PDL' },
    { id: 'd2', heure: '09:30', point_rdv: 'Parking gare' },
  ]);
  assert.equal(libelleDeparts(s), '09:00 PDL · 09:30 Parking gare');
  assert.deepEqual(departsDe({ heure: '14:00', point_rdv: 'PDL' }), [{ id: 'd1', heure: '14:00', point_rdv: 'PDL' }]);
  assert.equal(libelleDeparts({ heure: '14:00', point_rdv: 'PDL' }), '14:00 PDL');
});

test("départ d'une inscription : vide (inscriptions d'avant) = premier départ", () => {
  assert.equal(departInscription({ depart_id: '' }), 'd1');
  assert.equal(departInscription({}), 'd1');
  assert.equal(departInscription({ depart_id: 'd2' }), 'd2');
});

test('génération : la sortie reçoit les autres départs de sa règle', () => {
  const regle = { id: 'sm', nom: 'Samedi matin', jour: '5', heure: '09:00', point_rdv: 'PDL', frequence_semaines: '1', date_depart: '2026-11-02', active: true, autres_departs: '09:30 Parking gare' };
  const [s] = genererSorties([regle], [{ regle_id: 'sm', ordre: '1', titre: 'Samedi matin' }], [], ['2026-11-21'], new Set(), 'x');
  assert.equal(s.autres_departs, '09:30 Parking gare');
  const [sans] = genererSorties([{ ...regle, autres_departs: undefined }], [{ regle_id: 'sm', ordre: '1', titre: 'Samedi matin' }], [], ['2026-11-21'], new Set(), 'x');
  assert.equal(sans.autres_departs, '');
});

test('classeur : colonnes autres_departs (Regles, Sorties) et depart_id (Inscriptions)', () => {
  assert.ok(ONGLETS.Regles.includes('autres_departs'));
  assert.ok(ONGLETS.Sorties.includes('autres_departs'));
  assert.ok(ONGLETS.Inscriptions.includes('depart_id'));
});
