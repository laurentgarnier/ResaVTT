import { test } from 'node:test';
import assert from 'node:assert/strict';
import { courrierListe } from '../backend/noyau/courriers.js';
import { contexteTest } from './aides/contexte-test.js';

const LIEN = 'https://club.example.org/sorties/#/sortie/R%3Asm%3A2026-11-21%3A1';
const TEXTE = [
  'Les inscriptions sont ouvertes !',
  '🚵 Samedi 21 novembre 09:00 – Samedi matin (PDL)',
  '   ☀️ Ensoleillé, 2–9°, pluie 0 mm, vent 12 km/h NE',
  `   👉 ${LIEN}`,
  '',
  '🌐 Pas encore installée : https://club.example.org/sorties/',
].join('\n');

test('mail à la liste : version mise en forme en plus du texte, police plus grande', () => {
  const c = courrierListe('Rappel', TEXTE);
  assert.equal(c.objet, 'Rappel');
  assert.equal(c.texte, TEXTE, 'le texte brut reste envoyé (messageries sans HTML)');
  assert.match(c.html, /^<div style="font-family:Arial,sans-serif;font-size:16px;/);
});

test('mail à la liste : la date et l\'heure de chaque sortie en plus grand', () => {
  const { html } = courrierListe('Rappel', TEXTE);
  assert.match(html, /🚵 <b style="font-size:19px">Samedi 21 novembre 09:00<\/b> – Samedi matin \(PDL\)/);
});

test('mail à la liste : le lien de la sortie, court, sur la même ligne que son pictogramme ; les autres liens cliquables', () => {
  const { html } = courrierListe('Rappel', TEXTE);
  assert.ok(html.includes(`👉 <a href="${LIEN}">Voir la sortie et s'inscrire</a>`));
  assert.ok(html.includes('Pas encore installée : <a href="https://club.example.org/sorties/">https://club.example.org/sorties/</a>'));
});

test('mail à la liste : le texte est échappé', () => {
  const { html } = courrierListe('x', 'Motif : <script>alert(1)</script> & co');
  assert.ok(html.includes('Motif : &lt;script&gt;alert(1)&lt;/script&gt; &amp; co'));
  assert.ok(!html.includes('<script>'));
});

test('rappel envoyé à la liste : le mail part avec sa version mise en forme', () => {
  const t = contexteTest();
  const jeton = t.connecter('0611111111');
  t.depot.modifier('Jetons', (j) => j.jeton_hash === t.ctx.services.hacher(jeton), { admin_verifie: true });
  t.appel('rappel_envoyer_maintenant', { jeton, type: 'G', id: 'g-weekend' });
  const liste = t.mails.find((m) => m.destinataires === 'porteur@example.org' && m.objet !== 'À poster sur WhatsApp');
  assert.ok(liste && liste.html, 'mail à la liste avec html');
  assert.match(liste.html, /🚵 <b style="font-size:19px">/);
});
