# Rappels par récurrence et rappels groupés : plan de réalisation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** remplacer le rappel unique du jeudi par un rappel réglable dans chaque récurrence et des rappels groupés, avec la météo et le lien de chaque sortie dans les messages.

**Architecture:** le rappel individuel est stocké en colonnes `rappel_*` de l'onglet `Regles`, les rappels groupés dans un nouvel onglet `Rappels` (option A). Un module pur `backend/noyau/rappels.js` calcule les rappels dus, les sorties à annoncer et le texte ; `automate.js` l'appelle à chaque tic ; la météo est lue côté serveur par `ctx.services.http`, une fois par tic au plus. L'adaptateur Google ajoute les colonnes manquantes aux en-têtes des classeurs existants.

**Tech Stack:** JavaScript ES modules sans build (front et noyau), Google Apps Script (adaptateur), tests `node --test`.

**Spec:** `docs/superpowers/specs/2026-11-16-rappels-par-recurrence-design.md` (validée le 16/11/2026).

## Global Constraints

- Ne pas dégrader les performances : `calendrier` et les actions des adhérents ne lisent ni ne calculent rien de nouveau ; météo seulement au moment d'un envoi ; `admin_lire` sans appel supplémentaire.
- Jours : 0 = lundi … 6 = dimanche (`jourSemaine` de `logique/dates.js`).
- Rappel individuel par défaut : actif, `rappel_jour = (jour de la sortie − 2 + 7) % 7`, `rappel_heure = '18:00'`, mail et WhatsApp.
- Une récurrence appartient à au plus un rappel groupé ; une récurrence couverte par un groupe **actif** n'envoie pas son rappel individuel.
- Sorties annoncées : départ après l'instant d'envoi et au plus 7 jours après, non annulées, toutes les sorties de la **prochaine date** de chaque récurrence couverte ; aucune → rien ne part.
- Clés `Envois` : `rappel:R:<regle_id>:<date>`, `rappel:G:<rappel_id>:<date>`, manuel `rappel-manuel:<R|G>:<id>:<horodatage>`.
- Textes en français, textes bruts (pas de HTML) ; le vent en texte : secteur seul (« NE »).
- `backend/gas/Adaptateur.js` reste le seul fichier qui touche aux services Google ; le reste en modules purs testés.
- Pas de garde-fou contre les doubles annonces après une modification (§3.6).
- Commits avec `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. Une récurrence supprimée qui reste citée dans `regle_ids` d'un groupe : le groupe l'ignore, sans erreur. → test Task 3.
2. Open-Meteo injoignable ou réponse invalide au moment de l'envoi : le rappel part avec « Météo pas encore disponible ». → test Task 3.
3. Classeur existant dont l'en-tête `Regles` n'a pas les colonnes `rappel_*` : les réglages enregistrés sont bien écrits et relus. → test Task 2.
4. Rappel réglé le jour même de la sortie, après l'heure de départ : la sortie du jour est exclue, celle de la semaine suivante (≤ 7 jours) est annoncée. → test Task 1.
5. Deux groupes qui revendiquent la même récurrence dans `admin_enregistrer` : refus `champs_invalides`. → test Task 4.

---

## Fichiers

- Créer `backend/noyau/rappels.js` : réglages par défaut, rappels dus, sorties à annoncer, composition du message, météo serveur, envoi d'un rappel, mise en service.
- Modifier `backend/noyau/schema.js` : colonnes `rappel_*` de `Regles`, onglet `Rappels`.
- Modifier `site/sorties/js/logique/modeles.js` : textes par défaut des rappels.
- Modifier `site/sorties/js/logique/meteo.js` : `ligneMeteoTexte(plage)`.
- Modifier `backend/noyau/automate.js` : tic → rappels programmés ; retrait du rappel global.
- Modifier `backend/noyau/actions-admin.js`, `backend/noyau/actions.js` : enregistrement, lecture, envoi manuel.
- Modifier `backend/noyau/donnees-demo.js` : groupe « Week-end », colonnes `rappel_*`.
- Modifier `backend/gas/Adaptateur.js` : extension des en-têtes, onglet `Rappels` dans la lecture groupée.
- Modifier `site/sorties/js/ui/admin.js`, `site/sorties/js/app.js`, `site/sorties/style.css`, `site/sorties/sw.js` : écrans.
- Docs : specs fonctionnelle et technique, `docs/demo-ca.md`.

---

### Task 1: Module `rappels.js` — échéancier et sorties à annoncer

**Files:**
- Create: `backend/noyau/rappels.js`
- Modify: `backend/noyau/schema.js`
- Test: `tests/rappels-echeancier.test.js`

**Interfaces:**
- Produces:
  - `ONGLETS.Regles` complété par `'rappel_actif', 'rappel_jour', 'rappel_heure', 'rappel_mail', 'rappel_whatsapp', 'rappel_objet', 'rappel_texte'` (à la fin) ; `ONGLETS.Rappels = ['id', 'nom', 'regle_ids', 'jour', 'heure', 'mail', 'whatsapp', 'actif', 'objet', 'texte']`.
  - `reglagesRappelDefaut(jourSortie: string|number) → { rappel_actif: true, rappel_jour: string, rappel_heure: '18:00', rappel_mail: true, rappel_whatsapp: true, rappel_objet: string, rappel_texte: string }` (objet et texte = `MODELES_DEFAUT.rappel_individuel_objet/texte`, Task 3).
  - `rappelsProgrammes(regles, groupes) → Array<{ type: 'R'|'G', id, nom, regle_ids: string[], jour: number, heure: string, mail: boolean, whatsapp: boolean, objet: string, texte: string }>` : les groupes actifs, plus les règles actives dont `rappel_actif` est vrai et qui ne sont couvertes par aucun groupe actif. `regle_ids` d'un groupe = ids séparés par des virgules, nettoyés, limités aux règles existantes.
  - `estDu(rappel, maintenant: Date) → boolean` : `jourSemaine(aujourdhuiLocal(maintenant)) === rappel.jour` et heure locale ≥ `rappel.heure`.
  - `sortiesAAnnoncer(sorties, regleIds, maintenant) → sorties[]` : règle §3.3, triées par date puis heure.

- [ ] **Step 1: Write the failing tests** (`contexteTest`, aujourd'hui jeudi 12/11/2026, données de démo)

```js
test('rappelsProgrammes : un groupe actif remplace les rappels individuels de ses récurrences', () => {
  const regles = [r('sm', 5), r('sa', 5), r('me', 2)]; // r(id, jour) : règle active, rappel individuel actif
  const groupes = [{ id: 'g1', nom: 'Week-end', regle_ids: 'sm, sa,inconnue', jour: '3', heure: '18:00', mail: true, whatsapp: true, actif: true, objet: 'o', texte: 't' }];
  const p = rappelsProgrammes(regles, groupes);
  assert.deepEqual(p.map((x) => [x.type, x.id]), [['G', 'g1'], ['R', 'me']]);
  assert.deepEqual(p[0].regle_ids, ['sm', 'sa']); // l'id inconnu est ignoré
});
test('rappelsProgrammes : groupe désactivé → les rappels individuels repartent ; rappel individuel désactivé → rien', () => { /* actif:false sur g1 → R sm, R sa, R me ; rappel_actif:false sur me → absent */ });
test('estDu : le jour réglé, à partir de l\'heure réglée', () => {
  const rp = { jour: 3, heure: '18:00' };
  assert.equal(estDu(rp, new Date(2026, 10, 12, 17, 59)), false);
  assert.equal(estDu(rp, new Date(2026, 10, 12, 18, 0)), true);
  assert.equal(estDu(rp, new Date(2026, 10, 13, 18, 30)), false);
});
test('sortiesAAnnoncer : prochaine date dans les 7 jours, sans les annulées ni les sorties parties', () => {
  // sorties de démo : sm (samedi 14 09:30), sa (samedi 14 14:00), dm (dimanche 15, annulée)
  const s = sortiesAAnnoncer(sorties, ['sm', 'sa', 'dm'], new Date(2026, 10, 12, 18, 0));
  assert.deepEqual(s.map((x) => x.id), ['R:sm:2026-11-14:1', 'R:sa:2026-11-14:1']);
});
test('sortiesAAnnoncer : rappel le jour même après le départ → la sortie de la semaine suivante', () => {
  const s = sortiesAAnnoncer(sorties, ['sm'], new Date(2026, 10, 14, 10, 0));
  assert.deepEqual(s.map((x) => x.id), ['R:sm:2026-11-21:1']);
});
test('reglagesRappelDefaut : 2 jours avant la sortie à 18:00', () => {
  assert.equal(reglagesRappelDefaut('5').rappel_jour, '3');
  assert.equal(reglagesRappelDefaut('1').rappel_jour, '6');
});
```

- [ ] **Step 2: Run** `node --test tests/rappels-echeancier.test.js` — Expected: FAIL (module absent).
- [ ] **Step 3: Implement** the four functions in `backend/noyau/rappels.js` and the schema columns. Booleans read with `estVrai` (cellules `TRUE`/`VRAI`/booléen).
- [ ] **Step 4: Run** `npm test` — Expected: all pass.
- [ ] **Step 5: Commit** `feat(rappels): échéancier des rappels individuels et groupés`.

### Task 2: Classeurs existants — en-têtes et onglet `Rappels`

**Files:**
- Modify: `backend/gas/Adaptateur.js`
- Test: `tests/adaptateur-rapidite.test.js`

**Interfaces:**
- Consumes: `ONGLETS` (Task 1).
- Produces: `completerEntetes(feuille, onglet)` appelé par `feuille(onglet)` : ajoute en fin de ligne 1 les colonnes de `ONGLETS[onglet]` absentes, une seule fois par requête et par onglet ; la mémoire de l'onglet et le cache des données sont alors invalidés. `Rappels` fait partie de la lecture groupée et du cache.

- [ ] **Step 1: Write the failing tests**

```js
test("classeur d'une version précédente : les colonnes rappel_* manquantes sont ajoutées et les réglages enregistrés relus", () => {
  // installer, puis réécrire l'en-tête de Regles sans les 7 colonnes rappel_* (et vider les valeurs correspondantes)
  // depot.modifier('Regles', r => r.id === 'sm', { rappel_jour: '4' }) via vm, puis depot.lire('Regles') → rappel_jour === '4'
  // et la ligne 1 de la feuille se termine par les 7 colonnes rappel_* dans l'ordre de ONGLETS.Regles
});
test('cache des données : Rappels y figure et la copie reste sous 30 000 caractères avec la démo', () => {
  // après un calendrier : JSON.parse(g.cache.get('donnees')).onglets.Rappels existe ; g.cache.get('donnees').length < 30000
});
```

- [ ] **Step 2: Run** `node --test tests/adaptateur-rapidite.test.js` — Expected: the 2 new tests FAIL.
- [ ] **Step 3: Implement** `completerEntetes` in `depotSheets` (`feuille()` passe par lui ; écriture d'en-tête = `getRange(1, n+1, 1, k).setValues`). Ne rien faire si l'en-tête est complet (pas d'écriture, pas d'invalidation).
- [ ] **Step 4: Run** `npm test` — Expected: all pass ; les tests de rapidité existants (1 lecture groupée, cache) restent verts.
- [ ] **Step 5: Commit** `feat(rappels): colonnes et onglet des rappels sur les classeurs existants`.

### Task 3: Composition du message, météo serveur, envoi

**Files:**
- Modify: `backend/noyau/rappels.js`, `site/sorties/js/logique/meteo.js`, `site/sorties/js/logique/modeles.js`
- Test: `tests/rappels-message.test.js`, `tests/meteo.test.js`

**Interfaces:**
- Consumes: `sortiesAAnnoncer`, `rappelsProgrammes` (Task 1) ; `synthetiser`, `cardinal` (`meteo.js`) ; `remplirModele`, `libelleJour`.
- Produces:
  - `MODELES_DEFAUT.rappel_individuel_objet = 'Sorties VTT : {{nom}}'`, `rappel_individuel_texte = "Les inscriptions sont ouvertes !\n{{liste_sorties}}\n📱 Vous avez l'appli : ouvrez-la depuis votre écran d'accueil.\n🌐 Pas encore installée : {{lien}}"`, et de même `rappel_groupe_objet`, `rappel_groupe_texte`.
  - `ligneMeteoTexte(plage|null) → string` : `'☀️ 2–9° · 💧0 mm · 🌬 12 km/h NE'` (min = max → une seule valeur ; pas de secteur si inconnu) ou `'Météo pas encore disponible'`.
  - `meteoServeur(ctx, parametres) → hourly|null` : Open-Meteo `forecast` (variables `temperature_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m,wind_direction_10m`, `timezone=Europe/Paris`, `forecast_days=14`) via `ctx.services.http` ; `null` si coordonnées absentes, exception ou réponse sans `hourly`.
  - `composerMessage(rappel, sorties, hourly, urlAppli) → { objet, texte }` : repères §3.4 (`{{nom}}`, `{{liste_sorties}}`, `{{lien}}`, `{{titre}}`, `{{date}}`, `{{heure}}`, `{{point_rdv}}`, `{{meteo}}`, `{{lien_sortie}}`) ; entrée de liste = 3 lignes : `🚵 <libelleJour> <heure> – <titre> (<point_rdv>)`, `   <ligneMeteoTexte>`, `   👉 <lien_sortie>` ; `lien_sortie = <url_appli avec / final>#/sortie/<encodeURIComponent(id)>` (vide si pas d'URL).
  - `envoyerRappel(ctx, rappel, cle, hourly) → { etat, nb_sorties }` : sorties via `sortiesAAnnoncer` ; 0 sortie → `nb_sorties: 0`, rien envoyé, pas de ligne `Envois` ; sinon `envoyerEtapes` (de `automate.js`) avec seulement les étapes des canaux cochés.

