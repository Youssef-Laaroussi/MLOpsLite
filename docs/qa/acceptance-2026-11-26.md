# Validation réelle MLite — 26 novembre 2026

> Mise à jour : le défaut d’isolation décrit dans ce rapport historique a été
> corrigé et retesté. Voir le [rapport d’isolation du 27 novembre](workspace-isolation-2026-11-27.md).
> Les ports directs d’inférence exigent désormais un secret interne ; utiliser
> l’API authentifiée du propriétaire comme dans l’exemple actualisé ci-dessous.

Le parcours Solo local Iris a été exécuté et les défauts rencontrés ont été
corrigés. Le scénario de démonstration fonctionne : données → entraînement →
registre → déploiement → prédiction → monitoring → alerte → rollback.

**Ce résultat ne signifie pas que toutes les options affichées sont implémentées,
ni que l’installation isole complètement plusieurs utilisateurs.** Les limites
ci-dessous doivent être annoncées pendant la soutenance.

## Résultats

| Vérification | Résultat |
| --- | --- |
| Acceptation réelle par HTTP et services locaux | 82 contrôles réussis, 0 échec restant dans ce périmètre |
| Parcours dans le navigateur | 25 scénarios vérifiés, détaillés dans le fichier JSON |
| Suite backend finale | 298 tests réussis ; 18 avertissements de dépendances/fixtures |
| Suite frontend | 48 tests réussis, 12 fichiers |
| TypeScript et compilation Vite de production | Réussis |
| Ruff sur les fichiers Python modifiés et scripts QA ; `git diff --check` | Réussis |
| Construction Docker API et serving | Réussie ; nouvelle API et nouveaux conteneurs QA réellement utilisés |

Les tests unitaires utilisent des dépendances isolées. Les 82 contrôles
d’acceptation utilisent PostgreSQL, MinIO, MLflow et les conteneurs Docker réels,
sans simuler leurs réponses. Les résultats agrègent les derniers passages des
contrôles pendant cette session ; ils ne constituent pas un test de charge.

Le travail a été effectué sur la base `061419b`, avec les corrections dans
l’arbre de travail. Aucun commit ou push automatique n’a été réalisé.

## Environnement et données

- Compte de validation : USER standard, sans privilèges d’administration.
  Les contrôles administrateur utilisent séparément le compte existant, sans
  publier ses identifiants.
- Projet principal : `QA Solo Iris Validation`, slug `qa-solo-213057`.
- Iris réel : 150 lignes, quatre mesures et une classe. Upload CSV, JSON et
  Parquet, contrôles du nombre de lignes et des SHA-256.
- Deux entraînements de régression logistique, séparation stratifiée 80/20,
  paramètres et trois points d’historique de loss enregistrés dans MLflow.
- Modèle conservé : `qa-solo-213057-iris-final`, versions 1 et 2 ; v1 replacée
  en Production pour la démonstration.
- API/serveur MLflow : client MLflow 2.15.0 ; API avec pandas 2.3.3 et moteur
  Evidently disponible. Vérification de l’absence de `.env` et de `secrets/`
  dans l’image API.

Les anciennes données de l’installation ont été conservées. Les objets de test
restent préfixés QA. Plusieurs essais échoués pendant le diagnostic sont encore
visibles dans l’historique MLflow ; ils n’ont pas été transformés en succès.

## Couverture par écran

