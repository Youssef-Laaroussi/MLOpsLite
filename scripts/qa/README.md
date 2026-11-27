# Acceptation réelle du parcours Solo

Ces scripts utilisent la vraie API, PostgreSQL, MinIO, MLflow et Docker de
l’installation locale. Ils créent un compte USER de test et des ressources
préfixées `qa-solo-`. Ils ne remplacent pas les tests unitaires.

## Préparer

La configuration initiale de MLite doit être terminée, l’inscription ouverte,
les services Compose démarrés et l’image `mlite/serving:latest` construite.
Utiliser l’environnement Python du projet avec les dépendances de développement
et de données installées. Exécuter les commandes depuis la racine du dépôt.

Choisir un répertoire privé distinct pour chaque installation :

```bash
export MLITE_QA_DIR="$PWD/secrets/qa/local"
export MLITE_API_URL=http://localhost:8000
```

Le script crée `account.json` et `manifest.json` avec les permissions `0600`
dans ce répertoire `0700`. Le premier contient le mot de passe aléatoire du
compte QA. Ne pas le copier dans Git ou dans un rapport public. Les tokens
restent en mémoire.

Sans configuration, les résultats restent dans `secrets/qa/YYYYMMDD`, ignoré par
Git et Docker. Ce stockage persiste après un redémarrage, contrairement à `/tmp`.

Les vérifications administrateur utilisent, si disponible,
`secrets/admin.local.json`, ou le chemin fourni dans `MLITE_QA_ADMIN_FILE`.
Ce fichier privé doit contenir les champs `username` et `password` du compte
administrateur existant. Le scénario `seed` signale l’absence de ce fichier et
saute ces vérifications ; le scénario `storage` le requiert.

## Exécuter dans cet ordre

Remplacer `python` par le Python de l’environnement du projet si nécessaire.
Ne pas lancer plusieurs phases en parallèle : elles partagent un manifeste.

```bash
python scripts/qa/live_acceptance.py seed
python scripts/qa/live_acceptance.py train
python scripts/qa/live_acceptance.py monitor
python scripts/qa/live_acceptance.py serve
python scripts/qa/live_acceptance.py regression
python scripts/qa/live_acceptance.py security
python scripts/qa/live_acceptance.py validation
python scripts/qa/live_acceptance.py storage
```

| Phase | Contrôles réels |
| --- | --- |
| `seed` | Inscription USER, connexion, profil, projets, archivage/restauration/suppression du projet jetable, upload CSV/JSON/Parquet, versions, qualité, lectures du dashboard, audit personnel, refus administrateur, clé API créée/utilisée/révoquée. |
| `train` | Deux régressions logistiques sur Iris, séparation entraînement/test, métriques et historique MLflow, artefacts MinIO, enregistrement des versions, validation, lineage et promotions. L’entraînement s’exécute dans le service Compose `mlflow` pour utiliser sa version MLflow. |
| `monitor` | Qualité des objets stockés, données identiques puis décalées, moteur Evidently vérifié, rapport HTML, identifiants distincts, règle d’alerte, acquittement et résolution. |
| `serve` | Vrais conteneurs v1/v2, trois formats de prédiction, feedback labellisé, performance, ressources Docker et rollback vers v1 avec nouvelle prédiction. |
| `regression` | Modèle Ridge réellement entraîné sur 442 observations à cible continue, artefact servi, colonnes inversées, calcul du RMSE depuis 20 vrais labels, rejet d’un label incompatible et récupération sur le label valide suivant. Son conteneur est arrêté après vérification. |
| `security` | Mauvais identifiants, refresh, refus de changement de rôle et accès anonyme. Change temporairement le mot de passe du compte QA uniquement, teste la connexion puis restaure ce mot de passe. |
| `validation` | Feedback absent, mauvais type de label, latence négative, validation de formulaire en 422 sans recopier les mots de passe. |
| `storage` | Refus USER, connexion MinIO administrateur, nom de bucket invalide, création d’un bucket QA vide, inventaire et refus du doublon. |

La phase `monitor` refuse l’évaluation globale si des canaux externes ou des
règles déjà actives existent. Utiliser une installation QA isolée dans ce cas ;
ne pas désactiver les intégrations de quelqu’un d’autre pour passer le test.

Chaque contrôle imprime `PASS` ou `FAIL`. Une phase termine avec un code non nul
si le manifeste contient encore un échec. Relancer la phase concernée remplace
le résultat du contrôle et conserve les ressources nécessaires aux suivantes.

Pour répéter seulement l’inférence sur le conteneur conservé :

```bash
python scripts/qa/live_acceptance.py verify_demo
```

Chaque répétition ajoute de vraies prédictions et de nouveaux feedbacks. Les
compteurs, le nombre d’échantillons et les métriques peuvent donc évoluer.
Relancer `serve` arrête uniquement les anciens déploiements de ce scénario
enregistrés dans son manifeste avant de refaire le cycle.

## Données conservées et limites

Le modèle v1 restauré reste démarré pour démonstration. Projets, datasets,
artefacts, versions, rapports, incidents résolus et bucket QA restent identifiables
par leur préfixe. La suppression définitive ne concerne que le projet temporaire
créé spécialement par le test. Aucun nettoyage global de PostgreSQL, MinIO ou
MLflow n’est exécuté.

Le manifeste décrit les contrôles exécutés, pas une certification de tous les
écrans ou scénarios possibles. Les manipulations du navigateur, le responsive et
le redémarrage du service API sont documentés séparément dans le rapport QA.
Ne pas utiliser cette suite comme preuve d’isolation entre plusieurs comptes.

## Vérifier l’isolation entre comptes

Le scénario dédié utilise un compte A déjà préparé par `live_acceptance.py`,
un second USER de test et l’Admin existant. Il crée un projet privé B, téléverse
Iris, entraîne un modèle réel dans MLflow, le déploie puis vérifie les refus
intercomptes avant d’arrêter uniquement ce nouveau déploiement QA.

```bash
export MLITE_QA_A_DIR="$PWD/secrets/qa/20261127"
export MLITE_ISOLATION_DIR="$PWD/secrets/qa/workspace-isolation"
python scripts/qa/workspace_isolation.py
```

Adapter le premier chemin au manifeste A de cette installation. Le fichier
privé `secrets/admin.local.json` est requis pour les contrôles Admin. Les
identifiants B et le manifeste restent dans le second répertoire, ignoré par Git.
Les essais de modification/suppression visent exclusivement les ressources QA A,
qui doivent être refusées par le backend. Le modèle B et ses données sont conservés.

Toutes les prédictions des scripts utilisent maintenant l’API authentifiée
`/api/v1/deployments/{id}/predict` du propriétaire. Les ports directs des
conteneurs exigent un secret interne. Pour les requêtes manuelles, employer
un JWT dans `Authorization: Bearer ...`, ou une clé dans `X-API-Key: ...`.

Voir le [rapport d’isolation](../../docs/qa/workspace-isolation-2026-11-27.md)
pour la migration des données anciennes, les preuves navigateur et le périmètre.
