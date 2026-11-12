import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contexteTest, PORTEUR } from './aides/contexte-test.js';

function adminVerifie(t) {
  const jeton = t.connecter('0611111111');
  t.appel('admin_code_demander', { jeton });
  const code = t.mails.at(-1).texte.match(/\d{6}/)[0];
  assert.equal(t.appel('admin_code_verifier', { jeton, code }).ok, true);
  return jeton;
}

test('code admin envoyé par mail au porteur ; 5 essais puis blocage ; expiration à 15 min', () => {
  const t = contexteTest();
  const jeton = t.connecter('0611111111');
  assert.deepEqual(t.appel('admin_code_demander', { jeton }).data, { envoye: true });
  const mail = t.mails.at(-1);
  assert.equal(mail.destinataires, PORTEUR.email);
  assert.equal(mail.objet, "Code d'accès administration");
  assert.match(mail.texte, /^Votre code : \d{6} \(valable 15 minutes\)$/);
  const code = mail.texte.match(/\d{6}/)[0];
  const faux = code === '000000' ? '111111' : '000000';
  for (let i = 4; i >= 1; i--) {
    const r = t.appel('admin_code_verifier', { jeton, code: faux });
    assert.equal(r.erreur, 'code_faux');
    assert.equal(r.essais_restants, i);
  }
  assert.equal(t.appel('admin_code_verifier', { jeton, code: faux }).erreur, 'trop_essais');
  assert.equal(t.appel('admin_code_verifier', { jeton, code }).erreur, 'trop_essais');

  t.appel('admin_code_demander', { jeton });
  const code2 = t.mails.at(-1).texte.match(/\d{6}/)[0];
  t.regler(new Date(2026, 10, 12, 20, 16));
  assert.equal(t.appel('admin_code_verifier', { jeton, code: code2 }).erreur, 'code_expire');
});

test("admin_lire refusé tant que le code n'est pas vérifié", () => {
  const t = contexteTest();
  const jeton = t.connecter('0611111111');
  assert.equal(t.appel('admin_lire', { jeton }).erreur, 'admin_non_verifie');
  const ok = adminVerifie(t);
  const d = t.appel('admin_lire', { jeton: ok }).data;
  assert.deepEqual(d.regles.map((r) => r.nom), ['Samedi matin', 'Samedi après-midi', 'Dimanche matin']);
  assert.equal(d.regle_sorties.length, 5);
  assert.equal(d.parametres.whatsapp_numero, PORTEUR.telephone);
  assert.match(d.modeles.rappel_whatsapp, /^Les sorties du week-end/);
  assert.equal(d.fermetures.length, 1);
});

test('Ben (non admin) → admin_code_demander interdit', () => {
  const t = contexteTest();
  const jeton = t.connecter('0600000002');
  assert.equal(t.appel('admin_code_demander', { jeton }).erreur, 'interdit');
  assert.equal(t.appel('admin_lire', { jeton }).erreur, 'admin_non_verifie');
});

test('nouvelle règle mardi 18:30 toutes les 2 semaines → sortie le mardi suivant', () => {
  const t = contexteTest();
  const jeton = adminVerifie(t);
  const d = t.appel('admin_lire', { jeton }).data;
  const r = t.appel('admin_enregistrer', {
    jeton,
    regles: [...d.regles, { nom: 'Mardi soir', jour: '1', heure: '18:30', point_rdv: 'Parking du stade', frequence_semaines: '2', date_depart: '2026-11-17', active: true }],
    regle_sorties: [...d.regle_sorties, { regle_id: '__nouvelle_0', ordre: '1', titre: 'Nocturne frontale' }],
  });
  assert.equal(r.ok, true);
  const c = t.appel('calendrier', { jeton }).data;
  const mardi = c.jours.find((j) => j.date === '2026-11-17').sorties;
  assert.deepEqual(mardi.map((s) => [s.titre, s.heure, s.point_rdv]), [['Nocturne frontale', '18:30', 'Parking du stade']]);
  assert.equal(c.jours.find((j) => j.date === '2026-11-10').sorties.length, 0);
  const sam = c.jours.find((j) => j.date === '2026-11-14').sorties;
  assert.equal(sam.length, 4);
  assert.equal(sam[1].inscrits.length, 18);
});

test('paramètres et modèles : seules les clés connues sont enregistrées', () => {
  const t = contexteTest();
  const jeton = adminVerifie(t);
  t.appel('admin_enregistrer', { jeton, parametres: { point_rdv_defaut: 'Gare', cle_bidon: 'x' }, modeles: { rappel_whatsapp: 'Roulez ! {{lien}}' } });
  const d = t.appel('admin_lire', { jeton }).data;
  assert.equal(d.parametres.point_rdv_defaut, 'Gare');
  assert.equal(d.parametres.cle_bidon, undefined);
  assert.equal(d.modeles.rappel_whatsapp, 'Roulez ! {{lien}}');
});

test('admin_geocoder renvoie des communes candidates', () => {
  const t = contexteTest();
  const jeton = adminVerifie(t);
  assert.deepEqual(t.appel('admin_geocoder', { jeton, nom: 'Fontainebleau' }).data, [{ nom: 'Fontainebleau', departement: 'Seine-et-Marne', lat: 48.4, lon: 2.7 }]);
});

test('rappel_envoyer_maintenant envoie immédiatement les deux mails', () => {
  const t = contexteTest();
  const jeton = adminVerifie(t);
  t.appel('admin_enregistrer', { jeton, parametres: { url_appli: 'https://exemple.github.io/sorties/' } });
  const avant = t.mails.length;
  const r = t.appel('rappel_envoyer_maintenant', { jeton });
  assert.deepEqual(r.data, { etape_mail: 'ok', etape_whatsapp: 'ok' });
  const [liste, wa] = t.mails.slice(avant);
  assert.equal(liste.destinataires, PORTEUR.email);
  assert.equal(liste.texte, "Les sorties du week-end sont ouvertes !\n📱 Vous avez l'appli : ouvrez-la depuis votre écran d'accueil.\n🌐 Pas encore installée : https://exemple.github.io/sorties/");
  assert.equal(wa.objet, 'À poster sur WhatsApp');
  assert.match(wa.html, /href="https:\/\/wa\.me\/33611111111\?text=Les%20sorties/);
  assert.match(wa.html, /📲 Envoyer sur WhatsApp/);
  assert.ok(t.appel('admin_lire', { jeton }).data.envois.some((e) => e.cle.startsWith('rappel:manuel:')));
});
