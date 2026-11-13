import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contexteTest } from './aides/contexte-test.js';

const sortieDe = (t, jeton, id) => t.appel('calendrier', { jeton }).data.jours.flatMap((j) => j.sorties).find((s) => s.id === id);
// Le code administrateur est testé à la Tâche 7 ; ici on marque directement le jeton comme vérifié.
const verifierAdmin = (t, jeton) => {
  const hash = t.ctx.services.hacher(jeton);
  assert.equal(t.depot.modifier('Jetons', (j) => j.jeton_hash === hash, { admin_verifie: true }), 1);
};

test('sortie libre créée : créateur inscrit, visible au calendrier', () => {
  const t = contexteTest();
  const jeton = t.connecter('0600000002');
  const [moi] = t.appel('calendrier', { jeton }).data.personnes;
  const r = t.appel('sortie_creer', { jeton, date: '2026-11-13', heure: '14:00', titre: 'Sortie de Ben', point_rdv: 'Place de la mairie', personne_ids: [moi.id] });
  assert.equal(r.ok, true);
  const s = sortieDe(t, jeton, r.data.id);
  assert.equal(s.type, 'libre');
  assert.equal(s.createur_nom, 'Ben');
  assert.deepEqual(s.inscrits.map((i) => i.nom_affiche), ['Ben']);
  assert.equal(s.peut_modifier, true);
  assert.equal(t.appel('sortie_creer', { jeton, date: '2026-11-13', heure: '', titre: 'x', point_rdv: 'y', personne_ids: [] }).erreur, 'champs_invalides');
});

test("Ben change l'heure du samedi matin → message système, modifie_par Ben", () => {
  const t = contexteTest();
  const jeton = t.connecter('0600000002');
  assert.equal(t.appel('sortie_horaire', { jeton, sortie_id: 'R:sm:2026-11-14:1', heure: '08:45' }).ok, true);
  const s = sortieDe(t, jeton, 'R:sm:2026-11-14:1');
  assert.equal(s.heure, '08:45');
  assert.equal(s.modifie_par, 'Ben');
  const msgs = t.appel('discussion_lire', { jeton, sortie_id: s.id }).data;
  assert.equal(msgs.at(-1).texte, "Ben a changé l'horaire : 08:45.");
  assert.equal(msgs.at(-1).systeme, true);
  assert.equal(t.appel('sortie_horaire', { jeton, sortie_id: s.id, heure: '8h' }).erreur, 'champs_invalides');
});

test('Ben ne peut ni modifier ni annuler la sortie de Ludo', () => {
  const t = contexteTest();
  const jeton = t.connecter('0600000002');
  const r1 = t.appel('sortie_modifier', { jeton, sortie_id: 'libre-etangs', titre: 'x' });
  assert.equal(r1.erreur, 'interdit');
  assert.equal(r1.message, 'Action réservée au créateur ou à un administrateur.');
  assert.equal(t.appel('sortie_annuler', { jeton, sortie_id: 'libre-etangs', motif: 'x' }).erreur, 'interdit');
  assert.equal(t.appel('sortie_horaire', { jeton, sortie_id: 'libre-etangs', heure: '10:00' }).erreur, 'interdit');
});

test("le créateur modifie sa sortie libre", () => {
  const t = contexteTest();
  const jeton = t.connecter('0600000003');
  assert.equal(t.appel('sortie_modifier', { jeton, sortie_id: 'libre-etangs', titre: 'Étangs et bois', km: '38' }).ok, true);
  const s = sortieDe(t, jeton, 'libre-etangs');
  assert.equal(s.titre, 'Étangs et bois');
  assert.equal(s.km, '38');
  assert.equal(s.type, 'libre');
});

test("annulation par admin vérifié → a_notifier vrai ; par créateur d'une libre → faux", () => {
  const t = contexteTest();
  const admin = t.connecter('0611111111');
  assert.equal(t.appel('sortie_annuler', { jeton: admin, sortie_id: 'R:sm:2026-11-21:1', motif: 'Météo' }).erreur, 'interdit');
  verifierAdmin(t, admin);
  assert.equal(t.appel('sortie_annuler', { jeton: admin, sortie_id: 'R:sm:2026-11-21:1', motif: 'Météo' }).ok, true);
  const rec = t.depot.lire('Sorties').find((s) => s.id === 'R:sm:2026-11-21:1');
  assert.equal(rec.statut, 'annulee');
  assert.equal(rec.motif_annulation, 'Météo');
  assert.equal(rec.a_notifier, true);
  const ludo = t.connecter('0600000003');
  t.appel('sortie_annuler', { jeton: ludo, sortie_id: 'libre-etangs', motif: 'Blessé' });
  const libre = t.depot.lire('Sorties').find((s) => s.id === 'libre-etangs');
  assert.equal(libre.statut, 'annulee');
  assert.equal(libre.a_notifier, false);
  const msgs = t.appel('discussion_lire', { jeton: ludo, sortie_id: 'libre-etangs' }).data;
  assert.equal(msgs.at(-1).texte, 'Sortie annulée : Blessé.');
});

test('message de 1001 caractères ou vide refusé', () => {
  const t = contexteTest();
  const jeton = t.connecter('0600000002');
  assert.equal(t.appel('discussion_ecrire', { jeton, sortie_id: 'R:sm:2026-11-14:1', texte: 'x'.repeat(1001) }).erreur, 'texte_invalide');
  assert.equal(t.appel('discussion_ecrire', { jeton, sortie_id: 'R:sm:2026-11-14:1', texte: '   ' }).erreur, 'texte_invalide');
  assert.equal(t.appel('discussion_ecrire', { jeton, sortie_id: 'R:sm:2026-11-14:1', texte: 'x'.repeat(1000) }).ok, true);
});

