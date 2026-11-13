// Serveur de développement : sert site/ et répond sur POST /api avec le vrai noyau serveur,
// sur un dépôt en mémoire rempli avec le jeu de démonstration. Les mails sont affichés dans la console.
// Usage : node outils/serveur-dev.js [port]   puis ouvrir http://localhost:8080/sorties/
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { extname, join, normalize } from 'node:path';
import { creerDepotMemoire } from '../backend/noyau/depot-memoire.js';
import { creerDonneesDemo } from '../backend/noyau/donnees-demo.js';
import { traiter } from '../backend/noyau/actions.js';
import { ticNoyau } from '../backend/noyau/automate.js';
import { TRACES_DEMO } from '../backend/noyau/traces-demo.js';
import { aujourdhuiLocal } from '../site/sorties/js/logique/dates.js';

const PORT = Number(process.argv[2]) || 8080;
const RACINE = 'site';
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.gpx': 'application/gpx+xml' };

const porteur = { nom: 'Porteur', telephone: '+33611111111', email: 'porteur@example.org' };
const donnees = creerDonneesDemo(aujourdhuiLocal(new Date()), porteur);
const fichiers = new Map();
const ctx = {
  depot: creerDepotMemoire(donnees.tables),
  adherents: { lire: () => donnees.adherents.map((a) => ({ ...a })) },
  services: {
    maintenant: () => new Date(),
    uuid: () => randomUUID(),
    hacher: (s) => createHash('sha256').update(String(s)).digest('hex'),
    mail: (dest, objet, texte) => console.log(`\n📧 Mail à ${dest} — ${objet}\n${texte}\n`),
    fichiers: {
      enregistrer: (nom, contenu) => { const id = randomUUID(); fichiers.set(id, contenu); return id; },
      lire: (id) => (id.startsWith('demo:') ? TRACES_DEMO[id.slice(5)] : fichiers.get(id)),
      supprimer: (id) => fichiers.delete(id),
    },
    http: () => ({ results: [{ name: 'Fontainebleau', admin2: 'Seine-et-Marne', latitude: 48.4047, longitude: 2.7016 }] }),
  },
  journal: (type, detail) => console.log(`[${type}] ${detail}`),
};

// Troisième argument facultatif : délai ajouté à chaque appel /api (ms), pour voir l'appli comme avec Google.
const LATENCE = Number(process.argv[3]) || 0;

createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/api') {
    let corps = '';
    for await (const morceau of req) corps += morceau;
    if (LATENCE) await new Promise((r) => setTimeout(r, LATENCE));
    let reponse;
    try { reponse = traiter(JSON.parse(corps), ctx); } catch (e) { reponse = { ok: false, erreur: 'requete_invalide', message: 'Requête invalide.' }; }
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(reponse));
    return;
  }
  if (req.method === 'POST' && req.url === '/tic') {
    ticNoyau(ctx);
    res.end('tic exécuté');
    return;
  }
  let chemin = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (chemin.endsWith('/')) chemin += 'index.html';
  const fichier = normalize(join(RACINE, chemin));
  if (!fichier.startsWith(normalize(RACINE))) { res.writeHead(403); res.end(); return; }
  try {
    const contenu = await readFile(fichier);
    res.writeHead(200, { 'Content-Type': TYPES[extname(fichier)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(contenu);
  } catch (e) {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(await readFile(join(RACINE, '404.html')));
  }
}).listen(PORT, () => console.log(`Serveur de développement : http://localhost:${PORT}/sorties/  (porteur de démo : 06 11 11 11 11)`));
