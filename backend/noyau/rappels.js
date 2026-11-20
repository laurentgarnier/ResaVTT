// Rappels par récurrence et rappels groupés (conception : docs/superpowers/specs/2026-11-16-rappels-par-recurrence-design.md).
// Le rappel individuel est rangé dans la récurrence (colonnes rappel_* de Regles), les rappels groupés dans l'onglet Rappels.
import { aujourdhuiLocal, jourSemaine, estPasse, creneau, libelleJour } from '../../site/sorties/js/logique/dates.js';
import { lienSortie } from '../../site/sorties/js/logique/liens.js';
import { departsDe, libelleDeparts } from '../../site/sorties/js/logique/departs.js';
import { MODELES_DEFAUT, remplirModele } from '../../site/sorties/js/logique/modeles.js';
import { synthetiser, ligneMeteoTexte } from '../../site/sorties/js/logique/meteo.js';
import { estVrai, lireCleValeur } from './schema.js';
import { envoyerEtapes, etapesMessage } from './automate.js';

const HORIZON_JOURS = 7;

// Une heure relue du classeur peut valoir « 18:00:00 » (cellule convertie en heure par Sheets) : ramenée à HH:MM.
export function heureCourte(v) {
  const m = String(v == null ? '' : v).trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  return m ? `${m[1].padStart(2, '0')}:${m[2]}` : String(v == null ? '' : v);
}

// Nouvelle récurrence : rappel 2 jours avant la sortie, à 18:00, par mail et WhatsApp.
export function reglagesRappelDefaut(jourSortie) {
  return {
    rappel_actif: true,
    rappel_jour: String((Number(jourSortie) - 2 + 7) % 7),
    rappel_heure: '18:00',
    rappel_mail: true,
    rappel_whatsapp: true,
    rappel_objet: MODELES_DEFAUT.rappel_individuel_objet,
    rappel_texte: MODELES_DEFAUT.rappel_individuel_texte,
  };
}

function idsDuGroupe(groupe) {
  return String(groupe.regle_ids || '').split(',').map((id) => id.trim()).filter(Boolean);
}

// Rappels à considérer : les groupes actifs (limités à leurs récurrences actives existantes), puis les rappels
// individuels actifs des récurrences actives qu'aucun groupe actif ne couvre.
export function rappelsProgrammes(regles, groupes) {
  const actives = new Map(regles.filter((r) => estVrai(r.active)).map((r) => [r.id, r]));
  const couvertes = new Set();
  const res = [];
  for (const g of groupes.filter((x) => estVrai(x.actif))) {
    const ids = idsDuGroupe(g);
    ids.forEach((id) => couvertes.add(id));
    const regleIds = ids.filter((id) => actives.has(id));
    if (regleIds.length) res.push(rappelDepuisGroupe(g, regleIds));
  }
  for (const r of actives.values()) {
    if (!couvertes.has(r.id) && estVrai(r.rappel_actif)) res.push(rappelDepuisRegle(r));
  }
  return res;
}

