# Prototype de démo « Sorties VTT » (chaîne complète) – Plan de réalisation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** Monter un prototype de bout en bout, à présenter au CA. Il comprend :
- un Google Sheet et un Apps Script sur **le compte Google du porteur du projet** ;
- l'appli installable publiée sur GitHub Pages ;
- de **vrais mails** envoyés à l'adresse du porteur, simulant la liste de diffusion ;
- un **message WhatsApp prêt à envoyer**, qui ouvre la conversation WhatsApp du porteur.

**Architecture :**
- **Front.** Le site statique `site/` contient l'appli dans `site/sorties/`, en HTML, CSS et JavaScript « vanille » (modules ES, sans build).
- **Échanges.** Le front appelle l'Apps Script en `POST text/plain`, avec un corps JSON.
- **Noyau serveur.** Toute la logique serveur, actions comprises, est écrite en **modules ES purs** dans `backend/noyau/`. Elle passe par deux interfaces :
  - `depot`, pour la lecture et l'écriture des onglets ;
  - `services`, pour le mail, Drive, le hachage, les UUID et les appels HTTP.

  Elle est entièrement testée sous Node, avec un dépôt en mémoire.
- **Partage avec le front.** La logique commune (téléphones, dates, récurrences, droits, météo, GPX, modèles, échappement HTML) vit dans `site/sorties/js/logique/`. Le front l'utilise directement.
- **Copie vers Apps Script.** Un petit outil `outils/copier-vers-gas.js` copie `logique/` et `noyau/` dans `backend/gas/gen/`, en retirant les `import` et les `export`, car Apps Script n'a qu'une portée globale. `clasp push` envoie ensuite `backend/gas/`.
- **Adaptateur Google.** Seul `backend/gas/Adaptateur.js` touche aux API Google : `SpreadsheetApp`, `MailApp`, `DriveApp`, `Utilities`, `LockService`, `UrlFetchApp` et `ScriptApp`.

**Tech Stack :**
- HTML, CSS et JavaScript ES2022 ;
- Node 22 avec `node:test`, sans dépendance npm à l'exécution ;
- Google Apps Script (V8) et `@google/clasp` via `npx` ;
- Leaflet 1.9.4 (cdnjs) et tuiles OpenStreetMap ;
- Open-Meteo pour la météo et le géocodage ;
- GitHub Pages, publié par GitHub Actions.

**Spec :**
- `docs/specs/2026-11-11-inscriptions-specs-fonctionnelles.md`
- `docs/specs/2026-11-11-inscriptions-specs-techniques.md`
- Maquettes de référence : `.superpowers/brainstorm/1494-1794482525/content/maquettes-v2.html`. Pour l'administration et le formulaire complet, la référence reste `maquettes-v1.html`.

**Simplifications assumées pour le proto :**
- pas de `CacheService` sur le calendrier, ni de compteur de version : on relit les onglets à chaque appel, ce qui suffit à quelques dizaines d'utilisateurs ;
- pas de reprise du service worker hors ligne au-delà de la coquille.

Tout le reste suit la spec.

**Ajouts au proto, reportés dans la spec technique :**
- le paramètre `whatsapp_numero`, facultatif : s'il est renseigné, le lien devient `https://wa.me/<numero>?text=…` et ouvre directement la conversation avec ce numéro. Pour la démo, c'est le numéro du porteur, donc sa propre conversation « Vous » ;
- l'action administrateur `rappel_envoyer_maintenant`, qui déclenche le rappel du jeudi pendant la présentation, sans attendre jeudi 18 h.

**Légende :**
- **👤** marque une étape que seul le porteur peut faire, avec son compte : clics dans Google ou GitHub, autorisations OAuth, saisie de son numéro et de son adresse. L'agent fournit la marche à suivre exacte et attend la confirmation.
- Ni le numéro ni l'adresse du porteur ne sont jamais écrits dans le dépôt. Ils sont saisis directement dans le Sheet.

## Global Constraints

- Pas d'étape de build côté front. Seule bibliothèque externe : Leaflet 1.9.4 (`https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js` et `.css`).
- Dates au format texte `AAAA-MM-JJ`, heures au format `HH:MM`, stockées **en texte** dans Sheets (format `@` sur toutes les colonnes). Fuseau horaire `Europe/Paris` pour le script, le Sheet et le navigateur. Les semaines vont du lundi au dimanche.
- Fenêtre affichée : du lundi de la semaine courante au dimanche de la semaine suivante, soit 14 jours.
- Ids des sorties récurrentes : `R:<regle_id>:<date>:<ordre>`. Les autres ids sont des UUID.
- Colonnes lues **par leur en-tête**.
- Le fichier `Adherents` est un Google Sheet séparé, ouvert par `openById` avec la propriété de script `ADHERENTS_ID`.
- Les numéros de téléphone ne sortent jamais de l'API, sauf celui du compte connecté.
- Jetons : 2 × UUID, stockés hachés en SHA-256, une ligne par appareil.
- À **chaque appel**, `actif` et `admin` sont relus dans `Adherents`.
- Écritures sous `LockService.getScriptLock()`, avec 10 s d'attente au maximum. Pas de réécriture d'un onglet entier.
- Tout texte venant d'un utilisateur est échappé à l'affichage avec `echapper()`. Un message de discussion fait 1 000 caractères au maximum.
- Inscriptions ouvertes jusqu'à `date + heure` du rendez-vous et refusées si la sortie est annulée. Une personne peut être inscrite à plusieurs sorties du même créneau.
- Créneau : **matin** si l'heure est avant `13:00`, sinon après-midi. Heures par défaut : `09:00` le matin et `14:00` l'après-midi.
- Droits :
  - le créateur ou un administrateur vérifié (`admin_verifie`) modifie ou annule une sortie ;
  - tout adhérent change l'**heure** d'une sortie `recurrente`.
- Code administrateur : 6 chiffres, envoyé par mail, valable 15 min, 5 essais. Seul son hash est stocké.
- Météo :
  - Open-Meteo avec `timezone=Europe/Paris` et `forecast_days=14` ;
  - variables horaires `temperature_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m` ;
  - matin de 8 h à 12 h, après-midi de 13 h à 18 h, détail heure par heure de 6 h à 21 h ;
  - rien pour les jours passés ;
  - cache `localStorage` d'une heure ;
  - « Météo indisponible » en cas d'échec, « Prévision indisponible » au-delà de l'horizon ;
  - pied de page « Météo : Open-Meteo ».
- GPX :
  - points `trkpt` et `rtept` ;
  - Haversine (R = 6 371 km) ;
  - D+ = hausses de plus de 2 m ;
  - fichiers `.gpx` uniquement, 5 Mo maximum, stockés dans un dossier Drive non partagé et servis par `trace_lire` ;
  - avertissement « Évitez les traces qui partent de votre domicile » ;
  - carte Leaflet fixe : `dragging`, `touchZoom`, `scrollWheelZoom`, `doubleClickZoom`, `boxZoom`, `keyboard` et `zoomControl` à `false`, cadrage `fitBounds`, attribution OSM ;
  - carte chargée seulement à l'ouverture de la trace.
- Modèle de rappel par défaut, copié tel quel depuis la spec fonctionnelle §4.9 :
  `Les sorties du week-end sont ouvertes !\n📱 Vous avez l'appli : ouvrez-la depuis votre écran d'accueil.\n🌐 Pas encore installée : {{lien}}`
- Bandeau en mode navigateur sans jeton : « Vous avez installé l'appli ? Ouvrez-la depuis votre écran d'accueil. Sinon, saisissez votre numéro ci-dessous. »
- Manifest : `scope` et `start_url` = `./` dans `site/sorties/`. Aucun service worker à la racine du site.
- Interface en français, thème sombre de la maquette v2 (copier le bloc `:root` de `maquettes-v2.html`).
- **Fichiers dans `backend/noyau/` et `site/sorties/js/logique/`** :
  - un `import` tient sur **une seule ligne** ;
  - pas de `export default` ;
  - au niveau supérieur, seulement des déclarations de fonctions et des constantes littérales. Ces règles sont nécessaires à la copie vers Apps Script, qui ne garantit pas l'ordre de chargement des fichiers.

## Review Focus

1. **Heure du rendez-vous passée pendant que l'écran est ouvert** : « M'inscrire » doit afficher « Inscriptions closes », sans inscrire. Test : `inscription refusée après l'heure du rendez-vous` (Tâche 5).
2. **Échec d'envoi d'un mail** (quota, adresse invalide) : l'étape reste à refaire, `tentatives` est incrémenté, il n'y a pas de doublon au `tic` suivant et une alerte part après 3 échecs. Test : `tic reprend un envoi échoué sans doublon` (Tâche 7).
3. **Noms ou messages contenant `<script>`, `&` ou des guillemets** : ils s'affichent tels quels. Test : `renderSortie échappe les noms et messages` (Tâche 11).
4. **Valeurs renvoyées par Sheets** (cellule vide, `Date` au lieu de texte, numéro converti en nombre, case cochée `true`) : elles doivent être relues correctement. Test : `lignesEnObjets normalise vides, nombres et dates` (Tâche 8).
5. **Bascule d'heure ou de fin d'année dans la fenêtre** : toujours 14 dates consécutives. Test : `fenetre traverse le changement d'heure et la fin d'année` (Tâche 1).

