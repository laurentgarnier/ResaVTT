import { test } from 'node:test';
import assert from 'node:assert/strict';
import { peutModifier, peutChangerHoraire, inscriptionsOuvertes } from '../site/sorties/js/logique/droits.js';

const ben = { telephone: '+33600000002', est_admin: false, admin_verifie: false };
const adminNonVerifie = { telephone: '+33600000001', est_admin: true, admin_verifie: false };
const adminVerifie = { ...adminNonVerifie, admin_verifie: true };
const libreBen = { type: 'libre', statut: 'ouverte', createur_tel: '+33600000002', date: '2026-11-14', heure: '09:00' };
const libreLudo = { ...libreBen, createur_tel: '+33600000003' };
const rec = { type: 'recurrente', statut: 'ouverte', createur_tel: '', date: '2026-11-14', heure: '09:00' };

test('créateur et admin vérifié modifient ; admin non vérifié non', () => {
  assert.equal(peutModifier(libreBen, ben), true);
  assert.equal(peutModifier(libreLudo, ben), false);
  assert.equal(peutModifier(libreLudo, adminNonVerifie), false);
  assert.equal(peutModifier(libreLudo, adminVerifie), true);
  assert.equal(peutModifier(rec, ben), false);
});

test("tout adhérent change l'horaire d'une récurrente, pas d'une libre", () => {
  assert.equal(peutChangerHoraire(rec, ben), true);
  assert.equal(peutChangerHoraire(libreLudo, ben), false);
  assert.equal(peutChangerHoraire(libreBen, ben), true);
  assert.equal(peutChangerHoraire({ ...rec, statut: 'annulee' }, ben), false);
});

test('inscriptionsOuvertes fausse si annulée ou heure passée', () => {
  assert.equal(inscriptionsOuvertes(rec, new Date(2026, 10, 14, 8, 59)), true);
  assert.equal(inscriptionsOuvertes(rec, new Date(2026, 10, 14, 9, 0)), false);
  assert.equal(inscriptionsOuvertes({ ...rec, statut: 'annulee' }, new Date(2026, 10, 12)), false);
});
