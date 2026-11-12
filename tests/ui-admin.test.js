import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contexteTest } from './aides/contexte-test.js';
import { renderAdmin, renderCode } from '../site/sorties/js/ui/admin.js';

function donneesAdmin(preparer) {
  const t = contexteTest();
  const jeton = t.connecter('0611111111');
  t.depot.modifier('Jetons', (j) => j.jeton_hash === t.ctx.services.hacher(jeton), { admin_verifie: true });
  if (preparer) preparer(t, jeton);
  return t.appel('admin_lire', { jeton }).data;
}

test('écran du code : demande puis saisie, essais restants', () => {
  assert.match(renderCode({ envoye: false }), /Recevoir un code par email/);
  const html = renderCode({ envoye: true, erreur: 'Code incorrect.', essais_restants: 3 });
  assert.match(html, /Un code a été envoyé à votre adresse email\./);
  assert.match(html, /inputmode="numeric"/);
  assert.match(html, /Code incorrect\. \(3 essais restants\)/);
});

test('onglet récurrences : 3 règles initiales et leurs sorties', () => {
  const html = renderAdmin(donneesAdmin(), 'recurrences');
  for (const nom of ['Samedi matin', 'Samedi après-midi', 'Dimanche matin']) assert.match(html, new RegExp(nom));
  assert.match(html, /<li>Cool<\/li><li>Inter<\/li><li>Sportif<\/li>/);
  assert.match(html, /Chaque semaine · 09:00 · Place de la mairie/);
  assert.match(html, /\+ Nouvelle récurrence/);
  assert.match(html, /class="on"[^>]*>Récurrences/);
});

test('onglet fermetures : fermeture existante et formulaire', () => {
  const html = renderAdmin(donneesAdmin(), 'fermetures');
  assert.match(html, /Arrêté préfectoral, chasse/);
  assert.match(html, /Toutes les sorties récurrentes/);
  assert.match(html, /name="motif"/);
});

test('onglet paramètres : numéro WhatsApp et URL de l\'appli', () => {
  const html = renderAdmin(donneesAdmin(), 'parametres');
  assert.match(html, /name="whatsapp_numero" value="\+33611111111"/);
  assert.match(html, /name="url_appli"/);
  assert.match(html, /Rechercher/);
});

test('onglet messages : bouton « Envoyer le rappel maintenant » et historique des envois', () => {
  const d = donneesAdmin((t, jeton) => t.appel('rappel_envoyer_maintenant', { jeton }));
  const html = renderAdmin(d, 'messages');
  assert.match(html, /Envoyer le rappel maintenant/);
  assert.match(html, /rappel:manuel:/);
  assert.match(html, /class="ok">✓ mail/);
  assert.match(html, /name="rappel_whatsapp"/);
});

test('modèles et paramètres affichés échappés', () => {
  const d = donneesAdmin();
  d.modeles.rappel_whatsapp = '</textarea><script>x</script>';
  d.parametres.point_rdv_defaut = '"><script>y</script>';
  assert.doesNotMatch(renderAdmin(d, 'messages'), /<script>x/);
  assert.doesNotMatch(renderAdmin(d, 'parametres'), /<script>y/);
});
