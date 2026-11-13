// Actions d'administration : code par mail, règles, fermetures, paramètres, modèles, géocodage, rappel immédiat.
import { fenetre, aujourdhuiLocal } from '../../site/sorties/js/logique/dates.js';
import { sortiesAAnnulerPourFermeture } from '../../site/sorties/js/logique/recurrences.js';
import { MODELES_DEFAUT } from '../../site/sorties/js/logique/modeles.js';
import { estVrai, lireCleValeur, erreurMetier, PARAMETRES_DEFAUT } from './schema.js';
import { horodatage, completerRecurrences } from './actions-adherent.js';
import { messageSysteme } from './actions-sorties.js';
import { envoyerRappel } from './automate.js';

const DUREE_CODE_MS = 15 * 60 * 1000;
const ESSAIS_CODE_MAX = 5;

export function exigerAdminVerifie(u) {
  if (!u.est_admin || !u.admin_verifie) throw erreurMetier('admin_non_verifie', 'Saisissez le code reçu par email pour accéder à l’administration.');
}

function ligneJeton(ctx, u) {
  return ctx.depot.lire('Jetons').find((j) => j.jeton_hash === u.jeton_hash);
}

export function actionAdminCodeDemander(ctx, u) {
  if (!u.est_admin) throw erreurMetier('interdit', 'Réservé aux administrateurs.');
  if (!u.email) throw erreurMetier('email_manquant', "Aucune adresse email n'est renseignée pour ce compte administrateur.");
  const code = String(parseInt(ctx.services.hacher(ctx.services.uuid()).slice(0, 8), 16) % 1000000).padStart(6, '0');
  const expire = new Date(ctx.services.maintenant().getTime() + DUREE_CODE_MS).toISOString();
  ctx.depot.modifier('Jetons', (j) => j.jeton_hash === u.jeton_hash, { code_hash: ctx.services.hacher(code), code_expire: expire, code_essais: '0' });
  ctx.services.mail(u.email, "Code d'accès administration", `Votre code : ${code} (valable 15 minutes)`);
  return { envoye: true };
}

export function actionAdminCodeVerifier(ctx, u, req) {
  if (!u.est_admin) throw erreurMetier('interdit', 'Réservé aux administrateurs.');
  const j = ligneJeton(ctx, u);
  const essais = Number(j.code_essais || 0);
  if (essais >= ESSAIS_CODE_MAX) throw erreurMetier('trop_essais', 'Trop d’essais : demandez un nouveau code.');
  if (!j.code_hash || String(j.code_expire) < ctx.services.maintenant().toISOString()) {
    throw erreurMetier('code_expire', 'Code expiré : demandez un nouveau code.');
  }
  if (ctx.services.hacher(String(req.code || '').trim()) !== j.code_hash) {
    const n = essais + 1;
    ctx.depot.modifier('Jetons', (x) => x.jeton_hash === u.jeton_hash, n >= ESSAIS_CODE_MAX ? { code_essais: String(n), code_hash: '' } : { code_essais: String(n) });
    if (n >= ESSAIS_CODE_MAX) throw erreurMetier('trop_essais', 'Trop d’essais : demandez un nouveau code.');
    throw erreurMetier('code_faux', 'Code incorrect.', { essais_restants: ESSAIS_CODE_MAX - n });
  }
  ctx.depot.modifier('Jetons', (x) => x.jeton_hash === u.jeton_hash, { admin_verifie: true, code_hash: '', code_essais: '0' });
  return { admin_verifie: true };
}

export function actionAdminLire(ctx, u) {
  exigerAdminVerifie(u);
  return {
    regles: ctx.depot.lire('Regles').map((r) => ({ ...r, active: estVrai(r.active) })),
    regle_sorties: ctx.depot.lire('RegleSorties'),
    fermetures: ctx.depot.lire('Fermetures'),
    parametres: { ...PARAMETRES_DEFAUT, ...lireCleValeur(ctx.depot.lire('Parametres')) },
    modeles: { ...MODELES_DEFAUT, ...lireCleValeur(ctx.depot.lire('Modeles')) },
    envois: ctx.depot.lire('Envois').filter((e) => !String(e.cle).startsWith('purge:'))
      .sort((a, b) => String(b.horodatage).localeCompare(String(a.horodatage))).slice(0, 20),
  };
}

function texte(v, max) {
  return String(v == null ? '' : v).trim().slice(0, max);
}

