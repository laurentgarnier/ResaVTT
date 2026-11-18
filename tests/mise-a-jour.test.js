import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { surveillerMisesAJour } from '../site/sorties/js/maj-appli.js';

// Service worker chargé dans un bac à sable : on note ce qui part sur le réseau et ce que l'installation précharge.
function serviceWorker() {
  const ecouteurs = {};
  const appels = [];
  const prechargees = [];
  const cache = {
    match: async () => undefined,
    put: async () => {},
    addAll: async (liste) => { prechargees.push(...liste); },
  };
  const contexte = vm.createContext({
    self: { addEventListener: (t, f) => { ecouteurs[t] = f; }, location: { origin: 'https://club.example.org' }, skipWaiting: () => {}, clients: { claim: () => {} } },
    caches: { open: async () => cache, keys: async () => [], delete: async () => true },
    fetch: async (requete, init) => { appels.push({ requete, init }); return new Response('ok'); },
    // Comme dans un service worker, une adresse relative part du dossier du service worker.
    Request: class extends Request {
      constructor(u, init) { super(typeof u === 'string' ? new URL(u, 'https://club.example.org/sorties/').href : u, init); }
    },
    Response, URL, Promise, JSON,
  });
  vm.runInContext(readFileSync('site/sorties/sw.js', 'utf8'), contexte);
  const lancer = async (type, extra = {}) => {
    let promesse = null;
    ecouteurs[type]({ ...extra, waitUntil: (p) => { promesse = p; }, respondWith: (p) => { promesse = p; } });
    return promesse;
  };
  return { lancer, appels, prechargees };
}

test("service worker : une nouvelle version précharge l'appli depuis le serveur, sans reprendre les fichiers gardés par le téléphone", async () => {
  const sw = serviceWorker();
  await sw.lancer('install');
  assert.ok(sw.prechargees.length > 30);
  for (const r of sw.prechargees) assert.equal(r.cache, 'reload', `${r.url} pourrait venir du cache HTTP`);
});

test('service worker : la mise à jour en arrière-plan d\'un fichier interroge le serveur (pas de copie de moins de 10 min)', async () => {
  const sw = serviceWorker();
  await sw.lancer('fetch', { request: new Request('https://club.example.org/sorties/js/version.js') });
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(sw.appels.length, 1);
  assert.equal(sw.appels[0].init?.cache, 'no-cache');
});

// Navigateur imité : service worker, visibilité de la page, formulaire à l'écran.
function navigateurFactice({ controleur = {}, formulaire = false } = {}) {
  const ecouteursSw = {};
  const ecouteursDoc = {};
  const etat = { maj: 0, rechargements: 0 };
  const navigateur = {
    serviceWorker: {
      controller: controleur,
      ready: Promise.resolve({ update: async () => { etat.maj += 1; } }),
      addEventListener: (t, f) => { ecouteursSw[t] = f; },
    },
  };
  const doc = {
    visibilityState: 'visible',
    querySelector: (sel) => (sel === 'form' && formulaire ? {} : null),
    addEventListener: (t, f) => { ecouteursDoc[t] = f; },
  };
  const lieu = { reload: () => { etat.rechargements += 1; } };
  const montrer = async (visible) => { doc.visibilityState = visible ? 'visible' : 'hidden'; ecouteursDoc.visibilitychange(); await new Promise((r) => setTimeout(r, 0)); };
  return { navigateur, doc, lieu, etat, ecouteursSw, montrer, doc_: doc };
}

test("iPhone : quand l'appli revient au premier plan, elle cherche une nouvelle version", async () => {
  const f = navigateurFactice();
  surveillerMisesAJour(f.navigateur, f.doc, f.lieu);
  await f.montrer(false);
  assert.equal(f.etat.maj, 0);
  await f.montrer(true);
  assert.equal(f.etat.maj, 1);
});

test("nouvelle version installée : l'appli se recharge aussitôt pour l'afficher", () => {
  const f = navigateurFactice();
  surveillerMisesAJour(f.navigateur, f.doc, f.lieu);
  f.ecouteursSw.controllerchange();
  assert.equal(f.etat.rechargements, 1);
  f.ecouteursSw.controllerchange();
  assert.equal(f.etat.rechargements, 1, 'un seul rechargement');
});

test('nouvelle version pendant une saisie : rechargement reporté au moment où l\'appli passe en arrière-plan', async () => {
  const f = navigateurFactice({ formulaire: true });
  surveillerMisesAJour(f.navigateur, f.doc, f.lieu);
  f.ecouteursSw.controllerchange();
  assert.equal(f.etat.rechargements, 0);
  await f.montrer(false);
  assert.equal(f.etat.rechargements, 1);
});

test('première installation (aucune version précédente) : pas de rechargement', () => {
  const f = navigateurFactice({ controleur: null });
  surveillerMisesAJour(f.navigateur, f.doc, f.lieu);
  f.ecouteursSw.controllerchange();
  assert.equal(f.etat.rechargements, 0);
});
