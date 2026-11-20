// Calendrier : grille de 14 jours (PC, tablette) et vue d'un jour (téléphone).
import { echapper } from '../logique/html.js';
import { libelleJour, creneau, jourSemaine } from '../logique/dates.js';

const JOURS_COURTS = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'];

export function lienSortie(id) {
  return '#/sortie/' + encodeURIComponent(id);
}

// Inscrits d'une sortie dans le calendrier : le nombre seulement (pas de noms : une sortie peut en avoir 40) ; avec
// plusieurs départs, le total puis une colonne par départ avec son nombre d'inscrits.
export function inscritsSortie(s) {
  const nb = s.inscrits.length;
  const moi = s.inscrits.some((i) => i.a_moi);
  const total = `<span class="who"><span class="cnt">${nb} inscrit${nb > 1 ? 's' : ''}</span>${moi ? '<span class="inscrit-moi">✓ Inscrit</span>' : ''}</span>`;
  if (!plusieursDeparts(s)) return total;
  const colonnes = s.departs.map((d) => {
    const n = s.inscrits.filter((i) => (i.depart_id || 'd1') === d.id).length;
    return `<span><small>${echapper(d.heure)} ${echapper(d.point_rdv)}</small><b>${n}</b></span>`;
  }).join('');
  return `${total}<span class="departs-cal">${colonnes}</span>`;
}

// Ligne du lieu : « 📍 PDL » ; avec plusieurs départs, ceux-ci sont dans les colonnes des inscrits.
export function ligneLieu(s, suite) {
  const morceaux = [plusieursDeparts(s) ? '' : `📍 ${lieuSortie(s)}`, ...suite].filter(Boolean);
  return morceaux.length ? `<span class="meta">${morceaux.join(' · ')}</span>` : '';
}

export function badgeSortie(s) {
  if (s.statut === 'annulee') return '<span class="badge b-an">Annulée</span>';
  if (s.type === 'recurrente') return '<span class="badge b-rec">Récurrente</span>';
  return `<span class="badge b-lib">Proposée par ${echapper(s.createur_nom)}</span>`;
}

export function personnesDistinctes(sorties) {
  return new Set(sorties.filter((s) => s.statut !== 'annulee').flatMap((s) => s.inscrits.map((i) => i.personne_id))).size;
}

// Précipitations en mm, à la française (0,4 mm), en gras dès qu'il pleut (<strong> : les <b> de la météo ont leur
// propre mise en forme).
export function mm(v) {
  const n = Number(v) || 0;
  const texte = `${String(n).replace('.', ',')} mm`;
  return n > 0 ? `<strong class="pluie">${texte}</strong>` : texte;
}

// Orientation du vent : secteur d'où il vient, flèche dans le sens où il souffle.
export function orientationVent(deg, secteur) {
  if (!secteur) return '';
  return `<span class="vent-dir" title="Vent de secteur ${secteur}"><i style="transform:rotate(${deg}deg)">↓</i>${secteur}</span>`;
}

export function vent(kmh, deg, secteur) {
  return `🌬 ${kmh} km/h ${orientationVent(deg, secteur)}`.trim();
}

export function blocMeteo(meteoParDate, jour) {
  if (jour.passe) return '';
  if (!meteoParDate) return '<div class="meteo"><div class="indispo">Météo indisponible</div></div>';
  const m = meteoParDate[jour.date];
  if (!m || (!m.matin && !m.apres_midi)) return '<div class="meteo"><div class="indispo">Prévision indisponible</div></div>';
  const plage = (titre, p) => (p
    ? `<div>${titre}<br><b>${p.emoji} ${p.tmin === p.tmax ? p.tmin : `${p.tmin}–${p.tmax}`}°</b><br>💧${mm(p.pluie_mm)}<br>${vent(p.vent_max, p.vent_dir, p.vent_cardinal)}</div>`
    : `<div>${titre}<br>—</div>`);
  return `<div class="meteo">${plage('Matin', m.matin)}${plage('Après-midi', m.apres_midi)}</div>`;
}

// Lieu d'une sortie : son point de rendez-vous, ou ses départs s'il y en a plusieurs (« 09:00 PDL · 09:30 Gare »).
const plusieursDeparts = (s) => !!(s.departs && s.departs.length > 1);
export function lieuSortie(s) {
  return echapper(plusieursDeparts(s) ? s.departs.map((d) => `${d.heure} ${d.point_rdv}`).join(' · ') : s.point_rdv);
}

export function encadreSortie(s, compact) {
  const moi = s.inscrits.some((i) => i.a_moi);
  const heure = s.modifie_par && s.type === 'recurrente'
    ? `<span class="modifie" title="modifié par ${echapper(s.modifie_par)}">${echapper(s.heure)}</span>` : echapper(s.heure);
  const details = [s.km && `${echapper(s.km)} km`, s.dplus && `${echapper(s.dplus)} m D+`].filter(Boolean).join(' · ');
  return `<a class="sortie${moi ? ' moi' : ''}${s.statut === 'annulee' ? ' annulee' : ''}" href="${lienSortie(s.id)}">
    <span class="srow"><span class="st">${echapper(s.titre)}${compact ? '' : ` · ${heure}`}</span>${badgeSortie(s)}</span>
    ${ligneLieu(s, [compact && !plusieursDeparts(s) ? heure : '', details, s.nb_messages ? `💬 ${s.nb_messages}` : ''])}
    ${s.statut === 'annulee'
    ? `<span class="meta">Motif : ${echapper(s.motif_annulation || 'non précisé')}</span>`
    : inscritsSortie(s)}
  </a>`;
}