function heureMinute(d) {
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

export function estDu(rappel, maintenant) {
  return jourSemaine(aujourdhuiLocal(maintenant)) === Number(rappel.jour) && heureMinute(maintenant) >= String(rappel.heure);
}

// Pour chaque récurrence : ses sorties non annulées qui partent après maintenant et au plus 7 jours après,
// en ne gardant que celles de sa prochaine date.
export function sortiesAAnnoncer(sorties, regleIds, maintenant) {
  const limite = new Date(maintenant.getTime() + HORIZON_JOURS * 86400000);
  const dateLimite = aujourdhuiLocal(limite);
  const res = [];
  for (const id of regleIds) {
    const candidates = sorties.filter((s) => s.regle_id === id && s.statut !== 'annulee' && s.date <= dateLimite
      && !estPasse(s.date, s.heure, maintenant) && estPasse(s.date, s.heure, limite));
    if (!candidates.length) continue;
    const prochaine = candidates.reduce((m, s) => (s.date < m ? s.date : m), candidates[0].date);
    res.push(...candidates.filter((s) => s.date === prochaine));
  }
  return res.sort((a, b) => (a.date + a.heure).localeCompare(b.date + b.heure));
}

// Météo horaire d'Open-Meteo pour la commune du club, lue par le serveur au moment d'un envoi. null si indisponible :
// le rappel part alors sans météo.
export function meteoServeur(ctx, parametres) {
  if (!parametres.commune_lat || !parametres.commune_lon) return null;
  const variables = 'temperature_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m,wind_direction_10m';
  try {
    const r = ctx.services.http(`https://api.open-meteo.com/v1/forecast?latitude=${parametres.commune_lat}&longitude=${parametres.commune_lon}`
      + `&hourly=${variables}&timezone=Europe%2FParis&forecast_days=14`);
    return r && r.hourly ? r.hourly : null;
  } catch (e) {
    return null;
  }
}


function meteoDe(sortie, hourly) {
  if (!hourly) return null;
  try {
    return synthetiser(hourly, sortie.date)[creneau(sortie.heure)] || null;
  } catch (e) {
    return null;
  }
}

// « (PDL) », ou tous les départs d'une sortie qui en a plusieurs : « (09:00 PDL · 09:30 Parking gare) ».
function lieuAnnonce(s) {
  if (departsDe(s).length > 1) return ` (${libelleDeparts(s)})`;
  return s.point_rdv ? ` (${s.point_rdv})` : '';
}

// Objet et texte d'un rappel : repères {{nom}}, {{liste_sorties}}, {{lien}}, et ceux de la première sortie annoncée.
export function composerMessage(rappel, sorties, hourly, urlAppli) {
  const lignes = sorties.map((s) => {
    const lien = lienSortie(urlAppli, s.id);
    return [
      `🚵 ${libelleJour(s.date)} ${s.heure} – ${s.titre}${lieuAnnonce(s)}`,
      `   ${ligneMeteoTexte(meteoDe(s, hourly))}`,
      lien ? `   👉 ${lien}` : '',
    ].filter(Boolean).join('\n');
  });
  const premiere = sorties[0] || {};
  const valeurs = {
    nom: rappel.nom,
    liste_sorties: lignes.join('\n'),
    lien: urlAppli || '',
    titre: premiere.titre || '',
    date: premiere.date ? libelleJour(premiere.date) : '',
    heure: premiere.heure || '',
    point_rdv: premiere.point_rdv || '',
    departs: premiere.date ? libelleDeparts(premiere) : '',
    meteo: premiere.date ? ligneMeteoTexte(meteoDe(premiere, hourly)) : '',
    lien_sortie: premiere.id ? lienSortie(urlAppli, premiere.id) : '',
  };
  return { objet: remplirModele(rappel.objet || '', valeurs), texte: aerer(remplirModele(rappel.texte || '', valeurs)) };
}

// Une ligne vide avant chaque sortie annoncée (🚵) et après son lien (👉), quel que soit le texte réglé par l'admin ;
// jamais deux lignes vides de suite, ni au début ni à la fin.
export function aerer(texte) {
  const lignes = [];
  let videApres = false;
  for (const ligne of String(texte).split('\n')) {
    const t = ligne.trim();
    if (t && (videApres || t.startsWith('🚵'))) lignes.push('');
    lignes.push(t ? ligne : '');
    videApres = t.startsWith('👉');
  }
  const res = [];
  for (const l of lignes) if (l !== '' || (res.length && res[res.length - 1] !== '')) res.push(l);
  while (res.length && res[res.length - 1] === '') res.pop();
  return res.join('\n');
}

// Envoie un rappel (programmé ou manuel) sur ses canaux. Aucune sortie à annoncer : rien ne part, rien n'est noté.
export function envoyerRappelProgramme(ctx, rappel, cle, hourly) {
  const sorties = sortiesAAnnoncer(ctx.depot.lire('Sorties'), rappel.regle_ids, ctx.services.maintenant());
  if (!sorties.length) return { etat: null, nb_sorties: 0 };
  const parametres = lireCleValeur(ctx.depot.lire('Parametres'));
  const m = composerMessage(rappel, sorties, hourly, parametres.url_appli);
  const etapes = etapesMessage(ctx, m.objet, m.texte, m.texte, { mail: !!rappel.mail, whatsapp: !!rappel.whatsapp });
  return { etat: envoyerEtapes(ctx, cle, etapes), nb_sorties: sorties.length };
}

// ——— Rappels déduits du classeur ———

export function rappelDepuisGroupe(g, regleIds) {
  return {
    type: 'G', id: g.id, nom: g.nom, regle_ids: regleIds, jour: Number(g.jour), heure: heureCourte(g.heure),
    mail: estVrai(g.mail), whatsapp: estVrai(g.whatsapp), objet: g.objet, texte: g.texte,
  };
}

export function rappelDepuisRegle(r) {
  return {
    type: 'R', id: r.id, nom: r.nom, regle_ids: [r.id], jour: Number(r.rappel_jour), heure: heureCourte(r.rappel_heure),
    mail: estVrai(r.rappel_mail), whatsapp: estVrai(r.rappel_whatsapp), objet: r.rappel_objet, texte: r.rappel_texte,
  };
}

export function regleIdsDuGroupe(g) {
  return idsDuGroupe(g);
}

// ——— Tâche horaire ———

// Un rappel déjà parti aujourd'hui n'est repris que si l'un de ses canaux a échoué (envoyerEtapes saute ceux réussis).
function resteAEnvoyer(rappel, ligne) {
  if (!ligne) return true;
  return (rappel.mail && ligne.etape_mail !== 'ok') || (rappel.whatsapp && ligne.etape_whatsapp !== 'ok');
}

// Rappels dus à cet instant. La météo n'est demandée qu'une fois, et seulement si au moins un rappel a des sorties
// à annoncer.
export function rappelsDuTic(ctx, maintenant) {
  const aujourdhui = aujourdhuiLocal(maintenant);
  const envois = new Map(ctx.depot.lire('Envois').map((e) => [e.cle, e]));
  const sorties = ctx.depot.lire('Sorties');
  const aEnvoyer = rappelsProgrammes(ctx.depot.lire('Regles'), ctx.depot.lire('Rappels'))
    .filter((r) => estDu(r, maintenant))
    .map((r) => ({ rappel: r, cle: `rappel:${r.type}:${r.id}:${aujourdhui}` }))
    .filter(({ rappel, cle }) => resteAEnvoyer(rappel, envois.get(cle)))
    .filter(({ rappel }) => sortiesAAnnoncer(sorties, rappel.regle_ids, maintenant).length > 0);
  if (!aEnvoyer.length) return;
  const hourly = meteoServeur(ctx, lireCleValeur(ctx.depot.lire('Parametres')));
  for (const { rappel, cle } of aEnvoyer) envoyerRappelProgramme(ctx, rappel, cle, hourly);
}

// « Envoyer maintenant » : même désactivé ou couvert par un groupe, le rappel part.
export function envoyerRappelManuel(ctx, type, id, horodatage) {
  const regles = ctx.depot.lire('Regles');
  let rappel = null;
  if (type === 'G') {
    const g = ctx.depot.lire('Rappels').find((x) => x.id === id);
    if (g) rappel = rappelDepuisGroupe(g, idsDuGroupe(g).filter((rid) => regles.some((r) => r.id === rid)));
  } else if (type === 'R') {
    const r = regles.find((x) => x.id === id);
    if (r) rappel = rappelDepuisRegle(r);
  }
  if (!rappel) return null;
  const hourly = meteoServeur(ctx, lireCleValeur(ctx.depot.lire('Parametres')));
  const { etat, nb_sorties: nb } = envoyerRappelProgramme(ctx, rappel, `rappel-manuel:${type}:${id}:${horodatage}`, hourly);
  // Complet : au moins un canal demandé, et chacun a réussi.
  const complet = !!etat && (rappel.mail || rappel.whatsapp)
    && (!rappel.mail || etat.etape_mail === 'ok') && (!rappel.whatsapp || etat.etape_whatsapp === 'ok');
  return { nb_sorties: nb, complet: !!complet };
}

// ——— Mise en service sur un classeur existant ———

export const RAPPEL_WEEKEND = {
  nom: 'Week-end',
  objet: 'Sorties VTT : les inscriptions du week-end sont ouvertes',
  texte: "Les sorties du week-end sont ouvertes !\n{{liste_sorties}}\n📱 Vous avez l'appli : ouvrez-la depuis votre écran d'accueil.\n🌐 Pas encore installée : {{lien}}",
};

// Textes par défaut de l'ancien rappel du jeudi, pour reconnaître un texte jamais personnalisé.
const ANCIENS_TEXTES_DEFAUT = [
  "Les sorties du week-end sont ouvertes !\n📱 Vous avez l'appli : ouvrez-la depuis votre écran d'accueil.\n🌐 Pas encore installée : {{lien}}",
  "Les sorties du week-end sont ouvertes !\n🚵 Samedi : {{lien_samedi}}\n🚵 Dimanche : {{lien_dimanche}}\n📱 Vous avez l'appli : ouvrez-la depuis votre écran d'accueil.\n🌐 Pas encore installée : {{lien}}",
];

function texteRepris(corps) {
  if (!corps || ANCIENS_TEXTES_DEFAUT.includes(corps)) return RAPPEL_WEEKEND.texte;
  const lignes = corps.split('\n').filter((l) => !/\{\{lien_(samedi|dimanche)\}\}/.test(l)).join('\n');
  return /\{\{liste_sorties\}\}/.test(lignes) ? lignes : `${lignes}\n{{liste_sorties}}`;
}

// Une seule fois : l'ancien rappel du jeudi devient le rappel groupé « Week-end » (récurrences du samedi et du
// dimanche) ; chaque récurrence reçoit ses réglages individuels (désactivés hors week-end).
export function migrerRappels(ctx, parametresDefaut = {}) {
  const parametres = { ...parametresDefaut, ...lireCleValeur(ctx.depot.lire('Parametres')) };
  if (parametres.rappels_migres === 'oui') return false;
  const regles = ctx.depot.lire('Regles');
  for (const r of regles.filter((x) => x.rappel_jour === '' || x.rappel_jour == null)) {
    const weekend = r.jour === '5' || r.jour === '6' || r.jour === 5 || r.jour === 6;
    ctx.depot.modifier('Regles', (x) => x.id === r.id, { ...reglagesRappelDefaut(r.jour), rappel_actif: weekend });
  }
  if (!ctx.depot.lire('Rappels').length) {
    const modeles = lireCleValeur(ctx.depot.lire('Modeles'));
    const corps = modeles.rappel_mail_corps;
    if (modeles.rappel_whatsapp && corps && modeles.rappel_whatsapp !== corps) {
      ctx.journal('rappels', "Le texte WhatsApp de l'ancien rappel du jeudi n'a pas été repris : le rappel « Week-end » utilise le texte du mail.");
    }
    ctx.depot.ajouter('Rappels', [{
      id: 'g-weekend', nom: RAPPEL_WEEKEND.nom,
      regle_ids: regles.filter((r) => ['5', '6'].includes(String(r.jour))).map((r) => r.id).join(','),
      jour: String(parametres.rappel_jour || '3'), heure: parametres.rappel_heure || '18:00', mail: true, whatsapp: true, actif: true,
      objet: modeles.rappel_mail_objet || RAPPEL_WEEKEND.objet, texte: texteRepris(corps),
    }]);
  }
  if (!ctx.depot.modifier('Parametres', (l) => l.cle === 'rappels_migres', { valeur: 'oui' })) {
    ctx.depot.ajouter('Parametres', [{ cle: 'rappels_migres', valeur: 'oui' }]);
  }
  return true;
}