- [ ] **Step 1: Write the failing tests**

```js
test('ligneMeteoTexte : synthèse en texte, secteur du vent seul ; null → « Météo pas encore disponible »', () => {
  assert.equal(ligneMeteoTexte({ emoji: '☀️', tmin: 2, tmax: 9, pluie_mm: 0, vent_max: 12, vent_cardinal: 'NE' }), '☀️ 2–9° · 💧0 mm · 🌬 12 km/h NE');
  assert.equal(ligneMeteoTexte(null), 'Météo pas encore disponible');
});
test('composerMessage : liste des sorties avec météo de leur demi-journée et lien vers chaque sortie', () => {
  // rappel groupé « Week-end », sorties sm (09:30) et sa (14:00) du 14/11, hourly fabriqué (fabriquerHoraire) : matin ☀️, après-midi ⛅
  // texte contient '🚵 Samedi 14 novembre 09:30 – Samedi matin (PDL)\n   ☀️', puis '👉 https://club.example.org/sorties/#/sortie/R%3Asm%3A2026-11-14%3A1'
  // la sortie de 14:00 porte la météo de l'après-midi (⛅) ; objet = 'Sorties VTT : Week-end'
});
test('composerMessage : repères d\'une seule sortie ({{titre}}, {{date}}, {{heure}}, {{point_rdv}}, {{meteo}}, {{lien_sortie}})', () => { /* … */ });
test('envoyerRappel : mail seul → une seule étape ; aucune sortie à annoncer → rien n\'est envoyé', () => { /* … */ });
test('météo injoignable : le rappel part avec « Météo pas encore disponible »', () => {
  // ctx.services.http lève une exception → meteoServeur renvoie null → texte contient 'Météo pas encore disponible', mails envoyés
});
```