function enregistrerRegles(ctx, regles, regleSorties) {
  const nouveauxIds = {};
  let n = 0;
  const lignesRegles = regles.map((r) => {
    let id = texte(r.id, 60);
    if (!id) { id = ctx.services.uuid(); nouveauxIds['__nouvelle_' + n] = id; n++; }
    const jour = Number(r.jour);
    if (!(jour >= 0 && jour <= 6) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(r.heure) || !/^\d{4}-\d{2}-\d{2}$/.test(r.date_depart) || !texte(r.nom, 60)) {
      throw erreurMetier('champs_invalides', `Règle « ${texte(r.nom, 60)} » incomplète.`);
    }
    return {
      id, nom: texte(r.nom, 60), jour: String(jour), heure: r.heure, point_rdv: texte(r.point_rdv, 120),
      frequence_semaines: String(Math.max(1, Number(r.frequence_semaines) || 1)), date_depart: r.date_depart, active: estVrai(r.active) || r.active === true,
    };
  });
  const lignesRS = (regleSorties || []).map((rs) => ({
    regle_id: nouveauxIds[rs.regle_id] || texte(rs.regle_id, 60), ordre: String(Number(rs.ordre) || 1), titre: texte(rs.titre, 80),
    lieu: texte(rs.lieu, 120), km: texte(rs.km, 6), dplus: texte(rs.dplus, 6), description: texte(rs.description, 1000), trace_id: texte(rs.trace_id, 60),
  })).filter((rs) => rs.titre && lignesRegles.some((r) => r.id === rs.regle_id));
  ctx.depot.supprimer('Regles', () => true);
  ctx.depot.ajouter('Regles', lignesRegles);
  ctx.depot.supprimer('RegleSorties', () => true);
  ctx.depot.ajouter('RegleSorties', lignesRS);
}

function enregistrerFermetures(ctx, u, fermetures) {
  const existantes = new Set(ctx.depot.lire('Fermetures').map((f) => f.id));
  const lignes = fermetures.map((f) => ({
    id: texte(f.id, 60) || ctx.services.uuid(), debut: f.debut, fin: f.fin || f.debut, regle_id: texte(f.regle_id, 60), motif: texte(f.motif, 200),
    cree_par: texte(f.cree_par, 60) || u.nom,
  }));
  for (const f of lignes) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f.debut) || !/^\d{4}-\d{2}-\d{2}$/.test(f.fin) || f.fin < f.debut) throw erreurMetier('champs_invalides', 'Période de fermeture invalide.');
  }
  ctx.depot.supprimer('Fermetures', () => true);
  ctx.depot.ajouter('Fermetures', lignes);
  for (const f of lignes.filter((x) => !existantes.has(x.id))) {
    const ids = sortiesAAnnulerPourFermeture(f, ctx.depot.lire('Sorties'));
    if (!ids.length) continue;
    ctx.depot.modifier('Sorties', (s) => ids.includes(s.id), {
      statut: 'annulee', motif_annulation: f.motif, a_notifier: true, annulation_notifiee: false, modifie_par: u.nom, modifie_le: horodatage(ctx),
    });
    for (const id of ids) messageSysteme(ctx, id, f.motif ? `Sortie annulée : ${f.motif}.` : 'Sortie annulée.');
  }
}

function enregistrerCleValeur(ctx, onglet, valeurs, clesAutorisees) {
  const actuelles = new Set(ctx.depot.lire(onglet).map((l) => l.cle));
  for (const [cle, valeur] of Object.entries(valeurs)) {
    if (!clesAutorisees.includes(cle)) continue;
    const v = texte(valeur, 2000);
    if (actuelles.has(cle)) ctx.depot.modifier(onglet, (l) => l.cle === cle, { valeur: v });
    else ctx.depot.ajouter(onglet, [{ cle, valeur: v }]);
  }
}

export function actionAdminEnregistrer(ctx, u, req) {
  exigerAdminVerifie(u);
  if (req.regles) enregistrerRegles(ctx, req.regles, req.regle_sorties);
  if (req.fermetures) enregistrerFermetures(ctx, u, req.fermetures);
  if (req.parametres) enregistrerCleValeur(ctx, 'Parametres', req.parametres, Object.keys(PARAMETRES_DEFAUT));
  if (req.modeles) enregistrerCleValeur(ctx, 'Modeles', req.modeles, Object.keys(MODELES_DEFAUT));
  if (req.regles || req.fermetures) completerRecurrences(ctx, fenetre(aujourdhuiLocal(ctx.services.maintenant())));
  return null;
}

export function actionAdminGeocoder(ctx, u, req) {
  exigerAdminVerifie(u);
  const nom = texte(req.nom, 80);
  if (!nom) return [];
  const r = ctx.services.http(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(nom)}&count=5&language=fr&country=FR`);
  return (r.results || []).map((x) => ({ nom: x.name, departement: x.admin2 || x.admin1 || '', lat: x.latitude, lon: x.longitude }));
}

export function actionRappelEnvoyerMaintenant(ctx, u) {
  exigerAdminVerifie(u);
  return envoyerRappel(ctx, 'rappel:manuel:' + horodatage(ctx));
}
