import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contexteTest } from './aides/contexte-test.js';
import { renderGrille, renderJour, personnesDistinctes } from '../site/sorties/js/ui/calendrier.js';

function calendrierBen() {
  const t = contexteTest();
  return t.appel('calendrier', { jeton: t.connecter('0600000002') }).data;
}

const METEO = { matin: { tmin: 4, tmax: 6, pluie_proba: 0, pluie_mm: 0, vent_max: 10, code: 0, emoji: '☀️', libelle: 'Ensoleillé' },
  apres_midi: { tmin: 10, tmax: 12, pluie_proba: 20, pluie_mm: 0.2, vent_max: 15, code: 2, emoji: '⛅', libelle: 'Éclaircies' } };

function meteoPartout(cal) {
  return Object.fromEntries(cal.jours.map((j) => [j.date, METEO]));
}

function blocJour(html, date) {
  const debut = html.indexOf(`data-date="${date}"`);
  const fin = html.indexOf('data-date="', debut + 10);
  return html.slice(debut, fin < 0 ? undefined : fin);
}

test('grille : 14 cartes, jours passés grisés sans météo, jeudi encadré', () => {
  const cal = calendrierBen();
  const html = renderGrille(cal, meteoPartout(cal));
  assert.equal((html.match(/class="jour[ "]/g) || []).length, 14);
  assert.match(html, /Cette semaine/);
  assert.match(html, /Semaine prochaine/);
  assert.match(blocJour(html, '2026-11-09'), /class="jour passe/);
  assert.doesNotMatch(blocJour(html, '2026-11-09'), /class="meteo"/);
  assert.match(blocJour(html, '2026-11-12'), /class="jour aujourdhui/);
  assert.match(blocJour(html, '2026-11-14'), /☀️ 4–6°/);
  assert.match(blocJour(html, '2026-11-14'), /\+ Créer une sortie/);
  assert.doesNotMatch(blocJour(html, '2026-11-10'), /Créer une sortie/);
});

test('vue jour samedi : 4 sorties, « 18 inscrits » sur Inter, pastille « +14 », sections Matin / Après-midi', () => {
  const cal = calendrierBen();
  const html = renderJour(cal, '2026-11-14', meteoPartout(cal), null);
  assert.equal((html.match(/class="sortie[ "]/g) || []).length, 4);
  assert.match(html, /18 inscrits/);
  assert.match(html, /\+14/);
  assert.ok(html.indexOf('>Matin<') < html.indexOf('>Après-midi<'));
  assert.match(html, /href="#\/sortie\/R%3Asm%3A2026-11-14%3A2"/);
  assert.match(html, /class="onglet on"[^>]*>[^<]*sam/);
  assert.match(html, /\+ Créer une sortie samedi/);
});

test('vue jour samedi : nombre de personnes distinctes', () => {
  const cal = calendrierBen();
  const sam = cal.jours.find((j) => j.date === '2026-11-14');
  assert.equal(personnesDistinctes(sam.sorties), 39);
  assert.match(renderJour(cal, '2026-11-14', null, null), /<b>39 personnes<\/b> roulent/);
});

test('météo absente → « Météo indisponible » ; hors horizon → « Prévision indisponible »', () => {
  const cal = calendrierBen();
  assert.match(renderJour(cal, '2026-11-14', null, null), /Météo indisponible/);
  assert.match(renderJour(cal, '2026-11-14', { '2026-11-13': METEO }, null), /Prévision indisponible/);
  assert.match(renderGrille(cal, null), /Météo indisponible/);
});

test('jour courant : météo heure par heure affichée', () => {
  const cal = calendrierBen();
  const heures = [{ heure: '06', temp: 3, pluie_proba: 10, code: 0, emoji: '☀️' }, { heure: '07', temp: 4, pluie_proba: 0, code: 1, emoji: '⛅' }];
  const html = renderJour(cal, '2026-11-12', meteoPartout(cal), heures);
  assert.match(html, /Météo heure par heure/);
  assert.match(html, /06h/);
});

test('sortie annulée barrée dans la vue jour', () => {
  const cal = calendrierBen();
  const html = renderJour(cal, '2026-11-15', null, null);
  assert.match(html, /class="sortie annulee/);
  assert.match(html, /Annulée/);
});

test('météo : les précipitations sont affichées en mm, plus en %', () => {
  const cal = calendrierBen();
  const grille = blocJour(renderGrille(cal, meteoPartout(cal)), '2026-11-14');
  assert.match(grille, /💧0 mm/);
  assert.match(grille, /💧0,2 mm/);
  assert.doesNotMatch(grille, /💧\d+ %/);
  const heures = [{ heure: '06', temp: 3, pluie_proba: 10, pluie_mm: 1.5, code: 61, emoji: '🌧' }];
  const jour = renderJour(cal, '2026-11-12', meteoPartout(cal), heures);
  assert.match(jour, /06h<b>🌧<\/b>3°<br>1,5 mm/);
});
