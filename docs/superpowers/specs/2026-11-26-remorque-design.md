# Réservation de la remorque — conception

*26/11/2026. Choix de l'association : palette C (contrastée) ; une demande qui chevauche une demande en attente, une
réservation ou un blocage est refusée ; les gestionnaires confirment leur identité par un code mail (comme
l'administration) ; le nom du demandeur n'est visible que des gestionnaires et du demandeur ; aucune limite de durée
ni de délai ; calendrier sans borne dans le temps ; statistiques pour l'assemblée générale. Dépôts non fusionnés : le
noyau est modifié dans ResaVTT puis recopié dans ResaVTT-cloudflare.*

## Données
- Table **`Remorque`** : id, debut, fin (AAAA-MM-JJ, inclus), statut (`demandee`, `validee`, `refusee`, `annulee`,
  `bloquee`), motif (`club` ou `indisponible`, pour un blocage), commentaire, demandeur_tel, demandeur_nom,
  traite_par, traite_le, cree_le.
- Paramètres : `remorque_active` (`oui`/`non`, défaut `non`), `remorque_gestionnaires` (emails séparés par des
  virgules).
- **Gestionnaire** : adhérent connecté dont l'email (fichier des adhérents) figure dans `remorque_gestionnaires`.
  Ses actions demandent l'identité vérifiée par le code mail (même indicateur que l'administration, `admin_verifie`
  sur le jeton) ; le code peut être demandé par un administrateur ou un gestionnaire.

## Règles
- Page fermée (`remorque_active` ≠ `oui`) : toutes les actions refusées (`remorque_fermee`), bouton absent.
- Demande : début ≤ fin, début ≥ aujourd'hui ; refusée (`periode_prise`) si elle chevauche une période `demandee`,
  `validee` ou `bloquee`. Statut `demandee` ; mail aux gestionnaires.
- Annulation par le demandeur (demande en attente ou réservation à venir) : `annulee` ; mail aux gestionnaires.
- Validation / refus par un gestionnaire vérifié : `validee` / `refusee` (motif facultatif) ; mail au demandeur s'il a
  un email.
- Blocage par un gestionnaire vérifié (motif `club` ou `indisponible`) : refusé s'il chevauche une réservation validée
  ou un autre blocage ; les demandes en attente qu'il chevauche passent à `refusee` (mail au demandeur).
  Déblocage : le blocage passe à `annulee`.
- Vue des périodes : tout le monde voit les dates et l'état ; nom et commentaire seulement pour les gestionnaires et
  le demandeur.
- Purge (tic) : une réservation terminée depuis plus que la durée de conservation est **anonymisée** (demandeur,
  téléphone, commentaire effacés), dates et statut gardés pour les statistiques.

## Statistiques (Admin → Statistiques, par année)
Réservations validées, jours de prêt, adhérents différents (avant anonymisation, sinon non compté), demandes
refusées et annulées, jours bloqués (club / indisponible), jours de prêt par mois.

## Interface
- Bandeau : bouton « 🚚 Remorque » si la page est ouverte ; pour un gestionnaire, badge = demandes en attente.
- Page `#/remorque` : mois par mois sans limite, une ligne par semaine (lundi → dimanche) ; jours colorés selon l'état
  (palette C : réservée rouge, demandée orange, bloquée gris foncé avec cadenas), aujourd'hui entouré ; toucher un
  jour pris affiche sa période. Formulaire de demande (du, au, pour quoi faire), « Mes demandes » avec annulation.
- Gestionnaire : code mail si non vérifié ; sinon demandes à valider (Valider / Refuser), blocage d'une période,
  blocages en cours (Débloquer).
- Admin → Paramètres : case « Proposer la réservation de la remorque » et liste des gestionnaires.

## Hors champ
Textes des mails réglables dans Messages ; limites de durée ou de délai ; demi-journées.
