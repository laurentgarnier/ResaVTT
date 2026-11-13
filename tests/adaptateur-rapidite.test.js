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
  g.cache.delete('donnees'); // cache des données vide : on mesure la vraie lecture
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

test("classeur d'une version précédente : un onglet manquant est créé tout seul, la lecture groupée reprend dès l'appel suivant", () => {
  const { g, post } = installer({ sheetsAvance: true });
  g.classeurActif.deleteSheet(g.classeurActif.getSheetByName('Fermetures'));
  g.classeurActif.deleteSheet(g.classeurActif.getSheetByName('Bilan'));
  const jeton = post({ action: 'connexion', telephone: '0600000002' }).data.jeton;
  assert.equal(post({ action: 'calendrier', jeton }).ok, true);
  const fermetures = g.classeurActif.getSheetByName('Fermetures');
  assert.ok(fermetures, 'onglet Fermetures recréé');
  assert.deepEqual(fermetures.getRange(1, 1, 1, 6).getValues()[0], ['id', 'debut', 'fin', 'regle_id', 'motif', 'cree_par']);
  const r = post({ action: 'calendrier', jeton, mesure: true });
  assert.equal(r.ok, true);
  assert.ok(['ok', 'cache'].includes(r.mesure.lecture_groupee), r.mesure.lecture_groupee);
});

test('mesure: true → la réponse détaille le temps serveur et le mode de lecture ; sans mesure, rien de plus', () => {
  const { g, post } = installer({ sheetsAvance: true });
  const jeton = post({ action: 'connexion', telephone: '0600000002' }).data.jeton;
  g.cache.delete('donnees');
  const r = post({ action: 'calendrier', jeton, mesure: true });
  assert.equal(r.ok, true);
  assert.equal(r.mesure.lecture_groupee, 'ok');
  assert.equal(r.mesure.feuilles_lues_une_a_une, 0);
  assert.equal(r.mesure.adherents, 'cache');
  assert.ok(r.mesure.lignes.Sorties > 0);
  assert.equal(r.mesure.lignes.Bilan, undefined, 'le Bilan ne fait pas partie de la lecture groupée');
  for (const cle of ['total_ms', 'verrou_ms', 'lecture_groupee_ms', 'ouverture_classeur_ms', 'ecritures']) assert.equal(typeof r.mesure[cle], 'number', cle);
  assert.equal(post({ action: 'calendrier', jeton }).mesure, undefined);
  const sans = installer({ sheetsAvance: false }).post;
  const j2 = sans({ action: 'connexion', telephone: '0600000002' }).data.jeton;
  const m = sans({ action: 'calendrier', jeton: j2, mesure: true }).mesure;
  assert.equal(m.lecture_groupee, 'service Sheets indisponible');
  assert.ok(m.feuilles_lues_une_a_une > 0);
});

test('cache des données : le calendrier suivant ne touche plus au classeur', () => {
  const { g, post, remettreAZero } = installer({ sheetsAvance: true });
  const jeton = post({ action: 'connexion', telephone: '0600000002' }).data.jeton;
  post({ action: 'calendrier', jeton });
  remettreAZero();
  const r = post({ action: 'calendrier', jeton, mesure: true });
  assert.equal(r.ok, true);
  assert.equal(r.mesure.lecture_groupee, 'cache');
  assert.equal(g.stats.batchGet, 0);
  assert.equal(g.stats.getValues, 0);
  assert.equal(g.stats.ouvertures[g.proprietes.CLASSEUR_ID] || 0, 0, 'classeur ouvert inutilement');
  assert.ok(r.data.jours.some((j) => j.sorties.length >= 2));
});

test('cache des données : une écriture le vide, le calendrier suivant voit le changement', () => {
  const { post } = installer({ sheetsAvance: true });
  const jeton = post({ action: 'connexion', telephone: '0600000002' }).data.jeton;
  const avant = post({ action: 'calendrier', jeton }).data;
  const sortie = avant.jours.filter((j) => j.date > avant.aujourdhui).flatMap((j) => j.sorties).find((s) => s.statut !== 'annulee');
  const moi = avant.personnes[0];
  assert.equal(post({ action: 'inscription', jeton, sortie_id: sortie.id, personne_ids: [moi.id], inscrit: true }).ok, true);
  const r = post({ action: 'calendrier', jeton, mesure: true });
  const apres = r.data.jours.flatMap((j) => j.sorties).find((s) => s.id === sortie.id);
  assert.equal(apres.inscrits.length, sortie.inscrits.length + 1);
});

