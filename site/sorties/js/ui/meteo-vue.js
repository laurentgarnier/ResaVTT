// Chargement de la météo Open-Meteo (appel direct, cache d'une heure) et préparation par date.
import { synthetiser, heureParHeure } from '../logique/meteo.js';

const DUREE_CACHE_MS = 3600 * 1000;
const VARIABLES = 'temperature_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m,wind_direction_10m';

export async function chargerMeteo(lat, lon, fetchImpl = (...a) => globalThis.fetch(...a)) {
  if (!lat || !lon) return null;
  const cle = `meteo2:${lat},${lon}`; // meteo2 : avec la direction du vent
  try {
    const cache = JSON.parse(localStorage.getItem(cle) || 'null');
    if (cache && Date.now() - cache.t < DUREE_CACHE_MS) return cache.data;
  } catch (e) { /* cache illisible : on recharge */ }
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=${VARIABLES}&timezone=Europe%2FParis&forecast_days=14`;
    const r = await fetchImpl(url);
    if (!r.ok) return null;
    const data = (await r.json()).hourly;
    try { localStorage.setItem(cle, JSON.stringify({ t: Date.now(), data })); } catch (e) { /* stockage plein : sans cache */ }
    return data;
  } catch (e) {
    return null;
  }
}

export function meteoParDate(hourly, dates) {
  if (!hourly) return null;
  const res = {};
  for (const d of dates) {
    const s = synthetiser(hourly, d);
    if (s.matin || s.apres_midi) res[d] = s;
  }
  return res;
}

export function heuresDuJour(hourly, date) {
  return hourly ? heureParHeure(hourly, date) : null;
}
