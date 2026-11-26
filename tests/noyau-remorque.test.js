import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contexteTest, PORTEUR } from './aides/contexte-test.js';
import { purger } from '../backend/noyau/automate.js';

// Remorque ouverte ; gestionnaires : le porteur (administrateur) et Ben (simple adhérent, email ajouté).
// Horloge des tests : jeudi 12 novembre 2026, 20 h.
function remorque({ active = 'oui' } = {}) {
  const t = contexteTest();
  const param = (cle, valeur) => t.depot.modifier('Parametres', (l) => l.cle === cle, { valeur }) || t.depot.ajouter('Parametres', [{ cle, valeur }]);
  param('remorque_active', active);
  param('remorque_gestionnaires', `${PORTEUR.email}, ben@example.org`);
  t.adherents.find((a) => a.nom === 'Ben').email = 'ben@example.org';
  t.adherents.find((a) => a.nom === 'Marie').email = 'marie@example.org';
  const ben = t.connecter('0600000002');
  const marie = t.connecter('0600000001');
  const ludo = t.connecter('0600000003');
  const porteur = t.connecter('0611111111');
  const verifier = (jeton) => t.depot.modifier('Jetons', (j) => j.jeton_hash === t.ctx.services.hacher(jeton), { admin_verifie: true });
  const appel = (action, jeton, params = {}) => t.appel(`remorque_${action}`, { jeton, ...params });
  return { t, ben, marie, ludo, porteur, verifier, appel };
}

test('page fermée : actions refusées, le calendrier le signale', () => {
  const { t, marie, appel } = remorque({ active: 'non' });
  assert.equal(appel('lire', marie).erreur, 'remorque_fermee');
  assert.equal(appel('demander', marie, { debut: '2026-11-20', fin: '2026-11-21' }).erreur, 'remorque_fermee');
  assert.deepEqual(t.appel('calendrier', { jeton: marie }).data.remorque, { active: false });
});

test('demande : enregistrée « demandée », mail aux gestionnaires, badge pour les gestionnaires seulement', () => {
  const { t, marie, porteur, ben, appel } = remorque();
  const r = appel('demander', marie, { debut: '2026-11-20', fin: '2026-11-22', commentaire: 'Week-end Ardèche' });
  assert.equal(r.ok, true, JSON.stringify(r));
  const ligne = t.depot.lire('Remorque')[0];
  assert.equal(ligne.statut, 'demandee');
  assert.equal(ligne.demandeur_nom, 'Marie');
  const mail = t.mails.at(-1);
  assert.match(String(mail.destinataires), /porteur@example\.org/);
  assert.match(String(mail.destinataires), /ben@example\.org/);
  assert.match(mail.objet, /Demande de remorque/);
  assert.match(mail.texte, /Marie/);
  assert.match(mail.texte, /Week-end Ardèche/);
  assert.deepEqual(t.appel('calendrier', { jeton: porteur }).data.remorque, { active: true, attente: 1 });
  assert.deepEqual(t.appel('calendrier', { jeton: ben }).data.remorque, { active: true, attente: 1 });
  assert.deepEqual(t.appel('calendrier', { jeton: marie }).data.remorque, { active: true });
});

test('chevauchement : refusé avec une demande en attente, une réservation ou un blocage ; jours voisins acceptés', () => {
  const { marie, ludo, appel } = remorque();
  appel('demander', marie, { debut: '2026-11-20', fin: '2026-11-22' });
  assert.equal(appel('demander', ludo, { debut: '2026-11-22', fin: '2026-11-23' }).erreur, 'periode_prise');
  assert.equal(appel('demander', ludo, { debut: '2026-11-18', fin: '2026-11-25' }).erreur, 'periode_prise');
  assert.equal(appel('demander', ludo, { debut: '2026-11-23', fin: '2026-11-23' }).ok, true);
  assert.equal(appel('demander', ludo, { debut: '2026-11-19', fin: '2026-11-19' }).ok, true);
});

test('dates : fin avant début, début passé ou date mal écrite refusés ; aujourd\'hui accepté', () => {
  const { marie, appel } = remorque();
  assert.equal(appel('demander', marie, { debut: '2026-11-22', fin: '2026-11-20' }).erreur, 'dates_invalides');
  assert.equal(appel('demander', marie, { debut: '2026-11-11', fin: '2026-11-13' }).erreur, 'dates_invalides');
  assert.equal(appel('demander', marie, { debut: '20/11/2026', fin: '2026-11-21' }).erreur, 'dates_invalides');
  assert.equal(appel('demander', marie, { debut: '2026-11-12', fin: '2026-11-12' }).ok, true);
});