---

## Structure des fichiers

```text
package.json                         "type":"module", scripts test / gas:copier / gas:pousser
.gitignore                           node_modules/, .superpowers/, backend/gas/gen/, .clasprc.json
README.md
INSTALL.md                           mise en place pas à pas sur un compte Google et GitHub
.github/workflows/pages.yml          publie site/ (après npm test)
outils/copier-vers-gas.js            logique/ + noyau/ → backend/gas/gen/ sans import ni export
outils/generer-gpx-demo.js           génère backend/noyau/traces-demo.js (3 GPX fictifs)
outils/generer-icones.ps1            icônes PNG (System.Drawing)
backend/noyau/depot-memoire.js       creerDepotMemoire(tables) : dépôt en mémoire (tests)
backend/noyau/actions.js             traiter(requete, contexte) : routeur et contrôle du jeton
backend/noyau/actions-adherent.js    connexion, calendrier, personnes, inscriptions
backend/noyau/actions-sorties.js     sorties, discussions, traces
backend/noyau/actions-admin.js       code admin, admin_lire/enregistrer, géocodage, rappel maintenant
backend/noyau/automate.js            tic(contexte) : génération, annulations, rappel, purge
backend/noyau/courriers.js           construction des mails (texte + HTML avec bouton WhatsApp)
backend/noyau/schema.js              ONGLETS : nom → en-têtes ; valeurs par défaut des Parametres
backend/noyau/donnees-demo.js        creerDonneesDemo(aujourdhui, porteur) : jeu fictif
backend/noyau/traces-demo.js         généré : TRACES_DEMO
backend/gas/appsscript.json          timeZone Europe/Paris, V8, webapp, scopes
backend/gas/.clasp.json              scriptId (créé à la Tâche 9, non versionné si besoin)
backend/gas/Adaptateur.js            doPost, depotSheets, services Google, initialiser, installer, tic
backend/gas/gen/                     généré, non versionné
site/index.html, confidentialite.html, 404.html
site/commun/theme.css, entete.js, images/logo.svg
site/sorties/index.html, style.css, config.js, manifest.webmanifest, sw.js, icones/
site/sorties/js/app.js, api.js
site/sorties/js/logique/telephone.js, dates.js, recurrences.js, droits.js, meteo.js, gpx.js, modeles.js, html.js
site/sorties/js/ui/connexion.js, calendrier.js, sortie.js, formulaire.js, admin.js, meteo-vue.js, carte.js, installation.js
tests/*.test.js, tests/aides/
```

**Contexte serveur**, passé à toutes les fonctions du noyau :

```text
contexte = {
  depot:   { lire(onglet): object[], ajouter(onglet, objets[]), modifier(onglet, filtre(o)→bool, champs), supprimer(onglet, filtre(o)→bool) },
  adherents: { lire(): [{nom, telephone, email, actif, admin}] },     // fichier séparé
  services: { maintenant(): Date, uuid(): string, hacher(s): string(hex),
              mail(destinataires: string, objet, texte, html?): void,      // lève en cas d'échec
              fichiers: { enregistrer(nom, contenu): id, lire(id): string, supprimer(id) },
              http(url): object (JSON) },
  journal(type, detail): void
}
```

`depot.lire` renvoie des objets dont toutes les valeurs sont des chaînes ou des booléens, déjà normalisés par l'adaptateur.

**Modules d'interface (`ui/*.js`)** :
- chacun exporte des fonctions `render…(donnees) → string`, pures et testées ;
- chacun exporte aussi `brancher…(racine, actions)` pour les écouteurs, non testé sous Node ;
- `actions` vaut `{appeler, aller(hash), rafraichir(), toast(texte)}`.

---

### Tâche 1 : Socle, téléphones et dates

**Files :**
- Create: `package.json`, `.gitignore`, `README.md` (section Tests), `site/sorties/js/logique/telephone.js`, `site/sorties/js/logique/dates.js`
- Test: `tests/telephone.test.js`, `tests/dates.test.js`

**Interfaces (Produces) :**
- `normaliserTelephone(saisie: string): string | null`, au format `+33XXXXXXXXX`.
- `lundiDe(date)`, `ajouterJours(date, n)`.
- `fenetre(aujourdhui): string[14]`.
- `jourSemaine(date): 0..6`, où 0 est le lundi.
- `semainesEntre(a, b): number`.
- `aujourdhuiLocal(d?: Date): string`.
- `creneau(heure): 'matin' | 'apres_midi'`.
- `estPasse(date, heure, maintenant: Date): boolean`.
- `libelleJour(date): string`, par exemple « Samedi 14 novembre ».

- [ ] **Step 1 : Initialiser le dépôt.**
  - `git init` ;
  - `package.json` contient `{"name":"sorties-vtt","private":true,"type":"module","scripts":{"test":"node --test tests/","gas:copier":"node outils/copier-vers-gas.js","gas:pousser":"npm run gas:copier && cd backend/gas && npx --yes @google/clasp push -f"}}` ;
  - `.gitignore` comme indiqué dans la structure des fichiers.
- [ ] **Step 2 : Écrire les tests qui échouent.**

```js
test('formes françaises équivalentes', () => {
  for (const s of ['06 12 34 56 78', '0612345678', '+33 6 12 34 56 78', '0033612345678', '06.12.34.56.78'])
    assert.equal(normaliserTelephone(s), '+33612345678');
  assert.equal(normaliserTelephone('123'), null); assert.equal(normaliserTelephone(''), null);
});
test('fenetre part du lundi et dure 14 jours', () => {
  const f = fenetre('2026-11-12');
  assert.equal(f.length, 14); assert.equal(f[0], '2026-11-09'); assert.equal(f[13], '2026-11-22');
});
test('fenetre traverse le changement d\'heure et la fin d\'année', () => {
  assert.deepEqual(fenetre('2026-10-25').slice(0, 2), ['2026-10-19', '2026-10-20']);
  assert.equal(fenetre('2026-12-31')[13], '2027-01-10');
  assert.equal(new Set(fenetre('2026-10-25')).size, 14);
});
test('jourSemaine, semainesEntre, creneau, estPasse', () => {
  assert.equal(jourSemaine('2026-11-14'), 5);
  assert.equal(semainesEntre('2026-11-07', '2026-11-21'), 2);
  assert.equal(creneau('12:59'), 'matin'); assert.equal(creneau('13:00'), 'apres_midi');
  const m = new Date(2026, 10, 14, 9, 1);
  assert.equal(estPasse('2026-11-14', '09:00', m), true); assert.equal(estPasse('2026-11-14', '09:30', m), false);
});
```

- [ ] **Step 3 : Lancer `npm test`.** Attendu : FAIL, modules introuvables.
- [ ] **Step 4 : Implémenter les deux modules.**
  - L'arithmétique de dates se fait en UTC avec `Date.UTC`. Seuls `estPasse` et `aujourdhuiLocal` utilisent l'heure locale.
  - Pour le téléphone : garder les chiffres et le `+`. `0033` donne `+33`, et `0` suivi de 9 chiffres donne `+33` et les 9 chiffres. Le résultat doit correspondre à `^\+33[1-9]\d{8}$`.
- [ ] **Step 5 : Lancer `npm test`.** Attendu : PASS.
- [ ] **Step 6 : Commit.** `git add -A && git commit -m "feat: socle, numéros et dates"`

---

### Tâche 2 : Récurrences et droits

**Files :**
- Create: `site/sorties/js/logique/recurrences.js`, `site/sorties/js/logique/droits.js`
- Test: `tests/recurrences.test.js`, `tests/droits.test.js`

**Interfaces :**
- Consumes : Tâche 1.
- Produces :
  - Le type `Regle` : `{id, nom, jour:0..6, heure, point_rdv, frequence_semaines, date_depart, active}` et `RegleSortie` : `{regle_id, ordre, titre, lieu, km, dplus, description, trace_id}`.
  - Le type `Fermeture` : `{id, debut, fin, regle_id|'' , motif}`.
  - `genererSorties(regles, regleSorties, fermetures, dates, idsExistants: Set, maintenantIso): Sortie[]`.
    - Elle ne renvoie que les **nouvelles** sorties.
    - Chaque sortie a `type:'recurrente'`, `statut:'ouverte'`, `createur_tel:''`, `createur_nom:''`, `traces_masquees:''` et `annulation_notifiee:false`.
  - `sortiesAAnnulerPourFermeture(f, sorties): string[]`. Renvoie les ids des sorties récurrentes ouvertes de la période qui sont concernées par la fermeture.
  - Le type `Utilisateur` : `{telephone, est_admin, admin_verifie}`.
  - `peutModifier(sortie, u)`, `peutChangerHoraire(sortie, u)`, `inscriptionsOuvertes(sortie, maintenant: Date)`.

