import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderEncartInstallation, plateformeDepuis } from '../site/sorties/js/ui/installation.js';

const CONSEIL = 'Si le bouton n’apparaît pas, ouvrez ce lien dans Chrome ou Safari.';

test('rien quand l\'appli est déjà installée', () => {
  assert.equal(renderEncartInstallation({ plateforme: 'ios', installee: true }), '');
});

test('encart installation iOS et conseil générique', () => {
  const html = renderEncartInstallation({ plateforme: 'ios', installee: false });
  assert.match(html, /Partager/);
  assert.match(html, /Sur l(&#39;|')écran d(&#39;|')accueil/);
  assert.ok(html.includes(CONSEIL));
  assert.doesNotMatch(html, /data-action="installer"/);
});

test('Android : bouton seulement si le navigateur propose l\'installation', () => {
  assert.match(renderEncartInstallation({ plateforme: 'android', installee: false, invitePossible: true }), /data-action="installer"/);
  const sans = renderEncartInstallation({ plateforme: 'android', installee: false, invitePossible: false });
  assert.doesNotMatch(sans, /data-action="installer"/);
  assert.ok(sans.includes(CONSEIL));
});

test('détection de la plateforme', () => {
  assert.equal(plateformeDepuis('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'), 'ios');
  assert.equal(plateformeDepuis('Mozilla/5.0 (Linux; Android 14; Pixel 8)'), 'android');
  assert.equal(plateformeDepuis('Mozilla/5.0 (Windows NT 10.0; Win64; x64)'), 'autre');
});
