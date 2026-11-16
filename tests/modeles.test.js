import { test } from 'node:test';
import assert from 'node:assert/strict';
import { remplirModele, lienWhatsApp, listeAnnulations, MODELES_DEFAUT, sansEmojis } from '../site/sorties/js/logique/modeles.js';

test('rappel par défaut : texte exact et lien WhatsApp vers un numéro', () => {
  const t = remplirModele(MODELES_DEFAUT.rappel_individuel_texte, { lien: 'https://x.github.io/sorties/', liste_sorties: 'L' });
  assert.equal(t, "Les inscriptions sont ouvertes !\nL\n📱 Vous avez l'appli : ouvrez-la depuis votre écran d'accueil.\n🌐 Pas encore installée : https://x.github.io/sorties/");
  assert.ok(lienWhatsApp('a b', '+33612345678').startsWith('https://wa.me/33612345678?text=a%20b'));
  assert.ok(lienWhatsApp('a').startsWith('https://wa.me/?text='));
  assert.ok(lienWhatsApp('a', '').startsWith('https://wa.me/?text='));
});

test('clé inconnue laissée intacte', () => {
  assert.equal(remplirModele('{{a}} {{b}}', { a: '1' }), '1 {{b}}');
});

test('les modèles par défaut existent, dont ceux des rappels individuels et groupés', () => {
  assert.deepEqual(Object.keys(MODELES_DEFAUT).sort(), ['annulation_mail_corps', 'annulation_mail_objet', 'annulation_whatsapp', 'partage_whatsapp', 'rappel_groupe_objet', 'rappel_groupe_texte',
    'rappel_individuel_objet', 'rappel_individuel_texte']);
  assert.match(MODELES_DEFAUT.annulation_whatsapp, /\{\{liste_annulations\}\}/);
});

test('liste des annulations : une ligne par sortie', () => {
  const t = listeAnnulations([
    { date: '2026-11-14', heure: '09:00', titre: 'Cool', motif_annulation: 'Chasse' },
    { date: '2026-11-14', heure: '14:00', titre: 'Sam. après-midi', motif_annulation: '' },
  ]);
  assert.equal(t, '• Samedi 14 novembre 09:00 – Cool (Chasse)\n• Samedi 14 novembre 14:00 – Sam. après-midi');
});

test('WhatsApp : les emojis sont retirés (ils s\'affichent en caractères inconnus), avec l\'espace qui les suit', () => {
  assert.equal(sansEmojis('🚵 Nouvelle sortie\n   👉 Inscriptions\n☀️ Ensoleillé, 8–11°\n📱 Vous avez l\'appli 👨‍👩‍👧 !'), "Nouvelle sortie\n   Inscriptions\nEnsoleillé, 8–11°\nVous avez l'appli !");
  const texte = decodeURIComponent(lienWhatsApp('🚵 Sortie – 9 h · PDL ✅').split('text=')[1]);
  assert.equal(texte, 'Sortie – 9 h · PDL ');
});

test('modèle par défaut du message WhatsApp de partage d\'une nouvelle sortie', () => {
  assert.equal(MODELES_DEFAUT.partage_whatsapp, 'Nouvelle sortie : {{titre}}\n{{date}} {{heure}} – {{point_rdv}}\n{{distances}}\n{{meteo}}\nInscriptions : {{lien_sortie}}');
});
