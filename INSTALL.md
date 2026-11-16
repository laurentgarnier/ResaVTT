# Mise en place

Deux façons d'installer l'appli :

- **Installation de l'association (production)** : `npm run installer`, décrit juste dessous. On part de zéro, seul le fichier des adhérents existe ; récurrences, rappels, paramètres et textes se règlent ensuite dans l'appli.
- **Installation de démonstration**, pas à pas (sections A à C) : avec des données fictives, pour essayer l'appli sur un compte personnel.

Aucune carte bancaire n'est demandée.

## Installation de l'association (production)

**Avant de commencer**
- Sur le poste : Node.js 22 et git, ce dépôt à jour.
- Un compte Google et un compte GitHub (de préférence une organisation) au nom de l'association.
- Le fichier Google Sheets des adhérents, appartenant au compte de l'association ou partagé avec lui en modification. En ligne 1 de sa première feuille : `nom`, `telephone`, `email`, `actif`, `admin` (en minuscules). Au moins un adhérent `actif` et `admin` coché, avec son `email` : c'est lui qui ouvrira l'administration.
- Sur github.com, avec le compte de l'association : un dépôt **public vide** (sans README).

**Lancer**, à la racine du dépôt :

```bash
npm run installer
```

Le script guide pas à pas et s'arrête à la moindre erreur (on peut le relancer et sauter les étapes déjà faites) :

1. connexion au compte Google de l'association (une fenêtre de navigateur s'ouvre) ;
2. lien du fichier adhérents ;
3. création du classeur « Sorties VTT » et de son script dans ce compte, envoi du code ;
4. dans l'éditeur Apps Script qui s'ouvre : exécuter **`initialiser`** puis **`installer`**, en acceptant les autorisations. `initialiser` se branche sur le fichier adhérents (il vérifie ses colonnes) et crée le dossier des traces ; **ne pas lancer `chargerDonneesDemo`**, qui remplacerait les adhérents par des membres fictifs ;
5. mise en ligne de l'API ; son adresse est écrite dans `site/sorties/config.js` ;
6. bascule vers le dépôt GitHub de l'association (l'ancien reste accessible sous le nom `perso`) et envoi du code.

