# Démonstration au CA : scénario (environ 10 minutes)

**Matériel :** votre téléphone (appli installée), un PC branché au vidéoprojecteur, votre boîte mail et WhatsApp ouverts sur le téléphone.

**La veille ou le matin même :** dans l'éditeur Apps Script, exécuter `chargerDonneesDemo` pour que les sorties et les inscriptions correspondent à la semaine en cours. Ensuite, se reconnecter sur le téléphone et sur le PC : le rechargement efface les sessions.

## Le constat (1 min)

Aujourd'hui, le secrétaire passe environ 30 minutes chaque jeudi. Il vide ou recrée 3 Framadate, met à jour le mail et le message WhatsApp, puis les envoie. S'il est absent, rien ne part.

## Déroulé

| # | Écran | Ce qu'on montre | Message à faire passer |
|---|---|---|---|
| 1 | Téléphone | Ouvrir l'appli depuis l'écran d'accueil | Elle s'installe comme une appli, gratuitement, sans passer par un store. |
| 2 | Téléphone | Le calendrier : le samedi chargé, avec 4 sorties et 39 personnes | On voit d'un coup d'œil qui roule et dans quel groupe. |
| 3 | Téléphone | La météo du matin et de l'après-midi, puis heure par heure aujourd'hui | Ce sont les vraies prévisions pour la commune du club. |
| 4 | Téléphone | Ouvrir **Inter** : la liste des inscrits, la trace GPX, la carte | La liste alphabétique sert à faire l'appel au départ. Distance et dénivelé sont calculés depuis le GPX. |
| 5 | Téléphone | S'inscrire avec Léo, un membre de la famille | Un seul geste pour toute la famille, ou pour un adhérent sans smartphone. |
| 6 | Téléphone | Écrire « J'apporte une chambre à air » dans la discussion | Chaque sortie a sa discussion : retards, contraintes, matériel. |
| 7 | Téléphone | **+ Créer une sortie**, après-midi, puis Publier | Deux touchers suffisent pour proposer de rouler. Si une sortie existe déjà sur ce créneau, l'appli propose de la rejoindre. |
| 8 | PC | Se connecter en tant que Ben (06 00 00 00 02) et changer l'heure de Cool | N'importe quel adhérent peut décaler l'horaire d'une sortie récurrente. Le message apparaît dans la discussion sur le téléphone. |
| 9 | Téléphone | **⚙ Admin** → recevoir le code par mail, le saisir | L'administration est protégée par un code envoyé par email. |
| 10 | Téléphone | **Messages → Envoyer le rappel maintenant** | Habituellement, cela part tout seul le jeudi à 18 h. |
| 11 | Téléphone | Ouvrir les 2 mails reçus, puis appuyer sur le bouton vert : WhatsApp s'ouvre, message prêt | Pour le secrétaire, il ne reste qu'un clic sur WhatsApp. |
| 12 | Téléphone | **Fermetures** : fermer le samedi suivant (motif « Vacances ») | Les sorties sont annulées et les adhérents prévenus automatiquement (dans l'heure, ou tout de suite en lançant `tic`). |
| 13 | PC | Ouvrir le Google Sheet et le fichier Adhérents | Les données restent chez le club, dans un tableau lisible. La liste des adhérents se tient comme aujourd'hui. |

## Points à annoncer

- **Coût : zéro.** Tout repose sur un compte Google, un compte GitHub, la météo Open-Meteo et les cartes OpenStreetMap.
- **RGPD :** les numéros ne sont jamais affichés, les données sont supprimées après 12 mois, et une page « Données personnelles » est en place.
- **Ce qui reste à décider :** les titres des 3 groupes du samedi, le point de rendez-vous et la commune, le texte des messages, qui sont les administrateurs.

## Plan B

- **Réseau mauvais dans la salle :** des captures d'écran de chaque étape, prises la veille (à ranger dans `docs/captures/`).
- **Un mail tarde :** montrer l'historique dans **Admin → Messages → Derniers envois** (chaque étape est notée ✓ ou ✗).
- **Le code admin n'arrive pas :** se connecter en administrateur sur le PC, où le code a été saisi pendant la répétition.

## Notes de répétition

*À compléter après la répétition sur un vrai téléphone : écarts constatés, temps réel de chaque étape.*