| Section | Vérifications effectuées |
| --- | --- |
| Connexion et compte | Inscription publique USER, connexion réelle, mauvais mot de passe refusé, refresh valide/invalide, profil persistant, changement et restauration du mot de passe QA, refus de modification du rôle. |
| Overview | Chargement sur les vraies données, cartes et graphiques ; affichage mobile/bureau et navigation. Attention : plusieurs totaux restent ceux de l’installation. |
| Projects | Création UI/API, lecture, édition persistante, recherche, vues liste/grille, archivage/restauration ; suppression définitive du seul projet jetable via API. |
| Datasets | Upload réel dans MinIO depuis l’UI, CSV/JSON/Parquet via API, versions et hash, inspection du dataset, filtres et scores qualité reliés aux rapports réels. |
| Experiments | Deux versions entraînées, runs et métriques réelles, historique de loss, comparaison dans l’UI, paramètres, artefacts et téléchargement ZIP non vide. |
| Models | Versions enregistrées, promotions Staging/Production, stage invalide rejeté, signature validée, artefact disponible, lineage et correspondance SHA-256 avec les datasets. |
| Deployments | Création réelle depuis l’UI avec USER, arrêt depuis l’UI, état arrêté persisté, héritage du projet, readiness, santé, signature, artefact et refus d’un modèle non enregistré. |
| Inférence | Listes `inputs`, `dataframe_records` et `dataframe_split` avec colonnes inversées donnent les mêmes prédictions. Payload vide rejeté. |
| Monitoring | Vraie qualité, performance issue des labels, latences, requêtes/erreurs, mémoire Docker, données identiques et décalées, évaluation déclenchée dans l’UI, heatmap et rapport Evidently. |
| Alerts | Règle persistante, déclenchement sur la dérive mesurée, acquittement, résolution, désactivation de la règle QA ; détails, recherche et filtre projet vérifiés dans l’UI. |
| Services | Probes API, PostgreSQL, MinIO, MLflow, Docker et endpoint ; synchronisation, filtre Database et détail PostgreSQL dans l’UI. |
| Settings | Profil, General, préférences, notifications locales, validation du formulaire des clés, intégrations, About, événements personnels et sidebar fixe pendant le scroll. |
| Clés API | Création, authentification réelle puis révocation ; la clé révoquée est refusée. Aucun secret de clé conservé dans le rapport. |
| Audit et administration | Journal personnel limité à son acteur ; entrée d’un autre acteur refusée. USER reçoit 403 pour comptes, audit global et stockage. Inventaire et création d’un bucket QA testés avec Admin. |
| Validation et confidentialité | Erreurs personnalisées en 422, mots de passe absents des réponses et logs de validation ; feedback manquant, tableau de labels et latence négative refusés. |
| Mise en page | Settings et Overview à 375 px, header aux formats 1280/1536 px ; navigation mobile et palette de commandes. Ce contrôle n’est pas une certification exhaustive de tous les tableaux sur mobile. |

## Mesures obtenues

- Holdout de 30 fleurs : accuracy **96,67 %**, F1 pondéré **0,9666**.
- Trois exemples représentatifs prédits **0, 1, 2** dans les trois formats.
- Feedback réel : deux passages de 30 labels, soit **60 observations** au dernier
  passage, avec métriques calculées à partir des prédictions réellement renvoyées.
- Données identiques : **0 %** de colonnes en dérive.
- Données décalées de +5 sur `sepal_length` et `petal_length` : **40 %** de
  colonnes en dérive, statut HIGH ; rapport Evidently autonome d’environ 3,8 Mo.
- Mémoire d’inférence mesurée : environ **200 Mo**. Les latences sont des mesures
  de cette machine et évoluent avec sa charge, pas un benchmark de production.
- Redémarrage réel de l’API sans nouveau trafic : compteur conservé à **30 → 30**
  pendant ce contrôle, sans double comptage.
- Rollback réel **v2 → v1**, puis prédiction réussie sur la version restaurée.

Une requête invalide a été volontairement envoyée à l’inférence. Un taux d’erreur
non nul dans les graphiques QA est donc attendu et ne doit pas être effacé pour
faire paraître la démonstration parfaite.

## Correctifs issus des tests

1. Validation des datasets sur l’objet réellement stocké, avec extension correcte,
   nettoyage du fichier temporaire et erreur explicite si le téléchargement échoue.
2. Scores et rapports qualité reliés au catalogue ; score 0–100 correctement affiché.
   La présence d’une référence de stockage est distinguée d’une vérification de sync.
3. Accès aux chemins de fichiers du serveur réservé à l’administrateur.
4. Compatibilité avec l’API legacy d’Evidently 0.7, lecture du taux de dérive mesuré
   au lieu de son seuil, extraction des colonnes et identifiants uniques de rapports.
5. Échappement des labels dans les rapports HTML de secours.
6. Signature nommée dans l’exemple Iris, respect de l’ordre des features pour les
   objets JSON et les colonnes inversées ; refus des features manquantes.
7. Contraintes de dépendances du Dockerfile serving correctement citées, MLflow
   aligné sur 2.15.0 et setuptools compatible.
8. Métriques multiclasse correctes ; feedback relié à l’historique de performance,
   validation des entrées et refus explicite des labels incompatibles.
9. Mémoire/CPU Docker réellement collectés, erreurs d’inférence comptées,
   curseur de collecte persisté pour éviter le double comptage après redémarrage.
10. Permissions du dashboard Deployments alignées sur celles de l’API : USER peut
    arrêter un déploiement. Un nouveau déploiement hérite du projet de son modèle.
11. Alertes générées rattachées au projet du modèle pour rendre le filtre fonctionnel.
12. PostgreSQL correctement identifié dans les intégrations et Services.
13. Chevauchement du header à 1280 px corrigé ; confirmation de sauvegarde du profil
    conservée après mise à jour du nom.