- [ ] **Step 1 : Écrire les tests qui échouent.**

```js
const R = { id:'sm', nom:'Samedi matin', jour:5, heure:'09:00', point_rdv:'Place de la mairie', frequence_semaines:1, date_depart:'2026-01-03', active:true };
const RS = [1,2,3].map((o, i) => ({ regle_id:'sm', ordre:o, titre:['Cool','Inter','Sportif'][i] }));
test('3 sorties par samedi de la fenêtre', () => {
  const s = genererSorties([R], RS, [], fenetre('2026-11-12'), new Set(), 'x');
  assert.deepEqual(s.map(x => x.id), ['R:sm:2026-11-14:1','R:sm:2026-11-14:2','R:sm:2026-11-14:3','R:sm:2026-11-21:1','R:sm:2026-11-21:2','R:sm:2026-11-21:3']);
  assert.equal(s[1].titre, 'Inter'); assert.equal(s[1].heure, '09:00');
});
test('fréquence 2 semaines, date de départ, règle inactive', () => {
  const r = { ...R, id:'mar', jour:1, heure:'18:30', frequence_semaines:2, date_depart:'2026-11-17' };
  const rs = [{ regle_id:'mar', ordre:1, titre:'Nocturne' }];
  assert.deepEqual(genererSorties([r], rs, [], fenetre('2026-11-12'), new Set(), 'x').map(x => x.date), ['2026-11-17']);
  assert.equal(genererSorties([{ ...r, active:false }], rs, [], fenetre('2026-11-12'), new Set(), 'x').length, 0);
});
test('fermeture et sorties existantes ne sont pas régénérées', () => {
  const f = { id:'f', debut:'2026-11-14', fin:'2026-11-14', regle_id:'', motif:'Chasse' };
  const s = genererSorties([R], RS, [f], fenetre('2026-11-12'), new Set(['R:sm:2026-11-21:1']), 'x');
  assert.deepEqual(s.map(x => x.id), ['R:sm:2026-11-21:2','R:sm:2026-11-21:3']);
});
test('sortiesAAnnulerPourFermeture limite à la règle et à la période', …);
test('créateur et admin vérifié modifient ; admin non vérifié non', …);
test('tout adhérent change l\'horaire d\'une récurrente, pas d\'une libre', …);
test('inscriptionsOuvertes fausse si annulée ou heure passée', …);
```

- [ ] **Step 2 : Lancer `npm test`.** Attendu : FAIL.
- [ ] **Step 3 : Implémenter les deux modules.** Une date D est retenue si toutes ces conditions sont vraies :
  - `jourSemaine(D) === r.jour` ;
  - `D >= r.date_depart` ;
  - `semainesEntre(r.date_depart, D) % r.frequence_semaines === 0` ;
  - aucune fermeture ne couvre D avec `regle_id` vide ou égal à `r.id`.
- [ ] **Step 4 : Lancer `npm test`.** Attendu : PASS.
- [ ] **Step 5 : Commit.** `git commit -m "feat: récurrences et droits"`

---

### Tâche 3 : Synthèse météo

**Files :**
- Create: `site/sorties/js/logique/meteo.js`
- Test: `tests/meteo.test.js`

**Interfaces (Produces) :**
- `pire(codes): number`, `picto(code): {emoji, libelle}`.
- `synthetiser(hourly, date): {matin, apres_midi}`. Chaque élément vaut `{tmin, tmax, pluie_proba, pluie_mm, vent_max, code, emoji, libelle}`, ou `null` sans données.
- `heureParHeure(hourly, date): [{heure, temp, pluie_proba, code, emoji}]`, de 6 h à 21 h.

- [ ] **Step 1 : Écrire les tests qui échouent.**

```js
test('le pire code suit la gravité, pas le numéro', () => {
  assert.equal(pire([3, 51]), 51); assert.equal(pire([95, 99, 61]), 99);
  assert.equal(pire([45, 61]), 61); assert.equal(pire([80, 65]), 65);
});
test('synthèse matin 8–12 h et après-midi 13–18 h', () => {
  const h = fabriquerHoraire('2026-11-14', { 8:{t:2,p:0,c:0}, 12:{t:6,p:30,c:3}, 13:{t:9,p:10,c:2}, 18:{t:7,p:80,c:61}, 19:{t:5,p:100,c:95} });
  const s = synthetiser(h, '2026-11-14');
  assert.deepEqual([s.matin.tmin, s.matin.tmax, s.matin.pluie_proba, s.matin.code], [2, 6, 30, 3]);
  assert.equal(s.apres_midi.code, 61);
});
test('jour hors horizon → null', …);
test('heureParHeure : 16 entrées de 06 à 21', …);
```

  `fabriquerHoraire` est une aide de test placée dans `tests/aides/` : elle produit les 24 heures et remplit à 0 les heures non fournies.

- [ ] **Step 2 : Lancer `npm test`.** Attendu : FAIL.
- [ ] **Step 3 : Implémenter `meteo.js`.**
  - Ordre de gravité croissant :
    - 0 ;
    - 1 et 2 ;
    - 3 ;
    - 45 et 48 ;
    - 51, 53, 55, 56, 57 ;
    - 61, 66, 80 ;
    - 81 ;
    - 63, 65, 67, 82 ;
    - 71, 73, 77, 85 ;
    - 75 et 86 ;
    - 95 ;
    - 96 et 99.
  - Libellés correspondants : ☀️ Ensoleillé, ⛅ Éclaircies, ☁️ Couvert, 🌫 Brouillard, 🌦 Bruine, 🌧 Pluie, 🌧 Averses, 🌧 Forte pluie, 🌨 Neige, ❄️ Forte neige, ⛈ Orage, ⛈ Orage et grêle.
- [ ] **Step 4 : Lancer `npm test`.** Attendu : PASS.
- [ ] **Step 5 : Commit.** `git commit -m "feat: synthèse météo"`

---

### Tâche 4 : GPX, modèles, HTML et traces de démo

**Files :**
- Create: `site/sorties/js/logique/gpx.js`, `modeles.js`, `html.js`, `outils/generer-gpx-demo.js`, `backend/noyau/traces-demo.js` (généré)
- Test: `tests/gpx.test.js`, `tests/modeles.test.js`, `tests/html.test.js`

**Interfaces (Produces) :**
- `statsTrace(points: [lat, lon, ele|null][]): {km (1 décimale), dplus (entier)}`.
- `lirePoints(xml, Parser = globalThis.DOMParser)`. Lève `Error('gpx_invalide')`.
- `remplirModele(texte, valeurs)` : une clé inconnue reste telle quelle.
- `lienWhatsApp(texte, numero?)`. Le numéro est au format `+33…`. Le lien vaut `https://wa.me/33612345678?text=…` si un numéro est fourni, sinon `https://wa.me/?text=…`.
- `listeAnnulations(sorties)` : une ligne par sortie, au format `• Samedi 14 novembre 09:00 – Cool (motif)`.
- `MODELES_DEFAUT` : les 6 clés de la spec. Les annulations utilisent `Sortie(s) annulée(s) :\n{{liste_annulations}}\n📱 Détails dans l'appli (écran d'accueil).\n🌐 Pas encore installée : {{lien}}`.
- `echapper(s)`, `initiales(nom)`, `couleurAvatar(nom)`.
- `TRACES_DEMO` : `{ 'boucle-foret.gpx': '<gpx…>', 'variante-courte.gpx': …, 'inter-rocher.gpx': … }`.

- [ ] **Step 1 : Écrire les tests qui échouent.**

