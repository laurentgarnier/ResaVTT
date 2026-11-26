// Actions des adhérents : connexion, calendrier, personnes du compte, inscriptions.
import { normaliserTelephone } from '../../site/sorties/js/logique/telephone.js';
import { fenetre, aujourdhuiLocal, estPasse } from '../../site/sorties/js/logique/dates.js';
import { genererSorties } from '../../site/sorties/js/logique/recurrences.js';
import { peutModifier, peutChangerHoraire, inscriptionsOuvertes } from '../../site/sorties/js/logique/droits.js';
import { estVrai, lireCleValeur, erreurMetier, PARAMETRES_DEFAUT } from './schema.js';
import { MODELES_DEFAUT } from '../../site/sorties/js/logique/modeles.js';
import { departsDe, departInscription } from '../../site/sorties/js/logique/departs.js';
import { retirerTracesSansInscrit } from './actions-sorties.js';
import { etatRemorque } from './actions-remorque.js';

export function horodatage(ctx) {
  return ctx.services.maintenant().toISOString();
}

export function actionConnexion(ctx, _u, req) {
  const telephone = normaliserTelephone(req.telephone);
  const adherent = telephone && ctx.adherents.lire().find((a) => a.telephone === telephone && estVrai(a.actif));
  if (!adherent) throw erreurMetier('numero_inconnu', 'Numéro inconnu. Contactez le secrétaire.');
  const jeton = (ctx.services.uuid() + ctx.services.uuid()).replace(/-/g, '');
  const maintenant = horodatage(ctx);
  ctx.depot.ajouter('Jetons', [{
    jeton_hash: ctx.services.hacher(jeton), telephone, appareil: String(req.appareil || '').slice(0, 80), admin_verifie: false,
    code_hash: '', code_expire: '', code_essais: '0', cree_le: maintenant, derniere_utilisation: maintenant,
  }]);
  if (!ctx.depot.lire('Personnes').some((p) => p.telephone === telephone)) {
    ctx.depot.ajouter('Personnes', [{ id: ctx.services.uuid(), telephone, nom_affiche: adherent.nom, actif: true }]);
  }
  return { jeton, nom: adherent.nom, est_admin: estVrai(adherent.admin) };
}

export function actionDeconnexion(ctx, u) {
  ctx.depot.supprimer('Jetons', (j) => j.jeton_hash === u.jeton_hash);
  return null;
}

export function personnesDuCompte(ctx, u) {
  return ctx.depot.lire('Personnes').filter((p) => p.telephone === u.telephone && estVrai(p.actif));
}

// Ajoute les sorties récurrentes manquantes de la fenêtre (simule tic() si le déclencheur n'est pas passé).
export function completerRecurrences(ctx, dates) {
  const sorties = ctx.depot.lire('Sorties');
  const nouvelles = genererSorties(ctx.depot.lire('Regles'), ctx.depot.lire('RegleSorties'), ctx.depot.lire('Fermetures'),
    dates, new Set(sorties.map((s) => s.id)), horodatage(ctx));
  if (nouvelles.length) ctx.depot.ajouter('Sorties', nouvelles);
  return sorties.concat(nouvelles);
}

function versBooleen(v) {
  return estVrai(v);
}

// Inscrits d'une sortie tels que les voit l'adhérent u (sans aucun numéro), par ordre alphabétique.
export function inscritsVus(inscriptions, u, nomParTelephone) {
  return inscriptions.map((i) => {
    const titulaire = nomParTelephone[i.telephone] || '';
    return {
      personne_id: i.personne_id,
      nom_affiche: i.nom_affiche,
      inscrit_par: titulaire && titulaire !== i.nom_affiche ? titulaire : null,
      a_moi: i.telephone === u.telephone,
      depart_id: departInscription(i),
    };
  }).sort((a, b) => a.nom_affiche.localeCompare(b.nom_affiche, 'fr'));
}

export function nomsParTelephone(ctx) {
  const noms = {};
  for (const a of ctx.adherents.lire()) noms[a.telephone] = a.nom;
  return noms;
}

