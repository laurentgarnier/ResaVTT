import { test } from 'node:test';
import assert from 'node:assert/strict';
import { echapper, initiales, couleurAvatar } from '../site/sorties/js/logique/html.js';

test('echapper neutralise le HTML', () => {
  assert.equal(echapper(`<script>"&'`), '&lt;script&gt;&quot;&amp;&#39;');
  assert.equal(echapper(null), '');
  assert.equal(echapper(12), '12');
});

test('initiales et couleur déterministe', () => {
  assert.equal(initiales('Marie'), 'MA');
  assert.equal(initiales('Jean Dupont'), 'JD');
  assert.equal(initiales('élise'), 'ÉL');
  assert.equal(couleurAvatar('Ben'), couleurAvatar('Ben'));
  assert.match(couleurAvatar('Ben'), /^#[0-9a-f]{6}$/);
});
