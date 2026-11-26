# Appli de sorties du club de VTT : spécifications fonctionnelles

*Version 0.4, du 18/11/2026. Intègre les évolutions demandées pendant la réalisation du prototype : liens directs vers le week-end, météo en mm et km/h, conservation d'un mois, statistiques, mises en page et thèmes à l'essai ; puis rappels par récurrence, partage sur WhatsApp, nom et logo du club, thèmes contrastés et espacement « Aéré », mise à jour automatique de l'appli installée. Remplace la version 0.3.*

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
| **Gestionnaire de la remorque** (email désigné par un administrateur) **[décidé]** | Tout ce que fait un adhérent, plus : valider ou refuser les demandes de remorque, bloquer la remorque (utilisation par le club, non disponible). Comme un administrateur, il confirme son identité par un **code par email** une fois par appareil ; il n'a pas accès à l'administration. |
| **Secrétaire** | Tient la liste des adhérents et désigne les administrateurs, dans le tableau Google. Reçoit le rappel WhatsApp prêt à envoyer. |
| **Suppléants** | Reçoivent aussi le rappel WhatsApp prêt à envoyer. |
| **Automate** | Génère les sorties récurrentes, envoie les rappels (par récurrence ou groupés), envoie les annulations et purge les données anciennes. |

## 4. Écrans et parcours

### 4.1 Connexion (première fois)
1. L'adhérent saisit son **numéro de téléphone**.
2. Le numéro est comparé à la **liste des adhérents actifs** **[décidé]**, sans code SMS (le SMS est payant). Un numéro inconnu affiche « Contactez le secrétaire ».
3. L'appli **mémorise la connexion** sur l'appareil et ne la redemande plus.
4. Elle propose ensuite d'**installer l'appli** sur l'écran d'accueil, avec une aide spécifique pour iPhone et pour Android. L'icône de l'appli installée est le **logo du club** ; la page de connexion l'affiche aussi, au-dessus du nom de l'association.

