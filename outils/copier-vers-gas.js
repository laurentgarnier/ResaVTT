// Copie la logique partagée et le noyau serveur dans backend/gas/gen/ pour Apps Script (voir code-gas.js).
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { fichiersGas } from './code-gas.js';

const CIBLE = 'backend/gas/gen';
const fichiers = fichiersGas();
rmSync(CIBLE, { recursive: true, force: true });
mkdirSync(CIBLE, { recursive: true });
for (const f of fichiers) writeFileSync(`${CIBLE}/${f.nom}`, f.code);
console.log(`${fichiers.length} fichiers copiés dans ${CIBLE}`);
