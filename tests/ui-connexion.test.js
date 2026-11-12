import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderConnexion } from '../site/sorties/js/ui/connexion.js';

const BANDEAU = "Vous avez installé l'appli ? Ouvrez-la depuis votre écran d'accueil. Sinon, saisissez votre numéro ci-dessous.";

test('bandeau iOS seulement en mode navigateur', () => {
  assert.ok(renderConnexion({ modeNavigateur: true }).includes(BANDEAU.replace(/'/g, '&#39;')));
  assert.ok(!renderConnexion({ modeNavigateur: false }).includes('Vous avez installé'));
});

test('indice de démo affiché quand fourni, échappé', () => {
  assert.match(renderConnexion({ modeNavigateur: false, indiceDemo: 'Démo : 06 00 <b>' }), /Démo : 06 00 &lt;b&gt;/);
  assert.doesNotMatch(renderConnexion({ modeNavigateur: false }), /class="indice"/);
});

test('message d\'erreur affiché', () => {
  assert.match(renderConnexion({ modeNavigateur: false, erreur: 'Numéro inconnu. Contactez le secrétaire.' }), /Numéro inconnu\. Contactez le secrétaire\./);
});

test('champ téléphone adapté au mobile', () => {
  assert.match(renderConnexion({}), /<input[^>]+type="tel"[^>]+autocomplete="tel"/);
});
