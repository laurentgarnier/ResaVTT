import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pire, picto, synthetiser, heureParHeure, cardinal } from '../site/sorties/js/logique/meteo.js';
import { fabriquerHoraire } from './aides/meteo.js';

test('le pire code suit la gravité, pas le numéro', () => {
  assert.equal(pire([3, 51]), 51);
  assert.equal(pire([95, 99, 61]), 99);
  assert.equal(pire([45, 61]), 61);
  assert.equal(pire([80, 65]), 65);
});

test('picto en français', () => {
  assert.deepEqual(picto(0), { emoji: '☀️', libelle: 'Ensoleillé' });
  assert.equal(picto(95).libelle, 'Orage');
});

test('synthèse matin 8–12 h et après-midi 13–18 h', () => {
  const h = fabriquerHoraire('2026-11-14', {
    8: { t: 2, p: 0, c: 0, v: 10 }, 9: { t: 3, p: 0, c: 0 }, 10: { t: 4, p: 0, c: 0 }, 11: { t: 5, p: 0, c: 0 },
    12: { t: 6, p: 30, c: 3, mm: 0.4 },
    13: { t: 9, p: 10, c: 2 }, 14: { t: 9, p: 10, c: 2 }, 15: { t: 9, p: 10, c: 2 }, 16: { t: 9, p: 10, c: 2 }, 17: { t: 8, p: 10, c: 2 },
    18: { t: 7, p: 80, c: 61, v: 22.6 }, 19: { t: 5, p: 100, c: 95 },
  });
  const s = synthetiser(h, '2026-11-14');
  assert.deepEqual([s.matin.tmin, s.matin.tmax, s.matin.pluie_proba, s.matin.code, s.matin.vent_max, s.matin.pluie_mm], [2, 6, 30, 3, 10, 0.4]);
  assert.equal(s.apres_midi.code, 61);
  assert.equal(s.apres_midi.vent_max, 23);
  assert.equal(s.apres_midi.emoji, '🌧');
});

test('jour hors horizon → null', () => {
  const s = synthetiser(fabriquerHoraire('2026-11-14', {}), '2026-12-01');
  assert.equal(s.matin, null);
  assert.equal(s.apres_midi, null);
});

test('heureParHeure : 16 entrées de 06 à 21', () => {
  const l = heureParHeure(fabriquerHoraire('2026-11-14', { 6: { t: 1, p: 5, c: 45 } }), '2026-11-14');
  assert.equal(l.length, 16);
  assert.equal(l[0].heure, '06');
  assert.equal(l[15].heure, '21');
  assert.deepEqual([l[0].temp, l[0].pluie_proba, l[0].code, l[0].emoji], [1, 5, 45, '🌫']);
});

test('heureParHeure : précipitations de chaque heure en mm, arrondies au dixième', () => {
  const l = heureParHeure(fabriquerHoraire('2026-11-14', { 7: { t: 1, p: 60, c: 61, mm: 1.26 } }), '2026-11-14');
  assert.equal(l[1].pluie_mm, 1.3);
  assert.equal(l[0].pluie_mm, 0);
});

test('cardinal : direction d\'où vient le vent, en 8 secteurs à la française', () => {
  assert.deepEqual([0, 44, 46, 90, 135, 180, 225, 250, 270, 315, 350].map(cardinal), ['N', 'NE', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'O', 'NO', 'N']);
});

test('synthèse : orientation du vent prise à l\'heure du vent le plus fort de la plage', () => {
  const h = fabriquerHoraire('2026-11-14', { 9: { t: 5, p: 0, c: 0, v: 8, d: 90 }, 10: { t: 5, p: 0, c: 0, v: 21, d: 225 }, 11: { t: 5, p: 0, c: 0, v: 12, d: 180 } });
  const s = synthetiser(h, '2026-11-14');
  assert.equal(s.matin.vent_max, 21);
  assert.equal(s.matin.vent_dir, 225);
  assert.equal(s.matin.vent_cardinal, 'SO');
});

test('heureParHeure : vent de chaque heure en km/h avec son orientation', () => {
  const l = heureParHeure(fabriquerHoraire('2026-11-14', { 6: { t: 1, p: 0, c: 0, v: 14.6, d: 315 } }), '2026-11-14');
  assert.deepEqual([l[0].vent, l[0].vent_dir, l[0].vent_cardinal], [15, 315, 'NO']);
});

test('ancienne météo en cache sans direction : pas d\'orientation, pas d\'erreur', () => {
  const h = fabriquerHoraire('2026-11-14', { 9: { t: 5, p: 0, c: 0, v: 8 } });
  delete h.wind_direction_10m;
  const s = synthetiser(h, '2026-11-14');
  assert.equal(s.matin.vent_cardinal, '');
  assert.equal(heureParHeure(h, '2026-11-14')[0].vent_cardinal, '');
});