test('discussion_lire depuis un horodatage ne renvoie que les nouveaux', () => {
  const t = contexteTest();
  const jeton = t.connecter('0600000002');
  const avant = t.appel('discussion_lire', { jeton, sortie_id: 'R:sm:2026-11-14:1' }).data;
  assert.equal(avant.length, 3);
  assert.equal(avant[0].a_moi, false);
  t.regler(new Date(2026, 10, 12, 21, 0));
  t.appel('discussion_ecrire', { jeton, sortie_id: 'R:sm:2026-11-14:1', texte: 'Je viens !' });
  const nouveaux = t.appel('discussion_lire', { jeton, sortie_id: 'R:sm:2026-11-14:1', depuis: avant.at(-1).horodatage }).data;
  assert.deepEqual(nouveaux.map((m) => [m.auteur_nom, m.texte, m.a_moi]), [['Ben', 'Je viens !', true]]);
  assert.ok(!JSON.stringify(nouveaux).includes('+33'));
});

test("suppression d'un message : auteur oui, autre adhérent non", () => {
  const t = contexteTest();
  const ben = t.connecter('0600000002');
  t.appel('discussion_ecrire', { jeton: ben, sortie_id: 'R:sm:2026-11-14:1', texte: 'oups' });
  const m = t.appel('discussion_lire', { jeton: ben, sortie_id: 'R:sm:2026-11-14:1' }).data.at(-1);
  const ludo = t.connecter('0600000003');
  assert.equal(t.appel('discussion_supprimer', { jeton: ludo, message_id: m.id }).erreur, 'interdit');
  assert.equal(t.appel('discussion_supprimer', { jeton: ben, message_id: m.id }).ok, true);
  assert.ok(!t.appel('discussion_lire', { jeton: ben, sortie_id: 'R:sm:2026-11-14:1' }).data.some((x) => x.id === m.id));
});

test("trace : .txt refusé, 5 Mo + 1 refusé, contenu relu à l'identique", () => {
  const t = contexteTest();
  const ludo = t.connecter('0600000003');
  const gpx = '<?xml version="1.0"?><gpx><trk><trkseg><trkpt lat="48" lon="2"/></trkseg></trk></gpx>';
  const base = { jeton: ludo, sortie_id: 'libre-etangs', km: '35', dplus: '450' };
  assert.equal(t.appel('trace_ajouter', { ...base, nom_fichier: 'a.txt', contenu: gpx }).erreur, 'fichier_invalide');
  assert.equal(t.appel('trace_ajouter', { ...base, nom_fichier: 'a.gpx', contenu: 'pas du xml' }).erreur, 'fichier_invalide');
  assert.equal(t.appel('trace_ajouter', { ...base, nom_fichier: 'a.gpx', contenu: '<gpx>' + 'x'.repeat(5 * 1024 * 1024) }).erreur, 'fichier_trop_gros');
  const r = t.appel('trace_ajouter', { ...base, nom_fichier: 'etangs.gpx', contenu: gpx });
  assert.equal(r.ok, true);
  assert.deepEqual(t.appel('trace_lire', { jeton: ludo, trace_id: r.data.id }).data, { nom_fichier: 'etangs.gpx', contenu: gpx });
  assert.equal(sortieDe(t, ludo, 'libre-etangs').traces[0].nom_fichier, 'etangs.gpx');
  const ben = t.connecter('0600000002');
  assert.equal(t.appel('trace_ajouter', { ...base, jeton: ben, nom_fichier: 'b.gpx', contenu: gpx }).erreur, 'interdit');
  assert.equal(t.appel('trace_ajouter', { ...base, jeton: ben, nom_fichier: 'b.gpx', contenu: gpx, via_discussion: true }).ok, true);
});

test('trace de démo relue depuis le jeu de démo', () => {
  const t = contexteTest();
  const ben = t.connecter('0600000002');
  const r = t.appel('trace_lire', { jeton: ben, trace_id: 't-boucle-foret' }).data;
  assert.equal(r.nom_fichier, 'boucle-foret.gpx');
  assert.match(r.contenu, /^<\?xml/);
});

test('supprimer la trace par défaut la masque pour cette sortie seulement', () => {
  const t = contexteTest();
  const admin = t.connecter('0611111111');
  verifierAdmin(t, admin);
  assert.equal(t.appel('trace_supprimer', { jeton: admin, sortie_id: 'R:sm:2026-11-14:1', trace_id: 't-boucle-foret' }).ok, true);
  assert.deepEqual(sortieDe(t, admin, 'R:sm:2026-11-14:1').traces.map((x) => x.nom_fichier), ['inter-rocher.gpx']);
  assert.deepEqual(sortieDe(t, admin, 'R:sm:2026-11-21:1').traces.map((x) => x.nom_fichier), ['boucle-foret.gpx']);
  assert.ok(t.depot.lire('Traces').some((x) => x.id === 't-boucle-foret'));
});

test("le créateur d'une sortie ne peut pas supprimer la trace d'une autre sortie", () => {
  const t = contexteTest();
  const ludo = t.connecter('0600000003');
  const r = t.appel('trace_supprimer', { jeton: ludo, sortie_id: 'libre-etangs', trace_id: 't-inter' });
  assert.equal(r.erreur, 'trace_inconnue');
  assert.ok(t.depot.lire('Traces').some((x) => x.id === 't-inter'));
  assert.equal(t.appel('trace_supprimer', { jeton: ludo, sortie_id: 'libre-etangs', trace_id: 't-boucle-foret' }).erreur, 'trace_inconnue');
});
