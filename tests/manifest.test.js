import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';

test('manifest : portée limitée à /sorties/, icônes 192 et 512', () => {
  const m = JSON.parse(readFileSync('site/sorties/manifest.webmanifest', 'utf8'));
  assert.equal(m.scope, './');
  assert.equal(m.start_url, './');
  assert.equal(m.display, 'standalone');
  assert.equal(m.lang, 'fr');
  assert.equal(m.theme_color, '#121a2b');
  assert.deepEqual(m.icons.map((i) => i.sizes).sort(), ['192x192', '512x512']);
  for (const i of m.icons) assert.ok(existsSync(`site/sorties/${i.src}`), i.src);
  assert.ok(existsSync('site/sorties/icones/apple-touch-icon.png'));
});

test('aucun service worker à la racine du site', () => {
  assert.equal(existsSync('site/sw.js'), false);
  assert.ok(existsSync('site/sorties/sw.js'));
});

test('le service worker précharge tous les modules de l\'appli et ne met pas en cache l\'API', () => {
  const sw = readFileSync('site/sorties/sw.js', 'utf8');
  const modules = readdirSync('site/sorties/js', { recursive: true }).filter((f) => f.endsWith('.js')).map((f) => `js/${f.replace(/\\/g, '/')}`);
  for (const m of modules) assert.ok(sw.includes(`'${m}'`), `${m} absent de COQUILLE`);
  for (const hote of ['script.google.com', 'script.googleusercontent.com', 'api.open-meteo.com', 'tile.openstreetmap.org']) assert.ok(sw.includes(hote), hote);
});

test('la page déclare le manifeste et l\'icône Apple', () => {
  const html = readFileSync('site/sorties/index.html', 'utf8');
  assert.match(html, /<link rel="manifest" href="manifest.webmanifest">/);
  assert.match(html, /<link rel="apple-touch-icon" href="icones\/apple-touch-icon.png">/);
});

test('version affichée en pied de page : la même que celle du service worker, et une place prévue dans la page', async () => {
  const { VERSION_APPLI, libelleVersion } = await import('../site/sorties/js/version.js');
  const sw = readFileSync('site/sorties/sw.js', 'utf8');
  assert.match(sw, new RegExp(`const VERSION = 'sorties-vtt-v${VERSION_APPLI}';`));
  assert.equal(libelleVersion(), `Version ${VERSION_APPLI}`);
  assert.match(readFileSync('site/sorties/index.html', 'utf8'), /<span id="version-appli"><\/span>/);
});

test("icônes : une seule image source (logo.png, carrée) d'où viennent toutes les tailles ; l'onglet utilise l'icône de l'appli", () => {
  const taille = (f) => { const d = readFileSync(f); return [d.readUInt32BE(16), d.readUInt32BE(20)]; };
  const [l, h] = taille('site/sorties/icones/logo.png');
  assert.equal(l, h, 'logo.png doit être carré');
  assert.ok(l >= 1024, `logo.png trop petit : ${l} px`);
  assert.deepEqual(taille('site/sorties/icones/icone-192.png'), [192, 192]);
  assert.deepEqual(taille('site/sorties/icones/icone-512.png'), [512, 512]);
  assert.deepEqual(taille('site/sorties/icones/apple-touch-icon.png'), [180, 180]);
  assert.match(readFileSync('site/sorties/index.html', 'utf8'), /<link rel="icon" href="icones\/icone-192\.png" type="image\/png">/);
  assert.match(JSON.parse(readFileSync('package.json', 'utf8')).scripts.icones, /generer-icones\.ps1/);
});
