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
  assert.match(html, /\{\{lien_samedi\}\} et \{\{lien_dimanche\}\}/);
});

test('modèles et paramètres affichés échappés', () => {
  const d = donneesAdmin();
  d.modeles.rappel_whatsapp = '</textarea><script>x</script>';
  d.parametres.point_rdv_defaut = '"><script>y</script>';
  assert.doesNotMatch(renderAdmin(d, 'messages'), /<script>x/);
  assert.doesNotMatch(renderAdmin(d, 'parametres'), /<script>y/);
});

test("liste des récurrences : « Modifier » et « Nouvelle récurrence » mènent à un écran d'édition dédié, sans formulaire sous la liste", () => {
  const d = donneesAdmin();
  const html = renderAdmin(d, 'recurrences');
  assert.doesNotMatch(html, /id="form-regle"/);
  assert.match(html, /href="#\/admin\/recurrences\/nouvelle"[^>]*>\+ Nouvelle récurrence/);
  const r = d.regles[0];
  assert.match(html, new RegExp(`href="#/admin/recurrences/${encodeURIComponent(r.id)}"[^>]*>✎ Modifier`));
  assert.ok(html.indexOf('+ Nouvelle récurrence') < html.indexOf(r.nom), 'le bouton de création est en tête de liste');
});

test("écran d'édition d'une récurrence : seulement son formulaire rempli, retour vers la liste", () => {
  const d = donneesAdmin();
  const r = d.regles.find((x) => x.nom === 'Samedi matin');
  const html = renderAdmin(d, 'recurrences', { regleEditee: r.id });
  assert.match(html, /id="form-regle"/);
  assert.match(html, new RegExp(`data-id="${r.id}"`));
  assert.match(html, /✎ Modifier « Samedi matin »/);
  assert.match(html, /name="nom" value="Samedi matin"/);
  assert.match(html, />Cool\nInter\nSportif<\/textarea>/);
  assert.match(html, /href="#\/admin\/recurrences"[^>]*>‹ Récurrences/);
  assert.doesNotMatch(html, /Dimanche matin/);
  assert.doesNotMatch(html, /class="menu-admin"/);
});

test("écran de création d'une récurrence : formulaire vide ; récurrence inconnue : message et retour", () => {
  const d = donneesAdmin();
  const nouvelle = renderAdmin(d, 'recurrences', { regleEditee: 'nouvelle' });
  assert.match(nouvelle, /\+ Nouvelle récurrence/);
  assert.match(nouvelle, /id="form-regle" data-id=""/);
  assert.match(nouvelle, /name="nom" value=""/);
  const inconnue = renderAdmin(d, 'recurrences', { regleEditee: 'n-existe-pas' });
  assert.match(inconnue, /Cette récurrence n'existe plus/);
  assert.match(inconnue, /href="#\/admin\/recurrences"/);
});

test('onglet statistiques : chiffres de l\'année, choix de l\'année, participants par mois et par demi-journée', () => {
  const s = {
    annee: 2026, annees: [2026, 2025], sorties: 120, annulees: 3, participants: 1050,
    par_mois: Array.from({ length: 12 }, (_, i) => ({ mois: i + 1, sorties: i === 10 ? 12 : 0, participants: i === 10 ? 96 : 0 })),
    par_demi_journee: Array.from({ length: 7 }, (_, jour) => ({ jour, matin: jour === 5 ? 400 : 0, apres_midi: jour === 2 ? 75 : 0 })),
  };
  const html = renderAdmin(s, 'stats');
  assert.match(html, /class="on"[^>]*>Statistiques/);
  assert.match(html, /<b>120<\/b>\s*sorties proposées/);
  assert.match(html, /<b>1050<\/b>\s*participants/);
  assert.match(html, /8,8 par sortie/);
  assert.match(html, /3 sorties annulées/);
  assert.match(html, /href="#\/admin\/stats\/2025"/);
  assert.match(html, /class="on"[^>]*>2026/);
  assert.match(html, /Novembre<\/span>[\s\S]*?96 participants · 12 sorties/);
  assert.match(html, /Samedi[\s\S]*?400/);
  assert.match(html, /Mercredi[\s\S]*?75/);
});

test('onglet statistiques : année sans sortie', () => {
  const s = { annee: 2026, annees: [2026], sorties: 0, annulees: 0, participants: 0,
    par_mois: Array.from({ length: 12 }, (_, i) => ({ mois: i + 1, sorties: 0, participants: 0 })),
    par_demi_journee: Array.from({ length: 7 }, (_, jour) => ({ jour, matin: 0, apres_midi: 0 })) };
  const html = renderAdmin(s, 'stats');
  assert.match(html, /Aucune sortie passée en 2026/);
  assert.doesNotMatch(html, /NaN|Infinity/);
});
