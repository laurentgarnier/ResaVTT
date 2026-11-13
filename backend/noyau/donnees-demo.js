// Jeu de données fictif pour la démonstration : 40 adhérents, le porteur du projet (administrateur),
// les 3 règles initiales, un samedi chargé, une sortie libre, un dimanche fermé.
import { fenetre, ajouterJours, jourSemaine } from '../../site/sorties/js/logique/dates.js';
import { genererSorties, sortiesAAnnulerPourFermeture } from '../../site/sorties/js/logique/recurrences.js';
import { statsTrace } from '../../site/sorties/js/logique/gpx.js';
import { MODELES_DEFAUT } from '../../site/sorties/js/logique/modeles.js';
import { PARAMETRES_DEFAUT } from './schema.js';
import { TRACES_DEMO } from './traces-demo.js';

const NOMS_DEMO = ['Marie', 'Ben', 'Ludo', 'Jo', 'Alex', 'Claire', 'Damien', 'Émilie', 'Fabrice', 'Hugo',
  'Kévin', 'Laure', 'Manu', 'Nadia', 'Olivier', 'Rémi', 'Sophie', 'Thomas', 'Yann', 'Pierrot',
  'Gaëtan', 'Ana', 'Nico', 'Paul', 'Julie', 'Sam', 'Lucie', 'Antoine', 'Camille', 'Romain',
  'Inès', 'Bastien', 'Chloé', 'Vincent', 'Sarah', 'Mathieu', 'Léa', 'Quentin', 'Agathe', 'Florian'];

const INSCRITS_DEMO = {
  cool: ['Marie', 'Gaëtan', 'Ana', 'Pierrot', 'Julie', 'Lucie', 'Camille', 'Inès', 'Chloé', 'Léa', 'Agathe', 'Sarah'],
  inter: ['Alex', 'Claire', 'Damien', 'Émilie', 'Fabrice', 'Gérard', 'Hugo', 'Jo', 'Kévin', 'Laure', 'Manu', 'Nadia', 'Olivier', 'Rémi', 'Sophie', 'Thomas', 'Yann', 'Bastien'],
  sportif: ['Ludo', 'Paul', 'Nico', 'Antoine', 'Romain', 'Vincent', 'Quentin'],
  apresMidi: ['Ana', 'Nico', 'Mathieu', 'Florian'],
  libre: ['Ludo', 'Sam', 'Julie', 'Hugo', 'Florian', 'Mathieu', 'Paul', 'Camille'],
};

function telephoneDemo(i) {
  return '+336000000' + String(i + 1).padStart(2, '0');
}

