// Service worker de l'appli : portée limitée à /sorties/. Met en cache l'interface (stale-while-revalidate),
// jamais les données : l'API, la météo et les tuiles de carte passent toujours par le réseau.
const VERSION = 'sorties-vtt-v4';
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
  'icones/apple-touch-icon.png',
  'js/api.js',
  'js/app.js',
  'js/cache-calendrier.js',
  'js/logique/dates.js',
  'js/logique/droits.js',
  'js/logique/gpx.js',
  'js/logique/html.js',
  'js/logique/meteo.js',
  'js/logique/modeles.js',
  'js/logique/recurrences.js',
  'js/logique/telephone.js',
  'js/ui/admin.js',
  'js/ui/attente.js',
  'js/ui/calendrier.js',
  'js/ui/carte.js',
  'js/ui/connexion.js',
  'js/ui/formulaire.js',
  'js/ui/installation.js',
  'js/ui/meteo-vue.js',
  'js/ui/navigation.js',
  'js/ui/sortie.js',
];
const HOTES_RESEAU = ['script.google.com', 'script.googleusercontent.com', 'api.open-meteo.com', 'geocoding-api.open-meteo.com', 'tile.openstreetmap.org'];

self.addEventListener('install', (ev) => {
  ev.waitUntil(caches.open(VERSION).then((c) => c.addAll(COQUILLE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(caches.keys()
    .then((cles) => Promise.all(cles.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (ev) => {
  const url = new URL(ev.request.url);
  if (ev.request.method !== 'GET' || HOTES_RESEAU.includes(url.hostname) || url.origin !== self.location.origin) return;
  ev.respondWith(caches.open(VERSION).then(async (cache) => {
    const enCache = await cache.match(ev.request, { ignoreSearch: true });
    const reseau = fetch(ev.request).then((rep) => {
      if (rep.ok) cache.put(ev.request, rep.clone());
      return rep;
    }).catch(() => enCache);
    return enCache || reseau;
  }));
});
