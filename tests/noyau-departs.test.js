import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contexteTest } from './aides/contexte-test.js';

const ID = 'R:sm:2026-11-21:1';
const sortieDe = (t, jeton) => t.appel('calendrier', { jeton }).data.jours.flatMap((j) => j.sorties).find((s) => s.id === ID);

// Le samedi matin du 21 a un second départ, 09:30 Parking gare.
function avecDeuxDeparts() {
  const t = contexteTest();
  t.depot.modifier('Sorties', (s) => s.id === ID, { autres_departs: '09:30 Parking gare' });
  return t;
}

function adminVerifie(t) {
  const jeton = t.connecter('0611111111');
  t.depot.modifier('Jetons', (j) => j.jeton_hash === t.ctx.services.hacher(jeton), { admin_verifie: true });
  return jeton;
}

test('calendrier : chaque sortie donne ses départs, chaque inscrit son départ (le premier par défaut)', () => {
  const t = avecDeuxDeparts();
  const jeton = t.connecter('0600000002');
  const s = sortieDe(t, jeton);
  assert.deepEqual(s.departs, [{ id: 'd1', heure: '09:00', point_rdv: 'PDL' }, { id: 'd2', heure: '09:30', point_rdv: 'Parking gare' }]);
  const autre = t.appel('calendrier', { jeton }).data.jours.flatMap((j) => j.sorties).find((x) => x.id !== ID);
  assert.equal(autre.departs.length, 1);
});

test('inscription à un départ choisi ; sans départ, le premier ; départ inconnu refusé', () => {
  const t = avecDeuxDeparts();
  const ben = t.connecter('0600000002');
  const p = t.appel('calendrier', { jeton: ben }).data.personnes[0].id;
  assert.equal(t.appel('inscription', { jeton: ben, sortie_id: ID, personne_ids: [p], inscrit: true, depart_id: 'd2' }).ok, true);
  assert.equal(sortieDe(t, ben).inscrits.find((i) => i.personne_id === p).depart_id, 'd2');
  assert.equal(t.appel('inscription', { jeton: ben, sortie_id: ID, personne_ids: [p], inscrit: true, depart_id: 'd9' }).erreur, 'depart_inconnu');
  const marie = t.connecter('0600000001');
  const pm = t.appel('calendrier', { jeton: marie }).data.personnes[0].id;
  t.appel('inscription', { jeton: marie, sortie_id: ID, personne_ids: [pm], inscrit: true });
  assert.equal(sortieDe(t, ben).inscrits.find((i) => i.personne_id === pm).depart_id, 'd1');
});

test("changer de départ : une personne déjà inscrite et cochée change de départ, sans doublon ; la famille part du même départ", () => {
  const t = avecDeuxDeparts();
  const jeton = t.connecter('0611111111');
  const personnes = t.appel('calendrier', { jeton }).data.personnes.map((p) => p.id);
  assert.equal(personnes.length, 2);
  t.appel('inscription', { jeton, sortie_id: ID, personne_ids: personnes, inscrit: true, depart_id: 'd1' });
  t.appel('inscription', { jeton, sortie_id: ID, personne_ids: personnes, inscrit: true, depart_id: 'd2' });
  const miennes = sortieDe(t, jeton).inscrits.filter((i) => i.a_moi);
  assert.equal(miennes.length, 2);
  assert.ok(miennes.every((i) => i.depart_id === 'd2'));
});

test("changer l'heure d'un départ : le premier change l'heure de la sortie, un autre sa ligne ; message dans la discussion", () => {
  const t = avecDeuxDeparts();
  const jeton = adminVerifie(t);
  assert.equal(t.appel('sortie_horaire', { jeton, sortie_id: ID, depart_id: 'd2', heure: '09:45' }).ok, true);
  let s = sortieDe(t, jeton);
  assert.deepEqual(s.departs.map((d) => d.heure), ['09:00', '09:45']);
  assert.match(t.appel('discussion_lire', { jeton, sortie_id: ID }).data.at(-1).texte, /Parking gare : 09:45/);
  t.appel('sortie_horaire', { jeton, sortie_id: ID, heure: '08:45' });
  s = sortieDe(t, jeton);
  assert.deepEqual(s.departs.map((d) => d.heure), ['08:45', '09:45']);
  assert.equal(t.appel('sortie_horaire', { jeton, sortie_id: ID, depart_id: 'd5', heure: '10:00' }).erreur, 'depart_inconnu');
});

test("admin : les autres départs d'une récurrence sont enregistrés (une ligne par départ, heure normalisée) et recopiés sur les sorties générées", () => {
  const t = contexteTest();
  const jeton = adminVerifie(t);
  const d = t.appel('admin_lire', { jeton }).data;
  const regles = d.regles.map((r) => (r.id === 'dm' ? { ...r, autres_departs: ' 9:30 Parking gare\n\npas une heure\n10:00 Église' } : r));
  assert.equal(t.appel('admin_enregistrer', { jeton, regles, regle_sorties: d.regle_sorties }).ok, true);
  assert.equal(t.depot.lire('Regles').find((r) => r.id === 'dm').autres_departs, '09:30 Parking gare\n10:00 Église');
  t.depot.supprimer('Sorties', (s) => s.id === 'R:dm:2026-11-22:1');
  const s = t.appel('calendrier', { jeton }).data.jours.flatMap((j) => j.sorties).find((x) => x.id === 'R:dm:2026-11-22:1');
  assert.deepEqual(s.departs.map((x) => x.point_rdv), ['PDL', 'Parking gare', 'Église']);
});
