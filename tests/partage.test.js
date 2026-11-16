import { test } from 'node:test';
import assert from 'node:assert/strict';
import { messagePartageSortie, messageAnnulationSortie } from '../site/sorties/js/logique/partage.js';
import { MODELES_DEFAUT } from '../site/sorties/js/logique/modeles.js';

const SORTIE = { id: 'libre-etangs', titre: 'Boucle des étangs', date: '2026-11-20', heure: '13:30', point_rdv: 'PDL', km: '35', dplus: '450', createur_nom: 'Ludo' };
const PLAGE = { emoji: '☀️', libelle: 'Ensoleillé', tmin: 8, tmax: 11, pluie_mm: 0, vent_max: 10, vent_cardinal: 'NE' };
const URL_APPLI = 'https://club.example.org/sorties/';

test("message de partage par défaut : sortie, météo en mots et lien d'inscription", () => {
  assert.equal(messagePartageSortie(SORTIE, PLAGE, URL_APPLI), [
    'Nouvelle sortie : Boucle des étangs',
    'Vendredi 20 novembre 13:30 – PDL',
    '35 km · 450 m D+',
    '☀️ Ensoleillé, 8–11°, pluie 0 mm, vent 10 km/h NE',
    'Inscriptions : https://club.example.org/sorties/#/sortie/libre-etangs',
  ].join('\n'));
});

test("message de partage : sans distances ni météo, la ligne vide disparaît ; adresse sans « / » final", () => {
  const m = messagePartageSortie({ ...SORTIE, id: 'a b', km: '', dplus: '' }, null, 'https://club.example.org/sorties');
  assert.equal(m, 'Nouvelle sortie : Boucle des étangs\nVendredi 20 novembre 13:30 – PDL\nMétéo pas encore disponible\nInscriptions : https://club.example.org/sorties/#/sortie/a%20b');
});

test("message de partage : modèle choisi par l'admin, avec {{createur}} et {{lien}} ; une ligne de texte vide est gardée", () => {
  const modele = 'Salut ! {{createur}} propose {{titre}} le {{date}}.\n\n{{distances}}\nInfos : {{lien_sortie}} ({{lien}})';
  const m = messagePartageSortie({ ...SORTIE, km: '', dplus: '' }, PLAGE, URL_APPLI, modele);
  assert.equal(m, 'Salut ! Ludo propose Boucle des étangs le Vendredi 20 novembre.\n\nInfos : https://club.example.org/sorties/#/sortie/libre-etangs (https://club.example.org/sorties/)');
  assert.equal(messagePartageSortie(SORTIE, PLAGE, URL_APPLI, ''), messagePartageSortie(SORTIE, PLAGE, URL_APPLI, MODELES_DEFAUT.partage_whatsapp));
});

test("message d'annulation par défaut : la sortie, son motif et le lien", () => {
  const annulee = { ...SORTIE, statut: 'annulee', motif_annulation: 'Pluie annoncée' };
  assert.equal(messageAnnulationSortie(annulee, URL_APPLI), [
    'Sortie annulée : Boucle des étangs',
    'Vendredi 20 novembre 13:30 – PDL',
    'Motif : Pluie annoncée',
    'Détails : https://club.example.org/sorties/#/sortie/libre-etangs',
  ].join('\n'));
});

test("message d'annulation : sans motif, la ligne « Motif : » disparaît ; modèle choisi par l'admin", () => {
  const annulee = { ...SORTIE, statut: 'annulee', motif_annulation: '' };
  assert.equal(messageAnnulationSortie(annulee, URL_APPLI), 'Sortie annulée : Boucle des étangs\nVendredi 20 novembre 13:30 – PDL\nDétails : https://club.example.org/sorties/#/sortie/libre-etangs');
  assert.equal(messageAnnulationSortie(annulee, URL_APPLI, '{{createur}} annule {{titre}} ({{motif}}).\nDésolé !'), 'Ludo annule Boucle des étangs ().\nDésolé !');
});