export function vueSortie(s, contexteVue) {
  const { u, maintenant, inscriptionsParSortie, nomParTelephone, nbMessages, tracesParSortie, tracesParId } = contexteVue;
  const inscrits = inscritsVus(inscriptionsParSortie[s.id] || [], u, nomParTelephone);
  const masquees = String(s.traces_masquees || '').split(',').filter(Boolean);
  const traces = [];
  if (s.trace_regle_id && tracesParId[s.trace_regle_id] && !masquees.includes(s.trace_regle_id)) traces.push(tracesParId[s.trace_regle_id]);
  for (const t of tracesParSortie[s.id] || []) traces.push(t);
  const sortie = { ...s, a_notifier: versBooleen(s.a_notifier) };
  return {
    id: s.id, date: s.date, heure: s.heure, titre: s.titre, point_rdv: s.point_rdv, lieu: s.lieu, km: s.km, dplus: s.dplus,
    description: s.description, type: s.type, createur_nom: s.createur_nom, statut: s.statut, motif_annulation: s.motif_annulation,
    modifie_par: s.modifie_par, departs: departsDe(s), inscrits, nb_messages: nbMessages[s.id] || 0,
    // ajoute_par_nom : qui a proposé la trace (vide pour celle de la récurrence) ; a_moi : il peut la retirer.
    traces: traces.map((t) => ({ id: t.id, nom_fichier: t.nom_fichier, km: t.km, dplus: t.dplus, ajoute_par_nom: t.ajoute_par_nom || '', a_moi: !!t.ajoute_par_tel && t.ajoute_par_tel === u.telephone })),
    peut_modifier: peutModifier(sortie, u), peut_changer_horaire: peutChangerHoraire(sortie, u),
    // Sa propre sortie libre (sans transmettre de numéro) : seul son créateur annonce lui-même l'annulation sur WhatsApp.
    mienne: sortie.type === 'libre' && !!sortie.createur_tel && sortie.createur_tel === u.telephone,
    inscriptions_ouvertes: inscriptionsOuvertes(sortie, maintenant),
  };
}

function grouper(liste, cle) {
  const o = {};
  for (const x of liste) (o[x[cle]] = o[x[cle]] || []).push(x);
  return o;
}

export function contexteVue(ctx, u) {
  const nomParTelephone = nomsParTelephone(ctx);
  const nbMessages = {};
  for (const m of ctx.depot.lire('Discussions')) if (!estVrai(m.supprime)) nbMessages[m.sortie_id] = (nbMessages[m.sortie_id] || 0) + 1;
  const traces = ctx.depot.lire('Traces');
  return {
    u, maintenant: ctx.services.maintenant(), nomParTelephone, nbMessages,
    inscriptionsParSortie: grouper(ctx.depot.lire('Inscriptions'), 'sortie_id'),
    tracesParSortie: grouper(traces.filter((t) => t.sortie_id), 'sortie_id'),
    tracesParId: Object.fromEntries(traces.map((t) => [t.id, t])),
  };
}

export function actionCalendrier(ctx, u) {
  const aujourdhui = aujourdhuiLocal(ctx.services.maintenant());
  const dates = fenetre(aujourdhui);
  const sorties = completerRecurrences(ctx, dates).filter((s) => s.date >= dates[0] && s.date <= dates[13]);
  const cv = contexteVue(ctx, u);
  const parDate = grouper(sorties, 'date');
  const parametres = lireCleValeur(ctx.depot.lire('Parametres'));
  const modeles = lireCleValeur(ctx.depot.lire('Modeles'));
  // Les sorties d'une même règle restent groupées dans leur ordre, à l'heure de la règle, même si l'heure d'une occurrence a changé.
  const heureRegle = {};
  for (const r of ctx.depot.lire('Regles')) heureRegle[r.id] = r.heure;
  const heureRef = (s) => (s.type === 'recurrente' && heureRegle[s.regle_id]) || s.heure;
  return {
    aujourdhui,
    est_admin: u.est_admin,
    admin_verifie: u.admin_verifie,
    remorque: etatRemorque(ctx, u),
    moi: { telephone: u.telephone, nom: u.nom },
    personnes: personnesDuCompte(ctx, u).map((p) => ({ id: p.id, nom_affiche: p.nom_affiche })),
    parametres: {
      nom_appli: parametres.nom_appli || PARAMETRES_DEFAUT.nom_appli,
      commune_nom: parametres.commune_nom, commune_lat: parametres.commune_lat, commune_lon: parametres.commune_lon,
      point_rdv_defaut: parametres.point_rdv_defaut,
    },
    // Message WhatsApp de partage d'une nouvelle sortie, réglé par l'admin : composé dans le téléphone.
    modele_partage: modeles.partage_whatsapp || MODELES_DEFAUT.partage_whatsapp,
    modele_annulation: modeles.annulation_partage_whatsapp || MODELES_DEFAUT.annulation_partage_whatsapp,
    jours: dates.map((date) => ({
      date,
      passe: date < aujourdhui,
      sorties: (parDate[date] || [])
        .sort((a, b) => heureRef(a).localeCompare(heureRef(b)) || String(a.regle_id).localeCompare(String(b.regle_id)) || Number(a.ordre) - Number(b.ordre) || a.heure.localeCompare(b.heure))
        .map((s) => vueSortie(s, cv)),
    })),
  };
}

