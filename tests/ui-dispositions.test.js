import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contexteTest } from './aides/contexte-test.js';
import { renderFrise, renderAgenda } from '../site/sorties/js/ui/calendrier-variantes.js';
import { lireAffichage, enregistrerAffichage, renderSelecteurAffichage, DISPOSITIONS, THEMES } from '../site/sorties/js/ui/affichage.js';

// Marie est inscrite aux sorties « Cool » du jeu de démonstration.
function calendrierMarie() {
  const t = contexteTest();
  return t.appel('calendrier', { jeton: t.connecter('0600000001') }).data;
}

const METEO = { matin: { tmin: 4, tmax: 6, pluie_proba: 0, pluie_mm: 0, vent_max: 10, vent_dir: 225, vent_cardinal: 'SO', code: 0, emoji: '☀️', libelle: 'Ensoleillé' },
  apres_midi: { tmin: 10, tmax: 12, pluie_proba: 20, pluie_mm: 0.2, vent_max: 15, vent_dir: 0, vent_cardinal: 'N', code: 2, emoji: '⛅', libelle: 'Éclaircies' } };
const meteoPartout = (cal) => Object.fromEntries(cal.jours.map((j) => [j.date, METEO]));

function stockage(initial = {}) {
  const m = new Map(Object.entries(initial));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), m };
}

test('frise : 14 colonnes côte à côte, jours passés grisés, aujourd\'hui repérable pour y faire défiler', () => {
  const cal = calendrierMarie();
  const html = renderFrise(cal, meteoPartout(cal));
  assert.match(html, /class="frise"/);
  assert.equal((html.match(/class="col-jour[ "]/g) || []).length, 14);
  assert.match(html, new RegExp(`id="jour-${cal.aujourdhui}" class="col-jour aujourdhui"`));
  assert.match(html, /id="jour-2026-11-09" class="col-jour passe"/);
  assert.match(html, /Boucle des étangs/);
  assert.match(html, /href="#\/creer\/2026-11-14"/);
  assert.doesNotMatch(html, /href="#\/creer\/2026-11-09"/);
  assert.match(html, /💧0,2 mm/);
});

test('agenda : part d\'aujourd\'hui, heure en tête de chaque sortie, jours sans sortie sur une ligne', () => {
  const cal = calendrierMarie();
  const html = renderAgenda(cal, meteoPartout(cal));
  const aVenir = html.slice(html.indexOf('class="agenda-jours"'));
  assert.ok(aVenir.indexOf(`id="jour-${cal.aujourdhui}"`) >= 0);
  assert.equal(aVenir.indexOf('id="jour-2026-11-09"'), -1, 'les jours passés ne sont pas dans la liste principale');
  assert.match(html, /<details class="jours-passes">/);
  assert.match(html, /<span class="heure">09:00<\/span>/);
  const vides = cal.jours.filter((j) => !j.passe && !j.sorties.length).length;
  assert.equal((aVenir.match(/class="jour-vide"/g) || []).length, vides);
  assert.match(html, /href="#\/creer\/2026-11-14"/);
});

test('agenda : « Mes prochaines sorties » regroupe les sorties à venir où je suis inscrit', () => {
  const cal = calendrierMarie();
  const miennes = cal.jours.filter((j) => !j.passe).flatMap((j) => j.sorties)
    .filter((s) => s.statut !== 'annulee' && s.inscrits.some((i) => i.a_moi));
  assert.ok(miennes.length > 0);
  const html = renderAgenda(cal, null);
  const bloc = html.slice(html.indexOf('class="mes-sorties"'), html.indexOf('class="agenda-jours"'));
  assert.match(bloc, /Mes prochaines sorties/);
  for (const s of miennes) assert.ok(bloc.includes(encodeURIComponent(s.id)), s.id);
});

test('agenda : sans inscription, pas de bloc « Mes prochaines sorties »', () => {
  const t = contexteTest();
  const cal = t.appel('calendrier', { jeton: t.connecter('0600000002') }).data; // Ben, inscrit nulle part
  cal.jours.forEach((j) => j.sorties.forEach((s) => s.inscrits.forEach((i) => { i.a_moi = false; })));
  assert.doesNotMatch(renderAgenda(cal, null), /class="mes-sorties"/);
});

