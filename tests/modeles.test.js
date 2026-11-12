import { test } from 'node:test';
import assert from 'node:assert/strict';
import { remplirModele, lienWhatsApp, listeAnnulations, MODELES_DEFAUT } from '../site/sorties/js/logique/modeles.js';

test('rappel WhatsApp : texte exact et lien vers un numéro', () => {
  const t = remplirModele(MODELES_DEFAUT.rappel_whatsapp, { lien: 'https://x.github.io/sorties/' });
  assert.equal(t, "Les sorties du week-end sont ouvertes !\n📱 Vous avez l'appli : ouvrez-la depuis votre écran d'accueil.\n🌐 Pas encore installée : https://x.github.io/sorties/");
  assert.ok(lienWhatsApp('a b', '+33612345678').startsWith('https://wa.me/33612345678?text=a%20b'));
  assert.ok(lienWhatsApp('a').startsWith('https://wa.me/?text='));
  assert.ok(lienWhatsApp('a', '').startsWith('https://wa.me/?text='));
});

test('clé inconnue laissée intacte', () => {
  assert.equal(remplirModele('{{a}} {{b}}', { a: '1' }), '1 {{b}}');
});

test('les 6 modèles par défaut existent', () => {
  assert.deepEqual(Object.keys(MODELES_DEFAUT).sort(), ['annulation_mail_corps', 'annulation_mail_objet', 'annulation_whatsapp', 'rappel_mail_corps', 'rappel_mail_objet', 'rappel_whatsapp']);
  assert.match(MODELES_DEFAUT.annulation_whatsapp, /\{\{liste_annulations\}\}/);
});

test('liste des annulations : une ligne par sortie', () => {
  const t = listeAnnulations([
    { date: '2026-11-14', heure: '09:00', titre: 'Cool', motif_annulation: 'Chasse' },
    { date: '2026-11-14', heure: '14:00', titre: 'Sam. après-midi', motif_annulation: '' },
  ]);
  assert.equal(t, '• Samedi 14 novembre 09:00 – Cool (Chasse)\n• Samedi 14 novembre 14:00 – Sam. après-midi');
});
