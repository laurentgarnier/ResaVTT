// Les repères ({{…}}) listés dans l'admin sont exactement ceux que le code remplace : ni oubli dans l'aide, ni repère
// annoncé qui resterait tel quel dans le message.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { REPERES } from '../site/sorties/js/logique/modeles.js';
import { messagePartageSortie, messageAnnulationSortie } from '../site/sorties/js/logique/partage.js';
import { composerMessage } from '../backend/noyau/rappels.js';
import { contexteTest } from './aides/contexte-test.js';
import { ticNoyau } from '../backend/noyau/automate.js';

const TOUS = [...new Set([...Object.values(REPERES).flat(), 'inconnu', 'nom_sortie', 'lien_samedi', 'lien_dimanche', 'km'])];
const modeleTest = TOUS.map((r) => `${r}=[{{${r}}}]`).join('\n');
// Repères remplacés : ceux dont le {{…}} a disparu du texte produit.
const remplaces = (texte) => TOUS.filter((r) => !texte.includes(`{{${r}}}`)).sort();

const SORTIE = { id: 's1', titre: 'Boucle', date: '2026-11-20', heure: '13:30', point_rdv: 'PDL', km: '35', dplus: '450', createur_nom: 'Ludo', motif_annulation: 'Pluie', regle_id: 'sm', statut: 'ouverte' };

test('partage d\'une nouvelle sortie : repères listés = repères remplacés', () => {
  assert.deepEqual(remplaces(messagePartageSortie(SORTIE, null, 'https://x/sorties/', modeleTest)), [...REPERES.partage_whatsapp].sort());
});

test('annulation par l\'adhérent : repères listés = repères remplacés', () => {
  assert.deepEqual(remplaces(messageAnnulationSortie(SORTIE, 'https://x/sorties/', modeleTest)), [...REPERES.annulation_partage_whatsapp].sort());
});

test('rappels (individuels et groupés) : repères listés = repères remplacés, dans l\'objet comme dans le texte', () => {
  const m = composerMessage({ nom: 'Week-end', objet: modeleTest, texte: modeleTest }, [SORTIE], null, 'https://x/sorties/');
  assert.deepEqual(remplaces(m.texte), [...REPERES.rappel].sort());
  assert.deepEqual(remplaces(m.objet), [...REPERES.rappel].sort());
});

test('annulations envoyées automatiquement : repères listés = repères remplacés, dans l\'objet comme dans les textes', () => {
  const t = contexteTest({ maintenant: new Date(2026, 10, 12, 10, 0) });
  for (const cle of ['annulation_mail_objet', 'annulation_mail_corps', 'annulation_whatsapp']) {
    t.depot.modifier('Modeles', (l) => l.cle === cle, { valeur: modeleTest });
  }
  t.depot.modifier('Sorties', (s) => s.id === 'R:sm:2026-11-14:1', { statut: 'annulee', a_notifier: true, annulation_notifiee: false, motif_annulation: 'Vacances' });
  ticNoyau(t.ctx);
  const [liste, whatsapp] = t.mails.filter((m) => m.objet !== 'Sorties VTT : les inscriptions du week-end sont ouvertes');
  assert.ok(liste && whatsapp, JSON.stringify(t.mails.map((m) => m.objet)));
  assert.deepEqual(remplaces(liste.objet), [...REPERES.annulation].sort());
  assert.deepEqual(remplaces(liste.texte), [...REPERES.annulation].sort());
  assert.deepEqual(remplaces(whatsapp.texte.split('\n\nEnvoyer sur WhatsApp')[0]), [...REPERES.annulation].sort());
});