export function actionPersonnesEnregistrer(ctx, u, req) {
  const voulues = (req.personnes || []).map((p) => ({ id: p.id, nom_affiche: String(p.nom_affiche || '').trim().slice(0, 60) })).filter((p) => p.nom_affiche);
  if (!voulues.length) throw erreurMetier('personnes_vides', 'Le compte doit garder au moins une personne.');
  const actuelles = personnesDuCompte(ctx, u);
  const idsVoulus = new Set(voulues.filter((p) => p.id).map((p) => p.id));
  const retirees = actuelles.filter((p) => !idsVoulus.has(p.id)).map((p) => p.id);
  for (const p of voulues) {
    if (p.id && actuelles.some((a) => a.id === p.id)) ctx.depot.modifier('Personnes', (x) => x.id === p.id, { nom_affiche: p.nom_affiche });
    else ctx.depot.ajouter('Personnes', [{ id: ctx.services.uuid(), telephone: u.telephone, nom_affiche: p.nom_affiche, actif: true }]);
  }
  if (retirees.length) {
    ctx.depot.modifier('Personnes', (x) => retirees.includes(x.id), { actif: false });
    const maintenant = ctx.services.maintenant();
    const aVenir = new Set(ctx.depot.lire('Sorties').filter((s) => !estPasse(s.date, s.heure, maintenant)).map((s) => s.id));
    ctx.depot.supprimer('Inscriptions', (i) => retirees.includes(i.personne_id) && aVenir.has(i.sortie_id));
  }
  return null;
}

export function trouverSortie(ctx, id) {
  const s = ctx.depot.lire('Sorties').find((x) => x.id === id);
  if (!s) throw erreurMetier('sortie_inconnue', 'Sortie introuvable.');
  return s;
}

export function actionInscription(ctx, u, req) {
  const s = trouverSortie(ctx, req.sortie_id);
  if (s.statut === 'annulee') throw erreurMetier('sortie_annulee', 'Cette sortie est annulée.');
  if (!inscriptionsOuvertes(s, ctx.services.maintenant())) throw erreurMetier('inscriptions_closes', 'Inscriptions closes');
  const miennes = personnesDuCompte(ctx, u);
  const ids = req.personne_ids || [];
  const personnes = ids.map((id) => miennes.find((p) => p.id === id));
  if (!ids.length || personnes.some((p) => !p)) throw erreurMetier('personne_inconnue', 'Personne inconnue dans votre compte.');
  // Départ choisi pour toutes les personnes cochées (les personnes d'un compte inscrites ensemble partent du même).
  const depart = req.depart_id || 'd1';
  if (!departsDe(s).some((d) => d.id === depart)) throw erreurMetier('depart_inconnu', 'Point de départ inconnu.');
  if (req.inscrit) {
    const deja = new Set(ctx.depot.lire('Inscriptions').filter((i) => i.sortie_id === s.id).map((i) => i.personne_id));
    ctx.depot.ajouter('Inscriptions', personnes.filter((p) => !deja.has(p.id)).map((p) => ({
      sortie_id: s.id, personne_id: p.id, nom_affiche: p.nom_affiche, telephone: u.telephone, horodatage: horodatage(ctx), depart_id: depart,
    })));
    // Déjà inscrite et cochée : elle change de départ (une appli d'avant les départs n'en envoie pas : rien ne change).
    if (req.depart_id && personnes.some((p) => deja.has(p.id))) {
      ctx.depot.modifier('Inscriptions', (i) => i.sortie_id === s.id && ids.includes(i.personne_id) && departInscription(i) !== depart, { depart_id: depart });
    }
  } else {
    ctx.depot.supprimer('Inscriptions', (i) => i.sortie_id === s.id && ids.includes(i.personne_id));
    retirerTracesSansInscrit(ctx, s);
  }
  return null;
}
