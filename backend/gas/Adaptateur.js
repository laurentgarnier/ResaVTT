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
  if (ACTIONS_SANS_VERROU.indexOf(requete.action) >= 0) return repondreJson(traiter(requete, contexteGoogle()));
  var verrou = LockService.getScriptLock();
  if (!verrou.tryLock(10000)) return repondreJson({ ok: false, erreur: 'erreur_interne', message: 'Serveur occupé, réessayez.' });
  try {
    return repondreJson(traiter(requete, contexteGoogle()));
  } finally {
    verrou.releaseLock();
  }
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

function depotSheets(classeur) {
  function feuille(onglet) {
    var f = classeur.getSheetByName(onglet);
    if (!f) throw new Error('Onglet manquant : ' + onglet + ' (lancez initialiser()).');
    return f;
  }
  function entetes(f) {
    return f.getRange(1, 1, 1, f.getLastColumn()).getValues()[0].map(function (e) { return String(e).trim(); });
  }
  function reecrire(f, ent, rang, objet) {
    f.getRange(rang, 1, 1, ent.length).setValues([objetEnLigne(ent, objet)]);
  }
  return {
    lire: function (onglet) { return lignesEnObjets(valeursFeuille(feuille(onglet))); },
    ajouter: function (onglet, objets) {
      if (!objets.length) return;
      var f = feuille(onglet);
      var ent = entetes(f);
      var lignes = objets.map(function (o) { return objetEnLigne(ent, o); });
      f.getRange(f.getLastRow() + 1, 1, lignes.length, ent.length).setValues(lignes);
    },
    modifier: function (onglet, filtre, champs) {
      var f = feuille(onglet);
      var ent = entetes(f);
      var n = 0;
      objetsIndexes(valeursFeuille(f)).forEach(function (l) {
        if (!filtre(l.objet)) return;
        reecrire(f, ent, l.rang, Object.assign({}, l.objet, champs));
        n++;
      });
      return n;
    },
    supprimer: function (onglet, filtre) {
      var f = feuille(onglet);
      var rangs = objetsIndexes(valeursFeuille(f)).filter(function (l) { return filtre(l.objet); }).map(function (l) { return l.rang; });
      rangs.sort(function (a, b) { return b - a; }).forEach(function (r) { f.deleteRow(r); });
      return rangs.length;
    },
  };
}

function hexSha256(texte) {
  var octets = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(texte), Utilities.Charset.UTF_8);
  return octets.map(function (b) { return ((b + 256) % 256).toString(16).padStart(2, '0'); }).join('');
}

function contexteGoogle() {
  var props = proprietesScript();
  var depot = depotSheets(classeurAppli());
  return {
    depot: depot,
    adherents: {
      lire: function () {
        return lignesEnObjets(valeursFeuille(classeurAdherents().getSheets()[0])).map(function (a) {
          return { nom: String(a.nom || '').trim(), telephone: normaliserTelephone(String(a.telephone || '')) || '', email: String(a.email || '').trim(), actif: a.actif, admin: a.admin };
        }).filter(function (a) { return a.nom && a.telephone; });
      },
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
  var voulus = { adresse_liste: porteur.email, destinataires_whatsapp: porteur.email, email_alertes: porteur.email, whatsapp_numero: porteur.telephone };
  Object.keys(voulus).forEach(function (cle) {
    if (!depot.modifier('Parametres', function (l) { return l.cle === cle; }, { valeur: voulus[cle] })) depot.ajouter('Parametres', [{ cle: cle, valeur: voulus[cle] }]);
  });

  var feuilleAdh = classeurAdherents().getSheets()[0];
  if (feuilleAdh.getLastRow() > 1) feuilleAdh.getRange(2, 1, feuilleAdh.getLastRow() - 1, ENTETES_ADHERENTS.length).clearContent();
  var lignesAdh = donnees.adherents.map(function (a) { return [a.nom, a.telephone, a.email, a.actif, a.admin]; });
  feuilleAdh.getRange(2, 1, lignesAdh.length, ENTETES_ADHERENTS.length).setValues(lignesAdh);
  Logger.log('Données de démonstration chargées : ' + donnees.adherents.length + ' adhérents.');
}

function installer() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'tic') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('tic').timeBased().everyHours(1).create();
  Logger.log('Déclencheur horaire tic() installé.');
}
