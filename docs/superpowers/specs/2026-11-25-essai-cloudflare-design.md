# Essai : serveur et stockage sur Cloudflare — conception

*25/11/2026. À valider avant toute réalisation. L'appli actuelle (GitHub Pages + Apps Script + Google Sheets) n'est pas
touchée par l'essai.*

## Intention
Chaque appel à l'API Apps Script coûte environ **1,8 s**, presque entièrement en démarrage d'Apps Script (le travail
utile est de 0,13 s). Objectif : une appli qui répond **en quelques dizaines de millisecondes**, toujours **gratuite**,
en gardant la **liste des adhérents dans Google Sheets** (tenue par le secrétaire) et l'**envoi des mails par Google**.

## Objectifs, non-objectifs
- **Objectifs** : même appli, mêmes écrans, mêmes règles ; serveur et données sur Cloudflare ; mesurer le gain réel.
- **Non-objectifs de l'essai** : notifications (rendues possibles ensuite, sans Firebase) ; reprise des vraies données
  (étape séparée, après un essai concluant) ; changement de fonctionnalité.
- **Anti-objectifs** : toucher au classeur, au script ou au site actuels ; un coût, même faible ; envoyer des mails aux
  adhérents pendant l'essai.

## Architecture

```text
Téléphone / PC ──HTTPS──▶ Cloudflare Pages (site, nouveau dépôt GitHub)
       │
       └──HTTPS POST JSON──▶ Cloudflare Worker (API, même contrat que l'actuelle)
                                 ├── D1 (SQL)  : sorties, inscriptions, discussions, règles, rappels, paramètres…
                                 ├── KV        : fichiers GPX ; copie de la liste des adhérents
                                 ├── Cron      : tic horaire (récurrences, rappels, annulations, purge)
                                 └──HTTPS + secret──▶ Passerelle Apps Script (Google)
                                                          ├── adherents_lire  (lecture seule du fichier adhérents)
                                                          └── mail_envoyer    (MailApp, au nom de l'association)
Open-Meteo : appelé par le navigateur (inchangé) et par le Worker pour la météo des rappels.
```

