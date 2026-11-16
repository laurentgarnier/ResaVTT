// Installation de l'appli sur les comptes Google et GitHub de l'association, à partir de zéro : seul le fichier
// adhérents existe. À lancer depuis la racine du dépôt : npm run installer
// Chaque étape s'arrête en cas d'erreur ; le script peut être relancé, il propose de sauter les étapes déjà faites.
import { execSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, renameSync, unlinkSync } from 'node:fs';
import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import {
  idDepuisLien, idDeploiementDepuisSortie, urlApi, configPourProduction, adresseAppliDepuisDepot, fichierInstallationGas,
} from './installation.js';

const GAS = 'backend/gas';
const CLASP = ['--yes', '@google/clasp'];
const rl = readline.createInterface({ input: stdin, output: stdout });

const titre = (t) => console.log(`\n━━━ ${t} ━━━`);
const question = async (q) => (await rl.question(`${q} `)).trim();
const oui = async (q) => /^o/i.test(await question(`${q} [o/n]`));
const attendre = (q) => question(`${q} (Entrée pour continuer)`);

function clasp(args, { capturer = false } = {}) {
  const r = spawnSync('npx', [...CLASP, ...args], { cwd: GAS, shell: true, encoding: 'utf8', stdio: capturer ? 'pipe' : 'inherit' });
  if (r.status !== 0) throw new Error(`clasp ${args[0]} a échoué${capturer ? ` : ${r.stderr || r.stdout}` : ''}`);
  return capturer ? `${r.stdout}${r.stderr}` : '';
}

function sh(commande) {
  execSync(commande, { stdio: 'inherit' });
}

async function google() {
  titre('1. Compte Google de l\'association');
  console.log("Pré-requis : sur le compte Google de l'association, activer « Google Apps Script API » :");
  console.log('  https://script.google.com/home/usersettings');
  await attendre('Quand c\'est fait');
  if (await oui('Se déconnecter du compte Google actuel et se connecter à celui de l\'association ?')) {
    try { clasp(['logout']); } catch (e) { /* déjà déconnecté */ }
    clasp(['login']);
  }

  titre('2. Fichier adhérents');
  console.log('Collez le lien du fichier Google Sheets des adhérents (colonnes en ligne 1 : nom, telephone, email, actif, admin).');
  console.log("Il doit appartenir au compte de l'association, ou être partagé avec lui en modification.");
  let adherentsId = '';
  while (!adherentsId) adherentsId = idDepuisLien(await question('Lien ou identifiant :'));
  writeFileSync(`${GAS}/Installation.js`, fichierInstallationGas(adherentsId));

  titre('3. Classeur et script de l\'appli');
  if (existsSync(`${GAS}/.clasp.json`)) {
    renameSync(`${GAS}/.clasp.json`, `${GAS}/.clasp.ancien.json`);
    console.log('Ancien projet mis de côté : backend/gas/.clasp.ancien.json');
  }
  const manifeste = readFileSync(`${GAS}/appsscript.json`, 'utf8');
  clasp(['create-script', '--type', 'sheets', '--title', '"Sorties VTT"', '--rootDir', '.']);
  writeFileSync(`${GAS}/appsscript.json`, manifeste); // clasp peut le remplacer par un manifeste vide
  if (existsSync(`${GAS}/Code.js`)) unlinkSync(`${GAS}/Code.js`);
  sh('npm run gas:pousser');

  titre('4. Initialisation (dans l\'éditeur Apps Script)');
  clasp(['open-script']);
  console.log("Dans l'éditeur qui s'ouvre (recharger la page si besoin) :");
  console.log('  a) choisir la fonction « initialiser » puis Exécuter, et accepter les autorisations');
  console.log('     (écran « Google n\'a pas validé cette application » → Paramètres avancés → Accéder à Sorties VTT → Autoriser) ;');
  console.log('  b) choisir « installer » puis Exécuter (envois automatiques chaque heure).');
  console.log('Ne PAS lancer chargerDonneesDemo : elle remplacerait le fichier adhérents par des membres fictifs.');
  await attendre('Quand les deux ont réussi');

  titre('5. Mise en ligne de l\'API');
  const sortie = clasp(['create-deployment', '-d', '"API Sorties VTT"'], { capturer: true });
  const id = idDeploiementDepuisSortie(sortie);
  if (!id) throw new Error(`Déploiement : identifiant introuvable dans « ${sortie} »`);
  writeFileSync(`${GAS}/.deploiement.json`, JSON.stringify({ deploymentId: id }, null, 2));
  const url = urlApi(id);
  const reponse = await fetch(url).then((r) => r.text()).catch((e) => String(e));
  console.log(reponse.includes('API Sorties VTT : OK') ? `API en ligne : ${url}` : `⚠ L'API ne répond pas encore comme prévu (${reponse.slice(0, 80)}). Réessayer l'adresse dans un navigateur : ${url}`);
  writeFileSync('site/sorties/config.js', configPourProduction(readFileSync('site/sorties/config.js', 'utf8'), url));
  console.log("site/sorties/config.js pointe maintenant vers cette API (et n'affiche plus l'indice de démo).");
  console.log('Pour les versions suivantes du serveur : npm run gas:publier');
}

async function github() {
  titre('6. Dépôt GitHub de l\'association');
  console.log("Sur github.com, avec le compte de l'association : créer un dépôt PUBLIC vide (sans README).");
  const depot = await question('Adresse du dépôt (ex. https://github.com/<association>/sorties-vtt.git) :');
  const remotes = execSync('git remote', { encoding: 'utf8' }).split(/\s+/);
  if (remotes.includes('origin')) {
    const nom = remotes.includes('perso') ? 'ancien' : 'perso';
    sh(`git remote rename origin ${nom}`);
    console.log(`L'ancien dépôt reste accessible sous le nom « ${nom} ».`);
  }
  sh(`git remote add origin ${depot}`);
  sh('git add site/sorties/config.js');
  try { sh('git commit -m "Installation : API de l\'association"'); } catch (e) { /* rien à valider */ }
  sh('git push -u origin main');
  const adresse = adresseAppliDepuisDepot(depot);
  titre('7. À faire une fois sur GitHub et dans l\'appli');
  console.log('  a) Sur GitHub : Settings → Pages → Build and deployment → Source : « GitHub Actions ».');
  console.log('     Puis onglet Actions : « Publication du site » doit passer au vert.');
  console.log(`  b) Ouvrir l'appli : ${adresse || "https://<compte>.github.io/<dépôt>/sorties/"}`);
  console.log("     Se connecter avec le numéro d'un administrateur du fichier adhérents (colonne admin cochée, email renseigné).");
  console.log('  c) ⚙ Admin → Paramètres : adresse de l\'appli (ci-dessus), commune, point de rendez-vous, liste de diffusion,');
  console.log('     destinataires WhatsApp, email des alertes. Puis Récurrences, Rappels et Messages.');
}

try {
  console.log("Installation de l'appli des sorties sur les comptes de l'association.");
  if (await oui('Étapes Google (classeur, script, API) ?')) await google();
  if (await oui('Étapes GitHub (dépôt, publication du site) ?')) await github();
  console.log('\nTerminé.');
} catch (e) {
  console.error(`\n✗ ${e.message}\nCorrigez puis relancez : npm run installer (les étapes déjà faites peuvent être sautées).`);
  process.exitCode = 1;
} finally {
  rl.close();
}
