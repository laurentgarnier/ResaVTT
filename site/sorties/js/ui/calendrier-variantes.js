// Mises en page alternatives du calendrier, à l'essai à côté de la mise en page classique :
// - frise : les 14 jours en colonnes côte à côte, qu'on fait défiler horizontalement ;
// - agenda : une liste qui part d'aujourd'hui, mes sorties en tête, l'heure en premier, les jours vides sur une ligne.
import { echapper } from '../logique/html.js';
import { libelleJour, jourSemaine } from '../logique/dates.js';
import { mm, blocMeteo, encadreSortie, blocHeures, pastilles, badgeSortie, lienSortie } from './calendrier.js';

const JOURS_COURTS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

function libelleCourt(date) {
  return `${JOURS_COURTS[jourSemaine(date)]} ${Number(date.slice(8, 10))}`;
}

function resumeJour(jour) {
  const actives = jour.sorties.filter((s) => s.statut !== 'annulee');
  const n = actives.reduce((t, s) => t + s.inscrits.length, 0);
  if (!jour.sorties.length) return 'Aucune sortie';
  return `${actives.length} sortie${actives.length > 1 ? 's' : ''} · ${n} inscrit${n > 1 ? 's' : ''}`;
}

// ——— Frise horizontale ———

function colonneJour(cal, jour, meteoParDate) {
  const classes = ['col-jour', jour.passe ? 'passe' : '', jour.date === cal.aujourdhui ? 'aujourdhui' : ''].filter(Boolean).join(' ');
  return `<section id="jour-${jour.date}" class="${classes}">
    <header class="col-tete"><b>${echapper(libelleJour(jour.date))}</b>${jour.date === cal.aujourdhui ? '<span class="pastille-jour">Aujourd\'hui</span>' : ''}</header>
    ${blocMeteo(meteoParDate, jour)}
    <div class="resume">${resumeJour(jour)}</div>
    <div class="col-sorties">${jour.sorties.map((s) => encadreSortie(s, true)).join('')}</div>
    ${jour.passe ? '' : `<a class="btn o" href="#/creer/${jour.date}">+ Créer une sortie</a>`}
  </section>`;
}

export function renderFrise(cal, meteoParDate) {
  const semaine = (jours) => jours.map((j) => colonneJour(cal, j, meteoParDate)).join('');
  return `<div class="frise-entete"><span>Cette semaine</span><span class="mut petit">Faites glisser pour voir les autres jours →</span></div>
    <div class="frise" tabindex="0" aria-label="Calendrier des 14 jours">
      ${semaine(cal.jours.slice(0, 7))}<div class="frise-separateur"><span>Semaine prochaine</span></div>${semaine(cal.jours.slice(7))}
    </div>`;
}

// ——— Agenda ———

function meteoMini(meteoParDate, jour) {
  const m = meteoParDate && meteoParDate[jour.date];
  if (!m) return '';
  const plage = (p) => (p ? `${p.emoji} ${p.tmin === p.tmax ? p.tmin : `${p.tmin}–${p.tmax}`}° · 💧${mm(p.pluie_mm)}` : '—');
  return `<span class="meteo-mini" title="Matin · après-midi">${plage(m.matin)}<i>|</i>${plage(m.apres_midi)}</span>`;
}

function ligneSortie(s) {
  const nb = s.inscrits.length;
  const moi = s.inscrits.some((i) => i.a_moi);
  const details = [s.km && `${echapper(s.km)} km`, s.dplus && `${echapper(s.dplus)} m D+`].filter(Boolean).join(' · ');
  return `<a class="ligne-sortie${moi ? ' moi' : ''}${s.statut === 'annulee' ? ' annulee' : ''}" href="${lienSortie(s.id)}">
    <span class="heure${s.modifie_par && s.type === 'recurrente' ? ' modifie' : ''}"${s.modifie_par && s.type === 'recurrente' ? ` title="modifié par ${echapper(s.modifie_par)}"` : ''}>${echapper(s.heure)}</span>
    <span class="corps">
      <span class="srow"><span class="st">${echapper(s.titre)}</span>${badgeSortie(s)}</span>
      <span class="meta">📍 ${echapper(s.point_rdv)}${details ? ` · ${details}` : ''}${s.nb_messages ? ` · 💬 ${s.nb_messages}` : ''}</span>
      ${s.statut === 'annulee'
    ? `<span class="meta">Motif : ${echapper(s.motif_annulation || 'non précisé')}</span>`
    : `<span class="who">${nb ? pastilles(s.inscrits) : ''}<span class="cnt">${nb} inscrit${nb > 1 ? 's' : ''}</span>${moi ? '<span class="inscrit-moi">✓ Inscrit</span>' : ''}</span>`}
    </span>
  </a>`;
}

function blocJourAgenda(cal, jour, meteoParDate, heures) {
  const aujourdhui = jour.date === cal.aujourdhui;
  const creer = jour.passe ? '' : `<a class="creer-mini" href="#/creer/${jour.date}">+ Créer</a>`;
  if (!jour.sorties.length) {
    return `<div id="jour-${jour.date}" class="jour-vide"><span><b>${echapper(libelleJour(jour.date))}</b>${aujourdhui ? ' · aujourd\'hui' : ''}</span><span class="mut">Aucune sortie</span>${creer}</div>`;
  }
  return `<section id="jour-${jour.date}" class="agenda-jour${aujourdhui ? ' aujourdhui' : ''}${jour.passe ? ' passe' : ''}">
    <header class="agenda-tete">
      <span class="date">${echapper(libelleJour(jour.date))}${aujourdhui ? ' <span class="pastille-jour">Aujourd\'hui</span>' : ''}</span>
      ${jour.passe ? '' : meteoMini(meteoParDate, jour)}
    </header>
    ${aujourdhui && heures ? blocHeures(heures) : ''}
    <div class="petit mut">${resumeJour(jour)}</div>
    ${jour.sorties.map(ligneSortie).join('')}
    ${creer}
  </section>`;
}

function mesSorties(cal) {
  const miennes = cal.jours.filter((j) => !j.passe)
    .flatMap((j) => j.sorties.map((s) => ({ ...s, date: j.date })))
    .filter((s) => s.statut !== 'annulee' && s.inscrits.some((i) => i.a_moi));
  if (!miennes.length) return '';
  return `<div class="mes-sorties"><div class="titre-bloc">Mes prochaines sorties</div>
    <div class="mes-sorties-liste">${miennes.map((s) => `<a class="ma-sortie" href="${lienSortie(s.id)}"><b>${libelleCourt(s.date)} · ${echapper(s.heure)}</b>${echapper(s.titre)}</a>`).join('')}</div>
  </div>`;
}

export function renderAgenda(cal, meteoParDate, heures = null) {
  const passes = cal.jours.filter((j) => j.passe);
  const aVenir = cal.jours.filter((j) => !j.passe);
  return `<section class="agenda">
    ${mesSorties(cal)}
    ${passes.length ? `<details class="jours-passes"><summary>Jours passés (${passes.length})</summary>${passes.map((j) => blocJourAgenda(cal, j, meteoParDate, null)).join('')}</details>` : ''}
    <div class="agenda-jours">${aVenir.map((j) => blocJourAgenda(cal, j, meteoParDate, heures)).join('')}</div>
  </section>`;
}
