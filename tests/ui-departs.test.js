import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contexteTest } from './aides/contexte-test.js';
import { renderSortie, renderInscription, renderInscrits, changementInscrits, planInscription } from '../site/sorties/js/ui/sortie.js';
import { renderGrille } from '../site/sorties/js/ui/calendrier.js';
import { renderAgenda } from '../site/sorties/js/ui/calendrier-variantes.js';

const ID = 'R:sm:2026-11-21:1';

// Samedi 21 : second départ 09:30 Parking gare ; Ben inscrit au second, Marie au premier.
function donnees(tel = '0600000002') {
  const t = contexteTest();
  t.depot.modifier('Sorties', (s) => s.id === ID, { autres_departs: '09:30 Parking gare' });
  const ben = t.connecter('0600000002');
  const marie = t.connecter('0600000001');
  t.appel('inscription', { jeton: ben, sortie_id: ID, personne_ids: [t.appel('calendrier', { jeton: ben }).data.personnes[0].id], inscrit: true, depart_id: 'd2' });
  t.appel('inscription', { jeton: marie, sortie_id: ID, personne_ids: [t.appel('calendrier', { jeton: marie }).data.personnes[0].id], inscrit: true, depart_id: 'd1' });
  const jeton = t.connecter(tel);
  const cal = t.appel('calendrier', { jeton }).data;
  return { cal, sortie: cal.jours.flatMap((j) => j.sorties).find((s) => s.id === ID), personnes: cal.personnes };
}

test('fiche : les deux départs en tête, heure en gras', () => {
  const { sortie, personnes } = donnees();
  const html = renderSortie(sortie, [], personnes).replace(/ <button[^>]*>✎<\/button>/g, '');
  assert.match(html, /📍 <b style="color:var\(--txt\)">09:00<\/b> PDL · <b style="color:var\(--txt\)">09:30<\/b> Parking gare/);
});

test('fiche : « Mon départ » au choix, mon départ actuel présélectionné ; compte d\'une personne inscrite : changer de départ ou se désinscrire', () => {
  const { sortie, personnes } = donnees();
  const html = renderInscription(sortie, personnes);
  assert.match(html, /Mon départ/);
  assert.match(html, /<input type="radio" name="depart" value="d1"> 09:00 PDL/);
  assert.match(html, /<input type="radio" name="depart" value="d2" checked> 09:30 Parking gare/);
  assert.match(html, /<button class="btn p" type="submit" name="choix" value="changer"[^>]*>Changer de départ<\/button>/);
  assert.match(html, /<button class="btn o" type="submit" name="choix" value="desinscrire"[^>]*>Me désinscrire<\/button>/);
});

test('fiche : sans inscription, le premier départ est présélectionné ; un seul départ, pas de choix', () => {
  const { sortie, personnes } = donnees('0600000003');
  assert.match(renderInscription(sortie, personnes), /<input type="radio" name="depart" value="d1" checked>/);
  assert.doesNotMatch(renderInscription({ ...sortie, departs: [sortie.departs[0]] }, personnes), /Mon départ/);
});

test('fiche : inscrits au complet, total en tête, regroupés par départ avec sous-totaux', () => {
  const { sortie } = donnees();
  const html = renderInscrits(sortie);
  assert.match(html, /Inscrits <span>2 · ordre alphabétique<\/span>/);
  assert.ok(html.indexOf('PDL · 09:00 — 1') < html.indexOf('Marie'));
  assert.ok(html.indexOf('Marie') < html.indexOf('Parking gare · 09:30 — 1'));
  assert.ok(html.indexOf('Parking gare · 09:30 — 1') < html.indexOf('Ben'));
});

test('inscription : appels envoyés selon le formulaire (ajout, changement de départ, retrait)', () => {
  // deja : personne → départ actuel
  assert.deepEqual(planInscription({ deja: new Map(), voulues: ['p1', 'p2'], depart: 'd2' }),
    [{ personne_ids: ['p1', 'p2'], inscrit: true, depart_id: 'd2' }]);
  assert.deepEqual(planInscription({ deja: new Map([['p1', 'd1']]), voulues: ['p1', 'p2'], depart: 'd2' }),
    [{ personne_ids: ['p1', 'p2'], inscrit: true, depart_id: 'd2' }]);
  assert.deepEqual(planInscription({ deja: new Map([['p1', 'd2'], ['p2', 'd2']]), voulues: ['p1'], depart: 'd2' }),
    [{ personne_ids: ['p2'], inscrit: false }]);
  assert.deepEqual(planInscription({ deja: new Map([['p1', 'd2']]), voulues: ['p1'], depart: 'd2' }), []);
  assert.deepEqual(planInscription({ deja: new Map([['p1', 'd1']]), voulues: [], depart: 'd1' }), [{ personne_ids: ['p1'], inscrit: false }]);
});

test("fiche ouverte : changer de départ ailleurs redessine aussi le formulaire", () => {
  const avant = [{ personne_id: 'p1', nom_affiche: 'Ben', inscrit_par: null, a_moi: true, depart_id: 'd1' }];
  assert.deepEqual(changementInscrits(avant, [{ ...avant[0], depart_id: 'd2' }]), { liste: true, miennes: true });
});

test('calendrier et agenda : les départs dans la ligne du lieu ; « Mes prochaines sorties » donne mon départ', () => {
  const { cal } = donnees();
  assert.match(renderGrille(cal, {}), /📍 09:00 PDL · 09:30 Parking gare/);
  const agenda = renderAgenda(cal, {});
  assert.match(agenda, /📍 09:00 PDL · 09:30 Parking gare/);
  assert.match(agenda, /Sam\.? 21[^<]*· 09:30 Parking gare<\/b>/);
});
