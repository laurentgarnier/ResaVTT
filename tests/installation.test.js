import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { creerGoogleFactice } from './aides/google-factice.js';
import { scriptGasComplet } from '../outils/code-gas.js';
import {
  idDepuisLien, idDeploiementDepuisSortie, urlApi, configPourProduction, adresseAppliDepuisDepot, fichierInstallationGas,
} from '../outils/installation.js';

test('idDepuisLien : identifiant tiré du lien du fichier, ou gardé tel quel', () => {
  assert.equal(idDepuisLien('https://docs.google.com/spreadsheets/d/1AbC_d-9xYz/edit#gid=0'), '1AbC_d-9xYz');
  assert.equal(idDepuisLien('  1AbC_d-9xYz  '), '1AbC_d-9xYz');
  assert.equal(idDepuisLien('pas un lien ni un id !'), '');
});

test('idDeploiementDepuisSortie : la réponse de clasp deploy donne l\'identifiant du déploiement', () => {
  assert.equal(idDeploiementDepuisSortie('Deployed AKfycbzMk1Tc5Y-4GzT7_x @3\n'), 'AKfycbzMk1Tc5Y-4GzT7_x');
  assert.equal(idDeploiementDepuisSortie('erreur'), '');
  assert.equal(urlApi('AKfy_1'), 'https://script.google.com/macros/s/AKfy_1/exec');
});

test("configPourProduction : nouvelle adresse de l'API et plus d'indice de démo, le reste intact", () => {
  const avant = `export const CONFIG = {
  urlApi: surcharge() || (enLocal ? '/api' : 'https://script.google.com/macros/s/ANCIEN/exec'),
  urlAppli: '',
  indiceDemo: 'Démo : essayez 06 00 00 00 02 (Ben) ou votre propre numéro (administrateur).',
};`;
  const apres = configPourProduction(avant, 'https://script.google.com/macros/s/NOUVEAU/exec');
  assert.match(apres, /urlApi: surcharge\(\) \|\| \(enLocal \? '\/api' : 'https:\/\/script\.google\.com\/macros\/s\/NOUVEAU\/exec'\),/);
  assert.match(apres, /indiceDemo: '',/);
  assert.match(apres, /urlAppli: '',/);
  assert.throws(() => configPourProduction('rien à remplacer', 'x'), /config\.js/);
});

test('adresseAppliDepuisDepot : adresse publique de l\'appli selon le nom du dépôt', () => {
  assert.equal(adresseAppliDepuisDepot('https://github.com/VttClub/sorties-vtt.git'), 'https://vttclub.github.io/sorties-vtt/sorties/');
  assert.equal(adresseAppliDepuisDepot('https://github.com/VttClub/vttclub.github.io'), 'https://vttclub.github.io/sorties/');
  assert.equal(adresseAppliDepuisDepot('git@github.com:VttClub/resa.git'), 'https://vttclub.github.io/resa/sorties/');
  assert.equal(adresseAppliDepuisDepot('pas github'), '');
});

function installer(installationJs) {
  const g = creerGoogleFactice({ sheetsAvance: true });
  const adh = g.globaux.SpreadsheetApp.create('Adhérents du club');
  adh.getSheets()[0].getRange(1, 1, 2, 5).setValues([['nom', 'telephone', 'email', 'actif', 'admin'], ['Président', '06 12 34 56 78', 'pres@club.org', true, true]]);
  const contexte = vm.createContext({ ...g.globaux, console });
  vm.runInContext(scriptGasComplet() + '\n;\n' + installationJs(adh.getId()), contexte);
  return { g, contexte, adh };
}

test("initialiser en production : branché sur le fichier adhérents existant, sans créer de fichier de démo", () => {
  const { g, contexte, adh } = installer(fichierInstallationGas);
  vm.runInContext('initialiser()', contexte);
  assert.equal(g.proprietes.ADHERENTS_ID, adh.getId());
  assert.ok(!g.classeursCrees.some((c) => /démo/.test(c.getName())), 'fichier adhérents de démo créé');
  const post = (corps) => JSON.parse(contexte.doPost({ postData: { contents: JSON.stringify(corps) } }).getContent());
  const r = post({ action: 'connexion', telephone: '0612345678' });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.data.est_admin, true);
});

test('initialiser en production : fichier adhérents sans les bonnes colonnes → erreur claire, rien de branché', () => {
  const { g, contexte, adh } = installer(fichierInstallationGas);
  adh.getSheets()[0].getRange(1, 1, 1, 5).setValues([['Nom', 'Tel', 'Mail', 'x', 'y']]);
  assert.throws(() => vm.runInContext('initialiser()', contexte), /telephone/);
  assert.equal(g.proprietes.ADHERENTS_ID, undefined);
});

test('fichierInstallationGas : déclare l\'identifiant du fichier adhérents', () => {
  assert.equal(fichierInstallationGas('1AbC'), "// Écrit par npm run installer : fichier adhérents de l'association.\nvar INSTALLATION_ADHERENTS_ID = '1AbC';\n");
});
