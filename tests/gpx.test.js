import { test } from 'node:test';
import assert from 'node:assert/strict';
import { statsTrace } from '../site/sorties/js/logique/gpx.js';
import { TRACES_DEMO } from '../backend/noyau/traces-demo.js';

test("un degré de latitude ≈ 111,2 km", () => {
  assert.equal(statsTrace([[48, 2, null], [49, 2, null]]).km, 111.2);
});

test('D+ ignore les variations de 2 m ou moins', () => {
  const p = [[48, 2, 100], [48, 2.001, 101], [48, 2.002, 103], [48, 2.003, 110], [48, 2.004, 104], [48, 2.005, 107]];
  assert.equal(statsTrace(p).dplus, 13);
});

test('statsTrace sans altitude ni second point', () => {
  assert.deepEqual(statsTrace([[48, 2, null]]), { km: 0, dplus: 0 });
  assert.deepEqual(statsTrace([]), { km: 0, dplus: 0 });
});

test('les traces de démo font entre 15 et 60 km', () => {
  const noms = Object.keys(TRACES_DEMO);
  assert.deepEqual(noms.sort(), ['boucle-foret.gpx', 'inter-rocher.gpx', 'variante-courte.gpx']);
  for (const nom of noms) {
    const pts = [...TRACES_DEMO[nom].matchAll(/<trkpt lat="([\d.-]+)" lon="([\d.-]+)"><ele>([\d.-]+)<\/ele>/g)].map((m) => [+m[1], +m[2], +m[3]]);
    assert.ok(pts.length >= 100, nom);
    const { km, dplus } = statsTrace(pts);
    assert.ok(km > 15 && km < 60, `${nom} : ${km} km`);
    assert.ok(dplus > 50, `${nom} : ${dplus} m`);
  }
});