test('affichage : classique et thème nuit par défaut ; un choix inconnu ou un stockage illisible retombe sur le défaut', () => {
  assert.deepEqual(lireAffichage(stockage()), { disposition: 'classique', theme: 'nuit' });
  assert.deepEqual(lireAffichage(stockage({ 'sorties-vtt-affichage': '{"disposition":"agenda","theme":"clair"}' })), { disposition: 'agenda', theme: 'clair' });
  assert.deepEqual(lireAffichage(stockage({ 'sorties-vtt-affichage': '{"disposition":"bidon","theme":"foret"}' })), { disposition: 'classique', theme: 'foret' });
  assert.deepEqual(lireAffichage(stockage({ 'sorties-vtt-affichage': 'pas du json' })), { disposition: 'classique', theme: 'nuit' });
  assert.deepEqual(lireAffichage({ getItem: () => { throw new Error('bloqué'); } }), { disposition: 'classique', theme: 'nuit' });
});

test('affichage : le choix est mémorisé sur l\'appareil', () => {
  const s = stockage();
  enregistrerAffichage(s, { disposition: 'frise', theme: 'foret' });
  assert.deepEqual(lireAffichage(s), { disposition: 'frise', theme: 'foret' });
  assert.doesNotThrow(() => enregistrerAffichage({ setItem: () => { throw new Error('plein'); } }, { disposition: 'frise', theme: 'nuit' }));
});

test('sélecteur : trois mises en page et trois thèmes, le choix courant est marqué', () => {
  assert.deepEqual(DISPOSITIONS.map((d) => d.id), ['classique', 'frise', 'agenda']);
  assert.deepEqual(THEMES.map((t) => t.id), ['nuit', 'clair', 'foret']);
  const html = renderSelecteurAffichage({ disposition: 'agenda', theme: 'clair' });
  assert.equal((html.match(/data-disposition="/g) || []).length, 3);
  assert.equal((html.match(/data-theme-choix="/g) || []).length, 3);
  assert.match(html, /data-disposition="agenda" aria-pressed="true"/);
  assert.match(html, /data-disposition="classique" aria-pressed="false"/);
  assert.match(html, /data-theme-choix="clair" aria-pressed="true"/);
});

test('agenda : le résumé météo d\'un jour donne aussi le vent en km/h et son orientation', () => {
  const cal = calendrierMarie();
  const html = renderAgenda(cal, meteoPartout(cal));
  assert.match(html, /class="meteo-mini"><span class="plage"><small>Matin<\/small> ☀️ 4–6° · 💧0 mm · 🌬 10 km\/h <span class="vent-dir" title="Vent de secteur SO">/);
});

test('frise : météo heure par heure dépliée pour aujourd\'hui, repliée pour les autres jours à venir, absente des jours passés', () => {
  const cal = calendrierMarie();
  const heures = (date) => [{ heure: '09', temp: date === cal.aujourdhui ? 3 : 7, pluie_proba: 0, pluie_mm: 0.4, vent: 12, vent_dir: 90, vent_cardinal: 'E', code: 0, emoji: '☀️' }];
  const html = renderFrise(cal, meteoPartout(cal), heures);
  const colonne = (date) => { const d = html.indexOf(`id="jour-${date}"`); return html.slice(d, html.indexOf('</section>', d)); };
  assert.match(colonne(cal.aujourdhui), /<details class="heures" open><summary>⏱ Heure par heure<\/summary><div class="horaire"><div>09h<b>☀️<\/b>3°<br>0,4 mm<br>12 km\/h/);
  assert.match(colonne('2026-11-14'), /<details class="heures"><summary>⏱ Heure par heure<\/summary><div class="horaire"><div>09h<b>☀️<\/b>7°/);
  assert.doesNotMatch(colonne('2026-11-09'), /class="heures"/);
  assert.doesNotMatch(renderFrise(cal, null, () => null), /class="heures"/);
});
