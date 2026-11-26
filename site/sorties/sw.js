// Service worker de l'appli : portée limitée à /sorties/. Met en cache l'interface (stale-while-revalidate),
// jamais les données : l'API, la météo et les tuiles de carte passent toujours par le réseau.
const VERSION = 'sorties-vtt-v33'; // à garder égal à js/version.js
const COQUILLE = [
  './',
  'index.html',
  'style.css',
  'config.js',
  'manifest.webmanifest',
  '../commun/theme.css',
  '../commun/images/logo.svg',
  'icones/icone-192.png',
  'icones/icone-512.png',
  'icones/icone-maskable-192.png',
  'icones/icone-maskable-512.png',
  'icones/apple-touch-icon.png',
  'js/api.js',
  'js/app.js',
  'js/cache-calendrier.js',
  'js/maj-appli.js',
  'js/logique/dates.js',
  'js/logique/departs.js',
  'js/logique/droits.js',
  'js/logique/gpx.js',
  'js/logique/html.js',
  'js/logique/liens.js',
  'js/logique/meteo.js',
  'js/logique/modeles.js',
  'js/logique/partage.js',
  'js/logique/recurrences.js',
  'js/logique/remorque.js',
  'js/logique/telephone.js',
  'js/ui/admin.js',
  'js/ui/affichage.js',
  'js/ui/attente.js',
  'js/ui/remorque.js',
  'js/ui/calendrier.js',
  'js/ui/calendrier-variantes.js',
  'js/ui/carte.js',
  'js/ui/connexion.js',
  'js/ui/formulaire.js',
  'js/ui/installation.js',
  'js/ui/meteo-vue.js',
  'js/ui/navigation.js',
  'js/ui/nom-appli.js',
  'js/ui/sortie.js',
  'js/version.js',
];
const HOTES_RESEAU = ['script.google.com', 'script.googleusercontent.com', 'api.open-meteo.com', 'geocoding-api.open-meteo.com', 'tile.openstreetmap.org'];

// Nom de l'association, enregistré par l'appli : il remplace celui du manifeste, pour l'appli installée. Ce cache
// n'est pas vidé quand une nouvelle version arrive.
const CACHE_REGLAGES = 'sorties-vtt-reglages';

function manifesteAvecNom(texte, nom) {
  const n = String(nom || '').trim();
  if (!n) return texte;
  return JSON.stringify({ ...JSON.parse(texte), name: n, short_name: n });
}

self.addEventListener('install', (ev) => {
  // cache: 'reload' : sans quoi le navigateur peut reprendre des fichiers de l'ancienne version, gardés 10 min.
  ev.waitUntil(caches.open(VERSION).then((c) => c.addAll(COQUILLE.map((u) => new Request(u, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(caches.keys()
    .then((cles) => Promise.all(cles.filter((k) => k !== VERSION && k !== CACHE_REGLAGES).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (ev) => {
  const url = new URL(ev.request.url);
  if (ev.request.method !== 'GET' || HOTES_RESEAU.includes(url.hostname) || url.origin !== self.location.origin) return;
  const reponse = caches.open(VERSION).then(async (cache) => {
    const enCache = await cache.match(ev.request, { ignoreSearch: true });
    // no-cache : le serveur confirme (ou non) la copie, au lieu d'une copie du téléphone de moins de 10 min.
    const reseau = fetch(ev.request.url, { cache: 'no-cache', credentials: 'same-origin' }).then((rep) => {
      if (rep.ok) cache.put(ev.request, rep.clone());
      return rep;
    }).catch(() => enCache);
    return enCache || reseau;
  });
  if (!url.pathname.endsWith('/manifest.webmanifest')) {
    ev.respondWith(reponse);
    return;
  }
  ev.respondWith(reponse.then(async (rep) => {
    const nom = await caches.open(CACHE_REGLAGES).then((c) => c.match('nom-appli')).then((r) => (r ? r.text() : ''));
    if (!rep || !nom) return rep;
    return new Response(manifesteAvecNom(await rep.text(), nom), { headers: { 'Content-Type': 'application/manifest+json' } });
  }));
});
