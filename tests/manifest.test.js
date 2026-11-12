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
