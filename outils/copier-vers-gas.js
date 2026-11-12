// Copie la logique partagée et le noyau serveur dans backend/gas/gen/ pour Apps Script,
// qui n'a qu'une portée globale : on retire les import et les mots-clés export.
import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';

const SOURCES = [
  { dossier: 'site/sorties/js/logique', prefixe: 'logique-' },
  { dossier: 'backend/noyau', prefixe: 'noyau-', exclure: ['depot-memoire.js'] },
];
const CIBLE = 'backend/gas/gen';

rmSync(CIBLE, { recursive: true, force: true });
mkdirSync(CIBLE, { recursive: true });
const ecrits = [];
for (const { dossier, prefixe, exclure = [] } of SOURCES) {
  for (const fichier of readdirSync(dossier).filter((f) => f.endsWith('.js') && !exclure.includes(f)).sort()) {
    const code = readFileSync(`${dossier}/${fichier}`, 'utf8')
      .split(/\r?\n/)
      .filter((ligne) => !/^\s*import\s/.test(ligne))
      .map((ligne) => ligne.replace(/^export\s+(function|const|let|class|async function)\b/, '$1'))
      .join('\n');
    if (/^\s*export\b/m.test(code)) throw new Error(`${dossier}/${fichier} : export non pris en charge`);
    const cible = `${CIBLE}/${prefixe}${fichier}`;
    writeFileSync(cible, `// Généré depuis ${dossier}/${fichier} par outils/copier-vers-gas.js : ne pas modifier.\n${code}`);
    ecrits.push(cible);
  }
}
console.log(`${ecrits.length} fichiers copiés dans ${CIBLE}`);