```js
test('un degré de latitude ≈ 111,2 km', () => assert.equal(statsTrace([[48,2,null],[49,2,null]]).km, 111.2));
test('D+ ignore les variations de 2 m ou moins', () => {
  const p = [[48,2,100],[48,2.001,101],[48,2.002,103],[48,2.003,110],[48,2.004,104],[48,2.005,107]];
  assert.equal(statsTrace(p).dplus, 13);   // 100→101 ignoré ; →103 (+3) ; →110 (+7) ; descente à 104 ; →107 (+3)
});
test('statsTrace sans altitude ni second point', () => {
  assert.deepEqual(statsTrace([[48,2,null]]), { km:0, dplus:0 }); assert.deepEqual(statsTrace([]), { km:0, dplus:0 });
});
test('rappel WhatsApp : texte exact et lien vers un numéro', () => {
  const t = remplirModele(MODELES_DEFAUT.rappel_whatsapp, { lien:'https://x.github.io/sorties/' });
  assert.equal(t, "Les sorties du week-end sont ouvertes !\n📱 Vous avez l'appli : ouvrez-la depuis votre écran d'accueil.\n🌐 Pas encore installée : https://x.github.io/sorties/");
  assert.ok(lienWhatsApp('a b', '+33612345678').startsWith('https://wa.me/33612345678?text=a%20b'));
  assert.ok(lienWhatsApp('a').startsWith('https://wa.me/?text='));
});
test('echapper neutralise le HTML', () => assert.equal(echapper(`<script>"&'`), '&lt;script&gt;&quot;&amp;&#39;'));
test('les traces de démo font entre 15 et 60 km', () => { /* statsTrace sur les points extraits par regex de TRACES_DEMO */ });
```

- [ ] **Step 2 : Lancer `npm test`.** Attendu : FAIL.
- [ ] **Step 3 : Implémenter les modules.** Le calcul du D+ suit cet algorithme :

```js
let ref = null, dplus = 0;
for (const [, , e] of points) {
  if (e == null) continue;
  if (ref == null) { ref = e; continue; }
  if (e - ref > 2) { dplus += e - ref; ref = e; } else if (e < ref) ref = e;
}
```

- [ ] **Step 4 : Écrire et lancer `node outils/generer-gpx-demo.js`.**
  - Le script produit 3 boucles de 400 points autour de 48.4047, 2.7016, d'environ 31, 23 et 42 km, avec une altitude de 80 à 140 m.
  - Il écrit `backend/noyau/traces-demo.js`, qui contient `export const TRACES_DEMO = {...}`.
- [ ] **Step 5 : Lancer `npm test`.** Attendu : PASS.
- [ ] **Step 6 : Commit.** `git commit -m "feat: GPX, modèles de messages, échappement, traces de démo"`

---

### Tâche 5 : Noyau serveur, partie 1 (schéma, dépôt mémoire, connexion, calendrier, inscriptions)

**Files :**
- Create: `backend/noyau/schema.js`, `depot-memoire.js`, `actions.js`, `actions-adherent.js`, `donnees-demo.js`
- Test: `tests/aides/contexte-test.js`, `tests/noyau-adherent.test.js`

**Interfaces :**
- Consumes : Tâches 1 à 4.
- Produces :
  - `ONGLETS` : nom de l'onglet → liste des en-têtes, exactement les colonnes de la spec technique §3 (Jetons, Personnes, Sorties avec `traces_masquees` et `a_notifier`, Inscriptions, Discussions, Traces, Regles, RegleSorties, Fermetures, Parametres, Modeles, Envois, Journal).
  - `PARAMETRES_DEFAUT` :
    - `commune_nom:'Fontainebleau'`, `commune_lat:'48.4047'`, `commune_lon:'2.7016'` ;
    - `point_rdv_defaut:'Place de la mairie'` ;
    - `rappel_jour:'3'` (jeudi, 0 étant le lundi) et `rappel_heure:'18:00'` ;
    - `adresse_liste:''`, `destinataires_whatsapp:''`, `whatsapp_numero:''`, `email_alertes:''` ;
    - `conservation_mois:'12'`, `url_appli:''`, `contact_rgpd:''`.
  - `creerDepotMemoire(tables?: Record<onglet, object[]>)` implémente `depot`.
  - `traiter(requete: {action, jeton?, ...}, ctx): {ok:true, data} | {ok:false, erreur, message}`.
    - La fonction vérifie le jeton en hachant le jeton reçu et en cherchant le hash dans `Jetons`.
    - Elle relit l'adhérent (`actif`, `admin`) et construit `u = {telephone, nom, est_admin, admin_verifie}`.
    - Elle transforme toute exception en `{ok:false, erreur:'erreur_interne'}` et écrit l'erreur au journal.
  - Actions de cette tâche :
    - `connexion {telephone, appareil?}` renvoie `{jeton, nom, est_admin}`. L'erreur `numero_inconnu` a pour message « Numéro inconnu. Contactez le secrétaire. ». À la première connexion, l'action crée la personne « nom de l'adhérent ».
    - `deconnexion`.
    - `calendrier` répond avec la même forme que dans la Tâche 9 :
      - `{aujourdhui, est_admin, admin_verifie, moi:{telephone, nom}, personnes:[{id, nom_affiche}], parametres:{commune_nom, commune_lat, commune_lon, point_rdv_defaut}, jours:[{date, passe, sorties:[SortieVue]}]}` ;
      - `SortieVue` vaut `{id, date, heure, titre, point_rdv, lieu, km, dplus, description, type, createur_nom, statut, motif_annulation, modifie_par, inscrits:[{personne_id, nom_affiche, inscrit_par, a_moi}], nb_messages, traces:[{id, nom_fichier, km, dplus}], peut_modifier, peut_changer_horaire, inscriptions_ouvertes}` ;
      - les inscrits sont triés avec `localeCompare(…, 'fr')` ;
      - les traces incluent la trace par défaut de la règle, sauf si elle est masquée ;
      - **aucun numéro** n'apparaît.
    - `personnes_enregistrer {personnes:[{id?, nom_affiche}]}`. Retirer une personne supprime ses inscriptions à venir.
    - `inscription {sortie_id, personne_ids[], inscrit}`. Erreurs possibles : `inscriptions_closes`, `sortie_annulee`, `personne_inconnue`.
  - `creerDonneesDemo(aujourdhui, porteur: {nom, telephone, email}): {adherents, tables}`.
    - **40 adhérents fictifs** aux numéros `+3360000000x` à `+33600000040`, plus le **porteur**, administrateur, à qui on rattache « Léo ».
    - Les 3 règles initiales :
      - samedi 9 h avec Cool, Inter et Sportif, et la trace par défaut `boucle-foret.gpx` sur Cool ;
      - samedi 14 h avec « Sam. après-midi » ;
      - dimanche 9 h avec « Dim. matin ».
    - Les sorties générées pour la fenêtre, puis les modifications suivantes :
      - une fermeture le dimanche courant, motif « Arrêté préfectoral, chasse », appliquée **après** la génération (la sortie existe donc et elle est annulée) ;
      - Inter passée à `09:30`, avec `modifie_par:'Ben'` ;
      - une sortie libre « Boucle des étangs » de Ludo, le vendredi à 13:30, avec 8 inscrits ;
      - pour le samedi, des inscriptions Cool 12, Inter 18 (dont « Gérard », inscrit par Jo), Sportif 7 et après-midi 4 ;
      - quelques messages.
    - Le porteur n'est inscrit nulle part.
    - Les traces portent `drive_id = 'demo:<nom>'`. Le service `fichiers` de l'adaptateur les remplace par de vrais fichiers Drive au chargement (Tâche 8).

- [ ] **Step 1 : Écrire `tests/aides/contexte-test.js`.**
  - `contexteTest({maintenant, porteur})` renvoie `{ctx, mails:[], connecter(tel) → jeton}`.
  - Il s'appuie sur un dépôt mémoire initialisé par `creerDonneesDemo('2026-11-12', porteur)`.
  - Les services sont factices : `uuid` est un compteur, `hacher` utilise `createHash('sha256')`, `mail` alimente le tableau `mails`, `fichiers` est en mémoire et `http` est un double.
- [ ] **Step 2 : Écrire les tests qui échouent.** Horloge : jeudi 12 novembre 2026 à 20 h. Porteur : `{nom:'Porteur', telephone:'+33611111111', email:'porteur@example.org'}`.

```js
test('connexion au format libre ; inconnu refusé ; jeton stocké haché', …);
test('adhérent désactivé dans Adherents → non_connecte à l\'appel suivant', …);
test('calendrier : 14 jours, samedi à 4 sorties, Inter à 09:30, aucun numéro dans la réponse', async () => {
  /* … */ assert.ok(!JSON.stringify(c.jours).includes('+33'));
});
test('dimanche courant fermé : sortie annulée avec motif', …);
test('inscription multiple sur le même créneau', …);
test('inscription refusée après l\'heure du rendez-vous', …);   // horloge samedi 14 à 09:05
test('personnes_enregistrer : retirer Léo supprime ses inscriptions à venir', …);
test('sans jeton → non_connecte', …);
```

- [ ] **Step 3 : Lancer `npm test`.** Attendu : FAIL.
- [ ] **Step 4 : Implémenter les modules.** `calendrier` appelle `genererSorties` et ajoute les nouvelles sorties avant de répondre, ce qui permet d'avoir des sorties même si `tic` n'a pas encore tourné.
- [ ] **Step 5 : Lancer `npm test`.** Attendu : PASS.
- [ ] **Step 6 : Commit.** `git commit -m "feat: noyau serveur — connexion, calendrier, inscriptions"`

---

### Tâche 6 : Noyau serveur, partie 2 (sorties, discussions, traces)

**Files :**
- Create: `backend/noyau/actions-sorties.js`
- Test: `tests/noyau-sorties.test.js`

**Interfaces (Produces, actions) :**
- `sortie_creer {date, heure, titre, point_rdv, lieu?, km?, dplus?, description?, personne_ids[]}` renvoie `{id}`. Les personnes de `personne_ids` sont inscrites automatiquement.
- `sortie_modifier {sortie_id, ...}`. Exige `peutModifier`.
- `sortie_horaire {sortie_id, heure}`. Exige `peutChangerHoraire`. Renseigne `modifie_par`, puis ajoute le message système « <Nom> a changé l'horaire : <heure>. ».
- `sortie_annuler {sortie_id, motif}`. Exige `peutModifier`. Ajoute le message système « Sortie annulée : <motif>. ». Le champ `annulation_notifiee` passe à `false`, avec `a_notifier = true` si l'auteur est un administrateur vérifié et qu'il ne s'agit pas de sa propre sortie libre.
- `discussion_lire {sortie_id, depuis?}` renvoie `[{id, auteur_nom, texte, trace_id, horodatage, systeme, a_moi}]`.
- `discussion_ecrire {sortie_id, texte, trace_id?}`. Le texte réduit (trim) ne doit être ni vide ni dépasser 1 000 caractères, sinon l'erreur est `texte_invalide`.
- `discussion_supprimer {message_id}`. Réservée à l'auteur ou à un administrateur vérifié.
- `trace_ajouter {sortie_id, nom_fichier, contenu, km, dplus, via_discussion?}`.
  - Le nom doit finir par `.gpx`, sinon l'erreur est `fichier_invalide`.
  - Le contenu ne doit pas dépasser 5 Mo, sinon l'erreur est `fichier_trop_gros`.
  - Le contenu doit commencer par `<?xml` ou `<gpx`.
  - L'ajout est réservé au créateur ou à un administrateur, sauf si `via_discussion` vaut vrai.
- `trace_lire {trace_id}` renvoie `{nom_fichier, contenu}`.
- `trace_supprimer {sortie_id, trace_id}`. Pour la trace par défaut, l'id est ajouté à `traces_masquees`.
- Les erreurs de droits renvoient `interdit`, avec le message « Action réservée au créateur ou à un administrateur. ».

- [ ] **Step 1 : Écrire les tests qui échouent.**

```js
test('sortie libre créée : créateur inscrit, visible au calendrier', …);
test('Ben change l\'heure de Cool → message système, modifie_par Ben', …);
test('Ben ne peut ni modifier ni annuler la sortie de Ludo', …);
test('annulation par admin vérifié → a_notifier vrai ; par créateur d\'une libre → faux', …);
test('message de 1001 caractères ou vide refusé', …);
test('discussion_lire depuis un horodatage ne renvoie que les nouveaux', …);
test('trace : .txt refusé, 5 Mo + 1 refusé, contenu relu à l\'identique', …);
test('supprimer la trace par défaut la masque pour cette sortie seulement', …);
```

- [ ] **Step 2 : Lancer `npm test`.** Attendu : FAIL.
- [ ] **Step 3 : Implémenter `actions-sorties.js`.**
- [ ] **Step 4 : Lancer `npm test`.** Attendu : PASS.
- [ ] **Step 5 : Commit.** `git commit -m "feat: noyau serveur — sorties, discussions, traces"`

---

### Tâche 7 : Noyau serveur, partie 3 (administration, courriers, automate)

**Files :**
- Create: `backend/noyau/actions-admin.js`, `courriers.js`, `automate.js`
- Test: `tests/noyau-admin.test.js`, `tests/noyau-automate.test.js`

**Interfaces :**
- Produces (actions) :
  - `admin_code_demander`. Réservée à un administrateur. Envoie par `services.mail` à l'email de l'adhérent l'objet « Code d'accès administration » et le texte « Votre code : 123456 (valable 15 minutes) ». Renvoie `{envoye:true}`.
  - `admin_code_verifier {code}`. Erreurs possibles : `code_faux` (avec `essais_restants`), `code_expire` et `trop_essais`.
  - `admin_lire` renvoie `{regles, regle_sorties, fermetures, parametres, modeles, envois}`. L'erreur est `admin_non_verifie` tant que le code n'a pas été validé.
  - `admin_enregistrer {regles?, regle_sorties?, fermetures?, parametres?, modeles?}`.
    - Enregistrer des règles relance la génération.
    - Enregistrer une nouvelle fermeture annule les sorties concernées avec `a_notifier = true`.
  - `admin_geocoder {nom}` appelle `services.http("https://geocoding-api.open-meteo.com/v1/search?name=…&count=5&language=fr&country=FR")` et renvoie `[{nom, departement, lat, lon}]`.
  - `rappel_envoyer_maintenant` exécute l'envoi du rappel avec la clé `rappel:manuel:<horodatage>` et renvoie `{etape_mail, etape_whatsapp}`.
- Produces (`courriers.js`) :
  - `courrierListe(objet, texte): {objet, texte}`.
  - `courrierWhatsApp(texte, numero): {objet:'À poster sur WhatsApp', texte, html}`. Le HTML affiche le texte et un bouton vert « 📲 Envoyer sur WhatsApp » pointant vers `lienWhatsApp(texte, numero)`.
- Produces (`automate.js`) :
  - `ticNoyau(ctx)`, qui enchaîne quatre étapes. Le nom `tic` est réservé au déclencheur Apps Script de la Tâche 8.
    1. génération des sorties ;
    2. **annulations à notifier** : les sorties avec `a_notifier` vrai, `annulation_notifiee` faux et une date non passée sont regroupées en **un seul** envoi de clé `annulation:<horodatage du lot>`, qui comprend :
       - un mail `annulation_mail_*` vers `adresse_liste` ;
       - un mail WhatsApp `annulation_whatsapp` vers `destinataires_whatsapp`, avec le numéro `whatsapp_numero` ;
    3. **rappel** si le jour (`rappel_jour`) et l'heure (`rappel_heure`) sont atteints et que la clé `rappel:<date du jour>` n'est pas terminée ;
    4. **purge** une fois par jour après 3 h : les sorties et données liées antérieures à `conservation_mois`, et les jetons inutilisés depuis 12 mois.
  - `envoyerEtapes(ctx, cle, etapes: [{nom:'mail'|'whatsapp', faire()}])`.
    - Chaque étape réussie est notée dans `Envois` (`etape_mail` ou `etape_whatsapp` = `ok`).
    - Sur exception, `tentatives` est incrémenté et `derniere_erreur` renseigné. Au 3e échec, un mail est envoyé à `email_alertes`.
    - Une étape déjà notée `ok` n'est jamais refaite.

- [ ] **Step 1 : Écrire les tests qui échouent.**

```js
test('code admin envoyé par mail au porteur ; 5 essais puis blocage ; expiration à 15 min', …);
test('admin_lire refusé tant que le code n\'est pas vérifié', …);
test('nouvelle règle mardi 18:30 toutes les 2 semaines → sortie le mardi suivant', …);
test('fermeture du samedi suivant → 4 sorties annulées, un seul mail liste et un seul mail WhatsApp au tic', …);
test('rappel dû jeudi 18:00 : mail liste + mail WhatsApp avec lien wa.me/33611111111 ; pas renvoyé au tic suivant', …);
test('rappel non dû mercredi 18:00 ni jeudi 17:00', …);
test('tic reprend un envoi échoué sans doublon', () => {
  /* services.mail lève au premier appel WhatsApp seulement → etape_mail ok, etape_whatsapp ko, tentatives 1 ;
     tic suivant : le mail liste n'est pas renvoyé, le WhatsApp l'est. 3 échecs → mail à email_alertes */
});
test('rappel_envoyer_maintenant envoie immédiatement les deux mails', …);
test('purge : sortie de plus de 12 mois supprimée avec ses inscriptions', …);
```

- [ ] **Step 2 : Lancer `npm test`.** Attendu : FAIL.
- [ ] **Step 3 : Implémenter les trois modules.**
- [ ] **Step 4 : Lancer `npm test`.** Attendu : PASS.
- [ ] **Step 5 : Commit.** `git commit -m "feat: noyau serveur — administration, courriers, automate"`

---

### Tâche 8 : Adaptateur Apps Script et copie vers Apps Script

**Files :**
- Create: `outils/copier-vers-gas.js`, `backend/gas/appsscript.json`, `backend/gas/Adaptateur.js`, `backend/noyau/lignes.js`
- Test: `tests/copie-gas.test.js`, `tests/lignes.test.js`

**Interfaces :**
- Produces :
  - `lignesEnObjets(valeurs: any[][]): object[]` (`lignes.js`, pur, copié vers Apps Script). Les conversions sont les suivantes :
    - une cellule vide donne `''` ;
    - une `Date` donne `AAAA-MM-JJ`, ou `HH:MM` si la date est 1899-12-30 ;
    - un nombre de 9 chiffres commençant par 6 ou 7 donne `'+33'` suivi de ces chiffres ;
    - les autres nombres donnent `String(n)` ;
    - un booléen reste tel quel.
  - `objetEnLigne(entetes, objet): any[]`.
  - `outils/copier-vers-gas.js` lit `site/sorties/js/logique/*.js` et `backend/noyau/*.js`, sauf `depot-memoire.js`.
    - Il retire les lignes `import …` et remplace `export function` par `function` et `export const` par `const`.
    - Il écrit `backend/gas/gen/<nom>.js` et termine par la liste des fichiers.
  - `appsscript.json` : `{"timeZone":"Europe/Paris","runtimeVersion":"V8","exceptionLogging":"STACKDRIVER","webapp":{"executeAs":"USER_DEPLOYING","access":"ANYONE_ANONYMOUS"},"oauthScopes":["https://www.googleapis.com/auth/spreadsheets","https://www.googleapis.com/auth/script.send_mail","https://www.googleapis.com/auth/drive","https://www.googleapis.com/auth/script.external_request","https://www.googleapis.com/auth/script.scriptapp"]}`.
  - `Adaptateur.js` :
    - `doPost(e)` : lit `JSON.parse(e.postData.contents)`. Les actions d'écriture passent sous `LockService` ; les lectures `calendrier`, `discussion_lire` et `trace_lire` n'en ont pas besoin. Appelle `traiter(requete, contexteGoogle())` et répond avec `ContentService.createTextOutput(JSON.stringify(r)).setMimeType(ContentService.MimeType.JSON)`.
    - `doGet()` répond avec le texte « API Sorties VTT : OK ».
    - `contexteGoogle()` assemble `depotSheets(SpreadsheetApp.getActive())`, `adherents` (via `openById(PropertiesService.getScriptProperties().getProperty('ADHERENTS_ID'))`) et les services :
      - `uuid` : `Utilities.getUuid` ;
      - `hacher` : `Utilities.computeDigest(SHA_256)` converti en hexadécimal ;
      - `mail` : `MailApp.sendEmail({to, subject, body, htmlBody, name:'Sorties VTT'})` ;
      - `fichiers` : un dossier Drive à l'id `TRACES_ID`, avec `createFile(nom, contenu, 'application/gpx+xml')` et `setTrashed(true)` ;
      - `http` : `UrlFetchApp.fetch` puis `JSON.parse`.
    - `depotSheets(classeur)` :
      - `lire` passe par `getDataRange().getValues()` puis `lignesEnObjets` ;
      - `ajouter` utilise `appendRow` ou `setValues` sur les nouvelles lignes ;
      - `modifier` réécrit uniquement les lignes concernées ;
      - `supprimer` utilise `deleteRow`, du bas vers le haut.
    - `initialiser()` fait la mise en place complète :
      - crée les onglets de `ONGLETS` avec leurs en-têtes, le format `@` et la ligne 1 figée ;
      - remplit `Parametres` avec `PARAMETRES_DEFAUT` et `Modeles` avec `MODELES_DEFAUT` ;
      - crée le fichier « Adhérents du club (démo) » (colonnes nom, telephone, email, actif, admin, avec des cases à cocher) et le dossier Drive « Sorties VTT – traces » ;
      - enregistre `ADHERENTS_ID` et `TRACES_ID` dans les propriétés du script.
      - Elle est idempotente : un deuxième passage ne recrée rien.
    - `chargerDonneesDemo()` :
      - lit le porteur dans les 3 premières colonnes de la feuille `Porteur` (nom, téléphone, email), que le porteur remplit lui-même ;
      - vide les onglets de données (pas `Parametres` ni `Modeles`) ;
      - écrit `creerDonneesDemo(aujourdhui, porteur)` ;
      - crée les 3 traces de `TRACES_DEMO` dans Drive et remplace leurs `drive_id` ;
      - renseigne `adresse_liste`, `destinataires_whatsapp`, `email_alertes` avec l'email du porteur et `whatsapp_numero` avec son numéro.
    - `installer()` supprime les anciens déclencheurs `tic` puis exécute `ScriptApp.newTrigger('tic').timeBased().everyHours(1).create()`.
    - `tic()` appelle `ticNoyau(contexteGoogle())` sous verrou.

- [ ] **Step 1 : Écrire les tests qui échouent.**

```js
test('lignesEnObjets normalise vides, nombres et dates', () => {
  const o = lignesEnObjets([['date','heure','telephone','actif','km'], [new Date(2026,10,14), new Date(1899,11,30,9,30), 612345678, true, 31.2]]);
  assert.deepEqual(o, [{ date:'2026-11-14', heure:'09:30', telephone:'+33612345678', actif:true, km:'31.2' }]);
  assert.deepEqual(lignesEnObjets([['a','b'], ['', 'x'], ['', '']]), [{ a:'', b:'x' }]);   // ligne entièrement vide ignorée
});
test('copie vers Apps Script : aucun import/export, le tout se compile en un seul script', () => {
  execFileSync('node', ['outils/copier-vers-gas.js']);
  const code = readdirSync('backend/gas/gen').map(f => readFileSync(`backend/gas/gen/${f}`, 'utf8')).join('\n');
  assert.doesNotMatch(code, /^\s*(import|export)\b/m);
  new Function(code + '\nreturn typeof traiter === "function" && typeof ticNoyau === "function" && typeof genererSorties === "function";');
});
```

- [ ] **Step 2 : Lancer `npm test`.** Attendu : FAIL.
- [ ] **Step 3 : Implémenter les fichiers.**
- [ ] **Step 4 : Lancer `npm test`.** Attendu : PASS.
- [ ] **Step 5 : Commit.** `git commit -m "feat: adaptateur Apps Script et copie du noyau"`

---

### Tâche 9 : 👤 Mise en place sur le compte Google du porteur

**Files :**
- Create: `INSTALL.md` (partie Google), `backend/gas/.clasp.json` (créé par clasp)
- Modify: `site/sorties/config.js` (URL de l'API)

Cette tâche se fait **avec le porteur**. L'agent rédige `INSTALL.md`, puis le guide étape par étape et attend sa confirmation à chaque étape marquée 👤.

- [ ] **Step 1 : Rédiger la partie Google de `INSTALL.md`.** Elle reprend les étapes 2 à 8 ci-dessous, avec des captures textuelles des menus.
- [ ] **Step 2 : 👤 Activer l'API Apps Script.** Ouvrir https://script.google.com/home/usersettings et passer « Google Apps Script API » sur **Activé**.
- [ ] **Step 3 : 👤 Créer le classeur.** Dans Google Sheets, créer « Sorties VTT (démo) », puis ouvrir Extensions → Apps Script, renommer le projet « Sorties VTT » et relever l'**ID du script** (Paramètres du projet).
- [ ] **Step 4 : Pousser le code.**
  - 👤 Lancer `npx --yes @google/clasp login`. La commande ouvre le navigateur, où le porteur autorise l'accès avec son compte.
  - L'agent exécute ensuite `cd backend/gas && npx --yes @google/clasp clone <ID_SCRIPT> --rootDir .`, puis `npm run gas:pousser`, en conservant les fichiers locaux.
  - Attendu : « Pushed N files ».
- [ ] **Step 5 : 👤 Initialiser.**
  - Dans l'éditeur Apps Script, exécuter `initialiser` et accepter les autorisations. Google affiche l'avertissement « appli non validée » : choisir **Paramètres avancés → Accéder à Sorties VTT**.
  - Dans le classeur, créer la feuille `Porteur` et saisir en A2:C2 son nom, son numéro et son adresse email.
  - Exécuter `chargerDonneesDemo`, puis `installer`.
  - Attendu : les onglets sont remplis, le fichier « Adhérents du club (démo) » et le dossier Drive existent, et un déclencheur horaire `tic` est visible.
- [ ] **Step 6 : 👤 Déployer.**
  - Choisir Déployer → Nouveau déploiement → Application Web, avec « Exécuter en tant que : moi » et « Accès : tout le monde ».
  - Relever l'URL, qui se termine par `/exec`.
- [ ] **Step 7 : Vérifier l'API.**
  - `curl -sL -H "Content-Type: text/plain" -d '{"action":"connexion","telephone":"0600000002"}' <URL>`.
  - Attendu : `{"ok":true,"data":{"jeton":"…","nom":"Ben","est_admin":false}}`.
- [ ] **Step 8 : Écrire l'URL dans `site/sorties/config.js`.**
  - `export const CONFIG = { urlApi:'<URL>', urlAppli:'', indiceDemo:'Démo : essayez 06 00 00 00 02 (Ben) ou votre propre numéro (administrateur).' }`.
  - **Une URL de déploiement n'est pas un secret.** L'accès est contrôlé par les jetons.
- [ ] **Step 9 : Commit.** `git add INSTALL.md site/sorties/config.js backend/gas/.clasp.json && git commit -m "chore: mise en place Google (démo)"`

  Le fichier `.clasp.json` ne contient que l'ID du script, pas d'identifiants. Les identifiants de connexion sont dans `~/.clasprc.json`, hors du dépôt.

---

### Tâche 10 : Coquille de l'appli, connexion et site du club

**Files :**
- Create: `site/index.html`, `site/confidentialite.html`, `site/404.html`, `site/commun/theme.css`, `site/commun/entete.js`, `site/commun/images/logo.svg`, `site/sorties/index.html`, `site/sorties/style.css`, `site/sorties/js/api.js`, `site/sorties/js/app.js`, `site/sorties/js/ui/connexion.js`
- Test: `tests/ui-connexion.test.js`, `tests/api-client.test.js`

**Interfaces :**
- Produces :
  - `appeler(action, params, {fetchImpl = fetch} = {}): Promise<data>`.
    - La fonction envoie `fetch(CONFIG.urlApi, {method:'POST', headers:{'Content-Type':'text/plain;charset=utf-8'}, body: JSON.stringify({action, jeton, ...params}), redirect:'follow'})`. Le jeton vient de `localStorage['sorties-vtt-jeton']`.
    - Elle réessaie 2 fois, après 400 puis 1 200 ms, sur une erreur réseau ou sur `erreur_interne`.
    - Sur `ok:false`, elle lève `ErreurApi{code, message}`.
    - Sur `non_connecte`, elle efface le jeton et va à `#/connexion`.
  - Routes de `app.js` : `#/connexion`, `#/`, `#/jour/<date>`, `#/sortie/<id>`, `#/creer/<date>`, `#/modifier/<id>`, `#/personnes` et `#/admin`. Le module fournit aussi `aller`, `rafraichir` et `toast`.
  - `renderConnexion({modeNavigateur, indiceDemo}): string`.
  - `PAGES = [{titre:'Accueil', chemin:''}, {titre:'Sorties', chemin:'sorties/'}]` dans `entete.js`, avec des liens relatifs.

- [ ] **Step 1 : Écrire les tests qui échouent.**

```js
test('bandeau iOS seulement en mode navigateur', …);   // texte exact des Global Constraints
test('indice de démo affiché quand fourni', …);
test('appeler : POST text/plain avec jeton, réessaie sur erreur réseau puis réussit', async () => { /* fetchImpl factice : 1er appel rejette, 2e renvoie {ok:true,data:1} */ });
test('appeler : non_connecte efface le jeton', …);   // localStorage factice global
```

- [ ] **Step 2 : Lancer `npm test`.** Attendu : FAIL.
- [ ] **Step 3 : Implémenter les fichiers.**
  - En-tête : « Connecté : <nom> », menu Personnes, menu Administration si `est_admin`, et Déconnexion.
  - Pied de page : « Météo : Open-Meteo » et un lien vers `../confidentialite.html`.
  - `site/index.html` est l'accueil du club, avec le bouton « Sorties VTT ».
  - `confidentialite.html` reprend la spec fonctionnelle §5, avec les mentions à compléter entre crochets.
- [ ] **Step 4 : Lancer `npm test`.** Attendu : PASS.
- [ ] **Step 5 : Vérifier dans le navigateur.**
  - Lancer `npx --yes http-server site -p 8080 -c-1`, puis ouvrir `http://localhost:8080/sorties/`.
  - Se connecter avec `0600000002` : le calendrier vide s'affiche (rempli à la Tâche 11).
  - Saisir un numéro inconnu : le message « Numéro inconnu. Contactez le secrétaire. » s'affiche.