**Mises à jour de l'appli installée [décidé]** : une nouvelle version s'installe d'elle-même. L'appli la cherche à chaque ouverture et à chaque retour au premier plan (sur iPhone, rouvrir l'appli depuis l'écran d'accueil ne la recharge pas toujours), puis se recharge pour l'afficher. Si une saisie est en cours, le rechargement attend que l'adhérent quitte l'appli. Le **numéro de version** figure en pied de page.

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
- **Un encadré par sortie du jour** (voir 4.4), trié par heure de rendez-vous. Replié, il montre le titre, l'heure, le point de rendez-vous, le **nombre** d'inscrits (sans leurs noms, pour rester léger avec 40 inscrits) **[décidé]**, et le nombre de messages. Dans toutes les mises en page.
- **Bouton « + Créer une sortie »** (voir 4.5).
- Il n'y a **pas de bouton « Intéressé pour rouler »** **[décidé]**. Pour signaler qu'on roule, on crée une sortie avec le formulaire court ; les autres s'y inscrivent.

Sur téléphone, la vue du jour regroupe les sorties en « Matin » et « Après-midi » et affiche le nombre de personnes distinctes qui roulent ce jour-là **[choix du rédacteur]**.

Sur téléphone, les cartes s'affichent les unes sous les autres et l'appli ouvre directement sur le jour courant **[choix du rédacteur]**.

**Mises en page et thèmes à l'essai [décidé : à tester avant de choisir]**
Un bouton **🎨** dans l'en-tête permet à chacun de choisir, pour son appareil uniquement, une mise en page du calendrier, un thème et un espacement. Le choix est mémorisé sur l'appareil. Par défaut, l'appli s'ouvre en mise en page **Agenda**, avec le thème **Club** (aux couleurs du logo) et l'espacement **Compact** **[décidé]** ; les autres restent au choix dans 🎨. Un choix déjà fait sur un appareil est gardé.
- **Classique** : la grille des deux semaines (une carte par jour) ; sur téléphone, un jour à la fois avec les onglets de jours.
- **Frise** (horizontale) : les 14 jours en colonnes côte à côte, qu'on fait glisser du doigt, avec un repère entre les deux semaines. L'appli s'ouvre sur aujourd'hui, ou sur le jour visé par un lien. Sur téléphone, une colonne occupe presque tout l'écran et laisse voir le bord du jour suivant. Chaque jour à venir propose la météo heure par heure, dépliée pour aujourd'hui et repliée pour les autres jours.
- **Agenda** : une liste qui part d'aujourd'hui.
  - En tête, **« Mes prochaines sorties »** : les sorties à venir où l'une des personnes du compte est inscrite, avec un accès direct.
  - Chaque sortie commence par **son heure**, en gros, suivie du titre, du lieu, des distances et des inscrits.
  - Chaque jour donne sa météo résumée sur une ligne pour le matin et une pour l'après-midi. Comme en Frise, chaque jour à venir, avec ou sans sortie, propose aussi la météo **heure par heure** (« ⏱ Heure par heure »), dépliée pour aujourd'hui et à déplier pour les autres jours **[décidé]**.
  - Les jours sans sortie ont le même cadre que les autres jours, plus court : « Aucune sortie », « + Créer » et la météo du matin et de l'après-midi (utile pour décaler une sortie).
  - Les jours passés de la quinzaine sont repliés sous « Jours passés ».
- **Thèmes** (pour toute l'appli) :
  - **Nuit** : sombre, l'actuel ;
  - **Clair** : fond gris clair et accent bleu, lisible en plein soleil (sans vert, à la demande du club) ;
  - **Contraste** : fond noir, texte blanc, bordures marquées, le plus lisible en extérieur ;
  - **Club** : fond clair et bandeau rouge, aux couleurs du logo ;
  - **Ardoise** : sombre bleu-gris, cartes nettement plus claires que le fond, accent turquoise.
  Le thème Forêt a été retiré ; un appareil qui l'avait choisi revient au thème Nuit.
- **Espacement** : **Compact** (l'actuel, le plus d'informations à l'écran) ou **Aéré**, qui s'applique aux trois mises en page :
  - en Agenda, chaque jour commence par un bandeau (date en plus grand, météo), les sorties sont séparées par un filet au lieu d'être encadrées, et les jours sont plus espacés ; sur PC, l'agenda occupe toute la largeur, la date et la météo à gauche, les sorties à droite ;
  - en Classique, les sections « Matin » et « Après-midi » sont soulignées et les encadrés des sorties plus grands et plus espacés.

Une fois les essais faits, le club pourra garder une seule mise en page et un seul thème, ou laisser le choix à chacun.

### 4.4 Une sortie
**Ce qui est affiché :**
- le **titre** (par exemple « Samedi matin – Cool ») ;
- l'heure et le **point de rendez-vous** ; pour une sortie récurrente à **plusieurs points de départ**, chaque départ avec son heure (« 📍 09:00 PDL · 09:30 Parking gare ») ;
- le lieu ou le secteur de la sortie ;
- le **kilométrage** et le **dénivelé** prévus ;
- un badge **« Récurrente »** ou **« Proposée par Paul »** ;
- les **traces GPX** proposées **[décidé]**. Pour chacune, l'appli affiche :
  - le nom ;
  - la **distance** et le **dénivelé positif cumulé**, calculés automatiquement à partir de la trace ;
  - une **petite carte fixe, sans interaction**, qui montre le tracé. Sur téléphone, la trace tient sur une ligne et la carte s'ouvre au toucher ;
  - un bouton « Télécharger » ;
- la **liste complète des inscrits**, sur deux colonnes et par ordre alphabétique, pour faire l'appel au départ. Le nom de qui a fait l'inscription n'est pas affiché **[décidé]**. Un bouton **« M'inscrire »** ou **« Me désinscrire »**, avec un choix des personnes du compte ;
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
- **Tout adhérent inscrit** à la sortie (une des personnes de son compte), quel que soit son type (récurrente comprise), peut **proposer une ou plusieurs traces** depuis la fiche, au moment de son inscription ou après (bouton « 🗺 Proposer une trace ») **[décidé]**. Le créateur et les administrateurs le peuvent aussi.
- Chaque trace proposée indique **qui l'a proposée**. La retirent : son auteur, le créateur de la sortie ou un administrateur.
- Si l'auteur se désinscrit, ses traces restent sur la sortie. Quand la sortie n'a **plus aucun inscrit**, les traces proposées pour elle sont **supprimées** (fichiers compris), avec un message dans la discussion **[décidé]**. La trace par défaut d'une récurrence n'est pas concernée.
- Tout adhérent peut aussi joindre une trace à un message de la discussion (voir 4.6) **[choix du rédacteur]**.

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

**Prévenir le club sur WhatsApp [décidé]** : juste après « Publier », la fiche de la sortie affiche un encart « Prévenir le club » avec un bouton **« 📲 Partager sur WhatsApp »**. Un toucher ouvre WhatsApp avec un message prêt, que l'adhérent envoie lui-même au groupe du club. Son contenu est un **modèle réglé par l'admin** (Admin → Messages), sans nouvelle version de l'appli ; par défaut :
> Nouvelle sortie : Boucle des étangs
> Vendredi 20 novembre 13:30 – PDL
> 35 km · 450 m D+
> Ensoleillé, 8–11°, pluie 0 mm, vent 10 km/h NE
> Inscriptions : lien vers la sortie

Repères du modèle : `{{titre}}`, `{{date}}`, `{{heure}}`, `{{point_rdv}}`, `{{distances}}`, `{{meteo}}`, `{{lien_sortie}}`, `{{createur}}`, `{{lien}}`. Une ligne dont tous les repères sont vides disparaît.

**Prévenir de l'annulation sur WhatsApp [décidé]** : de même, quand un adhérent annule **sa propre** sortie libre, la fiche affiche un encart « Prévenir le club de l'annulation » avec un bouton **« 📲 Prévenir de l'annulation sur WhatsApp »**, et le message prêt, d'après un modèle réglé par l'admin (Admin → Messages) ; par défaut :
> Sortie annulée : Boucle des étangs
> Vendredi 20 novembre 13:30 – PDL
> Motif : Pluie annoncée
> Détails : lien vers la sortie

Repères : ceux du partage (sans `{{meteo}}` ni `{{distances}}`), plus `{{motif}}` ; la ligne « Motif : » disparaît sans motif. Le bouton reste ensuite sur la fiche de la sortie annulée, pour son créateur. Un administrateur qui annule la sortie d'un autre ne le voit pas : le club est alors prévenu automatiquement par mail et WhatsApp (§4.8).

La météo est celle de la demi-journée de la sortie, déjà connue du téléphone (pas d'appel au serveur). Le bouton reste ensuite sur la fiche, pour le créateur (et les administrateurs), tant que la sortie n'est pas annulée. Les sorties récurrentes n'en ont pas : elles ont leurs rappels (§4.9).

### 4.6 Discussion d'une sortie **[décidé]**
- C'est un fil de messages courts, en texte, propre à chaque sortie : remarques, contraintes, retards, et autres.
- Chaque message affiche le nom de la personne, la date et l'heure. On peut supprimer son propre message ; un administrateur peut supprimer n'importe quel message.
- Il est possible de **joindre une trace GPX** à un message **[choix du rédacteur]**.
- Le fil se met à jour à l'ouverture de la sortie, puis toutes les 30 secondes tant qu'elle reste ouverte ; la **liste des inscrits** aussi, pour voir les inscriptions faites depuis un autre appareil **[décidé]**. Le calendrier, quelle que soit sa mise en page, se met à jour de la même façon tant qu'il est à l'écran, sans bouger l'affichage **[décidé]**. Il n'y a **pas de notification sur le téléphone** **[choix du rédacteur]**.
- Des messages automatiques signalent les changements d'horaire et les annulations.

### 4.7 Météo **[décidé]**
- Les prévisions concernent la **commune du club**, paramétrée par les administrateurs.
- **Pour chaque jour affiché :** une synthèse du **matin** (8 h–12 h) et une de l'**après-midi** (13 h–18 h) **[choix du rédacteur pour les plages]**. Chaque synthèse donne :
  - un pictogramme et la température ;
  - la **quantité de pluie en mm** **[décidé]**, cumulée sur la plage, **en gras dès qu'elle dépasse 0 mm** **[décidé]** (partout où la pluie est affichée, heure par heure comprise) ;
  - le **vent en km/h** et son **orientation** **[décidé]** : le secteur d'où il vient (N, NE, E, SE, S, SO, O, NO) et une flèche dans le sens où il souffle. L'orientation retenue est celle de l'heure où le vent est le plus fort.
- **Heure par heure :** la météo **heure par heure** (de 6 h à 21 h) : pictogramme, température, pluie en mm, vent en km/h et orientation. Dans toutes les mises en page (Classique sur PC et sur téléphone, Frise, Agenda), chaque jour à venir la propose à déplier (« ⏱ Heure par heure »), dépliée pour aujourd'hui **[décidé]**.
- Au-delà de l'horizon de prévision fiable, l'appli affiche « Prévision indisponible ».
- **Pas de météo pour les jours passés** **[décidé]**.

### 4.8 Page d'administration (administrateurs uniquement)

Les onglets sont, dans cet ordre **[décidé]** : **Paramètres** (ouvert par défaut), **Récurrences**, **Rappels**, **Messages**, **Fermetures**, **Statistiques**.

Dans l'onglet **Messages**, chaque texte réglable (partage d'une nouvelle sortie, annulation par l'adhérent, objet et texte du mail d'annulation automatique, message WhatsApp d'annulation automatique) a son propre cadre, avec un titre en gras au-dessus de sa zone de saisie et, en dessous, la liste complète de ses repères (`{{titre}}`, `{{date}}`, etc.) **[décidé]**.

**Sorties récurrentes** **[décidé]**
- Créer, modifier, suspendre ou supprimer une **règle récurrente**. Une règle comprend :
  - le jour de la semaine et l'heure de rendez-vous ;
  - le point de rendez-vous ;
  - éventuellement d'**autres points de départ**, chacun avec son heure (voir ci-dessous) ;
  - la **fréquence** : toutes les semaines, toutes les 2 semaines, etc., avec une date de départ ;
  - la **liste des sorties générées**, chacune avec son titre et éventuellement un kilométrage, un dénivelé, une description ou une trace par défaut.
- Règles initiales **[décidé]**, chacune avec **un seul créneau** (une sortie générée) et le rendez-vous à **PDL**, le point de rendez-vous du club :
  - **Samedi matin**, 9 h, chaque semaine ;
  - **Samedi après-midi**, 14 h, chaque semaine ;
  - **Dimanche matin**, 9 h, chaque semaine.
- Une règle peut toujours générer plusieurs sorties (par exemple une par groupe de niveau) si le club le souhaite plus tard.
- **Plusieurs points de départ [décidé]** : une sortie récurrente peut partir de plusieurs endroits à des heures différentes (ex. 09:00 PDL, 09:30 Parking gare). Elle reste **une seule sortie** : une fiche, une discussion, une liste complète des inscrits. Détail : `docs/superpowers/specs/2026-11-20-departs-multiples-design.md`.
  - Dans l'écran de la récurrence, l'heure et le point de rendez-vous sont ceux du **premier départ** ; une zone « Autres points de départ » en prend un par ligne (« 09:30 Parking gare »). Les sorties déjà générées gardent leurs départs, comme leur heure.
  - Sur la fiche, l'adhérent choisit **« Mon départ »** (présélection : son départ actuel, sinon le premier). Les personnes d'un compte inscrites ensemble partent du **même départ** ; on peut ensuite en changer (« Changer de départ » pour un compte d'une personne).
  - La liste des inscrits donne le **total**, puis les inscrits **regroupés par départ** avec un sous-total, par ordre alphabétique.
  - Les inscriptions ferment à l'heure de la sortie (son premier départ). L'heure de chaque départ se change séparément (✎ à côté de chacun).
  - Dans le calendrier (toutes mises en page), la sortie donne le **total des inscrits**, puis **une colonne par départ** (heure, lieu, nombre d'inscrits) **[décidé]** ; « Mes prochaines sorties » donne l'heure et le lieu de son départ.
  - Réservé aux sorties récurrentes pour l'instant (pas aux sorties libres).
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
- Le **nom de l'association** **[décidé]** : il s'affiche dans l'onglet du navigateur, en haut à gauche du bandeau, et comme nom de l'appli installée sur le téléphone (court de préférence : une douzaine de caractères tiennent sous l'icône). Un changement vaut sans nouvelle version de l'appli ; une appli déjà installée garde le nom qu'elle avait à l'installation. Le nom est écrit d'une seule couleur, précédé du **logo du club** (bandeau et page de connexion). Le logo sert aussi d'icône à l'appli installée ; c'est une image du site, tirée du logo vectoriel du club (`docs/logo/corbas-vtt.svg`, voir INSTALL.md). Le changer demande une nouvelle version du site.
- La commune du club (pour la météo).
- Le point de rendez-vous par défaut.
- Les destinataires du rappel WhatsApp et l'email qui reçoit les alertes en cas d'erreur.
- Les **modèles de textes** des annulations (mail et WhatsApp). Les textes des rappels se règlent avec chaque rappel (voir 4.9).
- La durée de conservation des sorties : **1 mois** par défaut **[décidé]** (voir 5).

**Statistiques [décidé]**
Un onglet « Statistiques » donne, pour une **année civile** au choix (l'année en cours par défaut) :
- le nombre de **sorties proposées**, et à part le nombre de sorties annulées ;
- le nombre **total de participants**, c'est-à-dire d'inscriptions (une personne venue à 10 sorties compte 10 fois), et la moyenne par sortie ;
- les **participants et les sorties par mois** ;
- les **participants par demi-journée de la semaine** : pour chaque jour du lundi au dimanche, le matin (départ avant 13 h) et l'après-midi.

Seules les sorties déjà parties sont comptées ; les sorties annulées ne le sont pas. Les chiffres restent disponibles après la suppression des sorties (voir 5). *Compter des personnes distinctes sur l'année demanderait de conserver qui a participé, ce qui irait contre la conservation d'un mois.*

**La liste des adhérents** et la désignation des administrateurs restent dans le **tableau Google** tenu par le secrétaire **[choix du rédacteur]**. Une gestion des adhérents dans l'appli serait une évolution ultérieure. Le club peut avoir **plusieurs administrateurs** : il suffit de cocher la case « admin » et de renseigner l'**email** de chacun, qui reçoit sur sa propre adresse le code d'accès à l'administration.

### 4.9 Rappels **[décidé]**
Le rappel unique du jeudi est remplacé par des rappels réglés **par récurrence**, et par des **rappels groupés**. Détail : `docs/superpowers/specs/2026-11-16-rappels-par-recurrence-design.md`.

- **Rappel individuel** : dans l'écran de chaque récurrence, l'admin choisit s'il y a un rappel, son **jour** et son **heure** d'envoi, ses **canaux** (mail à la liste, WhatsApp, ou les deux), son **objet** et son **texte**. Par défaut : 2 jours avant la sortie, à 18 h, par mail et WhatsApp.
- **Rappels groupés** (onglet Admin « Rappels ») : un rappel nommé (ex. « Week-end ») annonce en un seul message les prochaines sorties de plusieurs récurrences, avec ses propres jour, heure, canaux et texte. Il **remplace les rappels individuels** des récurrences qu'il couvre. Une récurrence n'appartient qu'à un rappel groupé ; le désactiver ou le supprimer rend leur rappel individuel à ses récurrences.
- **Plusieurs départs** : la ligne d'une telle sortie les annonce tous, « (09:00 PDL · 09:30 Parking gare) » ; repère `{{departs}}`.
- **Sorties annoncées** : pour chaque récurrence couverte, sa prochaine date dans les 7 jours qui suivent l'envoi, sans les sorties annulées. Sans sortie à annoncer, rien ne part. Dans le message, une ligne vide précède chaque sortie annoncée et suit son lien, quel que soit le texte réglé (jamais deux lignes vides de suite). Le mail à la liste est mis en forme : texte plus grand, **date et heure de chaque sortie en plus gros**, un lien court « Voir la sortie et s'inscrire » sur la ligne du 👉, et le lien de l'appli affiché « Application <nom de l'association> » ; une version en texte brut l'accompagne pour les messageries qui n'affichent pas la mise en forme **[décidé]**.
- **Expéditeur** : les mails portent le **nom de l'association** comme nom d'expéditeur ; l'adresse reste celle du compte Google du club **[décidé]**.
- **Contenu par défaut** : chaque sortie annoncée avec la **météo prévue** pour sa demi-journée (pictogramme, état du ciel en mots, températures, pluie en mm, vent en km/h et secteur) et le **lien direct vers la sortie**, où l'on s'inscrit :
  > Les inscriptions sont ouvertes !
  > 🚵 Samedi 21 novembre 09:00 – Samedi matin (PDL)
  >    ☀️ Ensoleillé, 2–9°, pluie 0 mm, vent 12 km/h NE
  >    👉 lien vers la sortie
  > 📱 Vous avez l'appli : ouvrez-la depuis votre écran d'accueil.
  > 🌐 Pas encore installée : {{lien}}
- **Ordre du message [décidé]** : le message invite d'abord à ouvrir l'appli installée, puis donne le lien de la version web. La même consigne s'applique aux messages d'annulation.
- **« Envoyer maintenant »** sur chaque rappel l'envoie tout de suite, même désactivé ou couvert par un groupe (tests, démonstrations).
- **Canal WhatsApp** : un mail au secrétaire et aux suppléants contient un bouton qui ouvre WhatsApp avec le message déjà rédigé ; il suffit de choisir le groupe et d'appuyer sur Envoyer. Le message a la même présentation que le mail, sans pictogrammes : date et heure de chaque sortie en gras, « Voir la sortie et s'inscrire : » suivi du lien, mêmes lignes vides **[décidé]**.
- **Liens courts [décidé]** : dans tous les messages (rappels, partage et annulation sur WhatsApp), le lien d'une sortie est court : l'adresse de l'appli suivie de `#/s/` et d'un code de 6 caractères. Les anciens liens restent valables ; une sortie qui n'est plus au calendrier affiche « Cette sortie n'est plus au calendrier ».
- **Pas d'emojis sur WhatsApp [décidé]** : ils s'affichent en caractères inconnus chez certains. Tout message destiné à WhatsApp (rappels, annulations, partage d'une sortie) en est débarrassé automatiquement, y compris ceux saisis dans les textes ; les mails à la liste les gardent.
- **Mise en service** : l'ancien rappel du jeudi devient le rappel groupé « Week-end » (récurrences du samedi et du dimanche, mêmes jour et heure).
- **Doubles annonces** : si l'admin modifie les rappels en cours de semaine, une sortie peut être annoncée deux fois ; accepté, car cela ne suit qu'une modification.
- Si l'envoi échoue, les destinataires des alertes sont prévenus.

### 4.10 Réservation de la remorque **[décidé]**
Le club prête sa remorque à vélos. L'administrateur ouvre ou ferme la page (Paramètres : case « Proposer la réservation de la remorque ») et désigne les gestionnaires par leur email.
- **Bouton « 🚚 Remorque »** dans le bandeau quand la page est ouverte. Pour un gestionnaire, une pastille orange donne le nombre de demandes en attente.
- **Calendrier** mois par mois, sans limite dans le temps, une ligne par semaine du lundi au dimanche. Couleurs (palette contrastée) : libre ; **demandée** orange ; **réservée** rouge ; **bloquée** gris foncé avec cadenas. Aujourd'hui est entouré. Toucher un jour pris affiche sa période (le nom du demandeur et le commentaire ne sont visibles que de lui et des gestionnaires) ; toucher deux jours libres prépare la demande (début puis fin).
- **Demande** (du, au inclus, pour quoi faire) : refusée si elle chevauche une demande en attente, une réservation ou un blocage, ou si elle commence avant aujourd'hui. Les gestionnaires sont prévenus par email. « Mes demandes » liste les demandes et leur état ; une demande en attente ou une réservation à venir peut être annulée (gestionnaires prévenus).
- **Gestionnaire** : « À valider » (Valider / Refuser avec motif facultatif, le demandeur est prévenu par email s'il a une adresse), « Bloquer la remorque » (période, motif « utilisation par le club » ou « non disponible ») : un blocage est refusé sur une réservation ou un autre blocage, et refuse les demandes en attente qu'il recouvre (demandeurs prévenus). « Blocages en cours » permet de débloquer.
- **Aucune limite** de durée ni de délai pour l'instant ; pas de demi-journées.
- **Statistiques** (Admin → Statistiques, par année, pour l'assemblée générale) : réservations validées, jours de prêt, adhérents différents, demandes refusées et annulées, jours bloqués (club / indisponible), jours de prêt par mois.
- **Données personnelles** : passé la durée de conservation, une réservation perd le nom, le numéro et le commentaire ; dates et état restent pour les statistiques.

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
- **Mobile d'abord** : en français, avec de grands boutons, dans un **thème sombre** inspiré de la capture **[choix du rédacteur]**. D'autres thèmes (Clair, Contraste, Club, Ardoise) et un espacement « Aéré » sont proposés à l'essai (voir 4.3).
- **Installable** comme une appli sur Android et iPhone.
- **Coût : 0 €.**
- **Maintenance minimale** : aucun serveur à surveiller.
- **Volumétrie** : quelques dizaines à quelques centaines d'adhérents, et quelques dizaines de sorties par mois.

## 7. Questions encore ouvertes (peuvent attendre le paramétrage)
1. ~~Les titres des 3 sorties du samedi matin.~~ Tranché : un seul créneau par règle (voir 4.8).
2. La commune du club (pour la météo). Le point de rendez-vous par défaut est **PDL**.
3. Les textes actuels du mail et du message WhatsApp, pour servir de modèles.
