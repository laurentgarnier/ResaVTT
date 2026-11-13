import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contexteTest } from './aides/contexte-test.js';

test("avec_calendrier : une écriture renvoie le calendrier à jour dans la même réponse", () => {
  const t = contexteTest();
  const jeton = t.connecter('0600000002');
  const avant = t.appel('calendrier', { jeton }).data;
  const sortie = avant.jours.find((j) => j.date === '2026-11-14').sorties[0];
  const personne = avant.personnes[0];
  const r = t.appel('inscription', { jeton, sortie_id: sortie.id, personne_ids: [personne.id], inscrit: true, avec_calendrier: true });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.ok(r.calendrier, 'calendrier absent de la réponse');
  const apres = r.calendrier.jours.find((j) => j.date === '2026-11-14').sorties.find((s) => s.id === sortie.id);
  const nbAvant = sortie.inscrits.length;
  assert.equal(apres.inscrits.length, nbAvant + 1);
});

test("sans avec_calendrier, ou si l'action échoue, aucun calendrier n'est joint", () => {
  const t = contexteTest();
  const jeton = t.connecter('0600000002');
  const sansDemande = t.appel('personnes_enregistrer', { jeton, personnes: [{ nom_affiche: 'Ben' }] });
  assert.equal(sansDemande.ok, true);
  assert.equal(sansDemande.calendrier, undefined);
  const echec = t.appel('inscription', { jeton, sortie_id: 'inexistante', personne_ids: [], inscrit: true, avec_calendrier: true });
  assert.equal(echec.ok, false);
  assert.equal(echec.calendrier, undefined);
});

test("avec_calendrier après validation du code admin : le calendrier joint reflète admin_verifie", () => {
  const t = contexteTest();
  const jeton = t.connecter('0611111111');
  t.appel('admin_code_demander', { jeton });
  const code = t.mails.at(-1).texte.match(/\b(\d{6})\b/)[1];
  const r = t.appel('admin_code_verifier', { jeton, code, avec_calendrier: true });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.calendrier.admin_verifie, true);
});
