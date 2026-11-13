import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import vm from 'node:vm';
import { creerGoogleFactice } from './aides/google-factice.js';
import { scriptGasComplet, fichiersGas } from '../outils/code-gas.js';

const codeGas = scriptGasComplet;

test('copie vers Apps Script : aucun import/export, le tout se compile en un seul script', () => {
  const code = codeGas();
  assert.doesNotMatch(code, /^\s*(import|export)\b/m);
  const ok = new Function(`${code}\nreturn typeof traiter === "function" && typeof ticNoyau === "function" && typeof genererSorties === "function" && typeof doPost === "function";`)();
  assert.equal(ok, true);
});

test('aucun nom global en double entre les fichiers copiés', () => {
  const code = codeGas();
  const noms = [...code.matchAll(/^(?:function|const|let|var|class)\s+([A-Za-z_$][\w$]*)/gm)].map((m) => m[1]);
  const doublons = noms.filter((n, i) => noms.indexOf(n) !== i);
  assert.deepEqual(doublons, []);
});

test('adaptateur : initialiser, chargerDonneesDemo, puis doPost connexion et calendrier sur un Google factice', () => {
  const g = creerGoogleFactice();
  const contexte = vm.createContext({ ...g.globaux, console });
  vm.runInContext(codeGas(), contexte);
  vm.runInContext('initialiser()', contexte);
  const classeur = g.classeurActif;
  assert.ok(classeur.getSheetByName('Sorties'));
  assert.ok(g.proprietes.ADHERENTS_ID && g.proprietes.TRACES_ID && g.proprietes.CLASSEUR_ID);
  vm.runInContext('initialiser()', contexte);
  assert.equal(g.classeursCrees.length, 1);
  assert.equal(g.drive.dossiers.length, 1);

  classeur.getSheetByName('Porteur').getRange(2, 1, 1, 3).setValues([['Porteur', '06 11 11 11 11', 'porteur@example.org']]);
  vm.runInContext('chargerDonneesDemo()', contexte);
  assert.equal(g.drive.fichiers.size, 3);

  const post = (corps) => JSON.parse(contexte.doPost({ postData: { contents: JSON.stringify(corps) } }).getContent());
  const cx = post({ action: 'connexion', telephone: '0611111111' });
  assert.equal(cx.ok, true, JSON.stringify(cx));
  assert.equal(cx.data.est_admin, true);
  const cal = post({ action: 'calendrier', jeton: cx.data.jeton });
  assert.equal(cal.ok, true, JSON.stringify(cal));
  assert.equal(cal.data.jours.length, 14);
  assert.ok(cal.data.jours.some((j) => j.sorties.length >= 4));
  const trace = post({ action: 'trace_lire', jeton: cx.data.jeton, trace_id: 't-boucle-foret' });
  assert.match(trace.data.contenu, /^<\?xml/);

  assert.equal(post({ action: 'admin_code_demander', jeton: cx.data.jeton }).ok, true);
  assert.equal(g.mails.at(-1).to, 'porteur@example.org');
  assert.equal(JSON.parse(contexte.doPost({ postData: { contents: 'pas du json' } }).getContent()).erreur, 'requete_invalide');

  vm.runInContext('installer()', contexte);
  assert.deepEqual(g.declencheurs.map((d) => d.fonction), ['tic']);
  vm.runInContext('installer()', contexte);
  assert.equal(g.declencheurs.length, 1);
});

test("adaptateur : on peut ajouter au-delà des 1000 lignes initiales d'une feuille, même après des suppressions", () => {
  const g = creerGoogleFactice();
  const contexte = vm.createContext({ ...g.globaux, console });
  vm.runInContext(codeGas(), contexte);
  vm.runInContext('initialiser()', contexte);
  const n = vm.runInContext(`(function () {
    const depot = depotSheets(classeurAppli());
    const lignes = (k) => Array.from({ length: k }, (_, i) => ({ horodatage: 'h' + i, type: 't', detail: String(i) }));
    depot.ajouter('Journal', lignes(600));
    depot.supprimer('Journal', (l) => Number(l.detail) < 300);
    depot.ajouter('Journal', lignes(900));
    return depot.lire('Journal').length;
  })()`, contexte);
  assert.equal(n, 1200);
});

test('copier-vers-gas écrit dans backend/gas/gen exactement les fichiers construits en mémoire', () => {
  execFileSync('node', ['outils/copier-vers-gas.js']);
  const attendus = fichiersGas();
  assert.deepEqual(readdirSync('backend/gas/gen').sort(), attendus.map((f) => f.nom).sort());
  for (const f of attendus) assert.equal(readFileSync(`backend/gas/gen/${f.nom}`, 'utf8'), f.code);
});
