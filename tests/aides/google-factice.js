// Imitation minimale des services Google utilisés par backend/gas/Adaptateur.js, pour les tests sous Node.
import { createHash, randomUUID } from 'node:crypto';

function creerFeuille(nom) {
  const donnees = [];
  // Comme Google Sheets : une feuille a un nombre maximal de lignes (1000 au départ) ;
  // écrire au-delà échoue, deleteRow le réduit, insertRowsAfter l'augmente.
  let lignesMax = 1000;
  const largeur = () => donnees.reduce((m, l) => Math.max(m, l.length), 0);
  const plage = (r, c, nr, nc) => ({
    getValues: () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => {
      const v = (donnees[r - 1 + i] || [])[c - 1 + j];
      return v === undefined ? '' : v;
    })),
    setValues: (v) => {
      if (r + v.length - 1 > lignesMax) throw new Error(`Les coordonnées de la plage sont en dehors des dimensions de la feuille (${nom}).`);
      v.forEach((ligne, i) => {
        while (donnees.length < r + i) donnees.push([]);
        ligne.forEach((x, j) => { donnees[r - 1 + i][c - 1 + j] = x; });
      });
    },
    setNumberFormat: () => {},
    insertCheckboxes: () => {},
    clearContent: () => {
      for (let i = 0; i < nr; i++) if (donnees[r - 1 + i]) for (let j = 0; j < nc; j++) donnees[r - 1 + i][c - 1 + j] = '';
    },
  });
  return {
    donnees,
    getName: () => nom,
    getLastRow: () => {
      for (let i = donnees.length; i > 0; i--) if ((donnees[i - 1] || []).some((x) => x !== '' && x != null)) return i;
      return 0;
    },
    getLastColumn: () => largeur(),
    getMaxRows: () => lignesMax,
    insertRowsAfter: (_apres, n) => { lignesMax += n; },
    getRange: (r, c, nr = 1, nc = 1) => plage(r, c, nr, nc),
    appendRow: (l) => { donnees.push([...l]); },
    deleteRow: (r) => { donnees.splice(r - 1, 1); lignesMax -= 1; },
    deleteRows: (r, n) => { donnees.splice(r - 1, n); lignesMax -= n; },
    setFrozenRows: () => {},
  };
}

function creerClasseur(id, nom) {
  const feuilles = [creerFeuille('Feuille 1')];
  return {
    feuilles,
    getId: () => id,
    getName: () => nom,
    getUrl: () => `https://docs.google.com/spreadsheets/d/${id}`,
    getSheetByName: (n) => feuilles.find((f) => f.getName() === n) || null,
    getSheets: () => [...feuilles],
    insertSheet: (n) => { const f = creerFeuille(n); feuilles.push(f); return f; },
    deleteSheet: (f) => { feuilles.splice(feuilles.indexOf(f), 1); },
  };
}

export function creerGoogleFactice() {
  const classeurs = new Map();
  const classeurActif = creerClasseur('classeur-actif', 'Sorties VTT (démo)');
  classeurs.set(classeurActif.getId(), classeurActif);
  const classeursCrees = [];
  const proprietes = {};
  const mails = [];
  const declencheurs = [];
  const drive = { dossiers: [], fichiers: new Map() };
  let n = 0;

  const globaux = {
    SpreadsheetApp: {
      getActiveSpreadsheet: () => classeurActif,
      openById: (id) => { const c = classeurs.get(id); if (!c) throw new Error(`classeur ${id} introuvable`); return c; },
      create: (nom) => { const c = creerClasseur(`classeur-${++n}`, nom); classeurs.set(c.getId(), c); classeursCrees.push(c); return c; },
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (k) => (k in proprietes ? proprietes[k] : null),
        setProperty: (k, v) => { proprietes[k] = String(v); },
      }),
    },
    DriveApp: {
      createFolder: (nom) => { const d = { id: `dossier-${++n}`, nom }; drive.dossiers.push(d); return { getId: () => d.id, getUrl: () => `https://drive/${d.id}` }; },
      getFolderById: () => ({
        createFile: (nom, contenu) => { const id = `fichier-${++n}`; drive.fichiers.set(id, { nom, contenu, corbeille: false }); return { getId: () => id }; },
      }),
      getFileById: (id) => ({
        getBlob: () => ({ getDataAsString: () => drive.fichiers.get(id).contenu }),
        setTrashed: (v) => { drive.fichiers.get(id).corbeille = v; },
      }),
    },
    MailApp: { sendEmail: (o) => { mails.push(o); } },
    LockService: { getScriptLock: () => ({ tryLock: () => true, waitLock: () => {}, releaseLock: () => {} }) },
    ContentService: {
      MimeType: { JSON: 'application/json', TEXT: 'text/plain' },
      createTextOutput: (s) => { const o = { getContent: () => s, setMimeType: () => o }; return o; },
    },
    Utilities: {
      getUuid: () => randomUUID(),
      DigestAlgorithm: { SHA_256: 'sha256' },
      Charset: { UTF_8: 'utf8' },
      computeDigest: (_algo, s) => [...createHash('sha256').update(String(s), 'utf8').digest()].map((b) => (b > 127 ? b - 256 : b)),
    },
    UrlFetchApp: { fetch: () => ({ getContentText: () => '{"results":[]}' }) },
    ScriptApp: {
      getProjectTriggers: () => declencheurs.map((d) => ({ getHandlerFunction: () => d.fonction, _d: d })),
      deleteTrigger: (t) => { declencheurs.splice(declencheurs.indexOf(t._d), 1); },
      newTrigger: (fonction) => {
        const b = { timeBased: () => b, everyHours: () => b, create: () => { declencheurs.push({ fonction }); } };
        return b;
      },
    },
    Logger: { log: () => {} },
  };
  return { globaux, classeurActif, classeursCrees, proprietes, mails, declencheurs, drive };
}
