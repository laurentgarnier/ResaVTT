import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contexteTest } from './aides/contexte-test.js';
import { ticNoyau } from '../backend/noyau/automate.js';
import { migrerRappels } from '../backend/noyau/rappels.js';

const objets = (mails) => mails.map((m) => m.objet);

function adminVerifie(t) {
  const jeton = t.connecter('0611111111');
  t.depot.modifier('Jetons', (j) => j.jeton_hash === t.ctx.services.hacher(jeton), { admin_verifie: true });
  return jeton;
}

function compterMeteo(t) {
  const appels = [];
  t.ctx.services.http = (url) => { appels.push(url); return { hourly: null }; };
  return appels;
}

test('tic jeudi 18:05 (démo) : un seul rappel « Week-end », samedi matin et après-midi listés, dimanche annulé absent ; pas renvoyé au tic suivant', () => {
  const t = contexteTest({ maintenant: new Date(2026, 10, 12, 18, 5) });
  t.depot.modifier('Parametres', (l) => l.cle === 'url_appli', { valeur: 'https://club.example.org/sorties/' }) || t.depot.ajouter('Parametres', [{ cle: 'url_appli', valeur: 'https://club.example.org/sorties/' }]);
  ticNoyau(t.ctx);
  assert.deepEqual(objets(t.mails), ['Sorties VTT : les inscriptions du week-end sont ouvertes', 'À poster sur WhatsApp']);
  const texte = t.mails[0].texte;
  assert.match(texte, /^Les sorties du week-end sont ouvertes !/);
  assert.match(texte, /#\/sortie\/R%3Asm%3A2026-11-14%3A1/);
  assert.match(texte, /#\/sortie\/R%3Asa%3A2026-11-14%3A1/);
  assert.doesNotMatch(texte, /Dimanche matin/);
  assert.ok(t.depot.lire('Envois').some((e) => e.cle === 'rappel:G:g-weekend:2026-11-12'));
  t.regler(new Date(2026, 10, 12, 19, 5));
  ticNoyau(t.ctx);
  assert.equal(t.mails.length, 2);
});

test("tic : la météo est demandée une seule fois même si deux rappels sont dus, et pas du tout si aucun ne l'est", () => {
  const t = contexteTest({ maintenant: new Date(2026, 10, 12, 18, 5) });
  t.depot.modifier('Rappels', (g) => g.id === 'g-weekend', { actif: false }); // samedi matin et après-midi : rappels individuels du jeudi
  const appels = compterMeteo(t);
  ticNoyau(t.ctx);
  assert.equal(appels.length, 1);
  assert.deepEqual(objets(t.mails), ['Sorties VTT : Samedi matin', 'À poster sur WhatsApp', 'Sorties VTT : Samedi après-midi', 'À poster sur WhatsApp']);
  const avant = contexteTest({ maintenant: new Date(2026, 10, 12, 17, 0) });
  const aucun = compterMeteo(avant);
  ticNoyau(avant.ctx);
  assert.equal(aucun.length, 0);
  assert.equal(avant.mails.length, 0);
});

test("tic : rappel individuel d'une récurrence du mercredi réglé le lundi 18:00, mail seul", () => {
  const t = contexteTest({ maintenant: new Date(2026, 10, 12, 20, 0) });
  const jeton = adminVerifie(t);
  const d = t.appel('admin_lire', { jeton }).data;
  const mercredi = { nom: 'Mercredi soir', jour: '2', heure: '18:30', point_rdv: 'PDL', frequence_semaines: '1', date_depart: '2026-11-16', active: true,
    rappel_actif: true, rappel_jour: '0', rappel_heure: '18:00', rappel_mail: true, rappel_whatsapp: false, rappel_objet: 'Sorties VTT : {{nom}}', rappel_texte: '{{liste_sorties}}' };
  const r = t.appel('admin_enregistrer', { jeton, regles: [...d.regles, mercredi], regle_sorties: [...d.regle_sorties, { regle_id: '__nouvelle_0', ordre: '1', titre: 'Nocturne' }] });
  assert.equal(r.ok, true, JSON.stringify(r));
  const avant = t.mails.length;
  t.regler(new Date(2026, 10, 16, 18, 5));
  ticNoyau(t.ctx);
  const nouveaux = t.mails.slice(avant);
  assert.deepEqual(objets(nouveaux), ['Sorties VTT : Mercredi soir']);
  assert.match(nouveaux[0].texte, /^🚵 Mercredi 18 novembre 18:30 – Nocturne \(PDL\)/);
});

function ancienClasseur(t, { corps, whatsapp } = {}) {
  t.depot.supprimer('Rappels', () => true);
  t.depot.supprimer('Parametres', (l) => l.cle === 'rappels_migres');
  const vides = { rappel_actif: '', rappel_jour: '', rappel_heure: '', rappel_mail: '', rappel_whatsapp: '', rappel_objet: '', rappel_texte: '' };
  t.depot.modifier('Regles', () => true, vides);
  t.depot.ajouter('Regles', [{ id: 'me', nom: 'Mercredi soir', jour: '2', heure: '18:30', point_rdv: 'PDL', frequence_semaines: '1', date_depart: '2026-11-16', active: true, ...vides }]);
  t.depot.ajouter('Parametres', [{ cle: 'rappel_jour', valeur: '4' }, { cle: 'rappel_heure', valeur: '19:00' }]);
  if (corps) t.depot.ajouter('Modeles', [{ cle: 'rappel_mail_corps', valeur: corps }]);
  if (whatsapp) t.depot.ajouter('Modeles', [{ cle: 'rappel_whatsapp', valeur: whatsapp }]);
}

test('migrerRappels : ancien classeur → groupe Week-end sur les récurrences du samedi et du dimanche, autres jours en rappel individuel désactivé ; idempotent', () => {
  const t = contexteTest();
  ancienClasseur(t);
  migrerRappels(t.ctx);
  const groupes = t.depot.lire('Rappels');
  assert.equal(groupes.length, 1);
  const g = groupes[0];
  assert.deepEqual([g.nom, String(g.jour), g.heure, g.regle_ids], ['Week-end', '4', '19:00', 'sm,sa,dm']);
  assert.match(g.texte, /^Les sorties du week-end sont ouvertes !\n\{\{liste_sorties\}\}/);
  assert.equal(g.objet, 'Sorties VTT : les inscriptions du week-end sont ouvertes');
  const regles = Object.fromEntries(t.depot.lire('Regles').map((r) => [r.id, r]));
  assert.equal(String(regles.sm.rappel_actif), 'true');
  assert.equal(String(regles.sm.rappel_jour), '3');
  assert.equal(String(regles.me.rappel_actif), 'false');
  assert.equal(String(regles.me.rappel_jour), '0');
  migrerRappels(t.ctx);
  assert.equal(t.depot.lire('Rappels').length, 1);
  assert.ok(t.depot.lire('Parametres').some((l) => l.cle === 'rappels_migres' && l.valeur === 'oui'));
});

test('migrerRappels : texte personnalisé repris sans les liens samedi/dimanche, liste ajoutée ; texte WhatsApp différent → ligne Journal', () => {
  const t = contexteTest();
  const journal = [];
  t.ctx.journal = (type, detail) => journal.push([type, detail]);
  ancienClasseur(t, { corps: 'Roulez !\n🚵 Samedi : {{lien_samedi}}\n🚵 Dimanche : {{lien_dimanche}}\nInfos : {{lien}}', whatsapp: 'Autre texte' });
  migrerRappels(t.ctx);
  assert.equal(t.depot.lire('Rappels')[0].texte, 'Roulez !\nInfos : {{lien}}\n{{liste_sorties}}');
  assert.ok(journal.some(([type, detail]) => type === 'rappels' && /WhatsApp/.test(detail)), JSON.stringify(journal));
});

test('admin_enregistrer rappels : deux groupes sur la même récurrence → champs_invalides ; id de récurrence inconnu → ignoré', () => {
  const t = contexteTest();
  const jeton = adminVerifie(t);
  const g = (id, regle_ids) => ({ id, nom: id, regle_ids, jour: '3', heure: '18:00', mail: true, whatsapp: true, actif: true, objet: 'o', texte: '{{liste_sorties}}' });
  const doublon = t.appel('admin_enregistrer', { jeton, rappels: [g('a', ['sm', 'sa']), g('b', ['sa'])] });
  assert.equal(doublon.erreur, 'champs_invalides');
  assert.match(doublon.message, /Samedi après-midi/);
  assert.equal(t.appel('admin_enregistrer', { jeton, rappels: [g('a', ['sm', 'inconnue'])] }).ok, true);
  const d = t.appel('admin_lire', { jeton }).data;
  assert.deepEqual(d.rappels.map((x) => [x.id, x.regle_ids, x.actif, x.mail]), [['a', ['sm'], true, true]]);
  assert.equal(t.appel('admin_enregistrer', { jeton, rappels: [{ ...g('c', ['sm']), mail: false, whatsapp: false }] }).erreur, 'champs_invalides');
});

test("admin_lire : règles avec leurs réglages de rappel en booléens ; nouvelle règle sans réglage → rappel par défaut", () => {
  const t = contexteTest();
  const jeton = adminVerifie(t);
  const d = t.appel('admin_lire', { jeton }).data;
  const sm = d.regles.find((r) => r.id === 'sm');
  assert.deepEqual([sm.rappel_actif, sm.rappel_jour, sm.rappel_heure, sm.rappel_mail, sm.rappel_whatsapp], [true, '3', '18:00', true, true]);
  t.appel('admin_enregistrer', { jeton, regles: [...d.regles, { nom: 'Mardi', jour: '1', heure: '18:30', point_rdv: 'PDL', frequence_semaines: '1', date_depart: '2026-11-16', active: true }], regle_sorties: d.regle_sorties });
  const mardi = t.appel('admin_lire', { jeton }).data.regles.find((r) => r.nom === 'Mardi');
  assert.deepEqual([mardi.rappel_actif, mardi.rappel_jour, mardi.rappel_heure], [true, '6', '18:00']);
  const invalide = t.appel('admin_enregistrer', { jeton, regles: d.regles.map((r) => (r.id === 'sm' ? { ...r, rappel_heure: '25:00' } : r)), regle_sorties: d.regle_sorties });
  assert.equal(invalide.erreur, 'champs_invalides');
});

test('rappel_envoyer_maintenant : envoie un rappel individuel même couvert par un groupe ; renvoie nb_sorties', () => {
  const t = contexteTest();
  const jeton = adminVerifie(t);
  const avant = t.mails.length;
  const r = t.appel('rappel_envoyer_maintenant', { jeton, type: 'R', id: 'sm' });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.data.nb_sorties, 1);
  assert.deepEqual(objets(t.mails.slice(avant)), ['Sorties VTT : Samedi matin', 'À poster sur WhatsApp']);
  assert.ok(t.depot.lire('Envois').some((e) => e.cle.startsWith('rappel-manuel:R:sm:')));
  assert.equal(t.appel('rappel_envoyer_maintenant', { jeton, type: 'G', id: 'g-weekend' }).data.nb_sorties, 2);
  assert.equal(t.appel('rappel_envoyer_maintenant', { jeton, type: 'G', id: 'inconnu' }).erreur, 'introuvable');
});
