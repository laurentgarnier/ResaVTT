import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reaffichageAutomatiquePermis, destinationApresConnexion } from '../site/sorties/js/ui/navigation.js';

test("retour dans l'appli : seul le calendrier est réaffiché, jamais un écran de saisie", () => {
  for (const h of ['#/', '', '#/jour/2026-11-14']) assert.equal(reaffichageAutomatiquePermis(h), true, h);
  for (const h of ['#/creer/2026-11-14', '#/modifier/x', '#/admin/messages', '#/personnes', '#/sortie/R%3Asm']) assert.equal(reaffichageAutomatiquePermis(h), false, h);
});

test("après connexion, on arrive sur l'écran demandé par le lien (jour, sortie), jamais sur la déconnexion", () => {
  assert.equal(destinationApresConnexion('#/jour/2026-11-14'), '#/jour/2026-11-14');
  assert.equal(destinationApresConnexion('#/sortie/R%3Asm%3A2026-11-14%3A1'), '#/sortie/R%3Asm%3A2026-11-14%3A1');
  assert.equal(destinationApresConnexion('#/deconnexion'), '#/');
  assert.equal(destinationApresConnexion(''), '#/');
  assert.equal(destinationApresConnexion('#/'), '#/');
});
