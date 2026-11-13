// Construit, en mémoire, les fichiers destinés à Apps Script (portée globale unique) :
// logique partagée et noyau serveur, sans les lignes import ni les mots-clés export.
import { readdirSync, readFileSync } from 'node:fs';

const SOURCES = [
  { dossier: 'site/sorties/js/logique', prefixe: 'logique-' },
  { dossier: 'backend/noyau', prefixe: 'noyau-', exclure: ['depot-memoire.js'] },
];

export function fichiersGas() {
  const fichiers = [];
  for (const { dossier, prefixe, exclure = [] } of SOURCES) {
    for (const fichier of readdirSync(dossier).filter((f) => f.endsWith('.js') && !exclure.includes(f)).sort()) {
      const code = readFileSync(`${dossier}/${fichier}`, 'utf8')
        .split(/\r?\n/)
        .filter((ligne) => !/^\s*import\s/.test(ligne))
        .map((ligne) => ligne.replace(/^export\s+(function|const|let|class|async function)\b/, '$1'))
        .join('\n');
      if (/^\s*export\b/m.test(code)) throw new Error(`${dossier}/${fichier} : export non pris en charge`);
      fichiers.push({ nom: `${prefixe}${fichier}`, code: `// Généré depuis ${dossier}/${fichier} par outils/copier-vers-gas.js : ne pas modifier.\n${code}` });
    }
  }
  return fichiers;
}

// Le script complet tel qu'Apps Script le charge : fichiers générés puis adaptateur.
export function scriptGasComplet() {
  return fichiersGas().map((f) => f.code).concat(readFileSync('backend/gas/Adaptateur.js', 'utf8')).join('\n;\n');
}
