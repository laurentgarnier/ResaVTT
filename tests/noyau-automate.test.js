import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contexteTest, PORTEUR } from './aides/contexte-test.js';
import { ticNoyau } from '../backend/noyau/automate.js';

const objets = (mails) => mails.map((m) => m.objet);

function adminVerifie(t) {
  const jeton = t.connecter('0611111111');
  t.depot.modifier('Jetons', (j) => j.jeton_hash === t.ctx.services.hacher(jeton), { admin_verifie: true });
  return jeton;
}

test('fermeture du samedi suivant → 2 sorties annulées, un seul mail liste et un seul mail WhatsApp au tic', () => {
  const t = contexteTest({ maintenant: new Date(2026, 10, 12, 10, 0) });
  const jeton = adminVerifie(t);
  const d = t.appel('admin_lire', { jeton }).data;
  t.appel('admin_enregistrer', { jeton, fermetures: [...d.fermetures, { debut: '2026-11-21', fin: '2026-11-21', regle_id: '', motif: 'Vacances' }] });
  const annulees = t.depot.lire('Sorties').filter((s) => s.date === '2026-11-21' && s.statut === 'annulee');
  assert.equal(annulees.length, 2);
  assert.ok(annulees.every((s) => s.motif_annulation === 'Vacances'));
  ticNoyau(t.ctx);
  const annulation = t.mails.filter((m) => /annul/i.test(m.texte));
  assert.equal(annulation.length, 2);
  assert.equal(annulation[0].destinataires, PORTEUR.email);
  assert.equal(annulation[0].objet, 'Sorties VTT : annulation');
  assert.equal((annulation[0].texte.match(/^• /gm) || []).length, 2);
  assert.match(annulation[0].texte, /• Samedi 21 novembre 09:00 – Samedi matin \(Vacances\)/);
  assert.equal(annulation[1].objet, 'À poster sur WhatsApp');
  const n = t.mails.length;
  ticNoyau(t.ctx);
  assert.equal(t.mails.length, n);
  const msgs = t.appel('discussion_lire', { jeton, sortie_id: 'R:sm:2026-11-21:1' }).data;
  assert.equal(msgs.at(-1).texte, 'Sortie annulée : Vacances.');
});

test('rappel dû jeudi 18:00 : mail liste + mail WhatsApp avec lien wa.me/33611111111 ; pas renvoyé au tic suivant', () => {
  const t = contexteTest({ maintenant: new Date(2026, 10, 12, 18, 5) });
  ticNoyau(t.ctx);
  assert.deepEqual(objets(t.mails), ['Sorties VTT : les inscriptions du week-end sont ouvertes', 'À poster sur WhatsApp']);
  assert.match(t.mails[1].html, /https:\/\/wa\.me\/33611111111\?text=/);
  assert.ok(t.mails.every((m) => m.destinataires === PORTEUR.email));
  t.regler(new Date(2026, 10, 12, 19, 5));
  ticNoyau(t.ctx);
  assert.equal(t.mails.length, 2);
});

test('rappel non dû mercredi 18:00 ni jeudi 17:00', () => {
  const mercredi = contexteTest({ maintenant: new Date(2026, 10, 11, 18, 0) });
  ticNoyau(mercredi.ctx);
  assert.equal(mercredi.mails.length, 0);
  const jeudi = contexteTest({ maintenant: new Date(2026, 10, 12, 17, 0) });
  ticNoyau(jeudi.ctx);
  assert.equal(jeudi.mails.length, 0);
});

