// Synthèse météo à partir des données horaires Open-Meteo (spec technique §5, Météo).
// Les codes WMO ne sont pas classés par gravité : on utilise une table explicite.
const GROUPES_METEO = [
  { codes: [0], emoji: '☀️', libelle: 'Ensoleillé' },
  { codes: [1, 2], emoji: '⛅', libelle: 'Éclaircies' },
  { codes: [3], emoji: '☁️', libelle: 'Couvert' },
  { codes: [45, 48], emoji: '🌫', libelle: 'Brouillard' },
  { codes: [51, 53, 55, 56, 57], emoji: '🌦', libelle: 'Bruine' },
  { codes: [61, 66, 80], emoji: '🌧', libelle: 'Pluie' },
  { codes: [81], emoji: '🌧', libelle: 'Averses' },
  { codes: [63, 65, 67, 82], emoji: '🌧', libelle: 'Forte pluie' },
  { codes: [71, 73, 77, 85], emoji: '🌨', libelle: 'Neige' },
  { codes: [75, 86], emoji: '❄️', libelle: 'Forte neige' },
  { codes: [95], emoji: '⛈', libelle: 'Orage' },
  { codes: [96, 99], emoji: '⛈', libelle: 'Orage et grêle' },
];

function rang(code) {
  const i = GROUPES_METEO.findIndex((g) => g.codes.includes(code));
  return i < 0 ? 0 : i;
}

export function pire(codes) {
  return codes.reduce((p, c) => (rang(c) > rang(p) ? c : p), codes[0]);
}

export function picto(code) {
  const g = GROUPES_METEO[rang(code)];
  return { emoji: g.emoji, libelle: g.libelle };
}

function indicesDuJour(hourly, date, hDebut, hFin) {
  const res = [];
  hourly.time.forEach((t, i) => {
    if (!t.startsWith(date)) return;
    const h = Number(t.slice(11, 13));
    if (h >= hDebut && h <= hFin) res.push(i);
  });
  return res;
}

function synthesePlage(hourly, date, hDebut, hFin) {
  const idx = indicesDuJour(hourly, date, hDebut, hFin);
  if (!idx.length) return null;
  const v = (cle) => idx.map((i) => hourly[cle][i]).filter((x) => x != null);
  const temps = v('temperature_2m');
  const code = pire(v('weather_code'));
  return {
    tmin: Math.round(Math.min(...temps)),
    tmax: Math.round(Math.max(...temps)),
    pluie_proba: Math.round(Math.max(0, ...v('precipitation_probability'))),
    pluie_mm: Math.round(v('precipitation').reduce((a, b) => a + b, 0) * 10) / 10,
    vent_max: Math.round(Math.max(0, ...v('wind_speed_10m'))),
    code,
    ...picto(code),
  };
}

export function synthetiser(hourly, date) {
  return { matin: synthesePlage(hourly, date, 8, 12), apres_midi: synthesePlage(hourly, date, 13, 18) };
}

export function heureParHeure(hourly, date) {
  return indicesDuJour(hourly, date, 6, 21).map((i) => ({
    heure: hourly.time[i].slice(11, 13),
    temp: Math.round(hourly.temperature_2m[i]),
    pluie_proba: hourly.precipitation_probability[i],
    pluie_mm: Math.round((hourly.precipitation[i] || 0) * 10) / 10,
    code: hourly.weather_code[i],
    emoji: picto(hourly.weather_code[i]).emoji,
  }));
}
