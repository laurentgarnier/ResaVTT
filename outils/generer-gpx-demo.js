// Génère 3 boucles GPX fictives autour de la commune de démo, dans backend/noyau/traces-demo.js.
import { writeFileSync } from 'node:fs';

const CENTRE = [48.4047, 2.7016];
const BOUCLES = [
  { nom: 'boucle-foret.gpx', rayonKm: 4.9, dx: -0.02, dy: 0.01, graine: 1 },
  { nom: 'variante-courte.gpx', rayonKm: 3.6, dx: 0.01, dy: 0.0, graine: 2 },
  { nom: 'inter-rocher.gpx', rayonKm: 6.6, dx: 0.0, dy: -0.02, graine: 3 },
];

function boucle({ nom, rayonKm, dx, dy, graine }) {
  const n = 400;
  const lat0 = CENTRE[0] + dy;
  const lon0 = CENTRE[1] + dx;
  const kmParDegLat = 111.2;
  const kmParDegLon = 111.2 * Math.cos((lat0 * Math.PI) / 180);
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = (2 * Math.PI * i) / n;
    const r = rayonKm * (1 + 0.18 * Math.sin(3 * a + graine) + 0.08 * Math.sin(7 * a + 2 * graine));
    const lat = lat0 + (r * Math.sin(a)) / kmParDegLat;
    const lon = lon0 + (r * Math.cos(a)) / kmParDegLon;
    const ele = 110 + 30 * Math.sin(4 * a + graine) + 8 * Math.sin(13 * a);
    pts.push(`<trkpt lat="${lat.toFixed(6)}" lon="${lon.toFixed(6)}"><ele>${ele.toFixed(1)}</ele></trkpt>`);
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Sorties VTT (démo)" xmlns="http://www.topografix.com/GPX/1/1"><trk><name>${nom.replace('.gpx', '')}</name><trkseg>${pts.join('')}</trkseg></trk></gpx>\n`;
}

const traces = Object.fromEntries(BOUCLES.map((b) => [b.nom, boucle(b)]));
writeFileSync('backend/noyau/traces-demo.js', `// Fichier généré par outils/generer-gpx-demo.js : ne pas modifier à la main.\nexport const TRACES_DEMO = ${JSON.stringify(traces, null, 1)};\n`);
console.log('Traces écrites :', Object.keys(traces).join(', '));