- [ ] **Step 6 : Commit.** `git commit -m "feat: coquille de l'appli, connexion, site du club"`

---

### Tâche 11 : Calendrier, détail d'une sortie, météo et cartes

**Files :**
- Create: `site/sorties/js/ui/calendrier.js`, `sortie.js`, `meteo-vue.js`, `carte.js`
- Modify: `site/sorties/js/app.js`, `site/sorties/style.css`
- Test: `tests/ui-calendrier.test.js`, `tests/ui-sortie.test.js`

**Interfaces :**
- Consumes : la réponse de `calendrier` (Tâche 5), produite dans les tests avec `contexteTest` et `traiter`, ainsi que les Tâches 3 et 4.
- Produces :
  - `renderGrille(cal, meteoParDate | null)`. Vue PC : « Cette semaine » et « Semaine prochaine », 7 colonnes, jours passés grisés et sans météo, jour courant encadré.
  - `renderJour(cal, date, meteo, heures | null)`. Vue téléphone :
    - onglets des jours, avec pastille du nombre de sorties ;
    - météo du jour, et heure par heure pour le jour courant ;
    - « N personnes roulent » (personnes distinctes) ;
    - sections Matin et Après-midi ;
    - sorties repliées, avec 4 pastilles au maximum, puis « +N » et « N inscrits » ;
    - bouton « + Créer une sortie ».
  - `renderSortie(sortie, messages, personnes)`. Elle affiche :
    - le badge (Récurrente, Proposée par X ou Annulée) et l'heure, avec un crayon si `peut_changer_horaire` ;
    - les traces, une ligne chacune, avec « Voir la carte » et ⬇ ;
    - le bouton M'inscrire ou Modifier, avec les personnes du compte ;
    - les inscrits sur 2 colonnes triées, avec « (par Jo) » ;
    - la discussion (2 derniers messages, puis « Voir les N messages précédents ») et un champ de saisie limité à 1 000 caractères ;
    - les boutons Modifier et Annuler si `peut_modifier`.
  - `chargerMeteo(lat, lon): Promise<hourly | null>`, avec un cache `localStorage` d'une heure.
  - `afficherCarte(el, points)` : carte Leaflet fixe, polyligne `#c6f432`, départ en bleu, arrivée en rouge, `fitBounds`.
  - Bascule vers la vue PC à partir de 900 px. Défilement automatique jusqu'au jour courant.
  - La discussion est rafraîchie toutes les 30 s, avec arrêt quand la page est masquée. Le calendrier est rechargé sur `visibilitychange`.

