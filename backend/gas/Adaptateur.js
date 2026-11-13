/* Adaptateur Google Apps Script : seul fichier qui touche aux services Google.
 * Le reste du code (dossier gen/) est copié depuis site/sorties/js/logique et backend/noyau.
 *
 * Fonctions à lancer depuis l'éditeur Apps Script :
 *   initialiser()        crée les onglets, le fichier Adhérents, le dossier Drive des traces (sans risque si relancé)
 *   chargerDonneesDemo() remplace les données par le jeu de démonstration (lit la feuille « Porteur »)
 *   installer()          installe le déclencheur horaire tic()
 */

var ACTIONS_SANS_VERROU = ['discussion_lire', 'trace_lire'];

function doGet() {
  return ContentService.createTextOutput('API Sorties VTT : OK').setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  var requete;
  try {
    requete = JSON.parse(e.postData.contents);
  } catch (err) {
    return repondreJson({ ok: false, erreur: 'requete_invalide', message: 'Requête invalide.' });
  }
  var debut = Date.now();
  var options = { cacheAdherents: requete.action !== 'connexion' };
  if (ACTIONS_SANS_VERROU.indexOf(requete.action) >= 0) return repondreJson(traiterEtMesurer(requete, options, debut, 0));
  var verrou = LockService.getScriptLock();
  if (!verrou.tryLock(10000)) return repondreJson({ ok: false, erreur: 'occupe', message: 'Serveur occupé, réessayez.' });
  try {
    return repondreJson(traiterEtMesurer(requete, options, debut, Date.now() - debut));
  } finally {
    verrou.releaseLock();
  }
}

// Avec « mesure: true » dans la requête, la réponse détaille où le serveur a passé son temps.
function traiterEtMesurer(requete, options, debut, attenteVerrou) {
  var ctx = contexteGoogle(options);
  var reponse = traiter(requete, ctx);
  if (requete.mesure) {
    reponse.mesure = Object.assign({ total_ms: Date.now() - debut, verrou_ms: attenteVerrou }, ctx.mesure, ctx.depot.mesure);
  }
  return reponse;
}

function tic() {
  var verrou = LockService.getScriptLock();
  verrou.waitLock(30000);
  try {
    ticNoyau(contexteGoogle());
  } finally {
    verrou.releaseLock();
  }
}

function repondreJson(objet) {
  return ContentService.createTextOutput(JSON.stringify(objet)).setMimeType(ContentService.MimeType.JSON);
}

function proprietesScript() {
  return PropertiesService.getScriptProperties();
}

function classeurAppli() {
  var id = proprietesScript().getProperty('CLASSEUR_ID');
  return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
}

function classeurAdherents() {
  var id = proprietesScript().getProperty('ADHERENTS_ID');
  if (!id) throw new Error('Fichier Adhérents non configuré : lancez initialiser().');
  return SpreadsheetApp.openById(id);
}

function valeursFeuille(feuille) {
  var nbLignes = feuille.getLastRow();
  var nbColonnes = feuille.getLastColumn();
  if (nbLignes === 0 || nbColonnes === 0) return [];
  return feuille.getRange(1, 1, nbLignes, nbColonnes).getValues();
}

