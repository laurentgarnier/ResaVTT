# Rappels par récurrence et rappels groupés, avec la météo du jour : conception

*16/11/2026. Validé en conversation avec le porteur du projet ; à relire avant le plan de réalisation.*

## 1. Intention

Aujourd'hui, un seul rappel part chaque semaine, le jeudi à 18 h. Il annonce le week-end, avec un lien vers le samedi et un vers le dimanche. Il ne couvre donc que le week-end : une sortie récurrente du mercredi ne peut pas être annoncée le lundi, par exemple.

Le porteur veut :
- **pour chaque récurrence**, choisir s'il y a un rappel et, si oui, son jour, son heure, son canal (mail à la liste, WhatsApp, ou les deux) et son texte ;
- **pouvoir regrouper** plusieurs récurrences dans un **rappel groupé** (par exemple « Week-end »), qui a ses propres jour, heure, canaux et texte, et qui **remplace** les rappels individuels des récurrences qu'il couvre. Il peut y avoir plusieurs rappels groupés ;
- que les messages de rappel donnent, **par défaut, la météo prévue** pour la sortie et le **lien direct vers la sortie**, où l'on s'inscrit.

**Contrainte du porteur : ne pas dégrader les performances** (elles viennent d'être ramenées de ~4,5 s à ~1,5 s par appel, voir la spec technique §4, cache des données).

## 2. Objectifs, non-objectifs, anti-objectifs

**Objectifs**
- Un rappel individuel réglable dans l'écran de chaque récurrence.
- Des rappels groupés, en nombre libre, gérés dans un nouvel onglet d'administration.
- Météo et lien de chaque sortie dans les messages par défaut.
- À la mise en service, aucun changement visible pour les adhérents : le rappel du jeudi devient le rappel groupé « Week-end », avec la météo en plus.

**Non-objectifs**
- Rappels pour les **sorties libres** (proposées par un adhérent) : non, seulement les récurrences.
- Plusieurs rappels successifs pour une même récurrence (J-3 puis J-1) : non. Un rappel individuel, ou un rappel groupé.
- Textes différents pour le mail et pour WhatsApp : non, un seul texte par rappel (plus l'objet du mail). *Choix du rédacteur, accepté.*
- Les messages d'**annulation** ne changent pas.

**Anti-objectifs** (ce qui serait un échec même si « ça marche »)
- Une récurrence annoncée **deux fois** pour la même sortie par le fonctionnement normal (par son rappel individuel et par un groupe, ou par deux groupes). *Exception acceptée par le porteur : voir §3.6.*
- Un rappel qui part pour une sortie **annulée**.
- Un écran adhérent (calendrier, sortie, inscription) **plus lent** qu'aujourd'hui.
- Un rappel bloqué parce que la météo ne répond pas.

## 3. Comportement attendu

### 3.1 Rappel individuel (dans l'écran d'une récurrence)
Section « Rappel » de l'écran d'édition d'une récurrence (`#/admin/recurrences/<id>`) :
- **Rappel** : activé ou non.
- **Jour** (lundi … dimanche) et **heure** (HH:MM) d'envoi.
- **Canaux** : « Mail à la liste » et « WhatsApp » (cases à cocher ; au moins une si le rappel est activé).
- **Objet du mail** et **texte**.
- Si la récurrence est couverte par un rappel groupé : la section affiche « Couverte par le rappel « Week-end » : ce rappel individuel ne part pas » avec un lien vers ce rappel groupé ; les réglages restent visibles et modifiables, ils reprendront effet si la récurrence quitte le groupe.

**Valeurs par défaut d'une nouvelle récurrence** *(choix du rédacteur)* : rappel activé, **2 jours avant le jour de la sortie** (jeudi pour un samedi, lundi pour un mercredi) à **18:00**, mail et WhatsApp, objet et texte par défaut (§3.4).

### 3.2 Rappels groupés (onglet Admin « Rappels »)
- Liste des rappels groupés : nom, jour et heure, canaux, récurrences couvertes, actif ou non ; bouton « + Nouveau rappel groupé ».
- Écran dédié de création et de modification (`#/admin/rappels/<id|nouveau>`), même principe que l'écran des récurrences :
  - **Nom** (ex. « Week-end »), **actif** ;
  - **Récurrences couvertes** : liste à cocher de toutes les récurrences ; celles déjà couvertes par **un autre** rappel groupé sont grisées avec le nom de ce groupe ;
  - **Jour**, **heure**, **canaux**, **objet**, **texte**.
- **Règles** :
  - une récurrence appartient à **au plus un** rappel groupé (contrôlé aussi côté serveur) ;
  - une récurrence couverte par un rappel groupé **actif** n'envoie pas son rappel individuel ;
  - un rappel groupé **désactivé ou supprimé** rend leur rappel individuel aux récurrences qu'il couvrait (avec leurs réglages intacts) ;
  - une récurrence couverte par un groupe **désactivé** reste « prise » par ce groupe dans la liste à cocher (pour éviter qu'elle se retrouve dans deux groupes à la réactivation), mais son rappel individuel part.
- Bouton **« Envoyer maintenant »** sur chaque rappel (groupé, et individuel dans l'écran de la récurrence) : envoie tout de suite ce rappel, sans attendre son jour. Il remplace le bouton actuel « Envoyer le rappel maintenant » de l'onglet Messages. C'est une action explicite : il envoie **même si** le rappel est désactivé ou si la récurrence est couverte par un groupe *(choix du rédacteur)*. Les sorties annoncées suivent §3.3 ; s'il n'y en a aucune, l'admin voit « Aucune sortie à annoncer dans les 7 jours ».

### 3.3 Quelles sorties un rappel annonce
Au moment de l'envoi, pour **chaque récurrence couverte** (une seule pour un rappel individuel) :
- les sorties générées par cette récurrence dont le départ est **après l'instant d'envoi** et **au plus tard 7 jours après** ;
- **pas annulées** ;
- si une récurrence a plusieurs sorties par occurrence (plusieurs groupes de niveau), toutes celles de la **prochaine date** sont annoncées.

Si **aucune sortie** n'est à annoncer (récurrence toutes les 2 semaines dans la semaine creuse, tout annulé), **rien ne part**.

Le rappel part **le jour réglé, à partir de l'heure réglée**, au premier passage de la tâche horaire (comme aujourd'hui). Un rappel non envoyé ce jour-là (panne) n'est **pas** rattrapé le lendemain.

### 3.4 Contenu des messages
Repères utilisables dans l'objet et le texte (individuel comme groupé) :
- `{{nom}}` : nom de la récurrence (rappel individuel) ou du rappel groupé ;
- `{{liste_sorties}}` : une entrée par sortie annoncée, triées par date puis heure :
  ```
  🚵 Samedi 21 novembre 09:00 – Samedi matin (PDL)
     ☀️ 2–9° · 💧0 mm · 🌬 12 km/h NE
     👉 https://…/sorties/#/sortie/R%3Asm%3A2026-11-21%3A1
  ```
  (la ligne météo est remplacée par « Météo pas encore disponible » au-delà de l'horizon de prévision ou si le service ne répond pas) ;
- `{{lien}}` : adresse de l'appli ;
- pour la commodité d'un rappel individuel d'une seule sortie : `{{titre}}`, `{{date}}` (ex. « Samedi 21 novembre »), `{{heure}}`, `{{point_rdv}}`, `{{meteo}}` (la ligne météo seule), `{{lien_sortie}}` ; quand plusieurs sorties sont annoncées, ils valent ceux de la **première**.

**Textes par défaut** :
- objet individuel : `Sorties VTT : {{nom}}` ; objet groupé : `Sorties VTT : {{nom}}`.
- texte (individuel et groupé) :
  ```
  Les inscriptions sont ouvertes !
  {{liste_sorties}}
  📱 Vous avez l'appli : ouvrez-la depuis votre écran d'accueil.
  🌐 Pas encore installée : {{lien}}
  ```
- pour le groupe « Week-end » créé à la mise en service : objet `Sorties VTT : les inscriptions du week-end sont ouvertes`, texte commençant par `Les sorties du week-end sont ouvertes !`.

**Météo** : celle de la **demi-journée de la sortie** (matin : départ avant 13 h, plage 8 h–12 h ; après-midi : 13 h–18 h), comme dans l'appli : pictogramme, températures min–max, pluie en mm, vent max en km/h et secteur (N, NE…). Dans un message texte, pas de flèche orientée : le secteur seul.

**Canaux** : identiques à aujourd'hui (spec technique §7) : « mail » = mail à `adresse_liste` ; « WhatsApp » = mail au secrétaire et aux suppléants avec le bouton qui ouvre WhatsApp, message prêt.

### 3.5 Mise en service (reprise de l'existant)
Une seule fois, au premier passage du nouveau code sur un classeur existant :
- un rappel groupé **« Week-end »** est créé : actif, couvrant les récurrences existantes **du samedi et du dimanche** (`jour` 5 ou 6), ce qui reproduit exactement le rappel actuel, au jour et à l'heure de l'ancien réglage (`rappel_jour`, `rappel_heure`, par défaut jeudi 18:00), mail et WhatsApp, avec l'objet et le texte actuels du rappel (`rappel_mail_objet`, `rappel_mail_corps`) dans lesquels `{{lien_samedi}}` / `{{lien_dimanche}}` sont remplacés par `{{liste_sorties}}` si le texte est encore celui par défaut ; sinon le texte personnalisé est repris tel quel, et une ligne `{{liste_sorties}}` est ajoutée à la fin s'il n'en contient pas ;
- chaque récurrence existante reçoit les réglages individuels par défaut (§3.1). Ils ne partent pas tant qu'elle est couverte par « Week-end ». Une récurrence d'un autre jour reçoit ces réglages **désactivés**, pour qu'aucun message nouveau ne parte sans décision de l'admin *(choix du rédacteur)* ;
- le texte WhatsApp actuel (`rappel_whatsapp`) n'est pas repris, puisqu'un rappel n'a plus qu'un texte : c'est le texte du mail qui sert. S'il différait du texte du mail, une ligne le signale dans `Journal` *(choix du rédacteur)* ;
- les anciens réglages « Jour / heure du rappel » disparaissent de l'onglet Paramètres, et les textes « Rappel du jeudi » de l'onglet Messages (les textes d'annulation y restent).

Le jeu de démonstration (`chargerDonneesDemo`) contient le même groupe « Week-end ».

### 3.6 Doubles annonces après une modification (décision du porteur)
Aucun historique des sorties annoncées n'est tenu. Si l'admin modifie les rappels en cours de semaine (ajoute à un groupe une récurrence déjà annoncée par son rappel individuel, retire une récurrence d'un groupe déjà parti, ou utilise « Envoyer maintenant » avant l'envoi automatique), une sortie peut être annoncée deux fois. Le porteur l'accepte : cela ne suit qu'une modification et doit rester rare.

## 4. Approches envisagées

**A. Le rappel individuel dans la récurrence, les rappels groupés dans un onglet à part (retenue).** Colonnes `rappel_*` ajoutées à l'onglet `Regles` ; nouvel onglet `Rappels` pour les groupes. L'écran d'une récurrence enregistre déjà toute la récurrence : son rappel suit, et supprimer une récurrence supprime son rappel. L'automate lit les deux sources.

**B. Un seul onglet `Rappels` pour tout**, le rappel individuel étant une ligne qui ne vise qu'une récurrence, créée avec elle. Un seul modèle, mais il faut synchroniser création et suppression ; une ligne orpheline ou manquante donnerait un rappel fantôme ou une récurrence muette, défaut difficile à voir. **Écartée.**

**C. Garder le rappel du jeudi et ajouter des rappels par récurrence.** Écartée : le porteur ne veut pas spécialement de rappel le jeudi, et cela produirait des doublons.

Le porteur a choisi **A**.

## 5. Données

**Onglet `Regles`** : colonnes ajoutées à la fin :
`rappel_actif`, `rappel_jour` (0 = lundi … 6 = dimanche), `rappel_heure` (HH:MM), `rappel_mail`, `rappel_whatsapp`, `rappel_objet`, `rappel_texte`.

**Nouvel onglet `Rappels`** (rappels groupés) :
`id`, `nom`, `regle_ids` (identifiants séparés par des virgules), `jour`, `heure`, `mail`, `whatsapp`, `actif`, `objet`, `texte`.

**Envois** : chaque envoi garde une clé dans `Envois` (reprise des étapes mail / WhatsApp sans doublon, comme aujourd'hui) :
- automatique : `rappel:R:<regle_id>:<date d'envoi>` ou `rappel:G:<rappel_id>:<date d'envoi>` ;
- manuel : `rappel-manuel:<R|G>:<id>:<horodatage>`.

**Paramètres** : `rappel_jour` et `rappel_heure` ne servent plus qu'à la mise en service ; une clé `rappels_migres` marque qu'elle a eu lieu.

## 6. Contraintes

- **Performances** :
  - aucune donnée ni calcul supplémentaire dans `calendrier` et les actions des adhérents ;
  - `Rappels` est petit : il entre dans la lecture groupée et dans le cache des données (spec technique §4) ; vérifier que la taille du cache reste loin de la limite de 95 000 caractères ;
  - la météo n'est demandée qu'au moment d'un envoi (tâche horaire ou bouton « Envoyer maintenant »), **une seule fois par passage** même si plusieurs rappels partent, jamais dans une requête d'adhérent ;
  - l'écran Admin ne fait pas d'appel de plus : `admin_lire` renvoie aussi les rappels groupés.
- **Classeurs existants** : l'adaptateur lit et écrit par nom de colonne d'après la ligne d'en-tête de la feuille. Les nouvelles colonnes de `Regles` doivent donc être **ajoutées à l'en-tête** des classeurs existants (en fin de ligne), sans relancer `initialiser()` ; l'onglet `Rappels` est créé à la volée comme les autres onglets manquants.
- **Météo côté serveur** : Open-Meteo par `ctx.services.http` (déjà utilisé pour le géocodage), mêmes variables que l'appli (`temperature_2m`, `precipitation`, `weather_code`, `wind_speed_10m`, `wind_direction_10m`), commune du club (`commune_lat`, `commune_lon`), et le calcul existant de `logique/meteo.js`. Échec ou dépassement de l'horizon : le rappel part sans météo (« Météo pas encore disponible »).
- **Échappement** : comme aujourd'hui, les textes sont des textes bruts (mail en texte, WhatsApp via le lien `wa.me`).
- Le code reste en modules purs testés (`backend/noyau`, `site/sorties/js/logique`) et l'adaptateur Google reste le seul fichier qui touche aux services Google.

## 7. Laissé au constructeur

- Découpage des modules (par exemple un `backend/noyau/rappels.js` pour l'échéancier et la composition des messages).
- Forme exacte des écrans, en suivant le style de l'écran d'une récurrence et de l'onglet Statistiques.
- Validation des champs (jour 0–6, heure HH:MM, au moins un canal si actif, longueurs maximales comme les autres textes de l'admin).
- Mise à jour des specs fonctionnelle (§4.8, §4.9) et technique (§3, §7), du scénario de démo du CA (étape « Envoyer le rappel maintenant ») et de l'aide de l'onglet Messages.