- [ ] **Step 2: Run** `node --test tests/rappels-message.test.js tests/meteo.test.js` — Expected: FAIL.
- [ ] **Step 3: Implement** in the files above. `envoyerEtapes`/`etapesMessage` restent dans `automate.js` ; ajouter un paramètre `canaux = { mail: true, whatsapp: true }` à `etapesMessage`.
- [ ] **Step 4: Run** `npm test` — Expected: all pass.
- [ ] **Step 5: Commit** `feat(rappels): message avec météo et liens, envoi par canal`.

### Task 4: Tic, mise en service et actions d'administration

**Files:**
- Modify: `backend/noyau/automate.js`, `backend/noyau/rappels.js`, `backend/noyau/actions-admin.js`, `backend/noyau/actions.js`, `backend/noyau/donnees-demo.js`, `backend/noyau/schema.js`
- Test: `tests/rappels-tic.test.js`, `tests/noyau-automate.test.js`, `tests/noyau-admin.test.js` ; supprimer `tests/rappel-liens-jours.test.js` (rappel global retiré ; `prochainJour` et `lienJour` gardent leurs tests s'ils restent utilisés, sinon retirés avec eux).

**Interfaces:**
- Consumes: Tasks 1 et 3.
- Produces:
  - `rappelsDuTic(ctx, maintenant)` (appelé par `ticNoyau` à la place de `rappelDu`) : pour chaque rappel programmé dû et sans ligne `Envois` à sa clé du jour, `envoyerRappel` ; `meteoServeur` appelé **une seule fois** par tic et seulement si au moins un rappel est dû.
  - `migrerRappels(ctx)` (début de `ticNoyau` et de `actionAdminLire`) : si `Parametres.rappels_migres` ≠ `'oui'` : crée « Week-end » (§3.5), complète les `rappel_*` vides des règles, écrit `rappels_migres = 'oui'` ; idempotent.
  - `admin_lire` renvoie aussi `rappels` (groupes, `actif`/`mail`/`whatsapp` en booléens, `regle_ids` en tableau) et les `rappel_*` des règles.
  - `admin_enregistrer` accepte `rappels` (liste complète des groupes) ; `enregistrerRegles` conserve et valide les `rappel_*` (jour 0–6, heure HH:MM, au moins un canal si actif, objet ≤ 150, texte ≤ 2000) ; une nouvelle règle sans `rappel_*` reçoit `reglagesRappelDefaut`.
  - `rappel_envoyer_maintenant` prend `{ type: 'R'|'G', id }` et renvoie `{ nb_sorties }` ; envoie même si le rappel est désactivé ou couvert (§3.2).
  - Démo : règles avec `reglagesRappelDefaut`, groupe `{ id: 'g-weekend', nom: 'Week-end', regle_ids: 'sm,sa,dm', jour: '3', heure: '18:00', mail: true, whatsapp: true, actif: true }` avec les textes du rappel actuel, `rappels_migres: 'oui'`.
  - Retrait : `rappel_jour`/`rappel_heure` de `PARAMETRES_DEFAUT` gardés pour la migration mais plus affichés ; `envoyerRappel` global, `rappelDu`, `lien_samedi`/`lien_dimanche` retirés.

- [ ] **Step 1: Write the failing tests**

```js
test('tic jeudi 18:05 (démo) : un seul rappel « Week-end », samedi matin et après-midi listés, dimanche annulé absent ; pas renvoyé au tic suivant', () => { /* objets ['Sorties VTT : les inscriptions du week-end sont ouvertes', 'À poster sur WhatsApp'] ; texte contient les deux liens #/sortie/ */ });
test('tic : la météo est demandée une seule fois même si deux rappels sont dus, et pas du tout si aucun ne l\'est', () => { /* compter les appels à ctx.services.http */ });
test('tic : rappel individuel d\'une récurrence du mercredi réglé le lundi 18:00, mail seul', () => { /* une seule étape mail */ });
test('migrerRappels : ancien classeur → groupe Week-end sur les récurrences du samedi et dimanche, autres jours en rappel individuel désactivé ; idempotent', () => {
  // supprimer la ligne Parametres rappels_migres, vider les rappel_*, ajouter une règle du mercredi, rappel_jour='4' et rappel_heure='19:00' en paramètres
  // → 1 groupe { jour:'4', heure:'19:00', regle_ids couvre sm, sa, dm } ; règle du mercredi rappel_actif false ; second appel → toujours 1 groupe
});
test('migrerRappels : texte WhatsApp personnalisé différent du mail → ligne Journal', () => { /* … */ });
test('admin_enregistrer rappels : deux groupes sur la même récurrence → champs_invalides ; id de récurrence inconnu → ignoré', () => { /* … */ });
test('rappel_envoyer_maintenant : envoie un rappel individuel couvert par un groupe ; renvoie nb_sorties', () => { /* … */ });
```

- [ ] **Step 2: Run** `node --test tests/rappels-tic.test.js tests/noyau-automate.test.js tests/noyau-admin.test.js` — Expected: FAIL.
- [ ] **Step 3: Implement**; mettre à jour les tests existants du rappel du jeudi (`noyau-automate`, `noyau-admin`, `rappel-liens-jours`) pour le nouveau modèle.
- [ ] **Step 4: Run** `npm test` — Expected: all pass, y compris `copie-gas` (le module `rappels.js` est copié vers Apps Script sans `export` résiduel).
- [ ] **Step 5: Commit** `feat(rappels): envoi au tic, mise en service et administration`.

### Task 5: Écrans d'administration

**Files:**
- Modify: `site/sorties/js/ui/admin.js`, `site/sorties/js/app.js`, `site/sorties/style.css`, `site/sorties/sw.js` (version de cache)
- Test: `tests/ui-admin.test.js`

**Interfaces:**
- Consumes: données de `admin_lire` (Task 4).
- Produces:
  - Section « Rappel » de `formulaireRegle` : case « Rappel actif », jour, heure, cases « Mail à la liste » / « WhatsApp », objet, texte, bouton « 📨 Envoyer maintenant » (règle existante seulement) ; si couverte par un groupe actif, bandeau `Couverte par le rappel « <nom> » : ce rappel individuel ne part pas.` avec lien `#/admin/rappels/<id>`.
  - Onglet `['rappels', 'Rappels']` dans `ONGLETS_ADMIN` (entre Fermetures et Paramètres) : liste des groupes + `+ Nouveau rappel groupé` ; écran `#/admin/rappels/<id|nouveau>` (`renderAdmin(d, 'rappels', { rappelEdite })`) : nom, actif, cases des récurrences (celles d'un autre groupe `disabled` avec « (groupe <nom>) »), jour, heure, canaux, objet, texte, Enregistrer / Annuler / Supprimer, « Envoyer maintenant ».
  - Paramètres : plus de « Jour/Heure du rappel ». Messages : plus les 3 textes « Rappel du jeudi » ni le bouton global ; l'aide liste les repères des rappels.
  - Route `#/admin/rappels/(.+)` avant la route générale ; `admin_enregistrer` envoie `rappels` complet ; aucun appel réseau nouveau à l'affichage.

- [ ] **Step 1: Write the failing tests**

```js
test('écran d\'une récurrence : section Rappel remplie, et bandeau quand un groupe la couvre', () => {
  const d = donneesAdmin();
  const html = renderAdmin(d, 'recurrences', { regleEditee: 'sm' });
  assert.match(html, /Couverte par le rappel « Week-end »/);
  assert.match(html, /href="#\/admin\/rappels\/g-weekend"/);
  assert.match(html, /name="rappel_heure" type="time" value="18:00"/);
});
test('onglet Rappels : liste des groupes et écran d\'édition ; récurrences d\'un autre groupe désactivées', () => { /* nouveau groupe : cases sm/sa/dm disabled « (groupe Week-end) » */ });
test('Paramètres et Messages : plus de réglage ni de texte du rappel du jeudi', () => {
  assert.doesNotMatch(renderAdmin(donneesAdmin(), 'parametres'), /name="rappel_jour"/);
  assert.doesNotMatch(renderAdmin(donneesAdmin(), 'messages'), /Rappel du jeudi|rappel-maintenant/);
});
```

- [ ] **Step 2: Run** `node --test tests/ui-admin.test.js` — Expected: FAIL.
- [ ] **Step 3: Implement**; vérifier dans le navigateur (serveur de dev, téléphone 375 px) : créer un groupe, modifier une récurrence, « Envoyer maintenant » (mail visible dans les journaux du serveur de dev).
- [ ] **Step 4: Run** `npm test` — Expected: all pass.
- [ ] **Step 5: Commit** `feat(rappels): écrans d'administration des rappels`.

### Task 6: Documentation

**Files:**
- Modify: `docs/specs/2026-11-11-inscriptions-specs-fonctionnelles.md` (§4.8, §4.9), `docs/specs/2026-11-11-inscriptions-specs-techniques.md` (§3 onglets, §4 actions, §7.2), `docs/demo-ca.md` (étapes 10–11).

- [ ] **Step 1:** Mettre à jour ces documents d'après la spec de conception (sans la recopier : renvoyer vers elle pour le détail).
- [ ] **Step 2: Run** `npm test` — Expected: all pass.
- [ ] **Step 3: Commit** `docs: rappels par récurrence et rappels groupés`.

### Vérification finale

- [ ] `npm test` vert ; mesure en local (`mesure: true`) : `calendrier` sans écriture ni lecture feuille à feuille, comme avant.
- [ ] Après publication (avec l'accord du porteur) : `gas:pousser`, `clasp deploy` (même URL), `git push`, puis un `calendrier` mesuré en production comparable à avant (~1,5 s), et l'onglet Rappels visible.