function carteJour(cal, jour, meteoParDate, heuresDe) {
  const classes = ['jour', jour.passe ? 'passe' : '', jour.date === cal.aujourdhui ? 'aujourdhui' : ''].filter(Boolean).join(' ');
  const nbInscriptions = jour.sorties.reduce((n, s) => n + s.inscrits.length, 0);
  const resume = jour.sorties.length
    ? `${jour.sorties.length} sortie${jour.sorties.length > 1 ? 's' : ''} · ${nbInscriptions} inscription${nbInscriptions > 1 ? 's' : ''}`
    : 'Aucune sortie';
  return `<div data-date="${jour.date}" class="${classes}">
    <div class="dh">${echapper(libelleJour(jour.date))}</div>
    ${blocMeteo(meteoParDate, jour)}
    ${jour.passe ? '' : heuresRepliables(heuresDe(jour.date), jour.date === cal.aujourdhui)}
    <div class="resume">${resume}</div>
    ${jour.sorties.map((s) => encadreSortie(s, true)).join('')}
    ${jour.passe ? '' : `<a class="btn o" href="#/creer/${jour.date}">+ Créer une sortie</a>`}
  </div>`;
}

export function renderGrille(cal, meteoParDate, heuresDe = () => null) {
  const semaine = (titre, jours) => `<div class="semaine-titre">${titre}</div>
    <div class="grille">${jours.map((j) => carteJour(cal, j, meteoParDate, heuresDe)).join('')}</div>`;
  return semaine('Cette semaine', cal.jours.slice(0, 7)) + semaine('Semaine prochaine', cal.jours.slice(7));
}

function ongletsJours(cal, dateChoisie) {
  return `<nav class="onglets">${cal.jours.map((j) => {
    const [, , jj] = j.date.split('-');
    const nb = j.sorties.filter((s) => s.statut !== 'annulee').length;
    const classes = ['onglet', j.date === dateChoisie ? 'on' : '', j.passe ? 'passe' : ''].filter(Boolean).join(' ');
    return `<a class="${classes}" href="#/jour/${j.date}" data-date="${j.date}">${JOURS_COURTS[jourSemaine(j.date)]}<b>${Number(jj)}</b>${nb ? `<i>${nb}</i>` : ''}</a>`;
  }).join('')}</nav>`;
}

export function bandeHeures(heures) {
  return `<div class="horaire">${heures.map((h) => `<div>${h.heure}h<b>${h.emoji}</b>${h.temp}°<br>${mm(h.pluie_mm)}<br>${h.vent ?? 0} km/h${h.vent_cardinal ? `<br>${orientationVent(h.vent_dir, h.vent_cardinal)}` : ''}</div>`).join('')}</div>`;
}

// Météo heure par heure d'un jour, à déplier ; dépliée pour aujourd'hui (Classique, Frise et Agenda).
export function heuresRepliables(heures, ouvert) {
  if (!heures || !heures.length) return '';
  return `<details class="heures"${ouvert ? ' open' : ''}><summary>⏱ Heure par heure</summary>${bandeHeures(heures)}</details>`;
}

export function renderJour(cal, date, meteoParDate, heures) {
  const jour = cal.jours.find((j) => j.date === date) || cal.jours.find((j) => j.date === cal.aujourdhui);
  const matin = jour.sorties.filter((s) => creneau(s.heure) === 'matin');
  const apresMidi = jour.sorties.filter((s) => creneau(s.heure) === 'apres_midi');
  const nbPersonnes = personnesDistinctes(jour.sorties);
  const nbInscriptions = jour.sorties.filter((s) => s.statut !== 'annulee').reduce((n, s) => n + s.inscrits.length, 0);
  const section = (titre, liste) => (liste.length ? `<div class="section">${titre}</div>${liste.map((s) => encadreSortie(s, false)).join('')}` : '');
  const nomJour = libelleJour(jour.date).split(' ')[0].toLowerCase();
  return `<section class="vue-jour">
    ${ongletsJours(cal, jour.date)}
    <div class="titre-jour">${jour.date === cal.aujourdhui ? "Aujourd'hui, " : ''}${echapper(libelleJour(jour.date))}</div>
    ${blocMeteo(meteoParDate, jour)}
    ${jour.passe ? '' : heuresRepliables(heures, jour.date === cal.aujourdhui)}
    ${nbPersonnes ? `<div class="total"><b>${nbPersonnes} personne${nbPersonnes > 1 ? 's' : ''}</b> roule${nbPersonnes > 1 ? 'nt' : ''} ce jour-là${nbInscriptions !== nbPersonnes ? ` (${nbInscriptions} inscriptions)` : ''}.</div>` : ''}
    ${jour.sorties.length ? section('Matin', matin) + section('Après-midi', apresMidi) : '<p class="mut">Aucune sortie prévue pour l\'instant.</p>'}
    ${jour.passe ? '' : `<a class="btn o creer" href="#/creer/${jour.date}">+ Créer une sortie ${nomJour}</a>`}
  </section>`;
}
