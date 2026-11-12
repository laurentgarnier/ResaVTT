// Tâches automatiques (spec technique §7) : génération, annulations à notifier, rappel hebdomadaire, purge.
import { fenetre, aujourdhuiLocal, jourSemaine } from '../../site/sorties/js/logique/dates.js';
import { remplirModele, listeAnnulations, MODELES_DEFAUT } from '../../site/sorties/js/logique/modeles.js';
import { estVrai, lireCleValeur } from './schema.js';
import { completerRecurrences, horodatage } from './actions-adherent.js';
import { courrierListe, courrierWhatsApp } from './courriers.js';

const SEUIL_ALERTE_ENVOI = 3;

function heureLocale(d) {
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

export function reglagesEnvoi(ctx) {
  return {
    parametres: lireCleValeur(ctx.depot.lire('Parametres')),
    modeles: { ...MODELES_DEFAUT, ...lireCleValeur(ctx.depot.lire('Modeles')) },
  };
}

// Exécute les étapes d'un envoi ; une étape réussie n'est jamais refaite. Renvoie l'état final.
export function envoyerEtapes(ctx, cle, etapes) {
  let ligne = ctx.depot.lire('Envois').find((e) => e.cle === cle);
  if (!ligne) {
    ligne = { cle, etape_mail: '', etape_whatsapp: '', tentatives: '0', derniere_erreur: '', horodatage: horodatage(ctx) };
    ctx.depot.ajouter('Envois', [ligne]);
  }
  for (const etape of etapes) {
    const champ = 'etape_' + etape.nom;
    if (ligne[champ] === 'ok') continue;
    try {
      etape.faire();
      ligne[champ] = 'ok';
      ctx.depot.modifier('Envois', (e) => e.cle === cle, { [champ]: 'ok' });
    } catch (e) {
      const tentatives = Number(ligne.tentatives || 0) + 1;
      ligne.tentatives = String(tentatives);
      ligne.derniere_erreur = String(e && e.message ? e.message : e).slice(0, 300);
      ctx.depot.modifier('Envois', (x) => x.cle === cle, { tentatives: ligne.tentatives, derniere_erreur: ligne.derniere_erreur });
      ctx.journal('envoi', `${cle} ${etape.nom} : ${ligne.derniere_erreur}`);
      if (tentatives === SEUIL_ALERTE_ENVOI) alerterEchec(ctx, cle, ligne.derniere_erreur);
    }
  }
  return { etape_mail: ligne.etape_mail, etape_whatsapp: ligne.etape_whatsapp };
}

function alerterEchec(ctx, cle, erreur) {
  const { parametres } = reglagesEnvoi(ctx);
  if (!parametres.email_alertes) return;
  try {
    ctx.services.mail(parametres.email_alertes, `Sorties VTT : échec d'envoi (${cle})`,
      `L'envoi « ${cle} » a échoué ${SEUIL_ALERTE_ENVOI} fois.\nDernière erreur : ${erreur}\nIl sera retenté automatiquement chaque heure.`);
  } catch (e) {
    ctx.journal('alerte', String(e));
  }
}

function etapesMessage(ctx, objet, texteMail, texteWhatsApp) {
  const { parametres } = reglagesEnvoi(ctx);
  return [
    {
      nom: 'mail',
      faire: () => {
        if (!parametres.adresse_liste) throw new Error('adresse_liste non renseignée');
        const c = courrierListe(objet, texteMail);
        ctx.services.mail(parametres.adresse_liste, c.objet, c.texte);
      },
    },
    {
      nom: 'whatsapp',
      faire: () => {
        if (!parametres.destinataires_whatsapp) throw new Error('destinataires_whatsapp non renseigné');
        const c = courrierWhatsApp(texteWhatsApp, parametres.whatsapp_numero);
        ctx.services.mail(parametres.destinataires_whatsapp, c.objet, c.texte, c.html);
      },
    },
  ];
}

export function envoyerRappel(ctx, cle) {
  const { parametres, modeles } = reglagesEnvoi(ctx);
  const valeurs = { lien: parametres.url_appli };
  return envoyerEtapes(ctx, cle, etapesMessage(ctx, modeles.rappel_mail_objet,
    remplirModele(modeles.rappel_mail_corps, valeurs), remplirModele(modeles.rappel_whatsapp, valeurs)));
}

function notifierAnnulations(ctx, aujourdhui) {
  const aNotifier = ctx.depot.lire('Sorties')
    .filter((s) => s.statut === 'annulee' && estVrai(s.a_notifier) && !estVrai(s.annulation_notifiee) && s.date >= aujourdhui)
    .sort((a, b) => (a.date + a.heure).localeCompare(b.date + b.heure));
  if (!aNotifier.length) return;
  const ids = aNotifier.map((s) => s.id);
  // Clé stable pour un même lot : une étape échouée est reprise au tic suivant sans renvoyer l'autre.
  const cle = 'annulation:' + ctx.services.hacher(ids.join(',')).slice(0, 12);
  const { parametres, modeles } = reglagesEnvoi(ctx);
  const valeurs = { lien: parametres.url_appli, liste_annulations: listeAnnulations(aNotifier) };
  const etat = envoyerEtapes(ctx, cle, etapesMessage(ctx, modeles.annulation_mail_objet,
    remplirModele(modeles.annulation_mail_corps, valeurs), remplirModele(modeles.annulation_whatsapp, valeurs)));
  if (etat.etape_mail === 'ok' && etat.etape_whatsapp === 'ok') {
    ctx.depot.modifier('Sorties', (s) => ids.includes(s.id), { annulation_notifiee: true });
  }
}

function rappelDu(ctx, maintenant, aujourdhui) {
  const { parametres } = reglagesEnvoi(ctx);
  if (jourSemaine(aujourdhui) !== Number(parametres.rappel_jour)) return;
  if (heureLocale(maintenant) < (parametres.rappel_heure || '18:00')) return;
  envoyerRappel(ctx, 'rappel:' + aujourdhui);
}

function dateMoinsMois(date, mois) {
  const [a, m, j] = date.split('-').map(Number);
  const d = new Date(Date.UTC(a, m - 1 - mois, j));
  return d.toISOString().slice(0, 10);
}

export function purger(ctx, aujourdhui) {
  const { parametres } = reglagesEnvoi(ctx);
  const limite = dateMoinsMois(aujourdhui, Number(parametres.conservation_mois) || 12);
  const limiteJetons = dateMoinsMois(aujourdhui, 12);
  const anciennes = new Set(ctx.depot.lire('Sorties').filter((s) => s.date < limite).map((s) => s.id));
  if (anciennes.size) {
    ctx.depot.supprimer('Sorties', (s) => anciennes.has(s.id));
    ctx.depot.supprimer('Inscriptions', (i) => anciennes.has(i.sortie_id));
    ctx.depot.supprimer('Discussions', (m) => anciennes.has(m.sortie_id));
    for (const t of ctx.depot.lire('Traces').filter((x) => anciennes.has(x.sortie_id))) {
      if (!String(t.drive_id).startsWith('demo:')) ctx.services.fichiers.supprimer(t.drive_id);
    }
    ctx.depot.supprimer('Traces', (t) => anciennes.has(t.sortie_id));
  }
  ctx.depot.supprimer('Envois', (e) => String(e.horodatage).slice(0, 10) < limite);
  ctx.depot.supprimer('Jetons', (j) => String(j.derniere_utilisation).slice(0, 10) < limiteJetons);

  const actifs = new Set(ctx.adherents.lire().filter((a) => estVrai(a.actif)).map((a) => a.telephone));
  const partis = (tel) => tel && !actifs.has(tel);
  ctx.depot.supprimer('Jetons', (j) => partis(j.telephone));
  ctx.depot.supprimer('Personnes', (p) => partis(p.telephone));
  ctx.depot.modifier('Inscriptions', (i) => partis(i.telephone), { telephone: '' });
  ctx.depot.modifier('Discussions', (m) => partis(m.telephone), { telephone: '' });
  ctx.depot.modifier('Traces', (t) => partis(t.ajoute_par_tel), { ajoute_par_tel: '' });
  ctx.depot.modifier('Sorties', (s) => partis(s.createur_tel), { createur_tel: '' });
}

function purgeDue(ctx, maintenant, aujourdhui) {
  if (heureLocale(maintenant) < '03:00') return;
  const cle = 'purge:' + aujourdhui;
  if (ctx.depot.lire('Envois').some((e) => e.cle === cle)) return;
  purger(ctx, aujourdhui);
  ctx.depot.ajouter('Envois', [{ cle, etape_mail: 'sans objet', etape_whatsapp: 'sans objet', tentatives: '0', derniere_erreur: '', horodatage: horodatage(ctx) }]);
}

export function ticNoyau(ctx) {
  const maintenant = ctx.services.maintenant();
  const aujourdhui = aujourdhuiLocal(maintenant);
  completerRecurrences(ctx, fenetre(aujourdhui));
  notifierAnnulations(ctx, aujourdhui);
  rappelDu(ctx, maintenant, aujourdhui);
  purgeDue(ctx, maintenant, aujourdhui);
}
