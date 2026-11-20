import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contexteTest } from './aides/contexte-test.js';
import { reglagesRappelDefaut, rappelsProgrammes, estDu, sortiesAAnnoncer } from '../backend/noyau/rappels.js';
import { ONGLETS } from '../backend/noyau/schema.js';

// Règle active avec un rappel individuel actif.
const r = (id, jour, autres = {}) => ({ id, nom: id, jour: String(jour), heure: '09:00', active: true, ...reglagesRappelDefaut(jour), ...autres });
const groupe = (autres = {}) => ({ id: 'g1', nom: 'Week-end', regle_ids: 'sm, sa,inconnue', jour: '3', heure: '18:00', mail: true, whatsapp: true, actif: true, objet: 'o', texte: 't', ...autres });

function sortiesDemo() {
  return contexteTest({ maintenant: new Date(2026, 10, 12, 18, 0) }).depot.lire('Sorties');
}

test('schéma : colonnes rappel_* en fin de Regles (puis autres_departs), onglet Rappels', () => {
  assert.deepEqual(ONGLETS.Regles.slice(-8), ['rappel_actif', 'rappel_jour', 'rappel_heure', 'rappel_mail', 'rappel_whatsapp', 'rappel_objet', 'rappel_texte', 'autres_departs']);
  assert.deepEqual(ONGLETS.Rappels, ['id', 'nom', 'regle_ids', 'jour', 'heure', 'mail', 'whatsapp', 'actif', 'objet', 'texte']);
});

test('rappelsProgrammes : un groupe actif remplace les rappels individuels de ses récurrences', () => {
  const p = rappelsProgrammes([r('sm', 5), r('sa', 5), r('me', 2)], [groupe()]);
  assert.deepEqual(p.map((x) => [x.type, x.id]), [['G', 'g1'], ['R', 'me']]);
  assert.deepEqual(p[0].regle_ids, ['sm', 'sa']); // l'id inconnu est ignoré
  assert.deepEqual([p[0].jour, p[0].heure, p[0].mail, p[0].whatsapp], [3, '18:00', true, true]);
  assert.deepEqual([p[1].jour, p[1].heure, p[1].regle_ids, p[1].nom], [0, '18:00', ['me'], 'me']);
});

test('rappelsProgrammes : groupe désactivé → les rappels individuels repartent ; rappel individuel désactivé → rien', () => {
  const p = rappelsProgrammes([r('sm', 5), r('sa', 5), r('me', 2, { rappel_actif: false })], [groupe({ actif: 'FALSE' })]);
  assert.deepEqual(p.map((x) => [x.type, x.id]), [['R', 'sm'], ['R', 'sa']]);
});

test('rappelsProgrammes : une récurrence inactive ne compte pas, ni seule ni dans un groupe ; groupe sans récurrence existante ignoré', () => {
  const p = rappelsProgrammes([r('sm', 5, { active: false }), r('sa', 5)], [groupe({ regle_ids: 'sm' }), groupe({ id: 'g2', regle_ids: 'disparue' })]);
  assert.deepEqual(p.map((x) => [x.type, x.id]), [['R', 'sa']]);
});

test('rappelsProgrammes : booléens venus du classeur en texte (TRUE / VRAI / FALSE)', () => {
  const p = rappelsProgrammes([r('me', 2, { rappel_actif: 'VRAI', rappel_mail: 'TRUE', rappel_whatsapp: 'FALSE' })], []);
  assert.deepEqual([p[0].mail, p[0].whatsapp], [true, false]);
});

test("estDu : le jour réglé, à partir de l'heure réglée", () => {
  const rp = { jour: 3, heure: '18:00' };
  assert.equal(estDu(rp, new Date(2026, 10, 12, 17, 59)), false);
  assert.equal(estDu(rp, new Date(2026, 10, 12, 18, 0)), true);
  assert.equal(estDu(rp, new Date(2026, 10, 13, 18, 30)), false);
});

test('sortiesAAnnoncer : prochaine date dans les 7 jours, sans les annulées ni les sorties parties', () => {
  const s = sortiesAAnnoncer(sortiesDemo(), ['sm', 'sa', 'dm'], new Date(2026, 10, 12, 18, 0));
  assert.deepEqual(s.map((x) => x.id), ['R:sm:2026-11-14:1', 'R:sa:2026-11-14:1']);
});

test('sortiesAAnnoncer : rappel le jour même après le départ → la sortie de la semaine suivante', () => {
  const s = sortiesAAnnoncer(sortiesDemo(), ['sm'], new Date(2026, 10, 14, 10, 0));
  assert.deepEqual(s.map((x) => x.id), ['R:sm:2026-11-21:1']);
});

test('sortiesAAnnoncer : plusieurs sorties par occurrence → toutes celles de la prochaine date, triées par heure', () => {
  const sorties = [
    { id: 'b', regle_id: 'x', date: '2026-11-14', heure: '09:30', statut: 'ouverte' },
    { id: 'a', regle_id: 'x', date: '2026-11-14', heure: '09:00', statut: 'ouverte' },
    { id: 'c', regle_id: 'x', date: '2026-11-21', heure: '09:00', statut: 'ouverte' },
    { id: 'd', regle_id: 'autre', date: '2026-11-13', heure: '09:00', statut: 'ouverte' },
  ];
  assert.deepEqual(sortiesAAnnoncer(sorties, ['x'], new Date(2026, 10, 12, 18, 0)).map((s) => s.id), ['a', 'b']);
  assert.deepEqual(sortiesAAnnoncer(sorties, [], new Date(2026, 10, 12, 18, 0)), []);
});

test('reglagesRappelDefaut : 2 jours avant la sortie à 18:00, mail et WhatsApp', () => {
  const d = reglagesRappelDefaut('5');
  assert.deepEqual([d.rappel_actif, d.rappel_jour, d.rappel_heure, d.rappel_mail, d.rappel_whatsapp], [true, '3', '18:00', true, true]);
  assert.equal(reglagesRappelDefaut('1').rappel_jour, '6');
  assert.match(d.rappel_texte, /\{\{liste_sorties\}\}/);
  assert.equal(d.rappel_objet, 'Sorties VTT : {{nom}}');
});
