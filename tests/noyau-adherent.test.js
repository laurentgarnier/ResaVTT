import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contexteTest, PORTEUR } from './aides/contexte-test.js';

const samedi = (c) => c.jours.find((j) => j.date === '2026-11-14');

test('connexion au format libre ; inconnu refusé ; jeton stocké haché', () => {
  const t = contexteTest();
  const r = t.appel('connexion', { telephone: '06 00 00 00 02' });
  assert.equal(r.ok, true);
  assert.equal(r.data.nom, 'Ben');
  assert.equal(r.data.est_admin, false);
  const inconnu = t.appel('connexion', { telephone: '0699999999' });
  assert.equal(inconnu.erreur, 'numero_inconnu');
  assert.equal(inconnu.message, 'Numéro inconnu. Contactez le secrétaire.');
  const jetons = t.depot.lire('Jetons');
  assert.ok(!JSON.stringify(jetons).includes(r.data.jeton));
  assert.equal(jetons.at(-1).jeton_hash, t.ctx.services.hacher(r.data.jeton));
});

test('le porteur est administrateur et a Léo dans son compte', () => {
  const t = contexteTest();
  const jeton = t.connecter('06 11 11 11 11');
  const c = t.appel('calendrier', { jeton }).data;
  assert.equal(c.est_admin, true);
  assert.equal(c.admin_verifie, false);
  assert.deepEqual(c.personnes.map((p) => p.nom_affiche), ['Porteur', 'Léo']);
  assert.equal(c.moi.telephone, PORTEUR.telephone);
});

test("adhérent désactivé dans Adherents → non_connecte à l'appel suivant", () => {
  const t = contexteTest();
  const jeton = t.connecter('0600000002');
  t.adherents.find((a) => a.nom === 'Ben').actif = false;
  assert.equal(t.appel('calendrier', { jeton }).erreur, 'non_connecte');
});

test('calendrier : 14 jours, samedi à 4 sorties, Inter à 09:30, aucun numéro dans la réponse', () => {
  const t = contexteTest();
  const c = t.appel('calendrier', { jeton: t.connecter('0600000002') }).data;
  assert.equal(c.jours.length, 14);
  assert.equal(c.aujourdhui, '2026-11-12');
  assert.equal(c.jours[0].passe, true);
  assert.equal(c.jours[3].passe, false);
  const sam = samedi(c);
  assert.deepEqual(sam.sorties.map((s) => s.titre), ['Cool', 'Inter', 'Sportif', 'Sam. après-midi']);
  assert.equal(sam.sorties[1].heure, '09:30');
  assert.equal(sam.sorties[1].modifie_par, 'Ben');
  assert.equal(sam.sorties[1].inscrits.length, 18);
  assert.equal(sam.sorties[0].inscrits.length, 12);
  assert.ok(!JSON.stringify(c.jours).includes('+33'));
  assert.equal(c.parametres.point_rdv_defaut, 'Place de la mairie');
});

test('inscrits triés, inscrit_par, traces et messages', () => {
  const t = contexteTest();
  const sam = samedi(t.appel('calendrier', { jeton: t.connecter('0600000002') }).data);
  const inter = sam.sorties[1];
  const noms = inter.inscrits.map((i) => i.nom_affiche);
  assert.deepEqual(noms, [...noms].sort((a, b) => a.localeCompare(b, 'fr')));
  assert.equal(inter.inscrits.find((i) => i.nom_affiche === 'Gérard').inscrit_par, 'Jo');
  assert.equal(inter.inscrits.find((i) => i.nom_affiche === 'Jo').inscrit_par, null);
  assert.equal(inter.nb_messages, 3);
  assert.deepEqual(sam.sorties[0].traces.map((x) => x.nom_fichier), ['boucle-foret.gpx', 'variante-courte.gpx']);
  assert.ok(Number(sam.sorties[0].traces[0].km) > 15);
});

test('dimanche courant fermé : sortie annulée avec motif', () => {
  const t = contexteTest();
  const c = t.appel('calendrier', { jeton: t.connecter('0600000002') }).data;
  const dim = c.jours.find((j) => j.date === '2026-11-15').sorties[0];
  assert.equal(dim.statut, 'annulee');
  assert.equal(dim.motif_annulation, 'Arrêté préfectoral, chasse');
  assert.equal(dim.inscriptions_ouvertes, false);
  const dimSuivant = c.jours.find((j) => j.date === '2026-11-22').sorties[0];
  assert.equal(dimSuivant.statut, 'ouverte');
});

