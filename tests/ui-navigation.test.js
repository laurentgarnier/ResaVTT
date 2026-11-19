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

test('calendrier à l\'écran : relu toutes les 30 s, seulement visible, connecté, sur un écran de calendrier, et pas s\'il vient d\'être reçu', async () => {
  const { doitRelireCalendrier, INTERVALLE_CALENDRIER_MS } = await import('../site/sorties/js/ui/navigation.js');
  assert.equal(INTERVALLE_CALENDRIER_MS, 30000);
  const base = { visible: true, connecte: true, hash: '#/', recuIlYa: 31000 };
  assert.equal(doitRelireCalendrier(base), true);
  assert.equal(doitRelireCalendrier({ ...base, hash: '#/jour/2026-11-21' }), true);
  assert.equal(doitRelireCalendrier({ ...base, hash: '' }), true);
  assert.equal(doitRelireCalendrier({ ...base, visible: false }), false);
  assert.equal(doitRelireCalendrier({ ...base, connecte: false }), false);
  assert.equal(doitRelireCalendrier({ ...base, hash: '#/creer/2026-11-21' }), false, 'formulaire : jamais reconstruit');
  assert.equal(doitRelireCalendrier({ ...base, hash: '#/admin' }), false);
  assert.equal(doitRelireCalendrier({ ...base, recuIlYa: 5000 }), false, 'reçu il y a 5 s (action, retour dans l\'appli)');
});

test('calendrier relu : redessiné seulement si les jours ont changé (inscriptions, sorties)', async () => {
  const { calendrierAChange } = await import('../site/sorties/js/ui/navigation.js');
  const jours = [{ date: '2026-11-21', sorties: [{ id: 's1', inscrits: [{ personne_id: 'p1' }, { personne_id: 'p2' }] }] }];
  const copie = JSON.parse(JSON.stringify(jours));
  assert.equal(calendrierAChange({ jours }, { jours: copie }), false);
  copie[0].sorties[0].inscrits.pop();
  assert.equal(calendrierAChange({ jours }, { jours: copie }), true);
  assert.equal(calendrierAChange(null, { jours }), true);
});
