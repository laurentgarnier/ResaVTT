import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normaliserTelephone } from '../site/sorties/js/logique/telephone.js';

test('formes françaises équivalentes', () => {
  for (const s of ['06 12 34 56 78', '0612345678', '+33 6 12 34 56 78', '0033612345678', '06.12.34.56.78'])
    assert.equal(normaliserTelephone(s), '+33612345678');
});

test('numéro invalide', () => {
  assert.equal(normaliserTelephone('123'), null);
  assert.equal(normaliserTelephone(''), null);
  assert.equal(normaliserTelephone(null), null);
  assert.equal(normaliserTelephone('0012345678'), null);
});
