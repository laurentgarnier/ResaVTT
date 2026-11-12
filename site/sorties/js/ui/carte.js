// Petite carte fixe (sans interaction) d'une trace GPX, avec Leaflet et les tuiles OpenStreetMap.
export function afficherCarte(element, points) {
  const L = globalThis.L;
  if (!L) {
    element.textContent = 'Carte indisponible (pas de connexion).';
    return;
  }
  const carte = L.map(element, {
    dragging: false, touchZoom: false, scrollWheelZoom: false, doubleClickZoom: false, boxZoom: false, keyboard: false, zoomControl: false,
  });
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18, attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(carte);
  const latlngs = points.map((p) => [p[0], p[1]]);
  const trace = L.polyline(latlngs, { color: '#c6f432', weight: 4 }).addTo(carte);
  L.circleMarker(latlngs[0], { radius: 6, color: '#4ea3ff', fillColor: '#4ea3ff', fillOpacity: 1 }).addTo(carte);
  if (latlngs.length > 1) L.circleMarker(latlngs[latlngs.length - 1], { radius: 5, color: '#ff6b6b', fillColor: '#ff6b6b', fillOpacity: 1 }).addTo(carte);
  carte.fitBounds(trace.getBounds(), { padding: [12, 12] });
}