- [ ] **Step 1 : Écrire les tests qui échouent.**

```js
test('grille : 14 cartes, jours passés grisés sans météo, jeudi encadré', …);
test('vue jour samedi : 4 sorties, « 18 inscrits » sur Inter, pastille « +14 », sections Matin / Après-midi', …);
test('vue jour samedi : nombre de personnes distinctes', …);
test('détail Inter : 18 noms triés, « Gérard (par Jo) »', …);
test('renderSortie échappe les noms et messages', …);
test('sortie annulée : badge, motif, pas de bouton M\'inscrire', …);
test('météo absente → « Météo indisponible » ; hors horizon → « Prévision indisponible »', …);
```

- [ ] **Step 2 : Lancer `npm test`.** Attendu : FAIL.
- [ ] **Step 3 : Implémenter les modules et brancher les routes.** Le téléchargement d'une trace crée un `Blob` à partir de `trace_lire`, puis un lien `<a download>`.
- [ ] **Step 4 : Lancer `npm test`.** Attendu : PASS.
- [ ] **Step 5 : Vérifier dans le navigateur**, contre l'API réelle, en 375 px puis en largeur PC.
  - Le samedi s'affiche comme la maquette v2, avec la vraie météo.
  - Ouvrir Inter, puis la carte de la trace : elle s'affiche, fixe, avec l'attribution OSM.
  - Envoyer un message : la nouvelle ligne apparaît dans l'onglet `Discussions` du Sheet.
  - S'inscrire, puis se désinscrire.
  - Aucune erreur dans la console.
