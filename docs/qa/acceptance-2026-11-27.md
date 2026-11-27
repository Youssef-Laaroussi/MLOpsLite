# Reprise QA — 27 novembre 2026

> Mise à jour : le défaut d’isolation décrit dans ce rapport historique a été
> corrigé et retesté. Voir le [rapport d’isolation du 27 novembre](workspace-isolation-2026-11-27.md).
> Les ports directs d’inférence exigent désormais un secret interne ; utiliser
> l’API authentifiée du propriétaire comme dans l’exemple actualisé ci-dessous.

Le parcours Solo a été rejoué avec un nouveau compte USER et les vrais services
de l’installation. Le dernier défaut trouvé concernait les modèles de régression :
le calcul automatique du feedback les traitait comme une classification lorsque
`config.task_type` n’était pas renseigné.

Le correctif respecte d’abord la configuration explicite, y compris en majuscules.
Sans configuration, des métriques enregistrées de régression (`rmse`, `mae`, `mse`,
`r2`, `r2_score`), sans métriques de classification, sélectionnent la régression.
Les modèles sans indicateur clair gardent le défaut classification ; renseigner
explicitement `config.task_type` pour les cas ambigus.

## Résultats de la reprise

| Vérification | Résultat |
| --- | --- |
| Acceptation réelle, nouveau compte et nouvelles ressources QA | **85 contrôles réussis, aucun échec** |
| Suite backend après correction | **305 tests réussis**, 18 avertissements de dépendances/fixtures |
| Interface supplémentaire | Connexion du nouveau USER et affichage de la courbe RMSE vérifiés dans le navigateur |
| Vérifications frontend déjà réalisées le 26 novembre | 48 tests, compilation TypeScript/Vite et 25 scénarios UI réussis ; aucun code frontend modifié lors de cette reprise |

Les 85 contrôles sont ceux du nouveau manifeste. Ils recouvrent en partie les
82 contrôles du 26 novembre ; il ne faut pas additionner ces nombres comme des
scénarios indépendants. Les preuves et les limites de la campagne précédente
restent dans le [rapport du 26 novembre](acceptance-2026-11-26.md).

Le cycle exécuté couvre l’inscription publique, le profil, les projets, les
uploads CSV/JSON/Parquet, les versions et SHA-256, la qualité des objets MinIO,
l’entraînement MLflow, le registre, les promotions, les vrais conteneurs,
l’inférence, le feedback, Evidently, les alertes, les refus d’accès Admin,
les clés API, le changement/restauration du mot de passe QA et le stockage.

## Classification Iris

- Projet : `QA Solo Iris Validation`, slug **`qa-solo-111054-e75d`**.
- Modèle : **`qa-solo-111054-e75d-iris-final`**, deux versions réellement entraînées.
- Accuracy sur le holdout : **96,67 %**, F1 pondéré **0,9666**.
- Les trois formats de prédiction donnent les mêmes classes, y compris avec
  les colonnes nommées dans un ordre inversé.
- Rapport Evidently : **0 %** de dérive sur les mêmes données, **40 %** après
  décalage de `sepal_length` et `petal_length`.
- Règle QA déclenchée, acquittée, résolue puis désactivée.
- Rollback **v2 → v1** terminé et prédiction réussie sur la version restaurée.
- Le conteneur v1 restauré a ensuite passé à nouveau les tests des trois formats,
  de 30 feedbacks réels, de la performance et des mesures Docker.

Le conteneur conserve le port local **8101**. Les prédictions passent désormais
par l’API : renseigner `DEPLOYMENT_ID` et le token Bearer du propriétaire
dans `MLITE_TOKEN` :

```bash
curl -sS "http://localhost:8000/api/v1/deployments/${DEPLOYMENT_ID}/predict" \
  -H "Authorization: Bearer ${MLITE_TOKEN}" \
  -H 'Content-Type: application/json' \
  -d '{"inputs":[[5.1,3.5,1.4,0.2]]}'
```

Résultat attendu pour cet exemple : classe `0`. L’ancien scénario sur le port
8100 a été conservé. Utiliser le port du déploiement Running choisi dans l’UI.

## Régression à cible continue

Un modèle Ridge a été réellement entraîné sur les **442 observations** du dataset
intégré `sklearn.datasets.load_diabetes`, avec un holdout de 89 observations.

- Modèle : **`qa-solo-111054-e75d-regression`**.
- Artefact MLflow enregistré puis chargé par un vrai conteneur Docker.
- Aucune valeur `task_type` imposée au déploiement : le test exerce le correctif
  de détection depuis les métriques enregistrées.
- Prédictions du serveur comparées à celles du modèle entraîné ; un second
  appel avec les colonnes inversées donne les mêmes résultats.
- Sur 20 prédictions réellement retournées et leurs vraies cibles :
  **MAE 47,2044**, **RMSE 57,3946**, **R² 0,5095**.
- Un feedback contenant une prédiction non numérique est refusé en **422**.
  Le feedback valide suivant réussit et porte le compteur à 21 : l’entrée
  rejetée n’a pas corrompu les calculs suivants.
- La courbe RMSE de ce modèle est visible dans Monitoring avec le compte USER.
  Le point affiché correspond au dernier snapshot, après ce 21e feedback ;
  sa valeur diffère donc du calcul initial sur 20 observations.
- Le conteneur de régression a été arrêté après vérification ; ses métriques,
  artefacts et historiques restent consultables. Aucun trafic actif n’est
  attendu pour ce modèle arrêté.


## Rejouer et retrouver la session

Les [scripts QA](../../scripts/qa/README.md) incluent maintenant une phase
`regression`. Les fichiers privés de cette reprise sont conservés dans
`secrets/qa/20261127`, ignoré par Git et par le contexte de build Docker.
`account.json` et `manifest.json` ont les permissions 0600 ; leur répertoire est
en 0700. Ils permettent de reprendre les tests après redémarrage. Aucun mot de
passe n’est copié dans les rapports publics.

Exemple de vérification supplémentaire du conteneur Iris conservé :

```bash
export MLITE_QA_DIR="$PWD/secrets/qa/20261127"
python scripts/qa/live_acceptance.py verify_demo
```

Cette commande ajoute du vrai trafic et des feedbacks ; les compteurs évolueront.
Consulter aussi les [résultats détaillés sans credentials](acceptance-2026-11-27.json).

## Limites toujours ouvertes

**Le parcours local décrit est vérifié. L’ensemble du produit n’est pas certifié
à 100 %, et l’isolation complète entre comptes reste incomplète.** Plusieurs
catalogues et totaux sont encore partagés à l’échelle de l’installation. Les
tests de l’audit personnel et des permissions administrateur ne prouvent pas
l’isolation de toutes les ressources.

Les fonctions indisponibles ou non configurées signalées dans le rapport initial
restent telles quelles : 2FA, révocation des autres sessions, redémarrage de
service, notifications externes, OAuth, récupération du mot de passe par email
et DVC. Les préférences sauvegardées dans le navigateur ne constituent pas une
preuve d’application de chaque réglage côté serveur. Aucun test de charge,
de restauration de sauvegarde ou de toutes les familles de modèles n’a été ajouté.

Aucune donnée antérieure n’a été supprimée globalement. Aucun commit, push ou
changement d’identifiants personnels/Admin n’a été effectué pendant cette reprise.