**Ensuite, une fois :**
- sur GitHub : **Settings → Pages → Source : GitHub Actions**, puis vérifier que « Publication du site » passe au vert dans l'onglet **Actions** ;
- dans l'appli, avec le numéro d'un administrateur : **⚙ Admin → Paramètres** (adresse de l'appli donnée par le script, commune, point de rendez-vous, liste de diffusion, destinataires WhatsApp, email des alertes), puis **Récurrences**, **Rappels** et **Messages**.

**Logo du club** : le logo vectoriel est `docs/logo/corbas-vtt.svg` (modifiable dans Inkscape). Après une modification :
1. `"C:\Program Files\Inkscapein\python.exe" outils\composer-icone.py docs\logo\corbas-vtt.svg` compose les deux images sources carrées (fond blanc) : `site/sorties/icones/logo.png` (logo en grand) et `logo-maskable.png` (logo dans le cercle central, qu'Android peut découper) ;
2. `npm run icones` (sous Windows) en tire toutes les tailles (Android, iPhone, onglet, bandeau, page de connexion) ;
3. publier le site.

On peut aussi remplacer directement `site/sorties/icones/logo.png` par une image **carrée d'au moins 1024 × 1024 px**, à fond uni, logo centré, puis `npm run icones`. Une appli déjà installée garde son ancienne icône jusqu'à réinstallation.

**Mises à jour par la suite :**
- serveur : `npm run gas:publier` (envoie le code et publie une nouvelle version, même adresse) ;
- site : `git push` (publication automatique après les tests). Augmenter ensemble le numéro de `site/sorties/js/version.js` et celui de `site/sorties/sw.js` pour que les téléphones prennent la nouvelle version.

## A. Côté Google (données, serveur, mails)

### A1. Activer l'API Apps Script (une seule fois par compte)

1. Ouvrir https://script.google.com/home/usersettings
2. Passer **« Google Apps Script API »** sur **Activé**.

### A2. Créer le classeur

1. Dans Google Sheets, créer un classeur vide nommé **« Sorties VTT (démo) »**.
2. Menu **Extensions → Apps Script**. Un éditeur s'ouvre dans un nouvel onglet.
3. Renommer le projet (en haut à gauche) en **« Sorties VTT »**.
4. Dans l'éditeur : **⚙ Paramètres du projet** (roue dentée à gauche) → copier l'**ID du script**.

### A3. Envoyer le code

Dans un terminal, à la racine du dépôt :

```bash
npx --yes @google/clasp login
```

Le navigateur s'ouvre : choisir votre compte Google et autoriser clasp. Puis :

```bash
cd backend/gas
npx --yes @google/clasp clone <ID_DU_SCRIPT> --rootDir .
cd ../..
npm run gas:pousser
```

`clone` crée `backend/gas/.clasp.json` (il ne contient que l'ID du script) et peut écraser `appsscript.json` et `Code.js` : remettre `appsscript.json` avec `git checkout backend/gas/appsscript.json`, supprimer `backend/gas/Code.js` s'il est apparu, puis relancer `npm run gas:pousser`. Résultat attendu : « Pushed N files ».

### A4. Initialiser

Dans l'éditeur Apps Script (recharger la page) :

1. En haut, choisir la fonction **`initialiser`** puis **Exécuter**.
2. Google demande des autorisations : **Examiner les autorisations** → votre compte → écran « Google n'a pas validé cette application » → **Paramètres avancés** → **Accéder à Sorties VTT (non sécurisé)** → **Autoriser**. C'est normal pour un script personnel : il ne s'exécute que sur votre compte.
3. Dans le classeur, une feuille **`Porteur`** est apparue. En ligne 2, saisir : votre nom (colonne A), votre numéro de mobile (B), votre adresse email (C).
4. Revenir à l'éditeur, exécuter **`chargerDonneesDemo`**, puis **`installer`**.

Résultat attendu :

- le classeur contient les onglets Sorties, Inscriptions, Discussions… remplis ;
- un fichier **« Adhérents du club (démo) »** est dans votre Drive (40 adhérents fictifs + vous, administrateur) ;
- un dossier **« Sorties VTT – traces »** contient 3 fichiers GPX ;
- dans **⏰ Déclencheurs** (à gauche), un déclencheur horaire `tic` existe.

### A5. Déployer l'API

1. **Déployer → Nouveau déploiement** → type **Application Web**.
2. Description : « API Sorties VTT ». **Exécuter en tant que : moi**. **Qui a accès : Tout le monde**.
3. **Déployer**, puis copier l'**URL de l'application Web** (elle se termine par `/exec`).
4. Vérifier : ouvrir cette URL dans le navigateur doit afficher « API Sorties VTT : OK ».

Après chaque `npm run gas:pousser`, publier la nouvelle version : **Déployer → Gérer les déploiements → ✎ → Version : Nouvelle version → Déployer** (l'URL ne change pas). Plus simple : noter l'identifiant du déploiement dans `backend/gas/.deploiement.json` (`{ "deploymentId": "<id>" }`), puis utiliser `npm run gas:publier`.

### A6. Brancher l'appli sur l'API

Dans `site/sorties/config.js`, mettre l'URL `/exec` à la place de celle qui y figure (`urlApi`). Cette URL n'est pas un secret : l'accès aux données est protégé par la connexion de chaque adhérent.

Pour tester sur votre poste avec la vraie API avant publication : ouvrir http://localhost:8080/sorties/, puis dans la console du navigateur `localStorage.setItem('sorties-vtt-api', '<URL /exec>')` et recharger.

## B. Côté GitHub (publication de l'appli)

1. Créer un compte GitHub (gratuit) si besoin. Pour le club, créer plutôt une **organisation** au nom du club.
2. Créer un dépôt **public** :
   - nommé `<votre-compte>.github.io` : le site sera à `https://<votre-compte>.github.io/` et l'appli à `https://<votre-compte>.github.io/sorties/` ;
   - ou avec un autre nom (par exemple `sorties-vtt`) : le site sera à `https://<votre-compte>.github.io/sorties-vtt/`. Les deux fonctionnent.
3. Envoyer le code :

```bash
git remote add origin https://github.com/<votre-compte>/<depot>.git
git push -u origin main
```

4. Sur GitHub : **Settings → Pages → Build and deployment → Source : GitHub Actions**.
5. Onglet **Actions** : la « Publication du site » doit passer au vert (elle lance aussi les tests).
6. Dans l'appli, menu **⚙ Admin → Paramètres**, renseigner **Adresse de l'appli** avec l'URL de `/sorties/`. C'est ce lien qui figure dans les mails et le message WhatsApp.

## C. Vérifier la chaîne complète

1. Sur votre téléphone, ouvrir l'adresse de l'appli, se connecter avec votre numéro, installer l'appli (encart en haut du calendrier).
2. **⚙ Admin** → **Recevoir un code par email** : le code arrive dans votre boîte mail.
3. **Rappels → Week-end → 📨 Envoyer maintenant** : vous recevez 2 mails, le rappel (avec la météo et le lien de chaque sortie) et « À poster sur WhatsApp ». Le bouton vert de ce dernier ouvre **votre** conversation WhatsApp avec le message prérempli.
4. **Fermetures** : fermer un samedi. À l'heure suivante (ou en exécutant `tic` dans l'éditeur), vous recevez un seul mail listant les sorties annulées, plus le message WhatsApp correspondant.

## Désigner d'autres administrateurs

Dans le fichier **Adhérents**, cocher la colonne `admin` et renseigner l'`email` de la personne. Elle recevra un code par email la première fois qu'elle ouvre l'administration sur un appareil.

## En cas de souci

- **« Onglet manquant »** : relancer `initialiser` (les onglets et colonnes ajoutés par une nouvelle version sont normalement créés tout seuls).
- **`initialiser` signale des colonnes manquantes** dans le fichier adhérents : corriger la ligne 1 (`nom`, `telephone`, `email`, `actif`, `admin`) puis relancer.
- **L'appli est lente** : `mesure: true` dans une requête à l'API détaille le temps passé côté serveur (voir la spec technique, §4 cache).
- **L'appli affiche « Erreur technique »** : voir l'onglet `Journal` du classeur et, dans l'éditeur Apps Script, **Exécutions**.
- **Les mails n'arrivent pas** : vérifier les paramètres `adresse_liste`, `destinataires_whatsapp` et l'onglet `Envois` (colonne `derniere_erreur`). Pour un vrai Google Groupe, autoriser l'adresse du compte à publier dans le groupe.
