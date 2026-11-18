import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contexteTest } from './aides/contexte-test.js';
import { renderFrise, renderAgenda } from '../site/sorties/js/ui/calendrier-variantes.js';
import { lireAffichage, enregistrerAffichage, renderSelecteurAffichage, DISPOSITIONS, THEMES, ESPACEMENTS } from '../site/sorties/js/ui/affichage.js';

// Marie est inscrite à la sortie du samedi matin du jeu de démonstration.
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
  assert.match(html, /💧<strong class="pluie">0,2 mm<\/strong>/);
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

const DEFAUT = { disposition: 'classique', theme: 'nuit', espacement: 'compact' };

test('affichage : classique, thème nuit et espacement compact par défaut ; un choix inconnu ou un stockage illisible retombe sur le défaut', () => {
  assert.deepEqual(lireAffichage(stockage()), DEFAUT);
  assert.deepEqual(lireAffichage(stockage({ 'sorties-vtt-affichage': '{"disposition":"agenda","theme":"club","espacement":"aere"}' })), { disposition: 'agenda', theme: 'club', espacement: 'aere' });
  assert.deepEqual(lireAffichage(stockage({ 'sorties-vtt-affichage': '{"disposition":"bidon","theme":"contraste","espacement":"bidon"}' })), { ...DEFAUT, theme: 'contraste' });
  assert.deepEqual(lireAffichage(stockage({ 'sorties-vtt-affichage': '{"disposition":"agenda","theme":"foret"}' })), { ...DEFAUT, disposition: 'agenda' }, 'Forêt a été retiré : retour au thème nuit');
  assert.deepEqual(lireAffichage(stockage({ 'sorties-vtt-affichage': 'pas du json' })), DEFAUT);
  assert.deepEqual(lireAffichage({ getItem: () => { throw new Error('bloqué'); } }), DEFAUT);
});

test('affichage : le choix est mémorisé sur l\'appareil', () => {
  const s = stockage();
  enregistrerAffichage(s, { disposition: 'frise', theme: 'ardoise', espacement: 'aere' });
  assert.deepEqual(lireAffichage(s), { disposition: 'frise', theme: 'ardoise', espacement: 'aere' });
  assert.doesNotThrow(() => enregistrerAffichage({ setItem: () => { throw new Error('plein'); } }, { disposition: 'frise', theme: 'nuit' }));
});

test('sélecteur : trois mises en page, cinq thèmes et deux espacements, le choix courant est marqué', () => {
  assert.deepEqual(DISPOSITIONS.map((d) => d.id), ['classique', 'frise', 'agenda']);
  assert.deepEqual(THEMES.map((t) => t.id), ['nuit', 'clair', 'contraste', 'club', 'ardoise']);
  assert.deepEqual(ESPACEMENTS.map((e) => e.id), ['compact', 'aere']);
  const html = renderSelecteurAffichage({ disposition: 'agenda', theme: 'clair', espacement: 'aere' });
  assert.equal((html.match(/data-disposition="/g) || []).length, 3);
  assert.equal((html.match(/data-theme-choix="/g) || []).length, 5);
  assert.equal((html.match(/data-espacement="/g) || []).length, 2);
  assert.match(html, /data-espacement="aere" aria-pressed="true"/);
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
  assert.match(colonne(cal.aujourdhui), /<details class="heures" open><summary>⏱ Heure par heure<\/summary><div class="horaire"><div>09h<b>☀️<\/b>3°<br><strong class="pluie">0,4 mm<\/strong><br>12 km\/h/);
  assert.match(colonne('2026-11-14'), /<details class="heures"><summary>⏱ Heure par heure<\/summary><div class="horaire"><div>09h<b>☀️<\/b>7°/);
  assert.doesNotMatch(colonne('2026-11-09'), /class="heures"/);
  assert.doesNotMatch(renderFrise(cal, null, () => null), /class="heures"/);
});

test('agenda : un jour à venir sans sortie affiche quand même sa météo (utile pour décaler une sortie) ; un jour passé, non', () => {
  const cal = calendrierMarie();
  const html = renderAgenda(cal, meteoPartout(cal));
  const vide = cal.jours.find((j) => !j.passe && !j.sorties.length);
  assert.ok(vide, 'la démo doit avoir un jour à venir sans sortie');
  const bloc = (date) => { const d = html.indexOf(`id="jour-${date}"`); return html.slice(d, html.indexOf('</div>', html.indexOf('creer-mini', d)) + 6); };
  assert.match(bloc(vide.date), /class="jour-vide"[\s\S]*class="meteo-mini"[\s\S]*Matin<\/small> ☀️ 4–6°/);
  const passeVide = cal.jours.find((j) => j.passe && !j.sorties.length);
  if (passeVide) {
    const d = html.indexOf(`id="jour-${passeVide.date}"`);
    assert.doesNotMatch(html.slice(d, html.indexOf('</div>', d) + 6), /meteo-mini/);
  }
});

test('météo : des précipitations au-dessus de 0 sont écrites en gras, 0 mm reste normal', async () => {
  const { mm } = await import('../site/sorties/js/ui/calendrier.js');
  assert.equal(mm(0), '0 mm');
  assert.equal(mm(undefined), '0 mm');
  assert.equal(mm(0.2), '<strong class="pluie">0,2 mm</strong>');
  const cal = calendrierMarie();
  const html = renderAgenda(cal, meteoPartout(cal));
  assert.match(html, /💧0 mm/);
  assert.match(html, /💧<strong class="pluie">0,2 mm<\/strong>/);
});
