# Appli de sorties du club de VTT : spécifications fonctionnelles

*Version 0.3, du 13/11/2026. Intègre les évolutions demandées pendant la réalisation du prototype : liens directs vers le week-end, météo en mm et km/h, conservation d'un mois, statistiques, mises en page et thèmes à l'essai. Remplace la version 0.2.*

Légende des marquages :
- **[décidé]** : validé par l'association.
- **[choix du rédacteur]** : proposition non tranchée, à valider.

---

## 1. Contexte et objectif

Le club de VTT est une association à but non lucratif, sans budget.

**Aujourd'hui**, le secrétaire fait tout à la main chaque jeudi :
- il vide ou recrée 3 sondages Framadate, un par session, où les adhérents cochent un niveau ;
- il met à jour le mail et le message WhatsApp avec les liens ;
- il les envoie.

Cela prend **environ 30 minutes par semaine**. Si le secrétaire est indisponible, rien ne part.

**Objectif** : une **appli web gratuite, installable sur téléphone et tablette**, qui remplace les Framadate. Elle doit offrir :
- un **calendrier des sorties** sur 2 semaines ;
- des **sorties récurrentes générées automatiquement** ;
- des **sorties proposées librement** par les adhérents ;
- la météo, des traces GPX et un fil de discussion par sortie.

L'intervention humaine se limite au **paramétrage** et à **un clic par semaine** pour poster le rappel WhatsApp.

Source d'inspiration **[décidé]** : une appli de padel montrant les jours de la semaine en cartes, avec cette semaine et la semaine prochaine, les inscrits et les boutons « M'inscrire » et « + Ajouter un match ».

## 2. Objectifs, non-objectifs, anti-objectifs

**Objectifs**
- Un **lien unique et permanent**, épinglé dans la communauté WhatsApp, et une appli installable.
- La **génération automatique des sorties récurrentes**, sans action humaine.
- La **création libre de sorties** par n'importe quel adhérent.
- Voir **qui vient à quelle sortie**, et pouvoir signaler en deux touchers qu'on roule tel jour, en créant une sortie.
- La **météo** de la commune du club, une **trace GPX** par sortie et un **fil de discussion** par sortie.
- Un **rappel automatique le jeudi** par mail, et sur WhatsApp en un clic.
- Une **page d'administration** pour les administrateurs déclarés.
- **Coût nul.**

**Non-objectifs**
- Le paiement, les cotisations et la gestion des adhésions. La liste des adhérents reste tenue par le secrétaire.
- Les notifications sur le téléphone (push) **[choix du rédacteur]**. WhatsApp joue déjà ce rôle.
- Le suivi GPS en direct, l'enregistrement des sorties réalisées et les statistiques.
- Un rôle permettant de corriger les inscriptions des autres **[décidé]**.
- La gestion des abonnés à la liste mail, qui reste dans le Google Groupe existant **[décidé]**.

**Anti-objectifs** : ce qui serait un échec même si « ça marche ».
- Toute solution **payante** ou qui demande une carte bancaire.
- **Dépendre d'une seule personne** pour que les sorties apparaissent ou que le rappel parte.
- **Afficher les numéros de téléphone** des adhérents à d'autres adhérents.
- Une appli **plus compliquée que Framadate** pour un adhérent sur téléphone.
- Un bot WhatsApp non officiel qui risquerait de faire bannir le numéro.

## 3. Acteurs et droits