// Dépôt sur le classeur. Les lectures d'une même requête sont mémorisées : au premier besoin, tous les onglets
// (hors Journal) sont lus en un seul appel au service avancé Sheets ; à défaut, onglet par onglet.
// Toute écriture sur un onglet efface sa mémoire : la lecture suivante repart de la feuille.
function depotSheets(classeur) {
  var memo = {};
  var groupeTente = false;
  var mesure = { lecture_groupee: 'non tentée', lecture_groupee_ms: 0, feuilles_lues_une_a_une: 0, ecritures: 0 };
  function feuille(onglet) {
    var f = classeur.getSheetByName(onglet);
    if (f) return f;
    // Onglet ajouté par une nouvelle version (ex. Bilan) : créé à la volée, sans relancer initialiser().
    if (ONGLETS[onglet]) return preparerFeuille(classeur, onglet, ONGLETS[onglet]);
    throw new Error('Onglet manquant : ' + onglet + ' (lancez initialiser()).');
  }
  function precharger() {
    if (groupeTente) return;
    groupeTente = true;
    if (typeof Sheets === 'undefined') { mesure.lecture_groupee = 'service Sheets indisponible'; return; }
    var noms = Object.keys(ONGLETS).filter(function (n) { return n !== 'Journal'; });
    var t0 = Date.now();
    try {
      var rep = Sheets.Spreadsheets.Values.batchGet(classeur.getId(), {
        ranges: noms.map(function (n) { return "'" + n.replace(/'/g, "''") + "'"; }),
        valueRenderOption: 'UNFORMATTED_VALUE',
        dateTimeRenderOption: 'FORMATTED_STRING',
      });
      rep.valueRanges.forEach(function (vr, i) { memo[noms[i]] = vr.values || []; });
      mesure.lecture_groupee = 'ok';
    } catch (e) {
      mesure.lecture_groupee = 'échec : ' + String(e && e.message ? e.message : e).slice(0, 200);
      Logger.log('Lecture groupée impossible, lecture onglet par onglet : ' + e);
      // Cause la plus probable : un onglet manquant. On le crée pour que la lecture groupée marche à l'appel suivant.
      noms.forEach(function (n) { feuille(n); });
    } finally {
      mesure.lecture_groupee_ms = Date.now() - t0;
    }
  }
  function valeurs(onglet) {
    precharger();
    if (!Object.prototype.hasOwnProperty.call(memo, onglet)) {
      memo[onglet] = valeursFeuille(feuille(onglet));
      mesure.feuilles_lues_une_a_une++;
    }
    return memo[onglet];
  }
  function entetes(onglet) {
    return (valeurs(onglet)[0] || []).map(function (e) { return String(e).trim(); });
  }
  function reecrire(f, ent, rang, objet) {
    f.getRange(rang, 1, 1, ent.length).setValues([objetEnLigne(ent, objet)]);
  }
  return {
    mesure: mesure,
    lire: function (onglet) { return lignesEnObjets(valeurs(onglet)); },
    ajouter: function (onglet, objets) {
      if (!objets.length) return;
      var f = feuille(onglet);
      var ent = entetes(onglet);
      var lignes = objets.map(function (o) { return objetEnLigne(ent, o); });
      var debut = f.getLastRow() + 1;
      // Une feuille a un nombre maximal de lignes (1000 au départ, réduit par chaque suppression) : on l'agrandit au besoin.
      var manque = debut + lignes.length - 1 - f.getMaxRows();
      if (manque > 0) f.insertRowsAfter(f.getMaxRows(), manque);
      var plage = f.getRange(debut, 1, lignes.length, ent.length);
      plage.setNumberFormat('@');
      plage.setValues(lignes);
      delete memo[onglet];
      mesure.ecritures++;
    },
    modifier: function (onglet, filtre, champs) {
      var f = feuille(onglet);
      var ent = entetes(onglet);
      var n = 0;
      objetsIndexes(valeurs(onglet)).forEach(function (l) {
        if (!filtre(l.objet)) return;
        reecrire(f, ent, l.rang, Object.assign({}, l.objet, champs));
        n++;
      });
      if (n) { delete memo[onglet]; mesure.ecritures++; }
      return n;
    },
    supprimer: function (onglet, filtre) {
      var f = feuille(onglet);
      var rangs = objetsIndexes(valeurs(onglet)).filter(function (l) { return filtre(l.objet); }).map(function (l) { return l.rang; });
      rangs.sort(function (a, b) { return b - a; }).forEach(function (r) { f.deleteRow(r); });
      if (rangs.length) { delete memo[onglet]; mesure.ecritures++; }
      return rangs.length;
    },
  };
}

function hexSha256(texte) {
  var octets = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(texte), Utilities.Charset.UTF_8);
  return octets.map(function (b) { return ((b + 256) % 256).toString(16).padStart(2, '0'); }).join('');
}

var CLE_CACHE_ADHERENTS = 'adherents';
var DUREE_CACHE_ADHERENTS = 300; // secondes : une modification du fichier Adhérents est vue au plus 5 min après

function lireAdherentsSource() {
  return lignesEnObjets(valeursFeuille(classeurAdherents().getSheets()[0])).map(function (a) {
    return { nom: String(a.nom || '').trim(), telephone: normaliserTelephone(String(a.telephone || '')) || '', email: String(a.email || '').trim(), actif: a.actif, admin: a.admin };
  }).filter(function (a) { return a.nom && a.telephone; });
}

function oublierAdherentsEnCache() {
  try { CacheService.getScriptCache().remove(CLE_CACHE_ADHERENTS); } catch (e) { /* cache indisponible */ }
}

// options.cacheAdherents : la liste des adhérents peut venir du cache (5 min). Jamais pour la connexion ni pour tic (purge).
function contexteGoogle(options) {
  options = options || {};
  var mesure = { adherents: 'non lus' };
  var t0 = Date.now();
  var props = proprietesScript();
  var depot = depotSheets(classeurAppli());
  mesure.ouverture_classeur_ms = Date.now() - t0;
  var adherentsMemo = null;
  function adherents() {
    if (adherentsMemo) return adherentsMemo;
    var cache = null;
    try { cache = CacheService.getScriptCache(); } catch (e) { cache = null; }
    var brut = options.cacheAdherents && cache ? cache.get(CLE_CACHE_ADHERENTS) : null;
    if (brut) {
      adherentsMemo = JSON.parse(brut);
      mesure.adherents = 'cache';
    } else {
      var t1 = Date.now();
      adherentsMemo = lireAdherentsSource();
      mesure.adherents = 'fichier (' + (Date.now() - t1) + ' ms)';
      if (cache) {
        try { cache.put(CLE_CACHE_ADHERENTS, JSON.stringify(adherentsMemo), DUREE_CACHE_ADHERENTS); } catch (e) { /* trop gros ou indisponible */ }
      }
    }
    return adherentsMemo;
  }
  return {
    mesure: mesure,
    depot: depot,
    adherents: {
      lire: function () { return adherents().map(function (a) { return Object.assign({}, a); }); },
    },
    services: {
      maintenant: function () { return new Date(); },
      uuid: function () { return Utilities.getUuid(); },
      hacher: hexSha256,
      mail: function (destinataires, objet, texte, html) {
        var options = { to: destinataires, subject: objet, body: texte, name: 'Sorties VTT' };
        if (html) options.htmlBody = html;
        MailApp.sendEmail(options);
      },
      fichiers: {
        enregistrer: function (nom, contenu) {
          return DriveApp.getFolderById(props.getProperty('TRACES_ID')).createFile(nom, contenu, 'application/gpx+xml').getId();
        },
        lire: function (id) {
          if (String(id).indexOf('demo:') === 0) return TRACES_DEMO[String(id).slice(5)];
          return DriveApp.getFileById(id).getBlob().getDataAsString('UTF-8');
        },
        supprimer: function (id) { DriveApp.getFileById(id).setTrashed(true); },
      },
      http: function (url) { return JSON.parse(UrlFetchApp.fetch(url, { muteHttpExceptions: true }).getContentText()); },
    },
    journal: function (type, detail) {
      try {
        depot.ajouter('Journal', [{ horodatage: new Date().toISOString(), type: type, detail: String(detail).slice(0, 2000) }]);
      } catch (e) {
        Logger.log(type + ' : ' + detail);
      }
    },
  };
}

function preparerFeuille(classeur, nom, entetesFeuille) {
  var f = classeur.getSheetByName(nom) || classeur.insertSheet(nom);
  if (f.getLastRow() === 0) f.getRange(1, 1, 1, entetesFeuille.length).setValues([entetesFeuille]);
  f.getRange(1, 1, f.getMaxRows(), entetesFeuille.length).setNumberFormat('@');
  f.setFrozenRows(1);
  return f;
}

function completerCleValeur(depot, onglet, defauts) {
  var presentes = depot.lire(onglet).map(function (l) { return l.cle; });
  var manquantes = Object.keys(defauts).filter(function (k) { return presentes.indexOf(k) < 0; });
  depot.ajouter(onglet, manquantes.map(function (k) { return { cle: k, valeur: defauts[k] }; }));
}

function initialiser() {
  var props = proprietesScript();
  var classeur = SpreadsheetApp.getActiveSpreadsheet();
  props.setProperty('CLASSEUR_ID', classeur.getId());
  Object.keys(ONGLETS).forEach(function (nom) { preparerFeuille(classeur, nom, ONGLETS[nom]); });
  preparerFeuille(classeur, 'Porteur', ['nom', 'telephone', 'email']);
  var vide = classeur.getSheetByName('Feuille 1') || classeur.getSheetByName('Sheet1');
  if (vide && vide.getLastRow() === 0 && classeur.getSheets().length > 1) classeur.deleteSheet(vide);

  var depot = depotSheets(classeur);
  completerCleValeur(depot, 'Parametres', PARAMETRES_DEFAUT);
  completerCleValeur(depot, 'Modeles', MODELES_DEFAUT);

  if (!props.getProperty('ADHERENTS_ID')) {
    var adh = SpreadsheetApp.create('Adhérents du club (démo)');
    var f = adh.getSheets()[0];
    f.getRange(1, 1, 1, ENTETES_ADHERENTS.length).setValues([ENTETES_ADHERENTS]);
    f.getRange(1, 2, f.getMaxRows(), 1).setNumberFormat('@');
    f.getRange(2, 4, 500, 2).insertCheckboxes();
    f.setFrozenRows(1);
    props.setProperty('ADHERENTS_ID', adh.getId());
  }
  if (!props.getProperty('TRACES_ID')) {
    props.setProperty('TRACES_ID', DriveApp.createFolder('Sorties VTT – traces').getId());
  }
  Logger.log('Initialisation terminée. Fichier Adhérents : ' + classeurAdherents().getUrl());
}

function chargerDonneesDemo() {
  var classeur = classeurAppli();
  var ligne = classeur.getSheetByName('Porteur').getRange(2, 1, 1, 3).getValues()[0];
  var porteur = { nom: String(ligne[0]).trim(), telephone: normaliserTelephone(String(ligne[1])), email: String(ligne[2]).trim() };
  if (!porteur.nom || !porteur.telephone || porteur.email.indexOf('@') < 0) {
    throw new Error('Remplissez la feuille « Porteur » ligne 2 : nom, numéro de mobile, adresse email.');
  }
  var donnees = creerDonneesDemo(aujourdhuiLocal(new Date()), porteur);
  var depot = depotSheets(classeur);
  var props = proprietesScript();
  var dossier = DriveApp.getFolderById(props.getProperty('TRACES_ID'));
  donnees.tables.Traces.forEach(function (t) {
    var nom = String(t.drive_id).slice(5);
    t.drive_id = dossier.createFile(nom, TRACES_DEMO[nom], 'application/gpx+xml').getId();
  });
  Object.keys(donnees.tables).forEach(function (onglet) {
    if (onglet === 'Parametres' || onglet === 'Modeles') return;
    depot.supprimer(onglet, function () { return true; });
    depot.ajouter(onglet, donnees.tables[onglet]);
  });
  var voulus = { adresse_liste: porteur.email, destinataires_whatsapp: porteur.email, email_alertes: porteur.email, whatsapp_numero: porteur.telephone, point_rdv_defaut: PARAMETRES_DEFAUT.point_rdv_defaut };
  Object.keys(voulus).forEach(function (cle) {
    if (!depot.modifier('Parametres', function (l) { return l.cle === cle; }, { valeur: voulus[cle] })) depot.ajouter('Parametres', [{ cle: cle, valeur: voulus[cle] }]);
  });

  var feuilleAdh = classeurAdherents().getSheets()[0];
  if (feuilleAdh.getLastRow() > 1) feuilleAdh.getRange(2, 1, feuilleAdh.getLastRow() - 1, ENTETES_ADHERENTS.length).clearContent();
  var lignesAdh = donnees.adherents.map(function (a) { return [a.nom, a.telephone, a.email, a.actif, a.admin]; });
  feuilleAdh.getRange(2, 1, lignesAdh.length, ENTETES_ADHERENTS.length).setValues(lignesAdh);
  oublierAdherentsEnCache();
  Logger.log('Données de démonstration chargées : ' + donnees.adherents.length + ' adhérents.');
}

function installer() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'tic') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('tic').timeBased().everyHours(1).create();
  Logger.log('Déclencheur horaire tic() installé.');
}
