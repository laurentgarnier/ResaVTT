import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { contexteTest } from './aides/contexte-test.js';
import { PARAMETRES_DEFAUT } from '../backend/noyau/schema.js';
import { NOM_APPLI_DEFAUT, logoAppli, nomAppliAffiche } from '../site/sorties/js/ui/nom-appli.js';

test("nom de l'association : réglage par défaut « Sorties VTT », renvoyé avec le calendrier", () => {
  assert.equal(PARAMETRES_DEFAUT.nom_appli, 'Sorties VTT');
  assert.equal(NOM_APPLI_DEFAUT, 'Sorties VTT');
  const t = contexteTest();
  const jeton = t.connecter('0600000002');
  assert.equal(t.appel('calendrier', { jeton }).data.parametres.nom_appli, 'Sorties VTT');
  t.depot.modifier('Parametres', (l) => l.cle === 'nom_appli', { valeur: 'VTT Club Bellifontain' }) || t.depot.ajouter('Parametres', [{ cle: 'nom_appli', valeur: 'VTT Club Bellifontain' }]);
  assert.equal(t.appel('calendrier', { jeton }).data.parametres.nom_appli, 'VTT Club Bellifontain');
});

test("bandeau : le logo du club puis le nom, d'une seule couleur, échappé", () => {
  const LOGO = '<img class="logo-img" src="icones/icone-192.png" alt="" width="28" height="28">';
  assert.equal(logoAppli('VTT Club Bellifontain'), `${LOGO}<span class="logo-nom">VTT Club Bellifontain</span>`);
  assert.equal(logoAppli('<b>A</b> & B'), `${LOGO}<span class="logo-nom">&lt;b&gt;A&lt;/b&gt; &amp; B</span>`);
});

test("nom affiché : celui du serveur, sinon le dernier connu sur l'appareil, sinon le défaut", () => {
  assert.equal(nomAppliAffiche({ parametres: { nom_appli: ' Club X ' } }, 'Ancien'), 'Club X');
  assert.equal(nomAppliAffiche(null, 'Ancien'), 'Ancien');
  assert.equal(nomAppliAffiche({ parametres: { nom_appli: '' } }, ''), 'Sorties VTT');
});

// Service worker chargé dans un bac à sable : écouteurs, caches et réseau imités.
function serviceWorker(cachesInitiaux = {}) {
  const ecouteurs = {};
  const magasins = new Map(Object.entries(cachesInitiaux).map(([nom, entrees]) => [nom, new Map(Object.entries(entrees))]));
  const cache = (nom) => {
    if (!magasins.has(nom)) magasins.set(nom, new Map());
    const m = magasins.get(nom);
    const cle = (r) => new URL(typeof r === 'string' ? r : r.url, 'https://club.example.org/sorties/').pathname;
    return {
      match: async (r) => (m.has(cle(r)) ? m.get(cle(r)).clone() : undefined),
      put: async (r, rep) => { m.set(cle(r), rep); },
      addAll: async () => {},
    };
  };
  const manifeste = readFileSync('site/sorties/manifest.webmanifest', 'utf8');
  const contexte = vm.createContext({
    self: { addEventListener: (t, f) => { ecouteurs[t] = f; }, location: { origin: 'https://club.example.org' }, skipWaiting: () => {}, clients: { claim: () => {} } },
    caches: { open: async (n) => cache(n), keys: async () => [...magasins.keys()], delete: async (n) => magasins.delete(n) },
    fetch: async () => new Response(manifeste, { headers: { 'Content-Type': 'application/manifest+json' } }),
    Response, URL, Promise, JSON,
  });
  vm.runInContext(readFileSync('site/sorties/sw.js', 'utf8'), contexte);
  const evenement = (extra) => {
    let promesse = null;
    return { ev: { ...extra, waitUntil: (p) => { promesse = p; }, respondWith: (p) => { promesse = p; } }, fini: () => promesse };
  };
  return { ecouteurs, magasins, evenement };
}

test("service worker : le manifeste d'installation porte le nom de l'association enregistré par l'appli", async () => {
  const sw = serviceWorker({ 'sorties-vtt-reglages': { '/sorties/nom-appli': new Response('VTT Club Bellifontain') } });
  const { ev, fini } = sw.evenement({ request: new Request('https://club.example.org/sorties/manifest.webmanifest') });
  sw.ecouteurs.fetch(ev);
  const m = JSON.parse(await (await fini()).text());
  assert.equal(m.name, 'VTT Club Bellifontain');
  assert.equal(m.short_name, 'VTT Club Bellifontain');
  assert.equal(m.start_url, './');
  assert.equal(m.icons.length, 2);
});

test("service worker : sans nom enregistré, le manifeste d'origine ; une nouvelle version ne vide pas le cache du nom", async () => {
  const sw = serviceWorker({ 'sorties-vtt-v1': {}, 'sorties-vtt-reglages': {} });
  const { ev, fini } = sw.evenement({ request: new Request('https://club.example.org/sorties/manifest.webmanifest') });
  sw.ecouteurs.fetch(ev);
  assert.equal(JSON.parse(await (await fini()).text()).name, 'Sorties VTT');
  const act = sw.evenement({});
  sw.ecouteurs.activate(act.ev);
  await act.fini();
  assert.ok(sw.magasins.has('sorties-vtt-reglages'), 'cache du nom supprimé');
  assert.ok(!sw.magasins.has('sorties-vtt-v1'), 'ancienne version gardée');
});
