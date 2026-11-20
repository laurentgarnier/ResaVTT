import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contexteTest } from './aides/contexte-test.js';

const ID = 'R:sm:2026-11-21:1'; // récurrente, aucun inscrit au départ, trace par défaut de sa règle (t-boucle-foret)
const GPX = '<?xml version="1.0"?><gpx><trk><trkseg><trkpt lat="48.4" lon="2.7"></trkpt></trkseg></trk></gpx>';
const sortieDe = (t, jeton) => t.appel('calendrier', { jeton }).data.jours.flatMap((j) => j.sorties).find((s) => s.id === ID);

function adherent(t, tel) {
  const jeton = t.connecter(tel);
  const personne = t.appel('calendrier', { jeton }).data.personnes[0].id;
  return {
    jeton,
    inscrire: (inscrit = true) => t.appel('inscription', { jeton, sortie_id: ID, personne_ids: [personne], inscrit }),
    proposer: (nom = 'boucle.gpx') => t.appel('trace_ajouter', { jeton, sortie_id: ID, nom_fichier: nom, contenu: GPX, km: '20', dplus: '300' }),
  };
}

test('proposer une trace : réservé aux inscrits, sur une sortie récurrente comme libre', () => {
  const t = contexteTest();
  const ben = adherent(t, '0600000002');
  const refus = ben.proposer();
  assert.equal(refus.ok, false);
  assert.equal(refus.erreur, 'reserve_inscrits');
  ben.inscrire();
  assert.equal(ben.proposer('a.gpx').ok, true);
  assert.equal(ben.proposer('b.gpx').ok, true, 'plusieurs traces');
  const traces = sortieDe(t, ben.jeton).traces.filter((x) => x.nom_fichier !== 'boucle-foret.gpx');
  assert.deepEqual(traces.map((x) => [x.nom_fichier, x.ajoute_par_nom, x.a_moi]), [['a.gpx', 'Ben', true], ['b.gpx', 'Ben', true]]);
});

test("retirer une trace proposée : son auteur oui, un autre inscrit non", () => {
  const t = contexteTest();
  const ben = adherent(t, '0600000002');
  const marie = adherent(t, '0600000001');
  ben.inscrire();
  marie.inscrire();
  const id = ben.proposer().data.id;
  assert.equal(sortieDe(t, marie.jeton).traces.find((x) => x.id === id).a_moi, false);
  assert.equal(t.appel('trace_supprimer', { jeton: marie.jeton, sortie_id: ID, trace_id: id }).erreur, 'interdit');
  assert.equal(t.appel('trace_supprimer', { jeton: ben.jeton, sortie_id: ID, trace_id: id }).ok, true);
});

test("désinscription : les traces restent tant qu'il reste un inscrit ; au dernier, les traces proposées sont supprimées (pas celle de la récurrence)", () => {
  const t = contexteTest();
  const ben = adherent(t, '0600000002');
  const marie = adherent(t, '0600000001');
  ben.inscrire();
  marie.inscrire();
  ben.proposer();
  const avant = t.depot.lire('Traces').find((x) => x.sortie_id === ID);
  ben.inscrire(false);
  assert.ok(t.depot.lire('Traces').some((x) => x.sortie_id === ID), 'Marie est encore inscrite');
  marie.inscrire(false);
  assert.ok(!t.depot.lire('Traces').some((x) => x.sortie_id === ID), 'plus aucun inscrit');
  assert.ok(!t.fichiers.has(avant.drive_id), 'fichier Drive supprimé');
  assert.ok(sortieDe(t, ben.jeton).traces.some((x) => x.id === 't-boucle-foret'), 'trace de la récurrence gardée');
  assert.match(t.appel('discussion_lire', { jeton: ben.jeton, sortie_id: ID }).data.at(-1).texte, /plus aucun inscrit/i);
});