function idPersonne(nom) {
  return 'p-' + nom.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function pointsDemo(xml) {
  const res = [];
  const re = /<trkpt lat="([\d.-]+)" lon="([\d.-]+)"><ele>([\d.-]+)<\/ele>/g;
  let m;
  while ((m = re.exec(xml))) res.push([Number(m[1]), Number(m[2]), Number(m[3])]);
  return res;
}

// Créneaux habituels d'une semaine (lundi = 0) et participation moyenne, pour un historique crédible.
const HISTORIQUE_SEMAINE = [
  { jour: 2, heure: '14:00', moyenne: 5 },
  { jour: 5, heure: '09:00', moyenne: 9 },
  { jour: 5, heure: '09:00', moyenne: 12 },
  { jour: 5, heure: '09:00', moyenne: 6 },
  { jour: 5, heure: '14:00', moyenne: 4 },
  { jour: 6, heure: '09:00', moyenne: 10 },
  { jour: 6, heure: '09:00', moyenne: 7 },
];
// Plus de monde aux beaux jours (janvier … décembre).
const SAISON = [0.6, 0.65, 0.8, 1, 1.1, 1.2, 1.1, 0.8, 1.15, 1, 0.75, 0.6];

// Bilan anonyme des sorties des 13 mois précédant la fenêtre affichée (pseudo-aléatoire mais reproductible).
function historiqueDemo(lundi) {
  let graine = 7;
  const hasard = () => { graine = (graine * 16807) % 2147483647; return graine / 2147483647; };
  const lignes = [];
  for (let semaine = 57; semaine >= 1; semaine--) {
    const lundiPasse = ajouterJours(lundi, -7 * semaine);
    HISTORIQUE_SEMAINE.forEach((c, i) => {
      const date = ajouterJours(lundiPasse, c.jour);
      const facteur = SAISON[Number(date.slice(5, 7)) - 1];
      const annulee = hasard() < 0.04;
      lignes.push({ sortie_id: `H:${date}:${i}`, date, heure: c.heure, statut: annulee ? 'annulee' : 'ouverte',
        participants: String(annulee ? 0 : Math.max(1, Math.round(c.moyenne * facteur * (0.6 + 0.8 * hasard())))) });
    });
  }
  return lignes;
}

export function creerDonneesDemo(aujourdhui, porteur) {
  const dates = fenetre(aujourdhui);
  const lundi = dates[0];
  const horo = aujourdhui + 'T08:00:00';
  const samedi = dates.find((d) => d >= aujourdhui && jourSemaine(d) === 5) || dates[12];
  const vendredi = ajouterJours(samedi, -1);
  const dimanche = ajouterJours(samedi, 1);

  const adherents = NOMS_DEMO.map((nom, i) => ({ nom, telephone: telephoneDemo(i), email: '', actif: true, admin: false }));
  adherents.push({ nom: porteur.nom, telephone: porteur.telephone, email: porteur.email, actif: true, admin: true });
  const telDe = Object.fromEntries(adherents.map((a) => [a.nom, a.telephone]));

  const personnes = adherents.map((a) => ({ id: idPersonne(a.nom), telephone: a.telephone, nom_affiche: a.nom, actif: true }));
  personnes.find((p) => p.telephone === porteur.telephone).id = 'p-porteur';
  personnes.push({ id: 'p-leo', telephone: porteur.telephone, nom_affiche: 'Léo', actif: true });
  personnes.push({ id: 'p-gerard', telephone: telDe.Jo, nom_affiche: 'Gérard', actif: true });
  const personneParNom = Object.fromEntries(personnes.map((p) => [p.nom_affiche, p]));

  const regles = [
    { id: 'sm', nom: 'Samedi matin', jour: '5', heure: '09:00', point_rdv: 'Place de la mairie', frequence_semaines: '1', date_depart: lundi, active: true },
    { id: 'sa', nom: 'Samedi après-midi', jour: '5', heure: '14:00', point_rdv: 'Place de la mairie', frequence_semaines: '1', date_depart: lundi, active: true },
    { id: 'dm', nom: 'Dimanche matin', jour: '6', heure: '09:00', point_rdv: 'Place de la mairie', frequence_semaines: '1', date_depart: lundi, active: true },
  ];
  const regleSorties = [
    { regle_id: 'sm', ordre: '1', titre: 'Cool', lieu: 'Forêt domaniale', km: '30', dplus: '400', description: 'Rythme tranquille, regroupements fréquents.', trace_id: 't-boucle-foret' },
    { regle_id: 'sm', ordre: '2', titre: 'Inter', lieu: 'Rochers', km: '42', dplus: '750', description: '', trace_id: '' },
    { regle_id: 'sm', ordre: '3', titre: 'Sportif', lieu: '', km: '55', dplus: '1100', description: '', trace_id: '' },
    { regle_id: 'sa', ordre: '1', titre: 'Sam. après-midi', lieu: '', km: '', dplus: '', description: '', trace_id: '' },
    { regle_id: 'dm', ordre: '1', titre: 'Dim. matin', lieu: '', km: '', dplus: '', description: '', trace_id: '' },
  ];
  const fermeture = { id: 'f-chasse', debut: dimanche, fin: dimanche, regle_id: '', motif: 'Arrêté préfectoral, chasse', cree_par: porteur.nom };

  const sorties = genererSorties(regles, regleSorties, [], dates, new Set(), horo);
  for (const id of sortiesAAnnulerPourFermeture(fermeture, sorties)) {
    Object.assign(sorties.find((s) => s.id === id), { statut: 'annulee', motif_annulation: fermeture.motif, a_notifier: false, annulation_notifiee: true });
  }
  const idCool = `R:sm:${samedi}:1`;
  const idInter = `R:sm:${samedi}:2`;
  Object.assign(sorties.find((s) => s.id === idInter), { heure: '09:30', modifie_par: 'Ben', modifie_le: horo });
  const idLibre = 'libre-etangs';
  sorties.push({
    id: idLibre, date: vendredi, heure: '13:30', titre: 'Boucle des étangs', point_rdv: 'Église', lieu: 'Étangs', km: '35', dplus: '450',
    description: 'Rythme tranquille, pause café à mi-parcours.', type: 'libre', regle_id: '', ordre: '', trace_regle_id: '',
    createur_tel: telDe.Ludo, createur_nom: 'Ludo', statut: 'ouverte', motif_annulation: '', a_notifier: false, annulation_notifiee: false,
    modifie_par: '', modifie_le: '', traces_masquees: '', cree_le: horo,
  });

  const inscriptions = [];
  const inscrire = (sortieId, noms) => {
    for (const nom of noms) {
      const p = personneParNom[nom];
      inscriptions.push({ sortie_id: sortieId, personne_id: p.id, nom_affiche: p.nom_affiche, telephone: p.telephone, horodatage: horo });
    }
  };
  inscrire(idCool, INSCRITS_DEMO.cool);
  inscrire(idInter, INSCRITS_DEMO.inter);
  inscrire(`R:sm:${samedi}:3`, INSCRITS_DEMO.sportif);
  inscrire(`R:sa:${samedi}:1`, INSCRITS_DEMO.apresMidi);
  inscrire(idLibre, INSCRITS_DEMO.libre);

  const message = (n, sortieId, auteur, texte, systeme) => ({
    id: `m-${n}`, sortie_id: sortieId, auteur_nom: auteur, telephone: systeme ? '' : telDe[auteur], texte, trace_id: '',
    horodatage: `${aujourdhui}T${String(6 + n).padStart(2, '0')}:00:00.000Z`, supprime: false, systeme: !!systeme,
  });
  const discussions = [
    message(1, idInter, 'Ben', "Ben a changé l'horaire : 09:30.", true),
    message(2, idInter, 'Claire', 'Ça glisse dans la descente du chêne, prudence.'),
    message(3, idInter, 'Ben', "On attend jusqu'à 9h35 max, ensuite on part."),
    message(4, idCool, 'Gaëtan', 'Je pars à 11h30 max, je ferai la variante courte.'),
    message(5, idCool, 'Ana', 'Quelqu’un a une pompe ? La mienne a lâché 😅'),
    message(6, idLibre, 'Ludo', 'Prévoyez une frontale, on rentre à la tombée de la nuit.'),
  ];

  const trace = (id, nom, sortieId, regleId, auteur) => {
    const s = statsTrace(pointsDemo(TRACES_DEMO[nom]));
    return { id, sortie_id: sortieId, regle_id: regleId, nom_fichier: nom, drive_id: 'demo:' + nom, km: String(s.km), dplus: String(s.dplus),
      ajoute_par_tel: auteur ? telDe[auteur] : '', ajoute_par_nom: auteur || '', horodatage: horo };
  };
  const traces = [
    trace('t-boucle-foret', 'boucle-foret.gpx', '', 'sm', ''),
    trace('t-variante', 'variante-courte.gpx', idCool, '', 'Gaëtan'),
    trace('t-inter', 'inter-rocher.gpx', idInter, '', 'Ben'),
  ];

  const parametres = { ...PARAMETRES_DEFAUT, adresse_liste: porteur.email, destinataires_whatsapp: porteur.email, email_alertes: porteur.email, whatsapp_numero: porteur.telephone };

  return {
    adherents,
    tables: {
      Jetons: [], Journal: [], Envois: [], Bilan: historiqueDemo(lundi),
      Personnes: personnes, Sorties: sorties, Inscriptions: inscriptions, Discussions: discussions, Traces: traces,
      Regles: regles, RegleSorties: regleSorties, Fermetures: [fermeture],
      Parametres: Object.entries(parametres).map(([cle, valeur]) => ({ cle, valeur })),
      Modeles: Object.entries(MODELES_DEFAUT).map(([cle, valeur]) => ({ cle, valeur })),
    },
  };
}