| Acteur | Peut faire |
|---|---|
| **Adhérent** | Se connecter avec son numéro. Gérer les personnes de son compte. S'inscrire ou se désinscrire d'une sortie. Créer une sortie libre. Modifier ou supprimer **ses propres** sorties. Changer **l'horaire d'une sortie récurrente** pour la semaine concernée. Écrire dans les discussions. |
| **Administrateur** (déclaré par le secrétaire) | Tout ce que fait un adhérent, plus l'accès à la page d'administration. Lors de sa première connexion sur un appareil, il reçoit un **code par email** **[décidé]**, puisque les numéros sont visibles par tous dans WhatsApp. Il peut modifier ou supprimer **n'importe quelle** sortie et supprimer n'importe quel message. |
| **Secrétaire** | Tient la liste des adhérents et désigne les administrateurs, dans le tableau Google. Reçoit le rappel WhatsApp prêt à envoyer. |
| **Suppléants** | Reçoivent aussi le rappel WhatsApp prêt à envoyer. |
| **Automate** | Génère les sorties récurrentes, envoie le rappel du jeudi, envoie les annulations et purge les données anciennes. |

## 4. Écrans et parcours

### 4.1 Connexion (première fois)
1. L'adhérent saisit son **numéro de téléphone**.
2. Le numéro est comparé à la **liste des adhérents actifs** **[décidé]**, sans code SMS (le SMS est payant). Un numéro inconnu affiche « Contactez le secrétaire ».
3. L'appli **mémorise la connexion** sur l'appareil et ne la redemande plus.
4. Elle propose ensuite d'**installer l'appli** sur l'écran d'accueil, avec une aide spécifique pour iPhone et pour Android.

**Ouverture depuis un lien (mail, WhatsApp) [décidé] :**
- Sur **Android**, le lien ouvre en général directement l'appli installée. Sinon il ouvre la version web dans le navigateur, où l'adhérent est déjà connecté.
- Sur **iPhone et iPad**, le lien ouvre toujours la **version web** dans le navigateur, jamais l'appli installée, qui ne partage pas sa connexion. Quand la version web s'ouvre sans connexion, l'écran de connexion affiche d'abord un bandeau : « Vous avez installé l'appli ? Ouvrez-la depuis votre écran d'accueil. Sinon, saisissez votre numéro ci-dessous. »

**Lien vers un jour précis [décidé] :** un lien vers un jour (par exemple celui du samedi dans le rappel) ouvre ce jour. Si l'adhérent doit d'abord se connecter, il arrive sur ce jour juste après la connexion, et non sur l'accueil.

Les numéros sont normalisés : « 06 12… », « +33 6 12… » et « 0612… » sont reconnus comme le même numéro.

### 4.2 Personnes du compte (familles) **[décidé]**
- Un compte, c'est-à-dire un numéro, peut contenir **plusieurs personnes saisies librement**. Cela permet d'inscrire plusieurs personnes en une seule fois, en général des membres d'une même famille.
- Un adhérent **sans smartphone** est ajouté comme personne dans le compte d'un autre adhérent.
- Il n'y a **pas de foyer partagé** entre plusieurs numéros.
- La première personne proposée est le nom de l'adhérent tel qu'il figure dans la liste.

### 4.3 Le calendrier (écran principal)
Il reprend la mise en page de la capture d'inspiration :
- **Deux blocs** : « Cette semaine » et « Semaine prochaine », **du lundi au dimanche**.
- **Une carte par jour.** Les jours passés sont grisés mais restent consultables jusqu'à la fin de la semaine.
- **En haut de chaque carte :**
  - la date ;
  - la **météo** pour le **matin** et pour l'**après-midi** : un pictogramme, la température, la pluie en **mm** et le vent (voir 4.7) ;
  - le résumé « N sortie(s) · N inscription(s) ».
- **Un encadré par sortie du jour** (voir 4.4), trié par heure de rendez-vous. Replié, il montre le titre, l'heure, le point de rendez-vous, quelques pastilles d'inscrits et leur **nombre**, et le nombre de messages.
- **Bouton « + Créer une sortie »** (voir 4.5).
- Il n'y a **pas de bouton « Intéressé pour rouler »** **[décidé]**. Pour signaler qu'on roule, on crée une sortie avec le formulaire court ; les autres s'y inscrivent.

Sur téléphone, la vue du jour regroupe les sorties en « Matin » et « Après-midi » et affiche le nombre de personnes distinctes qui roulent ce jour-là **[choix du rédacteur]**.