- [ ] **Step 6 : Commit.** `git commit -m "feat: calendrier, détail de sortie, météo, cartes"`

---

### Tâche 12 : Formulaire « Créer une sortie » et personnes du compte

**Files :**
- Create: `site/sorties/js/ui/formulaire.js`
- Modify: `site/sorties/js/app.js`
- Test: `tests/ui-formulaire.test.js`

**Interfaces (Produces) :**
- `valeursParDefaut(date, creneau, moi, parametres): {date, heure, point_rdv, titre}`. L'heure vaut `09:00` ou `14:00`, et le titre « Sortie de <premier mot du nom> ».
- `sortiesMemeCreneau(cal, date, creneau): SortieVue[]`, limitée aux sorties ouvertes.
- `renderFormulaire({mode, valeurs, personnes, sortiesMemeCreneau, detailsOuverts})`. Le formulaire comprend :
  - Matin ou Après-midi, l'heure, le RDV, le titre et « Qui s'inscrit ? » ;
  - « ▸ Ajouter des détails », qui déplie lieu, km, D+, description et GPX ;
  - l'avertissement « Évitez les traces qui partent de votre domicile » ;
  - l'encart « Même créneau : rejoindre <titre> plutôt que créer une 2e sortie ? ».
- `renderPersonnes(personnes)`.
- À la sélection d'un fichier, `lirePoints` puis `statsTrace` préremplissent km et D+, et affichent « 📏 X km · ⛰ Y m D+ (calculé automatiquement) ». Un fichier invalide affiche « Fichier GPX illisible ». Au-delà de 5 Mo, le message est « Fichier trop gros (5 Mo maximum) ».

- [ ] **Step 1 : Écrire les tests qui échouent.**

