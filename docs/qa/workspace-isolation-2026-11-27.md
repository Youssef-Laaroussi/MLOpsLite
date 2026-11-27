# Isolation des espaces personnels — 27 novembre 2026

Le défaut de catalogues partagés constaté dans les campagnes Solo des 26 et
27 novembre est corrigé dans l’API et l’interface. Chaque compte dispose de ses
projets, datasets et versions, expériences et runs, modèles et versions,
déploiements, métriques, feedbacks, rapports de monitoring et alertes.

## Comportement vérifié

- Les listes, compteurs et agrégats portent sur les ressources du compte connecté.
- Un identifiant appartenant à un autre compte ne donne accès ni aux détails,
  ni aux artefacts, ni aux actions de modification, promotion ou arrêt : `404`.
- La création rattache les ressources au compte authentifié. Les références à
  un projet, dataset, modèle ou déploiement étranger sont refusées.
- Les expériences MLflow ont une propriété persistante. Deux comptes peuvent
  employer le même nom d’affichage ; leurs identifiants restent distincts.
- Les canaux et règles d’alerte sont privés. Les notifications des workers sont
  limitées au propriétaire de l’alerte. Aucun message externe n’a été envoyé.
- Le cache frontend est vidé lors d’une déconnexion ou d’un changement de compte.
  Le changement de session dans un autre onglet déclenche aussi son rechargement.
- Les éléments de collaboration Team restent masqués.

Le rôle Admin ne contourne pas l’isolation du workspace. Ses fonctions globales
restent accessibles séparément : **profil → Administration → Accounts, Storage,
Audit Logs ou Legacy Recovery**. Un USER n’a pas ce menu ; une navigation directe
vers la page Accounts lui affiche un refus, et l’API administrative répond `403`.
L’audit personnel reste distinct du journal global réservé à l’administration.

## Migration et données anciennes

La migration `0002_workspace_isolation` et l’initialisation de l’instance utilisent
la même mise à niveau idempotente. Les propriétaires déjà établis dans les
projets permettent de rattacher leurs ressources. Une relation avec un modèle
déjà attribué permet aussi de rattacher certains déploiements et alertes.
Les expériences historiques sont importées lors de leur lecture uniquement si
elles correspondent à un projet appartenant au compte.

Les données ambiguës sont conservées sans propriétaire et cachées des espaces
personnels. L’Admin peut les attribuer explicitement dans **Legacy Recovery**.
Cette récupération ne permet pas de transférer une ressource déjà attribuée,
ni de contredire le propriétaire établi de son projet. Aucune attribution
globale à un compte personnel n’a été effectuée pendant cette campagne.

Une sauvegarde PostgreSQL privée a précédé la migration. Les **544 identifiants
existants de 15 tables** comparés à cette sauvegarde sont toujours présents.
Ce contrôle vérifie la conservation des lignes, pas une restauration complète.

## Inférence authentifiée

Les requêtes de prédiction passent par :

```text
POST /api/v1/deployments/{deployment_id}/predict
GET  /api/v1/deployments/{deployment_id}/metadata
GET  /api/v1/deployments/{deployment_id}/ready
```

Utiliser `Authorization: Bearer <access-token>` ou `X-API-Key: <api-key>` du
propriétaire. Exemple avec un token déjà obtenu par ce compte :

```bash
curl --fail-with-body \
  "http://localhost:8000/api/v1/deployments/${DEPLOYMENT_ID}/predict" \
  -H "Authorization: Bearer ${MLITE_TOKEN}" \
  -H 'Content-Type: application/json' \
  -d '{"inputs":[[5.1,3.5,1.4,0.2]]}'
```

L’API transmet un secret interne au conteneur après vérification du propriétaire.
Ce secret n’est pas exposé dans les réponses de déploiement. Les ports des
conteneurs sont liés à `127.0.0.1` ; prédiction, métadonnées et télémétrie refusent
les requêtes sans ce secret. Les sondes anonymes ne donnent que l’état de santé.

Le conteneur de démonstration actif sur **8101** a été sécurisé en conservant
son identifiant de déploiement et son port. Sa route `/metadata` anonyme répond
`401`. L’ancienne démonstration **8100** était arrêtée et son port reste fermé.
Le conteneur créé pour le compte B a été arrêté après le scénario réel.

Pour mettre à jour une autre installation, construire l’image sécurisée avant
le démarrage de l’API :

```bash
docker compose build mlite-serving
```

Au démarrage, l’API sécurise les conteneurs Running anciens. Si l’image sécurisée
est absente ou si leur propriétaire ne peut pas être établi, ils restent arrêtés
avec un message de récupération. L’API ne relance pas une image non protégée.
Appliquer également les bindings localhost du Compose mis à jour.

## Résultats

| Vérification | Résultat |
| --- | --- |
| Deux comptes USER et un Admin, vrais PostgreSQL/MinIO/MLflow/Docker | **45 contrôles réussis**, aucun échec |
| Dataset réel du compte B | CSV Iris, 150 lignes, qualité calculée depuis MinIO |
| Modèle B | Régression logistique entraînée, enregistrée, déployée et interrogée ; classe Setosa `0` obtenue |
| Tentatives intercomptes | Lectures, artefacts, suppression, promotion, enregistrement d’un run étranger, arrêt et prédiction refusés |
| Suite backend finale | **325 tests réussis**, 21 avertissements, notamment fixtures AsyncMock et dépendances |
| Suite frontend finale | **49 tests réussis**, 13 fichiers |
| Compilation | TypeScript et build Vite réussis |
| Contrôles navigateur | **9 réussis** : catalogues A/B, changement de session, absence du menu Admin pour USER, accès Admin et refus par URL |
| Non-régression de la démonstration existante | Trois contrôles d’inférence/feedback/performance réexécutés avec succès via l’API authentifiée |
| Conservation des données | 544 identifiants antérieurs contrôlés, aucun manquant |
| CLI adaptée | 20 tests existants réussis après correction des URLs affichées |
| Vérification statique | Aucun nouvel écart Ruff ; 38 usages préexistants de `setattr` dans le service datasets restent signalés |

Les 45 contrôles de cette campagne ne s’additionnent pas aux 85 contrôles
historiques comme s’il s’agissait d’une campagne unique. Les résultats détaillés
sans identifiants de connexion sont dans le [fichier JSON](workspace-isolation-2026-11-27.json).


## Périmètre et limites

L’isolation vérifiée concerne les comptes passant par MLite. Le propriétaire de
la machine et les administrateurs disposant de Docker, PostgreSQL, MinIO ou du
MLflow brut restent des opérateurs de confiance : les modèles exécutent du code
sur leur infrastructure. PostgreSQL, MinIO et MLflow sont désormais exposés sur
localhost dans Compose ; ne pas les publier directement aux utilisateurs.

Les noms techniques de modèles et slugs de projets restent uniques à l’instance.
Un nom déjà utilisé est refusé, sans ouvrir le catalogue de son propriétaire.
Les métriques CPU/mémoire/disque décrivent l’infrastructure commune.
Les limitations historiques de 2FA, OAuth, notifications externes, DVC, charge
et restauration restent hors de cette correction. Cette campagne ne certifie
pas toutes les familles de modèles ni un hébergement face à un opérateur hostile.

Les mots de passe, tokens, sauvegardes et manifestes complets restent sous
`secrets/`, ignoré par Git et Docker. Aucun commit ni push n’a été effectué.
