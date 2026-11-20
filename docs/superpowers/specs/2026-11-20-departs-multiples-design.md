# Sortie récurrente à plusieurs points de départ — conception

*20/11/2026. Validé par l'association : récurrences seulement (pas les sorties libres pour l'instant) ; les personnes
d'un compte inscrites ensemble partent du même départ ; inscriptions closes à l'heure de la sortie (premier départ).*

## Intention
Une récurrence du club part de deux endroits à deux horaires (ex. 09:00 PDL, 09:30 Parking gare). Le club veut **une
seule sortie** — une fiche, une discussion, une liste complète des inscrits — mais savoir **à quel départ** chacun est
attendu.

## Approches considérées
- **Une sortie, plusieurs départs** (retenue) : une liste de départs sur la sortie, chaque inscription retient le sien.
- Deux sorties distinctes par récurrence (déjà possible avec « Sorties créées ») : rejetée, elle coupe la liste des
  inscrits et la discussion en deux.
- Mention libre dans la description : rejetée, on ne saurait pas qui part d'où.

## Données
- `Regles.autres_departs` : texte, un départ par ligne, `HH:MM lieu` (ex. `09:30 Parking gare`). L'heure et le point
  de rendez-vous de la règle restent le **premier départ**. Vide : un seul départ, comme avant.
- `Sorties.autres_departs` : recopié de la règle à la génération (modifier la règle ne change que les sorties pas encore
  générées, comme le reste). `heure` et `point_rdv` de la sortie = premier départ : tri, météo, rappels, purge,
  statistiques et fermeture des inscriptions n'en dépendent que.
- Départs d'une sortie : `d1` (heure et point_rdv de la sortie), puis `d2`, `d3`… dans l'ordre des lignes.
- `Inscriptions.depart_id` : vide = `d1` (les inscriptions existantes restent valables).
- Colonnes ajoutées automatiquement aux classeurs existants.

## Règles
- Inscription : `depart_id` choisi pour toutes les personnes cochées ; une personne déjà inscrite et cochée change de
  départ. Départ inconnu : refusé.
- Inscriptions closes à l'heure de la sortie (premier départ), inchangé.
- Changer l'heure : départ par départ (`sortie_horaire` avec `depart_id`), message automatique dans la discussion.

## Interface
- Admin, écran d'une récurrence : « Heure » et « Point de rendez-vous » = premier départ ; nouvelle zone « Autres points
  de départ (un par ligne : heure puis lieu) ».
- Fiche : ligne des départs (« 📍 09:00 PDL · 09:30 Parking gare »), choix « Mon départ » quand il y en a plusieurs,
  inscrits regroupés par départ avec sous-totaux, total en tête.
- Calendrier (Classique, Frise, Agenda) : les départs dans la ligne du lieu. « Mes prochaines sorties » : mon départ.
- Rappels : la ligne d'une sortie à plusieurs départs donne « (09:00 PDL · 09:30 Parking gare) » ; nouveau repère
  `{{departs}}` ; `{{heure}}` et `{{point_rdv}}` restent ceux du premier départ.

## Hors champ
- Départs multiples sur les sorties libres.
- Modifier la liste des départs d'une sortie déjà générée (sauf l'heure de chacun).