test("cache des données : après une écriture, la même requête le remet à jour ; l'appel suivant le lit directement", () => {
  const { g, post, remettreAZero } = installer({ sheetsAvance: true });
  const jeton = post({ action: 'connexion', telephone: '0600000002' }).data.jeton;
  const avant = post({ action: 'calendrier', jeton }).data;
  const sortie = avant.jours.filter((j) => j.date > avant.aujourdhui).flatMap((j) => j.sorties).find((s) => s.statut !== 'annulee');
  const ecriture = post({ action: 'inscription', jeton, sortie_id: sortie.id, personne_ids: [avant.personnes[0].id], inscrit: true, mesure: true });
  assert.equal(ecriture.mesure.cache, 'rempli');
  remettreAZero();
  const r = post({ action: 'calendrier', jeton, mesure: true });
  assert.equal(r.mesure.lecture_groupee, 'cache');
  assert.equal(g.stats.batchGet + g.stats.getValues, 0);
  assert.equal(r.data.jours.flatMap((j) => j.sorties).find((s) => s.id === sortie.id).inscrits.length, sortie.inscrits.length + 1);
});

test('cache des données : jamais prolongé plus de 5 min après la dernière lecture complète du classeur', () => {
  const { g, post } = installer({ sheetsAvance: true });
  const jeton = post({ action: 'connexion', telephone: '0600000002' }).data.jeton;
  const avant = post({ action: 'calendrier', jeton }).data;
  const copie = JSON.parse(g.cache.get('donnees'));
  copie.lu_a = Date.now() - 6 * 60 * 1000; // lecture complète d'il y a 6 min
  g.cache.set('donnees', JSON.stringify(copie));
  const sortie = avant.jours.filter((j) => j.date > avant.aujourdhui).flatMap((j) => j.sorties).find((s) => s.statut !== 'annulee');
  post({ action: 'inscription', jeton, sortie_id: sortie.id, personne_ids: [avant.personnes[0].id], inscrit: true });
  assert.equal(g.cache.has('donnees'), false, 'cache prolongé au-delà de 5 min');
  assert.equal(post({ action: 'calendrier', jeton, mesure: true }).mesure.lecture_groupee, 'ok');
});

test('cache des données : une requête sans verrou le lit mais ne le remplit pas', () => {
  const { g, post } = installer({ sheetsAvance: true });
  const jeton = post({ action: 'connexion', telephone: '0600000002' }).data.jeton;
  g.cache.delete('donnees');
  post({ action: 'discussion_lire', jeton, sortie_id: 'inexistante' });
  assert.notEqual(post({ action: 'calendrier', jeton, mesure: true }).mesure.lecture_groupee, 'cache');
  assert.equal(post({ action: 'discussion_lire', jeton, sortie_id: 'inexistante', mesure: true }).mesure.lecture_groupee, 'cache');
});

test('cache des données : ni le Bilan ni le Journal n\'y sont copiés', () => {
  const { g, post } = installer({ sheetsAvance: true });
  const jeton = post({ action: 'connexion', telephone: '0600000002' }).data.jeton;
  post({ action: 'calendrier', jeton });
  const brut = g.cache.get('donnees');
  assert.ok(brut, 'cache des données vide');
  const onglets = Object.keys(JSON.parse(brut).onglets);
  assert.ok(onglets.includes('Sorties'));
  assert.ok(!onglets.includes('Bilan'));
  assert.ok(!onglets.includes('Journal'));
});

test('cache des données : une modification relit la feuille, même si une ligne a été supprimée à la main entre-temps', () => {
  const { g, contexte } = installer({ sheetsAvance: true });
  vm.runInContext("depotSheets(classeurAppli, { cacheDonnees: true, peuplerCache: true }).lire('Personnes')", contexte);
  assert.ok(g.cache.get('donnees'), 'cache rempli');
  const feuille = g.classeurActif.getSheetByName('Personnes');
  const avant = feuille.getRange(1, 1, feuille.getLastRow(), 4).getValues();
  const cible = avant[5][0];
  feuille.deleteRow(3); // suppression à la main dans le classeur : les lignes suivantes remontent
  const n = vm.runInContext(`depotSheets(classeurAppli, { cacheDonnees: true }).modifier('Personnes', function (p) { return p.id === ${JSON.stringify(cible)}; }, { nom_affiche: 'Modifié' })`, contexte);
  assert.equal(n, 1);
  const apres = feuille.getRange(1, 1, feuille.getLastRow(), 4).getValues();
  const modifiees = apres.filter((l) => l[2] === 'Modifié');
  assert.deepEqual(modifiees.map((l) => l[0]), [cible]);
  const idsAttendus = avant.slice(1).map((l) => l[0]).filter((id) => id !== avant[2][0]).sort();
  assert.deepEqual(apres.slice(1).map((l) => l[0]).sort(), idsAttendus, 'une autre ligne a été écrasée');
});