## Ce qui est repris tel quel
- **Le site** (`site/`) : seule `config.js` change (adresse de l'API = le Worker).
- **La logique métier** (`backend/noyau`, `site/sorties/js/logique`) : déjà isolée de Google et en JavaScript standard,
  elle s'exécute telle quelle dans un Worker. Les tests existants continuent de la vérifier.
- **Le contrat de l'API** : mêmes actions, mêmes réponses. Le site ne voit pas la différence.

## Ce qui est écrit pour Cloudflare (l'« adaptateur », comme `backend/gas/Adaptateur.js` pour Google)
- **Dépôt D1** : même interface que le dépôt actuel (`lire`, `ajouter`, `modifier`, `supprimer` par onglet), une table
  par onglet, mêmes colonnes. Une requête lit en un seul lot (`db.batch`) les tables dont elle a besoin.
- **Adhérents** : lus via la passerelle, gardés dans KV (1 h) ; relus aussitôt quand un numéro inconnu tente de se
  connecter (comme aujourd'hui : un adhérent ajouté au fichier peut se connecter tout de suite) ; rafraîchis par le tic.
- **Mails** : le Worker demande à la passerelle de les envoyer (`MailApp`, nom d'expéditeur = l'association). Pendant
  l'essai, la passerelle n'envoie **qu'à l'adresse du porteur**, quels que soient les destinataires demandés.
- **Traces GPX** : dans KV (jusqu'à 5 Mo ; une ligne D1 est limitée à 2 Mo).
- **Tic** : Cron Trigger horaire appelant `ticNoyau` (inchangé).

## Sécurité du lien Worker ↔ passerelle
- Un **secret partagé** long et aléatoire : secret du Worker (`wrangler secret`) et propriété du script Apps Script.
  Jamais dans le site ni dans le dépôt.
- Chaque appel est signé (HMAC-SHA256 du corps + horodatage) ; la passerelle refuse une signature fausse ou un appel de
  plus de 5 minutes. La passerelle ne fait **que** ces deux actions, en lecture seule sur les adhérents.

## Quotas gratuits (Workers Free, documentation Cloudflare du 25/11/2026) et usage prévu
| Service | Limite gratuite | Usage estimé (80 adhérents) |
|---|---|---|
| Worker : requêtes | 100 000 / jour | 1 000 à 5 000 / jour (relectures de 30 s comprises) |
| Worker : temps de calcul | **10 ms par requête** | à mesurer : le point à surveiller (voir Risques) |
| Worker : sous-requêtes | 50 par requête | 1 à 3 (passerelle, Open-Meteo) |
| Cron Triggers | 5 par compte | 1 (tic horaire) |
| D1 | 10 bases, 500 Mo par base, 5 Go au total ; 5 M lignes lues et 100 000 écrites / jour ; 50 requêtes par appel | quelques Mo ; < 1 M lignes lues / jour |
| KV | 1 Go ; 100 000 lectures, 1 000 écritures, 1 000 suppressions / jour ; 25 Mo par valeur ; 1 écriture / s sur une même clé | quelques dizaines d'écritures / jour (GPX, adhérents) |
| Pages | 500 déploiements / mois ; 20 000 fichiers ; 25 Mo par fichier | quelques déploiements / semaine |
| Mails (Google, inchangé) | 100 destinataires / jour (MailApp) | comme aujourd'hui |

La documentation ne dit pas si une carte bancaire est demandée pour l'offre gratuite : à vérifier à la création du
compte. R2 (stockage de fichiers) est évité : il n'est pas nécessaire.

## Essai sans risque pour l'existant
- **Nouveau dépôt GitHub**, publié sur **Cloudflare Pages** (aucun lien avec GitHub Pages ni avec le dépôt actuel).
- **Nouveau Worker et nouvelle base D1** d'essai, remplis avec le jeu de démonstration (ou vides : faux adhérents).
- **Nouveau projet Apps Script** pour la passerelle, qui lit une **copie** du fichier des adhérents.
- Le script, le classeur et le site actuels ne sont **ni modifiés ni republiés**.

## Mesure du gain
Même jeu de données, même parcours (connexion, calendrier, fiche, inscription), 20 mesures chacun, depuis la France :
temps de réponse médian et 90 % de l'API actuelle et du Worker. **Critère de réussite : calendrier < 300 ms en médiane**
et aucune régression aux tests.

## Risques
1. **10 ms de calcul par requête** (offre gratuite) : la construction du calendrier (14 jours, inscrits, traces) doit
   tenir dedans. Mesuré en tout premier, avec le jeu de démonstration ; si ça ne tient pas, on allège la réponse.
2. **Double maintenance** de la logique commune si les deux dépôts vivent en parallèle (voir décisions).
3. **Données hors tableur** : sorties et inscriptions ne se consultent plus dans Google Sheets (un export pourra être
   ajouté si le club en a besoin).

## Décisions (25/11/2026)
1. **Dépôt** : `ResaVTT-cloudflare`, sur le compte GitHub de Laurent, créé comme **copie du dépôt actuel** (historique,
   site, logique et tests repris d'un coup).
2. **Compte Cloudflare** : le compte existant de Laurent pour l'essai (transférable au club ensuite). La connexion de
   l'outil `wrangler` à ce compte se fait par Laurent lui-même, dans son navigateur.

## Étapes (après validation)
1. Dépôt et projet Cloudflare : Worker, D1, KV, Pages ; dépôt dérivé de l'actuel.
2. Dépôt D1 + adaptateur Worker ; tests de l'adaptateur (comme ceux d'Apps Script, avec un Cloudflare imité).
3. Passerelle Apps Script (adhérents, mails, signature) et ses tests.
4. Tic par Cron ; traces dans KV.
5. Site publié sur Pages, branché sur le Worker ; mesure du gain ; compte rendu.