test("gestionnaire : identité vérifiée par code mail exigée ; un gestionnaire non administrateur obtient son code, sans accès à l'administration", () => {
  const { t, ben, marie, appel } = remorque();
  const id = appel('demander', marie, { debut: '2026-11-20', fin: '2026-11-21' }).data.id;
  assert.equal(appel('valider', ben, { id }).erreur, 'identite_non_verifiee');
  assert.equal(t.appel('admin_code_demander', { jeton: ben }).ok, true);
  assert.equal(t.mails.at(-1).destinataires, 'ben@example.org');
  const code = t.mails.at(-1).texte.match(/\d{6}/)[0];
  assert.equal(t.appel('admin_code_verifier', { jeton: ben, code }).ok, true);
  assert.equal(appel('valider', ben, { id }).ok, true);
  assert.equal(t.appel('admin_lire', { jeton: ben }).ok, false, "pas d'accès à l'administration");
  assert.equal(t.appel('admin_code_demander', { jeton: marie }).erreur, 'interdit');
  assert.equal(appel('valider', marie, { id }).erreur, 'interdit');
});

test('validation et refus : statut changé, mail au demandeur (s\'il a un email)', () => {
  const { t, marie, ludo, porteur, verifier, appel } = remorque();
  verifier(porteur);
  const a = appel('demander', marie, { debut: '2026-11-20', fin: '2026-11-21' }).data.id;
  const b = appel('demander', ludo, { debut: '2026-11-27', fin: '2026-11-28' }).data.id;
  const avant = t.mails.length;
  assert.equal(appel('valider', porteur, { id: a }).ok, true);
  assert.equal(t.mails.at(-1).destinataires, 'marie@example.org');
  assert.match(t.mails.at(-1).objet, /validée/);
  assert.equal(appel('refuser', porteur, { id: b, motif: 'Remorque prêtée à un autre club' }).ok, true);
  assert.equal(t.mails.length, avant + 1, 'Ludo n\'a pas d\'email : pas de mail');
  const etat = Object.fromEntries(t.depot.lire('Remorque').map((r) => [r.id, r.statut]));
  assert.deepEqual(etat, { [a]: 'validee', [b]: 'refusee' });
  assert.equal(appel('valider', porteur, { id: a }).erreur, 'statut_invalide', 'déjà validée');
});

test('lecture : tout le monde voit les dates et l\'état ; nom et commentaire pour les gestionnaires et le demandeur seulement', () => {
  const { marie, ludo, porteur, verifier, appel } = remorque();
  verifier(porteur);
  appel('demander', marie, { debut: '2026-11-20', fin: '2026-11-21', commentaire: 'Ardèche' });
  const vu = (jeton) => appel('lire', jeton).data.periodes[0];
  assert.deepEqual(Object.keys(vu(ludo)).sort(), ['a_moi', 'debut', 'fin', 'id', 'motif', 'statut']);
  assert.equal(vu(marie).demandeur_nom, 'Marie');
  assert.equal(vu(marie).a_moi, true);
  assert.equal(vu(porteur).commentaire, 'Ardèche');
  const g = appel('lire', porteur).data;
  assert.equal(g.est_gestionnaire, true);
  assert.equal(g.verifie, true);
  assert.equal(g.a_valider.length, 1);
  const l = appel('lire', ludo).data;
  assert.equal(l.est_gestionnaire, false);
  assert.equal(l.a_valider, undefined);
  assert.equal(JSON.stringify(l).includes('+33'), false);
});

test('annulation : par le demandeur seulement ; libère la période ; mail aux gestionnaires', () => {
  const { t, marie, ludo, appel } = remorque();
  const id = appel('demander', marie, { debut: '2026-11-20', fin: '2026-11-21' }).data.id;
  assert.equal(appel('annuler', ludo, { id }).erreur, 'interdit');
  assert.equal(appel('annuler', marie, { id }).ok, true);
  assert.equal(t.depot.lire('Remorque')[0].statut, 'annulee');
  assert.match(t.mails.at(-1).objet, /annulée/);
  assert.equal(appel('demander', ludo, { debut: '2026-11-20', fin: '2026-11-21' }).ok, true);
  assert.deepEqual(appel('lire', marie).data.mes_demandes.map((d) => d.statut), ['annulee']);
});