14. Stage de promotion invalide renvoyé en 422 ; CSV vide traité comme échec qualité.
15. Gestionnaire global de validation corrigé : 422 sérialisable et absence des valeurs
    soumises, notamment des mots de passe, dans la réponse et le log de validation.

Les fixtures de tests devenues obsolètes ont aussi été corrigées : artefacts réels
pour les tests de prédicteur, SQL isolé, MLflow/DNS isolés dans les tests unitaires,
port hôte indépendant et AuthProvider dans les tests d’Overview.

## Limites et décision de présentation

**Validé pour la démonstration Solo locale décrite ci-dessus. Pas certifié pour
héberger plusieurs utilisateurs avec des ressources confidentielles séparées.**

| Limite observée | Conséquence |
| --- | --- |
| Plusieurs catalogues de datasets, modèles, expériences, déploiements et compteurs restent communs à l’installation. | Un compte USER de QA voit encore des ressources anciennes de l’installation. L’audit personnel est isolé, mais cela ne suffit pas pour annoncer une isolation complète. Ce point reste bloquant pour une utilisation multi-compte confidentielle. |
| 2FA, révocation des autres sessions et redémarrage de service sont indisponibles. | Les contrôles correspondants sont désactivés ou signalés comme indisponibles. Le changement de mot de passe ne révoque pas les sessions existantes. |
| General, préférences et notifications ont de nombreux champs stockés dans le navigateur. | La sauvegarde locale est testée ; l’application globale d’un thème, d’une langue, d’un réglage serveur ou d’une politique de calcul n’est pas certifiée par ce test. |
| Slack/webhook non configurés, email indisponible ; OAuth et DVC non validés, DVC absent de l’API. | Aucune notification externe n’a été envoyée. Ne pas présenter ces intégrations comme vérifiées. |
| Uptime 30 jours, certaines informations d’infrastructure, environnement de déploiement non renseigné, PSI et moyennes de features absents de certaines réponses. | Les tirets sont des informations indisponibles, pas des résultats à inventer. Les métriques d’uptime ne peuvent pas être validées sur une session courte. |
| Pas de campagne de charge, de soak longue durée, de restauration de sauvegarde, ni de matrice complète de modèles/frameworks. | Ce passage QA ne constitue pas une certification de production ou de tous les types de modèles. |

Les adresses IP vues dans l’audit sont celles du réseau Docker pendant ce test.
La restitution de l’IP réelle derrière un reverse proxy externe n’a pas été validée.
Le disque de la machine avait environ 9 Go libres après les builds ; prévoir cet
espace dans la préparation d’une nouvelle reconstruction, sans nettoyer les données
existantes à l’aveugle.

## Déroulé de soutenance vérifiable

1. Ouvrir le projet `QA Solo Iris Validation`, puis le dataset de référence et ses
   versions. Expliquer le SHA-256 et les avertissements qualité réels.
2. Dans Experiments, sélectionner `qa-solo-213057`, puis les deux derniers runs
   terminés. Comparer les paramètres et les métriques ; télécharger l’artefact.
3. Dans Models, ouvrir `qa-solo-213057-iris-final`, choisir v1, puis Validate et
   View Lineage pour retrouver le dataset et le manifeste de dépendances.
4. Dans Deployments, ouvrir le conteneur Running, synchroniser la santé et
   vérifier son artefact. L’endpoint conservé est `http://localhost:8100`.
5. Dans Monitoring, filtrer sur ce modèle. Montrer la performance issue du feedback,
   puis le rapport de dérive à 40 % et les deux colonnes décalées.
6. Dans Alerts, filtrer sur le projet et ouvrir le dernier incident résolu.
7. Montrer l’historique de rollback v2 → v1 et les événements personnels dans Settings.

Le modèle sauvegardé peut être testé depuis le terminal. Renseigner
`DEPLOYMENT_ID` et le token Bearer de son propriétaire dans `MLITE_TOKEN` :

```bash
curl -sS "http://localhost:8000/api/v1/deployments/${DEPLOYMENT_ID}/predict" \
  -H "Authorization: Bearer ${MLITE_TOKEN}" \
  -H 'Content-Type: application/json' \
  -d '{"inputs":[[5.1,3.5,1.4,0.2]]}'
```

Le résultat attendu pour cet exemple est la classe `0`. Le serveur doit rester
en cours d’exécution et le port doit être celui du conteneur Running.

## Reproduire et consulter les preuves

- [Scripts d’acceptation et consignes](../../scripts/qa/README.md)
- [Résultats détaillés sans identifiants de connexion](acceptance-2026-11-26.json)

Les logs complets et le manifeste privé de cette exécution sont dans
`/tmp/mlite-qa-20261126`. Ne pas publier `account.json`, le manifeste complet ou
un fichier de secrets avec ces preuves.
