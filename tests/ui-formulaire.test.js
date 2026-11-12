import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contexteTest } from './aides/contexte-test.js';
import { valeursParDefaut, sortiesMemeCreneau, renderFormulaire, renderPersonnes } from '../site/sorties/js/ui/formulaire.js';

function calBen() {
  const t = contexteTest();
  return t.appel('calendrier', { jeton: t.connecter('0600000002') }).data;
}

test('défauts après-midi : 14:00, RDV du club, « Sortie de Ben »', () => {
  assert.deepEqual(valeursParDefaut('2026-11-13', 'apres_midi', { nom: 'Ben' }, { point_rdv_defaut: 'Place de la mairie' }),
    { date: '2026-11-13', heure: '14:00', point_rdv: 'Place de la mairie', titre: 'Sortie de Ben' });
  assert.equal(valeursParDefaut('2026-11-13', 'matin', { nom: 'Jean Dupont' }, {}).heure, '09:00');
  assert.equal(valeursParDefaut('2026-11-13', 'matin', { nom: 'Jean Dupont' }, {}).titre, 'Sortie de Jean');
});

test('le formulaire signale une sortie existante sur le même créneau', () => {
  const cal = calBen();
  const memes = sortiesMemeCreneau(cal, '2026-11-13', 'apres_midi');
  assert.deepEqual(memes.map((s) => s.titre), ['Boucle des étangs']);
  assert.deepEqual(sortiesMemeCreneau(cal, '2026-11-13', 'matin'), []);
  assert.deepEqual(sortiesMemeCreneau(cal, '2026-11-15', 'matin'), []);
  const html = renderFormulaire({ mode: 'creer', valeurs: valeursParDefaut('2026-11-13', 'apres_midi', cal.moi, cal.parametres), personnes: cal.personnes, sortiesMemeCreneau: memes, creneau: 'apres_midi' });
  assert.match(html, /Même créneau : rejoindre <a href="#\/sortie\/libre-etangs">Boucle des étangs<\/a> plutôt que créer une 2e sortie \?/);
  assert.match(html, /value="Sortie de Ben"/);
  assert.match(html, /value="14:00"/);
  assert.match(html, /Évitez les traces qui partent de votre domicile/);
});

test('détails repliés en création, dépliés en modification', () => {
  const cal = calBen();
  const valeurs = valeursParDefaut('2026-11-13', 'matin', cal.moi, cal.parametres);
  const creer = renderFormulaire({ mode: 'creer', valeurs, personnes: cal.personnes, sortiesMemeCreneau: [], creneau: 'matin' });
  assert.match(creer, /<details class="plus">/);
  assert.match(creer, /Qui s(&#39;|')inscrit/);
  assert.match(creer, />Publier</);
  const modifier = renderFormulaire({ mode: 'modifier', valeurs: { ...valeurs, km: '35' }, personnes: cal.personnes, sortiesMemeCreneau: [], creneau: 'matin' });
  assert.match(modifier, /<details class="plus" open>/);
  assert.doesNotMatch(modifier, /Qui s(&#39;|')inscrit/);
  assert.match(modifier, /value="35"/);
  assert.match(modifier, />Enregistrer</);
});

test('valeurs saisies échappées dans le formulaire', () => {
  const html = renderFormulaire({ mode: 'modifier', valeurs: { date: '2026-11-13', heure: '09:00', titre: '"><script>x</script>', point_rdv: 'a' }, personnes: [], sortiesMemeCreneau: [], creneau: 'matin' });
  assert.doesNotMatch(html, /<script>x/);
});

test('page personnes : noms modifiables, ajout, déconnexion', () => {
  const html = renderPersonnes([{ id: 'p1', nom_affiche: 'Porteur' }, { id: 'p2', nom_affiche: 'Léo' }]);
  assert.match(html, /value="Léo"/);
  assert.match(html, /data-id="p2"/);
  assert.match(html, /Ajouter une personne/);
  assert.match(html, /href="#\/deconnexion"/);
});