test('blocage : refusé sur une réservation validée ; les demandes en attente chevauchées sont refusées ; déblocage', () => {
  const { t, marie, ludo, porteur, verifier, appel } = remorque();
  verifier(porteur);
  const v = appel('demander', marie, { debut: '2026-11-20', fin: '2026-11-21' }).data.id;
  appel('valider', porteur, { id: v });
  assert.equal(appel('bloquer', porteur, { debut: '2026-11-21', fin: '2026-11-22', motif: 'club' }).erreur, 'periode_prise');
  const d = appel('demander', ludo, { debut: '2026-11-27', fin: '2026-11-28' }).data.id;
  const b = appel('bloquer', porteur, { debut: '2026-11-26', fin: '2026-11-30', motif: 'indisponible' });
  assert.equal(b.ok, true);
  const etat = (id) => t.depot.lire('Remorque').find((r) => r.id === id);
  assert.equal(etat(d).statut, 'refusee');
  assert.equal(etat(b.data.id).statut, 'bloquee');
  assert.equal(etat(b.data.id).motif, 'indisponible');
  assert.equal(appel('bloquer', porteur, { debut: '2026-12-01', fin: '2026-12-02', motif: 'autre' }).erreur, 'motif_invalide');
  assert.equal(appel('debloquer', porteur, { id: b.data.id }).ok, true);
  assert.equal(etat(b.data.id).statut, 'annulee');
  assert.equal(appel('demander', ludo, { debut: '2026-11-27', fin: '2026-11-28' }).ok, true);
});

test('purge : une réservation terminée depuis la durée de conservation est anonymisée, pas supprimée', () => {
  const { t } = remorque();
  t.depot.ajouter('Remorque', [
    { id: 'r-ancienne', debut: '2026-09-01', fin: '2026-09-03', statut: 'validee', motif: '', commentaire: 'Vosges', demandeur_tel: '+33600000001', demandeur_nom: 'Marie', traite_par: 'Porteur', traite_le: '', cree_le: '' },
    { id: 'r-recente', debut: '2026-11-01', fin: '2026-11-02', statut: 'validee', motif: '', commentaire: 'Jura', demandeur_tel: '+33600000001', demandeur_nom: 'Marie', traite_par: 'Porteur', traite_le: '', cree_le: '' },
  ]);
  purger(t.ctx, '2026-11-12');
  const r = Object.fromEntries(t.depot.lire('Remorque').map((x) => [x.id, x]));
  assert.equal(r['r-ancienne'].statut, 'validee');
  assert.equal(r['r-ancienne'].demandeur_nom, '');
  assert.equal(r['r-ancienne'].demandeur_tel, '');
  assert.equal(r['r-ancienne'].commentaire, '');
  assert.equal(r['r-recente'].demandeur_nom, 'Marie');
});

test("statistiques de l'année (administrateur vérifié) : réservations, jours de prêt, adhérents, refus, annulations, jours bloqués, prêt par mois", () => {
  const { t, porteur, verifier } = remorque();
  verifier(porteur);
  const r = (id, debut, fin, statut, motif = '', tel = '') => ({ id, debut, fin, statut, motif, commentaire: '', demandeur_tel: tel, demandeur_nom: '', traite_par: '', traite_le: '', cree_le: '' });
  t.depot.ajouter('Remorque', [
    r('a', '2026-03-06', '2026-03-08', 'validee', '', '+33600000001'),
    r('b', '2026-03-28', '2026-04-02', 'validee', '', '+33600000002'),
    r('c', '2026-05-01', '2026-05-01', 'validee', '', '+33600000001'),
    r('d', '2026-06-01', '2026-06-03', 'refusee'),
    r('e', '2026-06-10', '2026-06-11', 'annulee'),
    r('f', '2026-07-01', '2026-07-04', 'bloquee', 'club'),
    r('g', '2026-08-01', '2026-08-02', 'bloquee', 'indisponible'),
    r('h', '2025-12-30', '2026-01-02', 'validee', '', ''),
  ]);
  const s = t.appel('remorque_stats', { jeton: porteur, annee: 2026 }).data;
  assert.equal(s.annee, 2026);
  assert.equal(s.reservations, 4);
  assert.equal(s.jours_pret, 3 + 6 + 1 + 2, 'la réservation à cheval sur deux années ne compte que ses jours de 2026');
  assert.equal(s.adherents, 2, 'numéros connus seulement (anonymisés : non comptés)');
  assert.equal(s.refusees, 1);
  assert.equal(s.annulees, 1);
  assert.equal(s.jours_bloques_club, 4);
  assert.equal(s.jours_bloques_indisponible, 2);
  assert.deepEqual(s.jours_par_mois, [2, 0, 7, 2, 1, 0, 0, 0, 0, 0, 0, 0]);
  assert.ok(s.annees.includes(2025) && s.annees.includes(2026));
  assert.equal(t.appel('remorque_stats', { jeton: t.connecter('0600000001'), annee: 2026 }).ok, false);
});