test('inscription multiple sur le même créneau', () => {
  const t = contexteTest();
  const jeton = t.connecter('0600000002');
  const c0 = t.appel('calendrier', { jeton }).data;
  const sam0 = samedi(c0);
  const [moi] = c0.personnes;
  for (const s of sam0.sorties.slice(0, 2)) {
    assert.equal(t.appel('inscription', { jeton, sortie_id: s.id, personne_ids: [moi.id], inscrit: true }).ok, true);
  }
  const sam = samedi(t.appel('calendrier', { jeton }).data);
  assert.equal(sam.sorties[0].inscrits.length, 13);
  assert.ok(sam.sorties[0].inscrits.find((i) => i.nom_affiche === 'Ben').a_moi);
  assert.ok(sam.sorties[1].inscrits.find((i) => i.nom_affiche === 'Ben').a_moi);
  t.appel('inscription', { jeton, sortie_id: sam0.sorties[0].id, personne_ids: [moi.id], inscrit: false });
  assert.equal(samedi(t.appel('calendrier', { jeton }).data).sorties[0].inscrits.length, 12);
});

test("inscription refusée après l'heure du rendez-vous", () => {
  const t = contexteTest();
  const jeton = t.connecter('0600000002');
  const c = t.appel('calendrier', { jeton }).data;
  t.regler(new Date(2026, 10, 14, 9, 5));
  const r = t.appel('inscription', { jeton, sortie_id: 'R:sm:2026-11-14:1', personne_ids: [c.personnes[0].id], inscrit: true });
  assert.equal(r.erreur, 'inscriptions_closes');
  assert.equal(r.message, 'Inscriptions closes');
  const r2 = t.appel('inscription', { jeton, sortie_id: 'R:sm:2026-11-14:2', personne_ids: [c.personnes[0].id], inscrit: true });
  assert.equal(r2.ok, true);
});

test("inscription d'une personne d'un autre compte ou sur sortie annulée refusée", () => {
  const t = contexteTest();
  const jeton = t.connecter('0600000002');
  const [moi] = t.appel('calendrier', { jeton }).data.personnes;
  assert.equal(t.appel('inscription', { jeton, sortie_id: 'R:sm:2026-11-14:1', personne_ids: ['p-leo'], inscrit: true }).erreur, 'personne_inconnue');
  assert.equal(t.appel('inscription', { jeton, sortie_id: 'R:dm:2026-11-15:1', personne_ids: [moi.id], inscrit: true }).erreur, 'sortie_annulee');
});

test('personnes_enregistrer : retirer Léo supprime ses inscriptions à venir', () => {
  const t = contexteTest();
  const jeton = t.connecter('0611111111');
  const c = t.appel('calendrier', { jeton }).data;
  const [porteur, leo] = c.personnes;
  t.appel('inscription', { jeton, sortie_id: 'R:sm:2026-11-14:1', personne_ids: [porteur.id, leo.id], inscrit: true });
  const r = t.appel('personnes_enregistrer', { jeton, personnes: [{ id: porteur.id, nom_affiche: 'Porteur' }, { nom_affiche: 'Lucas' }] });
  assert.equal(r.ok, true);
  const c2 = t.appel('calendrier', { jeton }).data;
  assert.deepEqual(c2.personnes.map((p) => p.nom_affiche), ['Porteur', 'Lucas']);
  const cool = samedi(c2).sorties[0];
  assert.ok(cool.inscrits.some((i) => i.nom_affiche === 'Porteur'));
  assert.ok(!cool.inscrits.some((i) => i.nom_affiche === 'Léo'));
  assert.equal(t.appel('personnes_enregistrer', { jeton, personnes: [] }).erreur, 'personnes_vides');
});

test('sans jeton → non_connecte ; déconnexion invalide le jeton ; action inconnue', () => {
  const t = contexteTest();
  assert.equal(t.appel('calendrier', {}).erreur, 'non_connecte');
  const jeton = t.connecter('0600000002');
  assert.equal(t.appel('action_bidon', { jeton }).erreur, 'action_inconnue');
  assert.equal(t.appel('deconnexion', { jeton }).ok, true);
  assert.equal(t.appel('calendrier', { jeton }).erreur, 'non_connecte');
});
