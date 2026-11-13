import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contexteTest } from './aides/contexte-test.js';
import { purger } from '../backend/noyau/automate.js';
import { PARAMETRES_DEFAUT } from '../backend/noyau/schema.js';

function adminVerifie(t) {
  const jeton = t.connecter('0611111111');
  t.depot.modifier('Jetons', (j) => j.jeton_hash === t.ctx.services.hacher(jeton), { admin_verifie: true });
  return jeton;
}

// Repart d'un classeur sans sortie ni bilan, puis pose les sorties voulues avec leur nombre d'inscrits.
function viderEtPoser(t, sorties) {
  for (const o of ['Bilan', 'Sorties', 'Inscriptions']) t.depot.supprimer(o, () => true);
  for (const s of sorties) {
    t.depot.ajouter('Sorties', [{ id: s.id, date: s.date, heure: s.heure, titre: s.id, statut: s.statut || 'ouverte' }]);
    t.depot.ajouter('Inscriptions', Array.from({ length: s.inscrits }, (_, i) => ({ sortie_id: s.id, personne_id: `p${i}`, nom_affiche: `P${i}`, telephone: '' })));
  }
}

test('les données sont conservées 1 mois par défaut', () => {
  assert.equal(PARAMETRES_DEFAUT.conservation_mois, '1');
});

test('purge : chaque sortie supprimée laisse une ligne de bilan anonyme (date, heure, statut, nombre de participants)', () => {
  const t = contexteTest({ maintenant: new Date(2026, 10, 12, 20, 0) });
  t.depot.modifier('Parametres', (l) => l.cle === 'conservation_mois', { valeur: '1' });
  t.depot.supprimer('Bilan', () => true);
  const anciennes = t.depot.lire('Sorties').filter((s) => s.date < '2026-11-20');
  const inscrits = (id) => t.depot.lire('Inscriptions').filter((i) => i.sortie_id === id).length;
  const attendu = anciennes.map((s) => ({ sortie_id: s.id, date: s.date, heure: s.heure, statut: s.statut, participants: String(inscrits(s.id)) }));
  assert.ok(anciennes.length > 0);

  purger(t.ctx, '2026-12-20');

  assert.equal(t.depot.lire('Sorties').filter((s) => s.date < '2026-11-20').length, 0);
  const bilan = t.depot.lire('Bilan');
  assert.deepEqual(bilan.map((b) => ({ sortie_id: b.sortie_id, date: b.date, heure: b.heure, statut: b.statut, participants: b.participants })), attendu);
  assert.ok(bilan.every((b) => !('telephone' in b) && !('nom_affiche' in b)));
  purger(t.ctx, '2026-12-21');
  assert.equal(t.depot.lire('Bilan').length, attendu.length);
});

test('statistiques de l\'année : sorties proposées, participants, par mois et par demi-journée, bilan et sorties encore présentes réunis', () => {
  const t = contexteTest({ maintenant: new Date(2026, 10, 12, 20, 0) });
  const jeton = adminVerifie(t);
  viderEtPoser(t, [
    { id: 'a', date: '2026-11-07', heure: '09:00', inscrits: 5 }, // samedi matin
    { id: 'b', date: '2026-11-07', heure: '14:00', inscrits: 3 }, // samedi après-midi
    { id: 'c', date: '2026-11-12', heure: '19:30', inscrits: 2 }, // jeudi soir, déjà commencée
    { id: 'd', date: '2026-11-12', heure: '20:30', inscrits: 4 }, // pas encore partie : ignorée
    { id: 'e', date: '2026-11-14', heure: '09:00', inscrits: 9 }, // à venir : ignorée
    { id: 'f', date: '2026-11-08', heure: '09:00', inscrits: 6, statut: 'annulee' },
  ]);
  t.depot.ajouter('Bilan', [
    { sortie_id: 'h1', date: '2026-01-04', heure: '09:00', statut: 'ouverte', participants: '7' }, // dimanche matin
    { sortie_id: 'h2', date: '2026-03-18', heure: '14:00', statut: 'ouverte', participants: '4' }, // mercredi après-midi
    { sortie_id: 'h3', date: '2026-03-21', heure: '09:00', statut: 'annulee', participants: '2' },
    { sortie_id: 'h4', date: '2025-12-27', heure: '09:00', statut: 'ouverte', participants: '8' }, // autre année
    { sortie_id: 'a', date: '2026-11-07', heure: '09:00', statut: 'ouverte', participants: '5' }, // déjà dans Sorties : pas compté deux fois
  ]);

  const r = t.appel('admin_stats', { jeton });
  assert.equal(r.ok, true);
  const s = r.data;
  assert.equal(s.annee, 2026);
  assert.deepEqual(s.annees, [2026, 2025]);
  assert.equal(s.sorties, 5);
  assert.equal(s.annulees, 2);
  assert.equal(s.participants, 7 + 4 + 5 + 3 + 2);
  assert.equal(s.par_mois.length, 12);
  assert.deepEqual(s.par_mois[0], { mois: 1, sorties: 1, participants: 7 });
  assert.deepEqual(s.par_mois[2], { mois: 3, sorties: 1, participants: 4 });
  assert.deepEqual(s.par_mois[10], { mois: 11, sorties: 3, participants: 10 });
  assert.deepEqual(s.par_mois[5], { mois: 6, sorties: 0, participants: 0 });
  assert.equal(s.par_demi_journee.length, 7);
  assert.deepEqual(s.par_demi_journee[5], { jour: 5, matin: 5, apres_midi: 3 });
  assert.deepEqual(s.par_demi_journee[6], { jour: 6, matin: 7, apres_midi: 0 });
  assert.deepEqual(s.par_demi_journee[2], { jour: 2, matin: 0, apres_midi: 4 });
  assert.deepEqual(s.par_demi_journee[3], { jour: 3, matin: 0, apres_midi: 2 });

  const avant = t.appel('admin_stats', { jeton, annee: 2025 }).data;
  assert.equal(avant.annee, 2025);
  assert.equal(avant.sorties, 1);
  assert.equal(avant.participants, 8);
});

test('statistiques réservées aux administrateurs vérifiés', () => {
  const t = contexteTest();
  assert.equal(t.appel('admin_stats', { jeton: t.connecter('0600000002') }).erreur, 'admin_non_verifie');
  assert.equal(t.appel('admin_stats', { jeton: t.connecter('0611111111') }).erreur, 'admin_non_verifie');
});

test('jeu de démonstration : un an d\'historique dans le bilan pour que les statistiques aient de quoi montrer', () => {
  const t = contexteTest();
  const s = t.appel('admin_stats', { jeton: adminVerifie(t) }).data;
  assert.ok(s.sorties > 100, `sorties : ${s.sorties}`);
  assert.ok(s.par_mois.slice(0, 11).every((m) => m.sorties > 0)); // janvier à novembre 2026
  assert.ok(s.annees.includes(2025));
  assert.ok(s.par_demi_journee[5].matin > s.par_demi_journee[0].matin);
});
