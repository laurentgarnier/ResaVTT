import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { creerGoogleFactice } from './aides/google-factice.js';
import { scriptGasComplet } from '../outils/code-gas.js';

const codeGas = scriptGasComplet;

function installer(options) {
  const g = creerGoogleFactice(options);
  const contexte = vm.createContext({ ...g.globaux, console });
  vm.runInContext(codeGas(), contexte);
  vm.runInContext('initialiser()', contexte);
  g.classeurActif.getSheetByName('Porteur').getRange(2, 1, 1, 3).setValues([['Porteur', '06 11 11 11 11', 'porteur@example.org']]);
  vm.runInContext('chargerDonneesDemo()', contexte);
  const post = (corps) => JSON.parse(contexte.doPost({ postData: { contents: JSON.stringify(corps) } }).getContent());
  const remettreAZero = () => { g.stats.getValues = 0; g.stats.batchGet = 0; g.stats.ouvertures = {}; };
  return { g, contexte, post, remettreAZero };
}

test('calendrier : le classeur est lu en un seul appel groupé, le fichier Adhérents ouvert au plus une fois', () => {
  const { g, post, remettreAZero } = installer({ sheetsAvance: true });
  const jeton = post({ action: 'connexion', telephone: '0600000002' }).data.jeton;
  remettreAZero();
  const cal = post({ action: 'calendrier', jeton });
  assert.equal(cal.ok, true, JSON.stringify(cal));
  assert.ok(cal.data.jours.some((j) => j.sorties.length >= 2));
  assert.equal(g.stats.batchGet, 1);
  assert.ok((g.stats.ouvertures[g.proprietes.ADHERENTS_ID] || 0) <= 1, JSON.stringify(g.stats.ouvertures));
  assert.ok(g.stats.getValues <= 1, `lectures feuille à feuille : ${g.stats.getValues}`);
});

test("calendrier suivant : la liste des adhérents vient du cache, le fichier n'est pas rouvert", () => {
  const { g, post, remettreAZero } = installer({ sheetsAvance: true });
  const jeton = post({ action: 'connexion', telephone: '0600000002' }).data.jeton;
  post({ action: 'calendrier', jeton });
  remettreAZero();
  assert.equal(post({ action: 'calendrier', jeton }).ok, true);
  assert.equal(g.stats.ouvertures[g.proprietes.ADHERENTS_ID] || 0, 0);
});

test('connexion : un adhérent ajouté au fichier après la mise en cache peut se connecter tout de suite', () => {
  const { g, post } = installer({ sheetsAvance: true });
  const jeton = post({ action: 'connexion', telephone: '0600000002' }).data.jeton;
  post({ action: 'calendrier', jeton });
  const adh = g.classeursCrees[0].getSheets()[0];
  adh.getRange(adh.getLastRow() + 1, 1, 1, 5).setValues([['Nouveau', '0677777777', '', true, false]]);
  const r = post({ action: 'connexion', telephone: '0677777777' });
  assert.equal(r.ok, true, JSON.stringify(r));
});

test("sans service avancé Sheets, tout fonctionne en lecture feuille à feuille, sans relire deux fois le même onglet", () => {
  const { g, post, remettreAZero } = installer({ sheetsAvance: false });
  const jeton = post({ action: 'connexion', telephone: '0600000002' }).data.jeton;
  remettreAZero();
  const cal = post({ action: 'calendrier', jeton });
  assert.equal(cal.ok, true, JSON.stringify(cal));
  assert.ok(cal.data.jours.some((j) => j.sorties.length >= 2));
  assert.ok(g.stats.getValues <= 11, `lectures : ${g.stats.getValues}`);
});

test("écriture puis relecture dans la même requête : la relecture voit l'écriture (lecture groupée invalidée)", () => {
  const { post } = installer({ sheetsAvance: true });
  const jeton = post({ action: 'connexion', telephone: '0600000002' }).data.jeton;
  const cal = post({ action: 'calendrier', jeton }).data;
  const sortie = cal.jours.find((j) => j.sorties.length >= 2).sorties[0];
  const r = post({ action: 'inscription', jeton, sortie_id: sortie.id, personne_ids: [cal.personnes[0].id], inscrit: true, avec_calendrier: true });
  assert.equal(r.ok, true, JSON.stringify(r));
  const apres = r.calendrier.jours.flatMap((j) => j.sorties).find((s) => s.id === sortie.id);
  assert.equal(apres.inscrits.length, sortie.inscrits.length + 1);
});

test("tic lit la liste des adhérents à la source (la purge ne se fie pas au cache)", () => {
  const { g, contexte, post, remettreAZero } = installer({ sheetsAvance: true });
  const jeton = post({ action: 'connexion', telephone: '0600000002' }).data.jeton;
  post({ action: 'calendrier', jeton });
  remettreAZero();
  vm.runInContext('tic()', contexte);
  assert.ok((g.stats.ouvertures[g.proprietes.ADHERENTS_ID] || 0) >= 1);
});

test("classeur d'avant l'onglet Bilan : l'onglet manquant est créé tout seul, la lecture groupée reprend dès l'appel suivant", () => {
  const { g, post, remettreAZero } = installer({ sheetsAvance: true });
  g.classeurActif.deleteSheet(g.classeurActif.getSheetByName('Bilan'));
  const jeton = post({ action: 'connexion', telephone: '0600000002' }).data.jeton;
  assert.equal(post({ action: 'calendrier', jeton }).ok, true);
  const bilan = g.classeurActif.getSheetByName('Bilan');
  assert.ok(bilan, 'onglet Bilan recréé');
  assert.deepEqual(bilan.getRange(1, 1, 1, 5).getValues()[0], ['sortie_id', 'date', 'heure', 'statut', 'participants']);
  remettreAZero();
  assert.equal(post({ action: 'calendrier', jeton }).ok, true);
  assert.equal(g.stats.batchGet, 1);
  assert.ok(g.stats.getValues <= 1, `lectures feuille à feuille : ${g.stats.getValues}`);
});
