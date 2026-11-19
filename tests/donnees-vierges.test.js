import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contexteTest, PORTEUR } from './aides/contexte-test.js';
import { creerDonneesVierges } from '../backend/noyau/donnees-demo.js';
import { ONGLETS, PARAMETRES_DEFAUT } from '../backend/noyau/schema.js';
import { MODELES_DEFAUT } from '../site/sorties/js/logique/modeles.js';
import { ticNoyau } from '../backend/noyau/automate.js';

test('données vierges : des faux adhérents et le porteur administrateur, rien d\'autre', () => {
  const d = creerDonneesVierges(PORTEUR);
  assert.equal(d.adherents.length, 41);
  assert.deepEqual(d.adherents.filter((a) => a.admin).map((a) => a.telephone), [PORTEUR.telephone]);
  assert.ok(d.adherents.every((a) => a.actif));
  assert.deepEqual(Object.keys(d.tables).sort(), Object.keys(ONGLETS).sort());
  for (const [onglet, lignes] of Object.entries(d.tables)) {
    if (onglet !== 'Parametres' && onglet !== 'Modeles') assert.deepEqual(lignes, [], `${onglet} devrait être vide`);
  }
});

test('données vierges : paramètres et textes par défaut, mails et WhatsApp vers le porteur, pas de migration des anciens rappels', () => {
  const { tables } = creerDonneesVierges(PORTEUR);
  const p = Object.fromEntries(tables.Parametres.map((l) => [l.cle, l.valeur]));
  assert.equal(p.nom_appli, PARAMETRES_DEFAUT.nom_appli);
  assert.equal(p.adresse_liste, PORTEUR.email);
  assert.equal(p.destinataires_whatsapp, PORTEUR.email);
  assert.equal(p.email_alertes, PORTEUR.email);
  assert.equal(p.rappels_migres, 'oui');
  assert.deepEqual(Object.fromEntries(tables.Modeles.map((l) => [l.cle, l.valeur])), MODELES_DEFAUT);
});

test('nouvelle installation : calendrier vide, aucune récurrence ni rappel, la connexion fonctionne', () => {
  const t = contexteTest({ vierge: true });
  const jeton = t.connecter('0600000002');
  const cal = t.appel('calendrier', { jeton }).data;
  assert.equal(cal.jours.length, 14);
  assert.equal(cal.jours.flatMap((j) => j.sorties).length, 0);
  assert.equal(cal.personnes.length, 1);
  ticNoyau(t.ctx);
  assert.equal(t.depot.lire('Sorties').length, 0);
  assert.equal(t.depot.lire('Regles').length, 0);
  assert.equal(t.depot.lire('Rappels').length, 0);
  assert.equal(t.mails.length, 0);
});