Sur téléphone, les cartes s'affichent les unes sous les autres et l'appli ouvre directement sur le jour courant **[choix du rédacteur]**.

**Mises en page et thèmes à l'essai [décidé : à tester avant de choisir]**
Un bouton **🎨** dans l'en-tête permet à chacun de choisir, pour son appareil uniquement, une mise en page du calendrier et un thème. Le choix est mémorisé sur l'appareil. Par défaut, l'appli garde la mise en page **Classique** et le thème **Nuit** décrits ci-dessus.
- **Classique** : la grille des deux semaines (une carte par jour) ; sur téléphone, un jour à la fois avec les onglets de jours.
- **Frise** (horizontale) : les 14 jours en colonnes côte à côte, qu'on fait glisser du doigt, avec un repère entre les deux semaines. L'appli s'ouvre sur aujourd'hui, ou sur le jour visé par un lien. Sur téléphone, une colonne occupe presque tout l'écran et laisse voir le bord du jour suivant. Chaque jour à venir propose la météo heure par heure, dépliée pour aujourd'hui et repliée pour les autres jours.
- **Agenda** : une liste qui part d'aujourd'hui.
  - En tête, **« Mes prochaines sorties »** : les sorties à venir où l'une des personnes du compte est inscrite, avec un accès direct.
  - Chaque sortie commence par **son heure**, en gros, suivie du titre, du lieu, des distances et des inscrits.
  - Chaque jour donne sa météo résumée sur une ligne pour le matin et une pour l'après-midi ; aujourd'hui donne aussi la météo heure par heure.
  - Les jours sans sortie tiennent sur une ligne, avec « + Créer ».
  - Les jours passés de la quinzaine sont repliés sous « Jours passés ».
