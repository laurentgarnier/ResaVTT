import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contexteTest } from './aides/contexte-test.js';
import { fabriquerHoraire } from './aides/meteo.js';
import { composerMessage, meteoServeur, envoyerRappelProgramme } from '../backend/noyau/rappels.js';

const URL_APPLI = 'https://club.example.org/sorties/';
const MAINTENANT = new Date(2026, 10, 12, 18, 0);

// Matin du samedi 14 : soleil, vent de NE ; après-midi : éclaircies, pluie.
function horaire() {
  const h = {};
  for (let i = 8; i <= 12; i++) h[i] = { t: 2 + i - 8, p: 0, c: 0, v: i === 10 ? 12 : 5, d: 45 };
  for (let i = 13; i <= 18; i++) h[i] = { t: 8 + (i === 15 ? 3 : 0), p: 40, c: 2, mm: 0.2, v: 9, d: 270 };
  return fabriquerHoraire('2026-11-14', h);
}

const SORTIES = [
  { id: 'R:sm:2026-11-14:1', regle_id: 'sm', titre: 'Samedi matin', date: '2026-11-14', heure: '09:30', point_rdv: 'PDL', statut: 'ouverte' },
  { id: 'R:sa:2026-11-14:1', regle_id: 'sa', titre: 'Samedi après-midi', date: '2026-11-14', heure: '14:00', point_rdv: 'PDL', statut: 'ouverte' },
];

const groupe = (autres = {}) => ({ type: 'G', id: 'g', nom: 'Week-end', regle_ids: ['sm', 'sa'], mail: true, whatsapp: true,
  objet: 'Sorties VTT : {{nom}}', texte: 'Les inscriptions sont ouvertes !\n{{liste_sorties}}\n🌐 {{lien}}', ...autres });

test('composerMessage : liste des sorties avec la météo de leur demi-journée et le lien vers chaque sortie', () => {
  const m = composerMessage(groupe(), SORTIES, horaire(), URL_APPLI);
  assert.equal(m.objet, 'Sorties VTT : Week-end');
  assert.equal(m.texte, [
    'Les inscriptions sont ouvertes !',
    '🚵 Samedi 14 novembre 09:30 – Samedi matin (PDL)',
    '   ☀️ 2–6° · 💧0 mm · 🌬 12 km/h NE',
    '   👉 https://club.example.org/sorties/#/sortie/R%3Asm%3A2026-11-14%3A1',
    '🚵 Samedi 14 novembre 14:00 – Samedi après-midi (PDL)',
    '   ⛅ 8–11° · 💧1,2 mm · 🌬 9 km/h O',
    '   👉 https://club.example.org/sorties/#/sortie/R%3Asa%3A2026-11-14%3A1',
    `🌐 ${URL_APPLI}`,
  ].join('\n'));
});

test("composerMessage : repères d'une seule sortie, et ceux de la première quand il y en a plusieurs", () => {
  const rappel = groupe({ type: 'R', nom: 'Samedi matin', objet: '{{titre}} {{date}}', texte: '{{heure}}|{{point_rdv}}|{{meteo}}|{{lien_sortie}}' });
  const m = composerMessage(rappel, SORTIES, horaire(), URL_APPLI);
  assert.equal(m.objet, 'Samedi matin Samedi 14 novembre');
  assert.equal(m.texte, '09:30|PDL|☀️ 2–6° · 💧0 mm · 🌬 12 km/h NE|https://club.example.org/sorties/#/sortie/R%3Asm%3A2026-11-14%3A1');
});

test("composerMessage : sans météo ni adresse de l'appli, les lignes restent lisibles", () => {
  const m = composerMessage(groupe({ texte: '{{liste_sorties}}' }), SORTIES.slice(0, 1), null, '');
  assert.equal(m.texte, '🚵 Samedi 14 novembre 09:30 – Samedi matin (PDL)\n   Météo pas encore disponible');
});

test('meteoServeur : une requête Open-Meteo avec la direction du vent ; échec ou commune absente → null', () => {
  const t = contexteTest();
  const urls = [];
  t.ctx.services.http = (url) => { urls.push(url); return { hourly: { time: [] } }; };
  assert.deepEqual(meteoServeur(t.ctx, { commune_lat: '48.4', commune_lon: '2.7' }), { time: [] });
  assert.match(urls[0], /api\.open-meteo\.com\/v1\/forecast\?latitude=48\.4&longitude=2\.7&hourly=[^&]*wind_direction_10m/);
  assert.match(urls[0], /timezone=Europe%2FParis&forecast_days=14/);
  assert.equal(meteoServeur(t.ctx, { commune_lat: '', commune_lon: '' }), null);
  assert.equal(urls.length, 1);
  t.ctx.services.http = () => { throw new Error('réseau'); };
  assert.equal(meteoServeur(t.ctx, { commune_lat: '48.4', commune_lon: '2.7' }), null);
  t.ctx.services.http = () => ({ error: true });
  assert.equal(meteoServeur(t.ctx, { commune_lat: '48.4', commune_lon: '2.7' }), null);
});

function contexteRappel() {
  const t = contexteTest({ maintenant: MAINTENANT });
  t.depot.modifier('Parametres', (l) => l.cle === 'url_appli', { valeur: URL_APPLI }) || t.depot.ajouter('Parametres', [{ cle: 'url_appli', valeur: URL_APPLI }]);
  return t;
}

test("envoyerRappelProgramme : mail seul → une seule étape, la liste ; WhatsApp seul → le message à poster", () => {
  const t = contexteRappel();
  const r = envoyerRappelProgramme(t.ctx, groupe({ whatsapp: false, regle_ids: ['sm', 'sa', 'dm'] }), 'rappel:G:g:2026-11-12', horaire());
  assert.equal(r.nb_sorties, 2);
  assert.equal(t.mails.length, 1);
  assert.equal(t.mails[0].objet, 'Sorties VTT : Week-end');
  assert.match(t.mails[0].texte, /#\/sortie\/R%3Asa%3A2026-11-14%3A1/);
  const t2 = contexteRappel();
  envoyerRappelProgramme(t2.ctx, groupe({ mail: false }), 'rappel:G:g:2026-11-12', horaire());
  assert.deepEqual(t2.mails.map((m) => m.objet), ['À poster sur WhatsApp']);
});

test("envoyerRappelProgramme : aucune sortie à annoncer → rien n'est envoyé ni noté", () => {
  const t = contexteRappel();
  const r = envoyerRappelProgramme(t.ctx, groupe({ regle_ids: ['inconnue'] }), 'rappel:G:g:2026-11-12', null);
  assert.equal(r.nb_sorties, 0);
  assert.equal(t.mails.length, 0);
  assert.equal(t.depot.lire('Envois').filter((e) => e.cle === 'rappel:G:g:2026-11-12').length, 0);
});

test('météo injoignable : le rappel part avec « Météo pas encore disponible »', () => {
  const t = contexteRappel();
  envoyerRappelProgramme(t.ctx, groupe(), 'rappel:G:g:2026-11-12', null);
  assert.equal(t.mails.length, 2);
  assert.match(t.mails[0].texte, /Météo pas encore disponible/);
});
