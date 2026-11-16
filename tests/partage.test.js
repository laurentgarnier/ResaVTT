import { test } from 'node:test';
import assert from 'node:assert/strict';
import { messagePartageSortie } from '../site/sorties/js/logique/partage.js';

const SORTIE = { id: 'libre-etangs', titre: 'Boucle des étangs', date: '2026-11-20', heure: '13:30', point_rdv: 'PDL', km: '35', dplus: '450' };
const PLAGE = { emoji: '☀️', tmin: 8, tmax: 11, pluie_mm: 0, vent_max: 10, vent_cardinal: 'NE' };

test('message de partage : sortie, météo de la demi-journée et lien d\'inscription', () => {
  assert.equal(messagePartageSortie(SORTIE, PLAGE, 'https://club.example.org/sorties/'), [
    '🚵 Nouvelle sortie : Boucle des étangs',
    'Vendredi 20 novembre 13:30 – PDL',
    '35 km · 450 m D+',
    '☀️ 8–11° · 💧0 mm · 🌬 10 km/h NE',
    '👉 Inscriptions : https://club.example.org/sorties/#/sortie/libre-etangs',
  ].join('\n'));
});

test('message de partage : sans distances ni météo, adresse sans « / » final', () => {
  const m = messagePartageSortie({ ...SORTIE, id: 'a b', km: '', dplus: '' }, null, 'https://club.example.org/sorties');
  assert.equal(m, '🚵 Nouvelle sortie : Boucle des étangs\nVendredi 20 novembre 13:30 – PDL\nMétéo pas encore disponible\n👉 Inscriptions : https://club.example.org/sorties/#/sortie/a%20b');
});
