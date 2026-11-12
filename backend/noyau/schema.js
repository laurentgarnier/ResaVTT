// Onglets du Google Sheet de l'appli et leurs en-têtes (spec technique §3).
// Le fichier « Adhérents » est séparé : colonnes nom, telephone, email, actif, admin.

export const ONGLETS = {
  Jetons: ['jeton_hash', 'telephone', 'appareil', 'admin_verifie', 'code_hash', 'code_expire', 'code_essais', 'cree_le', 'derniere_utilisation'],
  Personnes: ['id', 'telephone', 'nom_affiche', 'actif'],
  Sorties: ['id', 'date', 'heure', 'titre', 'point_rdv', 'lieu', 'km', 'dplus', 'description', 'type', 'regle_id', 'ordre', 'trace_regle_id',
    'createur_tel', 'createur_nom', 'statut', 'motif_annulation', 'a_notifier', 'annulation_notifiee', 'modifie_par', 'modifie_le', 'traces_masquees', 'cree_le'],
  Inscriptions: ['sortie_id', 'personne_id', 'nom_affiche', 'telephone', 'horodatage'],
  Discussions: ['id', 'sortie_id', 'auteur_nom', 'telephone', 'texte', 'trace_id', 'horodatage', 'supprime', 'systeme'],
  Traces: ['id', 'sortie_id', 'regle_id', 'nom_fichier', 'drive_id', 'km', 'dplus', 'ajoute_par_tel', 'ajoute_par_nom', 'horodatage'],
  Regles: ['id', 'nom', 'jour', 'heure', 'point_rdv', 'frequence_semaines', 'date_depart', 'active'],
  RegleSorties: ['regle_id', 'ordre', 'titre', 'lieu', 'km', 'dplus', 'description', 'trace_id'],
  Fermetures: ['id', 'debut', 'fin', 'regle_id', 'motif', 'cree_par'],
  Parametres: ['cle', 'valeur'],
  Modeles: ['cle', 'valeur'],
  Envois: ['cle', 'etape_mail', 'etape_whatsapp', 'tentatives', 'derniere_erreur', 'horodatage'],
  Journal: ['horodatage', 'type', 'detail'],
};

export const ENTETES_ADHERENTS = ['nom', 'telephone', 'email', 'actif', 'admin'];

export const PARAMETRES_DEFAUT = {
  commune_nom: 'Fontainebleau',
  commune_lat: '48.4047',
  commune_lon: '2.7016',
  point_rdv_defaut: 'Place de la mairie',
  rappel_jour: '3',
  rappel_heure: '18:00',
  adresse_liste: '',
  destinataires_whatsapp: '',
  whatsapp_numero: '',
  email_alertes: '',
  conservation_mois: '12',
  url_appli: '',
  contact_rgpd: '',
};

// Les booléens peuvent revenir de Sheets en booléen ou en texte.
export function estVrai(v) {
  return v === true || v === 'TRUE' || v === 'true' || v === 'VRAI';
}

export function lireCleValeur(lignes) {
  const o = {};
  for (const l of lignes) if (l.cle) o[l.cle] = l.valeur == null ? '' : String(l.valeur);
  return o;
}

export function erreurMetier(code, message, extra) {
  const e = new Error(message);
  e.code = code;
  e.extra = extra || {};
  return e;
}
