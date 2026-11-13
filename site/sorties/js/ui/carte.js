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
  // Rouge soutenu bordé de blanc : lisible sur le fond de carte clair comme sur les zones boisées.
  L.polyline(latlngs, { color: '#ffffff', weight: 7, opacity: 0.85 }).addTo(carte);
  const trace = L.polyline(latlngs, { color: '#d7191c', weight: 4 }).addTo(carte);
  L.circleMarker(latlngs[0], { radius: 7, color: '#ffffff', weight: 2, fillColor: '#1565c0', fillOpacity: 1 }).bindTooltip('Départ').addTo(carte);
  if (latlngs.length > 1) L.circleMarker(latlngs[latlngs.length - 1], { radius: 6, color: '#ffffff', weight: 2, fillColor: '#212121', fillOpacity: 1 }).bindTooltip('Arrivée').addTo(carte);
  carte.fitBounds(trace.getBounds(), { padding: [12, 12] });
}
