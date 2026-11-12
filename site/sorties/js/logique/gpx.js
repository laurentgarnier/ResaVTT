// Lecture et calculs des traces GPX (spec technique §5, Traces GPX).
const RAYON_TERRE_KM = 6371;
const SEUIL_DPLUS_M = 2;

function haversineKm(a, b) {
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b[0] - a[0]);
  const dLon = rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLon / 2) ** 2;
  return 2 * RAYON_TERRE_KM * Math.asin(Math.sqrt(h));
}

export function statsTrace(points) {
  let km = 0;
  for (let i = 1; i < points.length; i++) km += haversineKm(points[i - 1], points[i]);
  let ref = null;
  let dplus = 0;
  for (const [, , e] of points) {
    if (e == null || Number.isNaN(e)) continue;
    if (ref == null) { ref = e; continue; }
    if (e - ref > SEUIL_DPLUS_M) { dplus += e - ref; ref = e; } else if (e < ref) ref = e;
  }
  return { km: Math.round(km * 10) / 10, dplus: Math.round(dplus) };
}

export function lirePoints(xml, Parser = globalThis.DOMParser) {
  const doc = new Parser().parseFromString(xml, 'application/xml');
  if (!doc.documentElement || doc.documentElement.localName !== 'gpx') throw new Error('gpx_invalide');
  const noeuds = [...doc.getElementsByTagNameNS('*', 'trkpt'), ...doc.getElementsByTagNameNS('*', 'rtept')];
  const points = noeuds.map((n) => {
    const ele = n.getElementsByTagNameNS('*', 'ele')[0];
    return [Number(n.getAttribute('lat')), Number(n.getAttribute('lon')), ele ? Number(ele.textContent) : null];
  }).filter((p) => Number.isFinite(p[0]) && Number.isFinite(p[1]));
  if (!points.length) throw new Error('gpx_invalide');
  return points;
}
