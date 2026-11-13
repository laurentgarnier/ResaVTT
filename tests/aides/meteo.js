// Fabrique un objet « hourly » Open-Meteo pour une date : 24 heures, valeurs fournies par heure.
export function fabriquerHoraire(date, valeurs) {
  const h = { time: [], temperature_2m: [], precipitation_probability: [], precipitation: [], weather_code: [], wind_speed_10m: [], wind_direction_10m: [] };
  for (let i = 0; i < 24; i++) {
    const v = valeurs[i] || { t: 0, p: 0, c: 0 };
    h.time.push(`${date}T${String(i).padStart(2, '0')}:00`);
    h.temperature_2m.push(v.t);
    h.precipitation_probability.push(v.p);
    h.precipitation.push(v.mm ?? 0);
    h.weather_code.push(v.c);
    h.wind_speed_10m.push(v.v ?? 0);
    h.wind_direction_10m.push(v.d ?? 0);
  }
  return h;
}
