import { test } from 'node:test';
import assert from 'node:assert/strict';
import { codeCourt, lienSortie, idDuCodeCourt } from '../site/sorties/js/logique/liens.js';
import { contexteTest } from './aides/contexte-test.js';

test('code court : 6 caractères (chiffres et minuscules), toujours le même pour une sortie', () => {
  const c = codeCourt('R:sm:2026-11-21:1');
  assert.match(c, /^[0-9a-z]{6}$/);
  assert.equal(codeCourt('R:sm:2026-11-21:1'), c);
  assert.notEqual(codeCourt('R:sm:2026-11-28:1'), c);
});

test('code court : aucune collision entre les sorties du jeu de démonstration et sur un an de récurrences', () => {
  const t = contexteTest();
  const ids = t.depot.lire('Sorties').map((s) => s.id);
  for (let j = 0; j < 365; j++) for (const r of ['sm', 'sa', 'dm']) ids.push(`R:${r}:${j}:1`);
  assert.equal(new Set(ids.map(codeCourt)).size, new Set(ids).size);
});

test("lien d'une sortie : court, sans identifiant encodé ; vide sans adresse de l'appli", () => {
  const l = lienSortie('https://club.example.org/sorties', 'R:sm:2026-11-21:1');
  assert.equal(l, `https://club.example.org/sorties/#/s/${codeCourt('R:sm:2026-11-21:1')}`);
  assert.ok(!l.includes('%'));
  assert.equal(lienSortie('', 'x'), '');
});

test('code court reçu : retrouve la sortie du calendrier, sinon rien', () => {
  const jours = [{ sorties: [{ id: 'a' }, { id: 'R:sm:2026-11-21:1' }] }, { sorties: [] }];
  assert.equal(idDuCodeCourt(jours, codeCourt('R:sm:2026-11-21:1')), 'R:sm:2026-11-21:1');
  assert.equal(idDuCodeCourt(jours, 'zzzzzz'), null);
});
