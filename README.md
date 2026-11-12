# Sorties VTT

Application d'inscription aux sorties du club : une appli web installable sur téléphone (PWA, hébergée sur GitHub Pages) et un petit serveur Google Apps Script qui stocke les données dans un Google Sheet et envoie les mails.

- Spécifications : [docs/specs](docs/specs)
- Mise en place sur un compte Google et GitHub : [INSTALL.md](INSTALL.md)
- Scénario de démonstration : [docs/demo-ca.md](docs/demo-ca.md)

## Organisation

| Dossier | Contenu |
|---|---|
| `site/` | Le site statique du club, publié tel quel. L'appli est dans `site/sorties/`. |
| `site/sorties/js/logique/` | Règles communes à l'appli et au serveur : dates, récurrences, droits, météo, GPX, messages. |
| `site/sorties/js/ui/` | Les écrans de l'appli. |
| `backend/noyau/` | Le serveur : actions de l'API, envois automatiques, purge. Indépendant de Google, donc testable. |
| `backend/gas/` | L'adaptateur Google Apps Script (`Adaptateur.js`) et la configuration du projet. |
| `outils/` | Copie du code vers Apps Script, serveur de développement, génération des icônes et des traces de démo. |
| `tests/` | Tests automatiques (Node, sans dépendance). |

## Lancer la démo sur son poste

Prérequis : Node 22 ou plus récent.

```bash
node outils/serveur-dev.js
```

Puis ouvrir http://localhost:8080/sorties/. Le serveur de développement utilise le vrai code du serveur, avec des données de démonstration en mémoire ; les mails sont affichés dans la console. Numéros de démo : `06 11 11 11 11` (administrateur), `06 00 00 00 02` (Ben).

## Tests

```bash
npm test
```

## Envoyer le serveur sur Apps Script

```bash
npm run gas:pousser
```

Cette commande copie `logique/` et `noyau/` dans `backend/gas/gen/`, puis les envoie avec clasp. Après un changement du serveur, il faut aussi publier une **nouvelle version** du déploiement (voir INSTALL.md).

## Ajouter une page au site du club

1. Créer un dossier dans `site/`, par exemple `site/agenda/`, avec un `index.html` (copier `site/index.html` comme modèle).
2. Ajouter une ligne à la liste `PAGES` dans `site/commun/entete.js`.
3. Enregistrer sur la branche `main` : le site est republié automatiquement.