- **Thèmes** : **Nuit** (sombre, l'actuel), **Clair** (fond clair, accent vert, lisible en plein soleil) et **Forêt** (sombre aux tons verts). Le thème s'applique à toute l'appli.

Une fois les essais faits, le club pourra garder une seule mise en page et un seul thème, ou laisser le choix à chacun.

### 4.4 Une sortie
**Ce qui est affiché :**
- le **titre** (par exemple « Samedi matin – Cool ») ;
- l'heure et le **point de rendez-vous** ;
- le lieu ou le secteur de la sortie ;
- le **kilométrage** et le **dénivelé** prévus ;
- un badge **« Récurrente »** ou **« Proposée par Paul »** ;
- les **traces GPX** proposées **[décidé]**. Pour chacune, l'appli affiche :
  - le nom ;
  - la **distance** et le **dénivelé positif cumulé**, calculés automatiquement à partir de la trace ;
  - une **petite carte fixe, sans interaction**, qui montre le tracé. Sur téléphone, la trace tient sur une ligne et la carte s'ouvre au toucher ;
  - un bouton « Télécharger » ;
- la **liste complète des inscrits**, sur deux colonnes et par ordre alphabétique, pour faire l'appel au départ. Une personne inscrite par un autre compte est marquée, par exemple « Gérard (par Jo) ». Un bouton **« M'inscrire »** ou **« Me désinscrire »**, avec un choix des personnes du compte ;
- la **discussion** (voir 4.6), avec le nombre de messages.

**Ouverture et clôture des inscriptions :**
- On peut s'inscrire dès que la sortie existe et jusqu'à l'**heure du rendez-vous** **[choix du rédacteur]**.
- Il n'y a **pas de limite de places** **[choix du rédacteur]**.
- **Une même personne peut s'inscrire à plusieurs sorties du même créneau** **[décidé]**. Par exemple, quelqu'un qui accepte de rouler dans n'importe quel groupe s'inscrit aux 3 sorties du samedi matin. L'appli ne retire donc aucune inscription automatiquement.
- À terme, le club envisage de ne plus proposer de sortie par niveau, mais **un seul créneau le matin et un seul l'après-midi**. Les règles récurrentes le permettent déjà : il suffira de n'y mettre qu'une sortie.

**Modifier une sortie :**
- Le **créateur** et les **administrateurs** peuvent tout modifier et supprimer la sortie **[décidé]**.
- Pour une **sortie récurrente**, n'importe quel adhérent peut changer **l'horaire** de cette occurrence uniquement **[décidé]**. La modification s'affiche, par exemple « Horaire modifié par Paul ». Les inscrits voient un message automatique dans la discussion.

**Ajouter une trace GPX :**
- Le créateur et les administrateurs peuvent ajouter ou retirer des traces **[choix du rédacteur]**.
- Les autres adhérents peuvent proposer une trace en la joignant dans la discussion (voir 4.6) **[choix du rédacteur]**.

### 4.5 Créer une sortie (tout adhérent)
Le bouton « + Créer une sortie » d'un jour ouvre un **formulaire court** **[décidé]** :
- **Matin** ou **après-midi** : préremplit l'heure de rendez-vous (9h ou 14h par défaut, modifiable).
- Le **point de rendez-vous** par défaut du club est prérempli.
- Le **titre** est prérempli, par exemple « Sortie de Marie », et reste modifiable.
- **Qui s'inscrit** parmi les personnes du compte.
- Un lien **« Ajouter des détails »** déplie les champs facultatifs : lieu ou secteur, kilométrage, dénivelé, description, une ou plusieurs traces GPX.

Deux touchers suffisent donc pour publier une sortie. Si une sortie existe déjà sur le même créneau, le formulaire la signale et propose de la rejoindre plutôt que d'en créer une deuxième **[choix du rédacteur]**.

À la création, le créateur est **inscrit automatiquement** **[choix du rédacteur]**.

Une sortie libre est une sortie unique : **pas de groupes de niveau** et pas de récurrence **[décidé]**.

### 4.6 Discussion d'une sortie **[décidé]**
- C'est un fil de messages courts, en texte, propre à chaque sortie : remarques, contraintes, retards, et autres.
- Chaque message affiche le nom de la personne, la date et l'heure. On peut supprimer son propre message ; un administrateur peut supprimer n'importe quel message.
- Il est possible de **joindre une trace GPX** à un message **[choix du rédacteur]**.
- Le fil se met à jour à l'ouverture de la sortie, puis toutes les 30 secondes tant qu'elle reste ouverte. Il n'y a **pas de notification sur le téléphone** **[choix du rédacteur]**.
- Des messages automatiques signalent les changements d'horaire et les annulations.

### 4.7 Météo **[décidé]**
- Les prévisions concernent la **commune du club**, paramétrée par les administrateurs.
- **Pour chaque jour affiché :** une synthèse du **matin** (8 h–12 h) et une de l'**après-midi** (13 h–18 h) **[choix du rédacteur pour les plages]**. Chaque synthèse donne :
  - un pictogramme et la température ;
  - la **quantité de pluie en mm** **[décidé]**, cumulée sur la plage ;
  - le **vent en km/h** et son **orientation** **[décidé]** : le secteur d'où il vient (N, NE, E, SE, S, SO, O, NO) et une flèche dans le sens où il souffle. L'orientation retenue est celle de l'heure où le vent est le plus fort.
- **Pour le jour courant :** la météo **heure par heure** (de 6 h à 21 h) : pictogramme, température, pluie en mm, vent en km/h et orientation. En mise en page Frise, elle est aussi proposée pour les autres jours à venir (voir 4.3).
- Au-delà de l'horizon de prévision fiable, l'appli affiche « Prévision indisponible ».
- **Pas de météo pour les jours passés** **[décidé]**.

### 4.8 Page d'administration (administrateurs uniquement)

**Sorties récurrentes** **[décidé]**
- Créer, modifier, suspendre ou supprimer une **règle récurrente**. Une règle comprend :
  - le jour de la semaine et l'heure de rendez-vous ;
  - le point de rendez-vous ;
  - la **fréquence** : toutes les semaines, toutes les 2 semaines, etc., avec une date de départ ;
  - la **liste des sorties générées**, chacune avec son titre et éventuellement un kilométrage, un dénivelé, une description ou une trace par défaut.
- Règles initiales **[décidé]**, chacune avec **un seul créneau** (une sortie générée) et le rendez-vous à **PDL**, le point de rendez-vous du club :
  - **Samedi matin**, 9 h, chaque semaine ;
  - **Samedi après-midi**, 14 h, chaque semaine ;
  - **Dimanche matin**, 9 h, chaque semaine.
- Une règle peut toujours générer plusieurs sorties (par exemple une par groupe de niveau) si le club le souhaite plus tard.
- Les sorties issues des règles apparaissent automatiquement **au plus tard au début de la « semaine prochaine »** affichée, c'est-à-dire avec environ 2 semaines d'avance.
- La création et la modification d'une règle se font sur un **écran dédié**, comme la création d'une sortie, et non sous la liste des règles **[décidé]**. Enregistrer ou annuler ramène à la liste.
- Modifier une règle ne change que les sorties **qui n'ont pas encore été générées**. Les sorties déjà visibles se modifient une par une **[choix du rédacteur]**.

**Annuler une sortie ou fermer une période**
- Un administrateur peut **annuler une sortie** précise ou **fermer une période** (vacances, par exemple), pour toutes les règles ou pour une seule.
- Une sortie annulée qui avait déjà été générée passe en **« Annulée »**. Elle reste visible, mais les inscriptions sont bloquées. Ensuite :
  - un **mail** part vers la liste de diffusion **[décidé]** ;
  - un **message WhatsApp d'annulation** prêt à poster est envoyé au secrétaire et aux suppléants **[décidé]** ;
  - un message automatique est ajouté à la discussion.
- Si un **adhérent supprime sa propre sortie libre**, celle-ci passe en « Annulée » avec un message dans la discussion. Aucun mail n'est envoyé **[choix du rédacteur]**.

**Paramètres généraux**
- La commune du club (pour la météo).
- Le point de rendez-vous par défaut.
- Le jour et l'heure du rappel hebdomadaire. Par défaut : **le jeudi à 18 h**.
- Les destinataires du rappel WhatsApp et l'email qui reçoit les alertes en cas d'erreur.
- Les **modèles de textes** : rappel par mail, rappel WhatsApp, annulation par mail, annulation WhatsApp.
- La durée de conservation des sorties : **1 mois** par défaut **[décidé]** (voir 5).

**Statistiques [décidé]**
Un onglet « Statistiques » donne, pour une **année civile** au choix (l'année en cours par défaut) :
- le nombre de **sorties proposées**, et à part le nombre de sorties annulées ;
- le nombre **total de participants**, c'est-à-dire d'inscriptions (une personne venue à 10 sorties compte 10 fois), et la moyenne par sortie ;
- les **participants et les sorties par mois** ;
- les **participants par demi-journée de la semaine** : pour chaque jour du lundi au dimanche, le matin (départ avant 13 h) et l'après-midi.

Seules les sorties déjà parties sont comptées ; les sorties annulées ne le sont pas. Les chiffres restent disponibles après la suppression des sorties (voir 5). *Compter des personnes distinctes sur l'année demanderait de conserver qui a participé, ce qui irait contre la conservation d'un mois.*

**La liste des adhérents** et la désignation des administrateurs restent dans le **tableau Google** tenu par le secrétaire **[choix du rédacteur]**. Une gestion des adhérents dans l'appli serait une évolution ultérieure. Le club peut avoir **plusieurs administrateurs** : il suffit de cocher la case « admin » et de renseigner l'**email** de chacun, qui reçoit sur sa propre adresse le code d'accès à l'administration.

### 4.9 Rappel hebdomadaire **[décidé]**
Chaque jeudi à l'heure paramétrée, sans intervention :
- **Mail** à la **liste de diffusion du club**, qui est un Google Groupe à adresse unique. C'est un rappel avec le **lien de l'appli** et des **liens directs vers le samedi et le dimanche qui suivent** **[décidé]**.
- **Ordre du message [décidé]** : le rappel, mail comme WhatsApp, invite **d'abord à ouvrir l'appli installée** depuis l'écran d'accueil, **puis** donne le lien vers la version web pour ceux qui ne l'ont pas installée. Le modèle par défaut :
  > Les sorties du week-end sont ouvertes !
  > 🚵 Samedi : {{lien_samedi}}
  > 🚵 Dimanche : {{lien_dimanche}}
  > 📱 Vous avez l'appli : ouvrez-la depuis votre écran d'accueil.
  > 🌐 Pas encore installée : {{lien}}
- `{{lien_samedi}}` et `{{lien_dimanche}}` mènent à la page du premier samedi et du premier dimanche à partir du jour d'envoi (un rappel envoyé un samedi désigne ce samedi-là). Les administrateurs les placent où ils veulent dans les textes.
- La même consigne s'applique aux messages d'annulation.
- **Mail au secrétaire et aux suppléants** contenant un bouton qui ouvre WhatsApp avec le rappel déjà rédigé. Il suffit de choisir le groupe et d'appuyer sur Envoyer.
- Si l'envoi échoue, les destinataires des alertes sont prévenus.

## 5. Données personnelles (RGPD)
- **Données traitées :**
  - le téléphone, le nom et éventuellement l'email des adhérents, déjà détenus par le club ;
  - les noms saisis pour les personnes ;
  - les inscriptions, les intérêts, les messages de discussion ;
  - les traces GPX, qui ne contiennent normalement que des parcours. Un avertissement est affiché à l'envoi : « n'envoyez pas une trace qui part de votre domicile ».
- **Visibilité :**
  - les adhérents connectés voient les noms, les inscriptions et les messages ;
  - **les numéros de téléphone ne sont jamais affichés** ;
  - l'appli n'est pas accessible sans connexion.
- **Conservation :**
  - les sorties, inscriptions, intérêts, messages et traces de plus d'**1 mois** sont supprimés automatiquement (durée paramétrable) **[décidé]** ;
  - avant suppression, chaque sortie laisse un **bilan anonyme** pour les statistiques : sa date, son heure, si elle a été annulée et son nombre d'inscrits, sans aucun nom ni numéro. Ce bilan est conservé ;
  - un adhérent désactivé ne peut plus se connecter, et son compte est purgé.
- **Information :**
  - une page « Confidentialité » dans l'appli, avec un contact pour exercer ses droits ;
  - une phrase à ajouter dans le bulletin d'adhésion.
- **À la charge du club :**
  - tenir un registre des traitements d'une page, sur le modèle de la CNIL ;
  - activer la double authentification sur le compte Google du club.

## 6. Exigences générales
- **Mobile d'abord** : en français, avec de grands boutons, dans un **thème sombre** inspiré de la capture **[choix du rédacteur]**. Deux autres thèmes, Clair et Forêt, sont proposés à l'essai (voir 4.3).
- **Installable** comme une appli sur Android et iPhone.
- **Coût : 0 €.**
- **Maintenance minimale** : aucun serveur à surveiller.
- **Volumétrie** : quelques dizaines à quelques centaines d'adhérents, et quelques dizaines de sorties par mois.

## 7. Questions encore ouvertes (peuvent attendre le paramétrage)
1. ~~Les titres des 3 sorties du samedi matin.~~ Tranché : un seul créneau par règle (voir 4.8).
2. La commune du club (pour la météo). Le point de rendez-vous par défaut est **PDL**.
3. Les textes actuels du mail et du message WhatsApp, pour servir de modèles.