test('tic reprend un envoi échoué sans doublon', () => {
  const t = contexteTest({ maintenant: new Date(2026, 10, 12, 18, 0) });
  t.echouerMailSi((m) => m.objet === 'À poster sur WhatsApp');
  ticNoyau(t.ctx);
  assert.deepEqual(objets(t.mails), ['Sorties VTT : les inscriptions du week-end sont ouvertes']);
  let envoi = t.depot.lire('Envois').find((e) => e.cle === 'rappel:2026-11-12');
  assert.deepEqual([envoi.etape_mail, envoi.etape_whatsapp, envoi.tentatives], ['ok', '', '1']);
  assert.match(envoi.derniere_erreur, /échec mail simulé/);

  t.regler(new Date(2026, 10, 12, 19, 0));
  ticNoyau(t.ctx);
  t.regler(new Date(2026, 10, 12, 20, 0));
  ticNoyau(t.ctx);
  const alertes = t.mails.filter((m) => m.objet.startsWith('Sorties VTT : échec'));
  assert.equal(alertes.length, 1);
  assert.equal(alertes[0].destinataires, PORTEUR.email);
  assert.match(alertes[0].texte, /rappel:2026-11-12/);

  t.echouerMailSi(null);
  t.regler(new Date(2026, 10, 12, 21, 0));
  ticNoyau(t.ctx);
  assert.equal(t.mails.filter((m) => m.objet === 'Sorties VTT : les inscriptions du week-end sont ouvertes').length, 1);
  assert.equal(t.mails.filter((m) => m.objet === 'À poster sur WhatsApp').length, 1);
  envoi = t.depot.lire('Envois').find((e) => e.cle === 'rappel:2026-11-12');
  assert.deepEqual([envoi.etape_mail, envoi.etape_whatsapp], ['ok', 'ok']);
});

test('purge : sortie de plus de 12 mois supprimée avec ses inscriptions', () => {
  const t = contexteTest({ maintenant: new Date(2026, 10, 12, 4, 0) });
  t.depot.ajouter('Sorties', [{ id: 'vieille', date: '2025-10-01', heure: '09:00', titre: 'Ancienne', type: 'libre', statut: 'ouverte', createur_tel: '+33600000003' }]);
  t.depot.ajouter('Inscriptions', [{ sortie_id: 'vieille', personne_id: 'p-ludo', nom_affiche: 'Ludo', telephone: '+33600000003', horodatage: '2025-09-30T10:00:00' }]);
  t.depot.ajouter('Discussions', [{ id: 'mv', sortie_id: 'vieille', auteur_nom: 'Ludo', telephone: '+33600000003', texte: 'x', horodatage: '2025-09-30T10:00:00' }]);
  ticNoyau(t.ctx);
  assert.ok(!t.depot.lire('Sorties').some((s) => s.id === 'vieille'));
  assert.ok(!t.depot.lire('Inscriptions').some((i) => i.sortie_id === 'vieille'));
  assert.ok(!t.depot.lire('Discussions').some((m) => m.sortie_id === 'vieille'));
  assert.ok(t.depot.lire('Sorties').some((s) => s.id === 'R:sm:2026-11-14:1'));
});

test("purge : numéro d'un adhérent inactif effacé, jetons et personnes supprimés", () => {
  const t = contexteTest({ maintenant: new Date(2026, 10, 12, 4, 0) });
  t.connecter('0600000002');
  t.adherents.find((a) => a.nom === 'Ben').actif = false;
  ticNoyau(t.ctx);
  assert.ok(!t.depot.lire('Jetons').some((j) => j.telephone === '+33600000002'));
  assert.ok(!t.depot.lire('Personnes').some((p) => p.telephone === '+33600000002'));
  assert.ok(!JSON.stringify(t.depot.lire('Discussions')).includes('+33600000002'));
  assert.ok(t.depot.lire('Discussions').some((m) => m.auteur_nom === 'Ben'));
});

test("purge : si la liste des adhérents est vide ou illisible, personne n'est effacé", () => {
  const t = contexteTest({ maintenant: new Date(2026, 10, 12, 4, 0) });
  t.connecter('0600000002');
  const personnesAvant = t.depot.lire('Personnes').length;
  t.adherents.splice(0, t.adherents.length);
  ticNoyau(t.ctx);
  assert.equal(t.depot.lire('Personnes').length, personnesAvant);
  assert.equal(t.depot.lire('Jetons').length, 1);
  assert.ok(JSON.stringify(t.depot.lire('Inscriptions')).includes('+336'));
});

test("purge : si plus d'un adhérent sur cinq disparaît d'un coup, la purge des départs est suspendue", () => {
  const t = contexteTest({ maintenant: new Date(2026, 10, 12, 4, 0) });
  for (const a of t.adherents.slice(0, 15)) a.actif = false;
  ticNoyau(t.ctx);
  assert.ok(t.depot.lire('Personnes').some((p) => p.telephone === '+33600000001'));
});
