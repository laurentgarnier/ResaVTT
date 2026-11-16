// Publie une nouvelle version du serveur sur le déploiement enregistré par npm run installer (même adresse /exec).
// Appelé par npm run gas:publier, après l'envoi du code (gas:pousser).
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const fichier = 'backend/gas/.deploiement.json';
if (!existsSync(fichier)) {
  console.error(`${fichier} absent : lancez d'abord npm run installer (ou créez-le : { "deploymentId": "<id>" }).`);
  process.exit(1);
}
const { deploymentId } = JSON.parse(readFileSync(fichier, 'utf8'));
const r = spawnSync('npx', ['--yes', '@google/clasp', 'create-deployment', '-i', deploymentId, '-d', '"Nouvelle version"'],
  { cwd: 'backend/gas', shell: true, stdio: 'inherit' });
process.exit(r.status ?? 1);