```js
test('défauts après-midi : 14:00, RDV du club, « Sortie de Ben »', …);
test('le formulaire signale une sortie existante sur le même créneau', …);
test('détails repliés en création, dépliés en modification', …);
```

- [ ] **Step 2 : Lancer `npm test`.** Attendu : FAIL.
- [ ] **Step 3 : Implémenter et brancher.** Envoi : `sortie_creer`, puis `trace_ajouter` pour chaque fichier (`FileReader.readAsText`).
- [ ] **Step 4 : Lancer `npm test`.** Attendu : PASS.
- [ ] **Step 5 : Vérifier dans le navigateur.**
  - Créer une sortie l'après-midi : elle apparaît, avec le créateur inscrit.
  - Créer une sortie avec détails et un GPX exporté depuis `TRACES_DEMO` : la trace est visible dans le dossier Drive.
  - Ajouter une personne au compte, puis l'inscrire.
- [ ] **Step 6 : Commit.** `git commit -m "feat: création et modification de sorties, personnes"`

---

### Tâche 13 : Administration

**Files :**
- Create: `site/sorties/js/ui/admin.js`
- Modify: `site/sorties/js/app.js`
- Test: `tests/ui-admin.test.js`

**Interfaces (Produces) :**
- `renderCode({envoye, erreur, essais_restants})` affiche « Un code a été envoyé à votre adresse email. » et un champ de 6 chiffres.
- `renderAdmin(donnees, onglet)`. Les onglets sont les suivants :
  - **Récurrences** : une carte par règle avec un interrupteur et la liste des sorties, plus « + Nouvelle récurrence » (jour, heure, fréquence « chaque semaine », « toutes les 2 sem. » ou « autre », date de départ, sorties).
  - **Fermetures** : la liste et un formulaire (début, fin, règle ou toutes, motif).
  - **Paramètres** : la commune (recherche via `admin_geocoder`), le RDV par défaut, le jour et l'heure du rappel, `adresse_liste`, `destinataires_whatsapp`, `whatsapp_numero`, `email_alertes` et `url_appli`.
  - **Messages** : les modèles modifiables, le bouton « Envoyer le rappel maintenant » (`rappel_envoyer_maintenant`) et l'historique `Envois` (clé, état de chaque étape, tentatives, dernière erreur).

- [ ] **Step 1 : Écrire les tests qui échouent.**

```js
test('onglet récurrences : 3 règles initiales et leurs sorties', …);
test('onglet messages : bouton « Envoyer le rappel maintenant » et historique des envois', …);
test('modèles et paramètres affichés échappés', …);
```

- [ ] **Step 2 : Lancer `npm test`.** Attendu : FAIL.
- [ ] **Step 3 : Implémenter et brancher.** Un utilisateur qui n'est pas administrateur et ouvre `#/admin` est renvoyé vers `#/` avec le message « Réservé aux administrateurs ».
- [ ] **Step 4 : Lancer `npm test`.** Attendu : PASS.
- [ ] **Step 5 : 👤 Vérifier de bout en bout**, connecté avec le numéro du porteur.
  - Ouvrir Administration : le **code arrive dans la boîte mail du porteur** ; le saisir.
  - Cliquer sur « Envoyer le rappel maintenant ». Le porteur reçoit **2 mails** :
    - le rappel « liste », au texte exact de la spec ;
    - « À poster sur WhatsApp », dont le bouton ouvre **sa propre conversation WhatsApp** avec le message prérempli.
  - Fermer le samedi suivant, puis exécuter `tic` depuis l'éditeur, ou attendre l'heure suivante. Le porteur reçoit **un seul** mail d'annulation listant les 4 sorties, plus le mail WhatsApp correspondant.
- [ ] **Step 6 : Commit.** `git commit -m "feat: page d'administration"`

---

### Tâche 14 : PWA installable et publication sur GitHub Pages

**Files :**
- Create: `site/sorties/manifest.webmanifest`, `site/sorties/sw.js`, `site/sorties/js/ui/installation.js`, `outils/generer-icones.ps1`, `site/sorties/icones/*.png`, `.github/workflows/pages.yml`
- Modify: `site/sorties/index.html`, `site/sorties/js/app.js`, `README.md`, `INSTALL.md` (partie GitHub)
- Test: `tests/manifest.test.js`, `tests/ui-installation.test.js`

**Interfaces (Produces) :**
- Manifest : `{"name":"Sorties VTT","short_name":"Sorties VTT","start_url":"./","scope":"./","display":"standalone","background_color":"#121a2b","theme_color":"#121a2b","lang":"fr","icons":[192 et 512 px, purpose "any maskable"]}`. La page déclare aussi `apple-touch-icon` en 180 px.
- `sw.js` :
  - précharge la coquille : `./`, `index.html`, `style.css`, `../commun/theme.css`, `js/**`, `config.js` et les icônes ;
  - applique *stale-while-revalidate* aux fichiers de même origine ;
  - laisse passer vers le réseau `script.google.com`, `script.googleusercontent.com`, `api.open-meteo.com`, `geocoding-api.open-meteo.com` et `tile.openstreetmap.org` ;
  - porte une constante `VERSION` et purge les anciens caches.
- `renderEncartInstallation({plateforme, installee})` :
  - rien quand l'appli est installée ;
  - sur Android, le bouton `beforeinstallprompt` ;
  - sur iOS, « Partager → Sur l'écran d'accueil » ;
  - dans tous les cas, « Si le bouton n'apparaît pas, ouvrez ce lien dans Chrome ou Safari ».
- `pages.yml` lance `npm test`, puis `actions/upload-pages-artifact` (`path: site`) et `actions/deploy-pages` à chaque modification de `main`.

- [ ] **Step 1 : Écrire les tests qui échouent.**

```js
test('manifest : portée limitée à /sorties/, icônes 192 et 512', …);
test('aucun service worker à la racine du site', () => assert.equal(existsSync('site/sw.js'), false));
test('encart installation iOS et conseil générique', …);
```

- [ ] **Step 2 : Lancer `npm test`.** Attendu : FAIL.
- [ ] **Step 3 : Implémenter les fichiers, puis lancer `powershell -File outils/generer-icones.ps1`.**
- [ ] **Step 4 : Lancer `npm test`.** Attendu : PASS, avec toute la suite au vert.
- [ ] **Step 5 : 👤 Publier.**
  - Créer un dépôt public sur le compte GitHub du porteur. Avec le nom `<compte>.github.io`, le site est servi à la racine ; avec un autre nom, il est servi sous `/<nom>/`. Les deux fonctionnent grâce aux chemins relatifs.
  - L'agent exécute `git remote add origin …` puis `git push -u origin main`.
  - 👤 Dans Settings → Pages → Source, choisir « GitHub Actions ».
  - Attendu : le workflow est vert et l'appli est accessible à `https://<compte>.github.io/…/sorties/`.
  - Reporter cette URL dans `url_appli` (onglet `Parametres` ou page Administration) et dans `CONFIG.urlAppli`.
- [ ] **Step 6 : Commit.** `git commit -m "feat: PWA installable et publication GitHub Pages"`

---

### Tâche 15 : 👤 Répétition de la démonstration au CA

**Files :**
- Create: `docs/demo-ca.md`, le scénario minuté de la présentation.

- [ ] **Step 1 : Rédiger `docs/demo-ca.md`.** Le scénario dure environ 10 minutes :
  1. installer l'appli sur le téléphone du porteur depuis le lien ;
  2. se connecter avec son numéro ;
  3. parcourir le samedi chargé : inscrits, traces, carte, météo réelle ;
  4. s'inscrire avec un membre de la famille ;
  5. écrire dans la discussion ;
  6. créer une sortie en deux touchers ;
  7. sur le PC, se connecter avec le compte de Ben et changer l'heure d'une sortie récurrente : le message système apparaît sur le téléphone ;
  8. en tant qu'administrateur : recevoir le code par mail ;
  9. cliquer sur « Envoyer le rappel maintenant », puis montrer les 2 mails reçus et l'envoi WhatsApp en un clic ;
  10. fermer un samedi, puis exécuter `tic` et montrer le mail d'annulation groupé ;
  11. ouvrir le Google Sheet pour montrer où sont les données et la liste des adhérents.

  Le document comprend aussi un plan B :
  - si le réseau est mauvais : captures prises à l'avance ;
  - si un mail arrive en retard : historique `Envois` dans l'administration.
- [ ] **Step 2 : 👤 Dérouler le scénario de bout en bout une fois, sur un vrai téléphone (Android ou iPhone) et un PC.** Noter tout écart dans `docs/demo-ca.md`, puis le corriger dans la tâche concernée.
- [ ] **Step 3 : Avant le CA, recharger des données fraîches.** Exécuter `chargerDonneesDemo` le jour même, pour que la fenêtre et les inscriptions correspondent à la semaine en cours.
- [ ] **Step 4 : Commit.** `git commit -m "docs: scénario de démonstration au CA"`
