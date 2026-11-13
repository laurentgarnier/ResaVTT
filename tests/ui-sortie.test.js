import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contexteTest } from './aides/contexte-test.js';
import { renderSortie } from '../site/sorties/js/ui/sortie.js';

function donnees(id, tel = '0600000002') {
  const t = contexteTest();
  const jeton = t.connecter(tel);
  const cal = t.appel('calendrier', { jeton }).data;
  const sortie = cal.jours.flatMap((j) => j.sorties).find((s) => s.id === id);
  const messages = t.appel('discussion_lire', { jeton, sortie_id: id }).data;
  return { sortie, messages, personnes: cal.personnes };
}

test('détail du samedi matin : 22 noms triés, « Gérard (par Jo) »', () => {
  const { sortie, messages, personnes } = donnees('R:sm:2026-11-14:1');
  const html = renderSortie(sortie, messages, personnes);
  const noms = [...html.matchAll(/<span class="n">([^<]+)<\/span>/g)].map((m) => m[1]);
  assert.equal(noms.length, 22);
  assert.deepEqual(noms, [...noms].sort((a, b) => a.localeCompare(b, 'fr')));
  assert.match(html, /Gérard<\/span> <small>\(par Jo\)<\/small>/);
  assert.match(html, /Inscrits <span>22 · ordre alphabétique<\/span>/);
  assert.match(html, /09:30/);
  assert.match(html, /modifié par Ben/);
  assert.match(html, /inter-rocher\.gpx/);
  assert.match(html, /M&#39;inscrire|M'inscrire/);
});

test('discussion : les 2 derniers messages et un lien vers les précédents', () => {
  const { sortie, messages, personnes } = donnees('R:sm:2026-11-14:1');
  const html = renderSortie(sortie, messages, personnes);
  assert.match(html, /Voir le message précédent|Voir les 1 messages précédents/);
  assert.match(html, /On attend jusqu/);
  const tout = renderSortie(sortie, messages, personnes, { tousMessages: true });
  assert.match(tout, /a changé l(&#39;|')horaire/);
});

test('renderSortie échappe les noms et messages', () => {
  const { sortie, personnes } = donnees('R:sm:2026-11-14:1');
  const piege = { ...sortie, titre: '<b>x</b>', lieu: '"><img src=x onerror=alert(1)>', inscrits: [{ personne_id: 'p', nom_affiche: '<i>Zoé</i>', inscrit_par: null, a_moi: false }] };
  const messages = [{ id: 'm', auteur_nom: '<u>Ana</u>', texte: '<script>alert(1)</script> & co', horodatage: '2026-11-12T08:00:00.000Z', systeme: false, a_moi: false, trace_id: '' }];
  const html = renderSortie(piege, messages, personnes);
  assert.doesNotMatch(html, /<script>|<b>x|<img|<i>Zoé|<u>Ana/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt; &amp; co/);
});

test("sortie annulée : badge, motif, pas de bouton M'inscrire", () => {
  const { sortie, messages, personnes } = donnees('R:dm:2026-11-15:1');
  const html = renderSortie(sortie, messages, personnes);
  assert.match(html, /Annulée/);
  assert.match(html, /Arrêté préfectoral, chasse/);
  assert.doesNotMatch(html, /inscrire/);
});

test('droits : crayon horaire sur récurrente, modifier/annuler seulement pour le créateur', () => {
  const ben = donnees('R:sm:2026-11-14:1');
  const htmlBen = renderSortie(ben.sortie, ben.messages, ben.personnes);
  assert.match(htmlBen, /data-action="horaire"/);
  assert.doesNotMatch(htmlBen, /data-action="annuler"/);
  const ludo = donnees('libre-etangs', '0600000003');
  const htmlLudo = renderSortie(ludo.sortie, ludo.messages, ludo.personnes);
  assert.match(htmlLudo, /data-action="annuler"/);
  assert.match(htmlLudo, /href="#\/modifier\/libre-etangs"/);
  assert.match(htmlLudo, /Proposée par Ludo/);
});
