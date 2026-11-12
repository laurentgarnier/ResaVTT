# Mise en place pas à pas

Ce guide installe la chaîne complète sur **votre** compte Google et **votre** compte GitHub. Il faut environ 30 minutes la première fois. Aucune carte bancaire n'est demandée.

Pour le club, on refera la même chose avec le compte Google et le compte GitHub du club.

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

Après chaque `npm run gas:pousser`, publier la nouvelle version : **Déployer → Gérer les déploiements → ✎ → Version : Nouvelle version → Déployer** (l'URL ne change pas).

### A6. Brancher l'appli sur l'API

Dans `site/sorties/config.js`, remplacer `A_RENSEIGNER_URL_APPS_SCRIPT` par l'URL `/exec`. Cette URL n'est pas un secret : l'accès aux données est protégé par la connexion de chaque adhérent.

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
3. **Messages → Envoyer le rappel maintenant** : vous recevez 2 mails, le rappel et « À poster sur WhatsApp ». Le bouton vert de ce dernier ouvre **votre** conversation WhatsApp avec le message prérempli.
4. **Fermetures** : fermer un samedi. À l'heure suivante (ou en exécutant `tic` dans l'éditeur), vous recevez un seul mail listant les sorties annulées, plus le message WhatsApp correspondant.

## Désigner d'autres administrateurs

Dans le fichier **Adhérents**, cocher la colonne `admin` et renseigner l'`email` de la personne. Elle recevra un code par email la première fois qu'elle ouvre l'administration sur un appareil.

## En cas de souci

- **« Onglet manquant »** : relancer `initialiser`.
- **L'appli affiche « Erreur technique »** : voir l'onglet `Journal` du classeur et, dans l'éditeur Apps Script, **Exécutions**.
- **Les mails n'arrivent pas** : vérifier les paramètres `adresse_liste`, `destinataires_whatsapp` et l'onglet `Envois` (colonne `derniere_erreur`). Pour un vrai Google Groupe, autoriser l'adresse du compte à publier dans le groupe.
