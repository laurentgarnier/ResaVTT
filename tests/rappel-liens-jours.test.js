import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contexteTest } from './aides/contexte-test.js';
import { envoyerRappel } from '../backend/noyau/automate.js';
import { prochainJour } from '../site/sorties/js/logique/dates.js';
import { MODELES_DEFAUT } from '../site/sorties/js/logique/modeles.js';

const URL_APPLI = 'https://club.example.org/sorties/';

function preparer(maintenant, corps) {
  const t = contexteTest({ maintenant });
  const regler = (onglet, cle, valeur) => {
    if (!t.depot.modifier(onglet, (l) => l.cle === cle, { valeur })) t.depot.ajouter(onglet, [{ cle, valeur }]);
  };
  regler('Parametres', 'url_appli', URL_APPLI);
  regler('Modeles', 'rappel_mail_corps', corps);
  regler('Modeles', 'rappel_whatsapp', corps);
  return t;
}

test('prochainJour : le jour même compte, sinon le suivant de la semaine (lundi = 0)', () => {
  assert.equal(prochainJour('2026-11-12', 5), '2026-11-14'); // jeudi → samedi
  assert.equal(prochainJour('2026-11-12', 6), '2026-11-15'); // jeudi → dimanche
  assert.equal(prochainJour('2026-11-14', 5), '2026-11-14'); // samedi → samedi même
  assert.equal(prochainJour('2026-11-15', 5), '2026-11-21'); // dimanche → samedi suivant
  assert.equal(prochainJour('2026-12-31', 5), '2027-01-02'); // passage d'année
});

test('rappel du jeudi : {{lien_samedi}} et {{lien_dimanche}} mènent aux pages du week-end qui suit, dans le mail et le message WhatsApp', () => {
  const t = preparer(new Date(2026, 10, 12, 18, 5), 'Samedi : {{lien_samedi}}\nDimanche : {{lien_dimanche}}\nAppli : {{lien}}');
  envoyerRappel(t.ctx, 'rappel:test');
  const [liste, whatsapp] = t.mails;
  assert.equal(liste.texte, `Samedi : ${URL_APPLI}#/jour/2026-11-14\nDimanche : ${URL_APPLI}#/jour/2026-11-15\nAppli : ${URL_APPLI}`);
  assert.match(whatsapp.texte, /Samedi : https:\/\/club\.example\.org\/sorties\/#\/jour\/2026-11-14/);
  // Dans le lien wa.me, le # du lien est encodé : il ne coupe pas le texte du message.
  assert.match(whatsapp.html, /wa\.me\/[^"]*%23%2Fjour%2F2026-11-14/);
});

test('rappel envoyé un samedi : le lien samedi désigne ce samedi-là', () => {
  const t = preparer(new Date(2026, 10, 14, 9, 0), '{{lien_samedi}} {{lien_dimanche}}');
  envoyerRappel(t.ctx, 'rappel:test');
  assert.equal(t.mails[0].texte, `${URL_APPLI}#/jour/2026-11-14 ${URL_APPLI}#/jour/2026-11-15`);
});

test('adresse de l\'appli sans « / » final : les liens restent valides', () => {
  const t = preparer(new Date(2026, 10, 12, 18, 5), '{{lien_samedi}}');
  t.depot.modifier('Parametres', (l) => l.cle === 'url_appli', { valeur: 'https://club.example.org/sorties' });
  envoyerRappel(t.ctx, 'rappel:test');
  assert.equal(t.mails[0].texte, 'https://club.example.org/sorties/#/jour/2026-11-14');
});

test('les textes par défaut du rappel proposent les liens du samedi et du dimanche', () => {
  for (const cle of ['rappel_mail_corps', 'rappel_whatsapp']) {
    assert.match(MODELES_DEFAUT[cle], /\{\{lien_samedi\}\}/);
    assert.match(MODELES_DEFAUT[cle], /\{\{lien_dimanche\}\}/);
    assert.match(MODELES_DEFAUT[cle], /\{\{lien\}\}/);
  }
});
