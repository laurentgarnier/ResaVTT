import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { appeler, ErreurApi, enregistrerJeton, lireJeton } from '../site/sorties/js/api.js';

const stockage = new Map();
globalThis.localStorage = {
  getItem: (k) => (stockage.has(k) ? stockage.get(k) : null),
  setItem: (k, v) => stockage.set(k, String(v)),
  removeItem: (k) => stockage.delete(k),
};
beforeEach(() => stockage.clear());

const reponse = (corps) => ({ ok: true, json: async () => corps });

test('appeler : POST text/plain avec jeton, réessaie sur erreur réseau puis réussit', async () => {
  enregistrerJeton('J1');
  const appels = [];
  const fetchImpl = async (url, options) => {
    appels.push({ url, options });
    if (appels.length === 1) throw new TypeError('réseau');
    return reponse({ ok: true, data: 1 });
  };
  const data = await appeler('calendrier', { x: 2 }, { fetchImpl, url: 'https://api', delais: [0, 0] });
  assert.equal(data, 1);
  assert.equal(appels.length, 2);
  assert.equal(appels[0].options.method, 'POST');
  assert.equal(appels[0].options.headers['Content-Type'], 'text/plain;charset=utf-8');
  assert.deepEqual(JSON.parse(appels[0].options.body), { action: 'calendrier', jeton: 'J1', x: 2 });
});

test('appeler : erreur métier levée sans nouvel essai, avec code et message', async () => {
  let n = 0;
  const fetchImpl = async () => { n++; return reponse({ ok: false, erreur: 'inscriptions_closes', message: 'Inscriptions closes' }); };
  await assert.rejects(appeler('inscription', {}, { fetchImpl, url: 'u', delais: [0, 0] }), (e) => e instanceof ErreurApi && e.code === 'inscriptions_closes' && e.message === 'Inscriptions closes');
  assert.equal(n, 1);
});

test('appeler : serveur occupé réessayé deux fois puis levé', async () => {
  let n = 0;
  const fetchImpl = async () => { n++; return reponse({ ok: false, erreur: 'occupe', message: 'Serveur occupé, réessayez.' }); };
  await assert.rejects(appeler('sortie_creer', {}, { fetchImpl, url: 'u', delais: [0, 0] }), (e) => e.code === 'occupe');
  assert.equal(n, 3);
});

test("appeler : erreur_interne jamais réessayée (l'écriture a pu avoir lieu)", async () => {
  let n = 0;
  const fetchImpl = async () => { n++; return reponse({ ok: false, erreur: 'erreur_interne', message: 'x' }); };
  await assert.rejects(appeler('calendrier', {}, { fetchImpl, url: 'u', delais: [0, 0] }), (e) => e.code === 'erreur_interne');
  assert.equal(n, 1);
});

test('appeler : erreur réseau réessayée pour une lecture, pas pour une écriture', async () => {
  let n = 0;
  const fetchImpl = async () => { n++; throw new TypeError('réseau'); };
  await assert.rejects(appeler('discussion_ecrire', {}, { fetchImpl, url: 'u', delais: [0, 0] }), (e) => e.code === 'reseau');
  assert.equal(n, 1);
  n = 0;
  await assert.rejects(appeler('discussion_lire', {}, { fetchImpl, url: 'u', delais: [0, 0] }), (e) => e.code === 'reseau');
  assert.equal(n, 3);
});

test('appeler : non_connecte efface le jeton', async () => {
  enregistrerJeton('J1');
  let deconnecte = false;
  const fetchImpl = async () => reponse({ ok: false, erreur: 'non_connecte', message: 'Veuillez vous reconnecter.' });
  await assert.rejects(appeler('calendrier', {}, { fetchImpl, url: 'u', delais: [0, 0], surDeconnexion: () => { deconnecte = true; } }), (e) => e.code === 'non_connecte');
  assert.equal(lireJeton(), null);
  assert.equal(deconnecte, true);
});

test('appeler : un calendrier joint à la réponse est transmis à surCalendrier, la donnée reste data', async () => {
  const recus = [];
  const fetchImpl = async () => reponse({ ok: true, data: { id: 'S1' }, calendrier: { jours: [] } });
  const data = await appeler('sortie_creer', {}, { fetchImpl, url: 'https://api', surCalendrier: (c) => recus.push(c) });
  assert.deepEqual(data, { id: 'S1' });
  assert.deepEqual(recus, [{ jours: [] }]);
});

test('appeler : surDebut / surFin encadrent chaque appel, même en échec', async () => {
  const evts = [];
  const fetchImpl = async () => reponse({ ok: false, erreur: 'refuse', message: 'Non.' });
  await assert.rejects(appeler('inscription', {}, { fetchImpl, url: 'https://api', surDebut: () => evts.push('debut'), surFin: () => evts.push('fin') }));
  assert.deepEqual(evts, ['debut', 'fin']);
});
