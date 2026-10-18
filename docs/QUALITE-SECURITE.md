# Qualité, tests et sécurité assistés par IA

Ce document décrit comment l'IA a été utilisée pour **tester** CarLoop, **détecter des anomalies et des
vulnérabilités** et **proposer des refactorings**, et ce qui a été corrigé.

## 1. Démarche

| Étape | Outil | Rôle de l'IA |
|---|---|---|
| Génération des tests | Claude Code (assistant de code) | Écriture des tests unitaires et d'intégration à partir du code et des règles métier, y compris les cas d'erreur du LLM (réponse invalide, timeout, quota) simulés en remplaçant `fetch` |
| Revue de code orientée sécurité | Claude Code | Lecture des routes, middlewares, validations et prompts pour repérer les failles (contrôle d'accès, injection, redirections, force brute, fuite de données vers le LLM) |
| Audit des dépendances | `npm audit` + analyse par Claude Code | Tri des vulnérabilités : ce qui part en production et ce qui ne sert qu'au développement |
| Évaluation du comportement IA | Script `npm run eval` (écrit avec Claude Code) | Mesure de la validité, de la justesse, de la latence et des tokens sur 12 cas annotés, détection des réponses tronquées |
| Test en conditions réelles | Appels HTTP sur l'application lancée avec la vraie clé | Détection des problèmes de délai et d'indisponibilité du fournisseur |

## 2. Tests automatisés

**131 tests**, tous au vert (`npm test`) : 109 côté serveur, 22 côté client.

| Niveau | Fichiers | Exemples de ce qui est vérifié |
|---|---|---|
| Couche IA (unitaires) | `server/src/ai/tests/` | anonymisation (19 cas : emails, téléphones tunisiens, plaques « TU », adresses, noms), extraction du JSON, nouvel essai sur 429/5xx, timeout, relance corrective, garde-fou anti-injection, modèles de secours |
| Schémas des modules (unitaires) | `features/*/tests/schema.test.ts` | chaque sortie LLM valide est acceptée, chaque sortie incohérente est rejetée ; chaque mock respecte son schéma |
| API (intégration, Supertest + MongoDB en mémoire) | `features/*/tests/*.api.test.ts`, `core/tests/` | parcours métier complets, contrôle d'accès par rôle et par propriétaire, réponse LLM invalide simulée → 502 après relance, vérification que **aucune donnée personnelle** n'est envoyée au LLM |
| Front (Testing Library) | `client/src/**/tests/` | affichage des erreurs IA, cartes de résultat, liens de réservation, filtrage des redirections |

Aucun test n'appelle le vrai fournisseur ni n'a besoin d'une base installée : les tests tournent sur n'importe quelle machine.

## 3. Anomalies et vulnérabilités détectées

| # | Constat | Gravité | Détecté par | Correction | Vérification |
|---|---|---|---|---|---|
| F1 | **Redirection ouverte** : après connexion, `?redirect=` était suivi sans contrôle (`/connexion?redirect=//site-pirate.com`), aggravé par la CVE de React Router sur `/\` | Moyenne | `npm audit` + revue | `safeRedirect()` n'accepte que les chemins internes (`client/src/core/auth/redirect.ts`) | `redirect.test.ts` |
| F2 | **Force brute** possible sur `/api/auth/login` et `/register` (aucune limite) | Moyenne | Revue | 10 tentatives échouées par IP / 15 min, réponses réussies non comptées (`authRateLimit.ts`) | `authRateLimit.test.ts` |
| F3 | **Injection de prompt** : le texte du client (symptôme, avis…) pouvait contenir « ignore tes consignes » | Moyenne | Revue des prompts | Garde-fou ajouté automatiquement à tous les prompts système (`runAiTask.ts`) | test unitaire + cas « Injection de prompt » de l'évaluation (réussi) |
| F4 | React Router 6 vulnérable (2 avis « moderate ») | Moyenne | `npm audit` | Exploitation principale neutralisée par F1 ; migration vers React Router 7 recommandée (changement majeur) | — |
| F5 | Vulnérabilités dans les outils de développement (vitest, esbuild, tinypool, braces) | Faible en pratique | `npm audit` | Hors production : l'image Docker n'installe que les dépendances d'exécution (`npm install --omit=dev`) | `npm audit --omit=dev` : seules les 2 alertes de F4 restent |
| F6 | **JSON tronqué** avec un modèle à raisonnement : plan d'entretien rejeté | Fiabilité | `npm run eval` | `reasoning.effort = low`, limite de tokens relevée | évaluation : 12/12 |
| F7 | **Délais incohérents** : serveur 15 s, front 45 s, nginx 60 s, alors que le modèle gratuit met jusqu'à 75 s | Fiabilité | Test réel | Serveur 90 s, front 180 s, nginx 180 s, documentés dans `.env.example` | test réel du plan (131 s) |
| F8 | **Erreurs du fournisseur non journalisées** : un 502 était impossible à diagnostiquer | Maintenabilité | Test réel | Journal serveur du statut et d'un extrait de la réponse (jamais la clé, jamais envoyé au client) | test réel |
| F9 | **Déploiement incomplet** : `nginx.conf` visait un service `server` sans `docker-compose.yml` | Déploiement | Revue | `docker-compose.yml` (MongoDB + API + front) | `docker compose config` |
| F10 | Module 5 sans aucun test | Couverture | Revue | 13 tests ajoutés (schéma, mock, API, isolation entre clients, données envoyées au LLM) | `npm test` |

Points vérifiés **sans anomalie** : injection NoSQL (toutes les requêtes passent par Zod, les identifiants sont convertis
par Mongoose), contrôle d'accès (un client ne voit que ses véhicules, réservations et conversations : testé),
hash des mots de passe jamais renvoyé, clé API jamais exposée au navigateur, aucune trace d'erreur interne renvoyée au client.

## 4. Recommandations de refactoring

| Recommandation | Bénéfice | Statut |
|---|---|---|
| Centraliser l'appel LLM dans `runAiTask` (anonymisation, validation, relance, journal) | Un seul endroit à sécuriser et tester pour 5 modules | Fait |
| Ajouter le garde-fou anti-injection dans `runAiTask` plutôt que dans chaque prompt | Aucun module ne peut l'oublier | Fait |
| Modèle configurable avec secours (`OPENROUTER_MODEL` séparé par des virgules) | Changer de modèle sans toucher au code, résister aux 429 | Fait |
| Migrer vers React Router 7 | Supprime F4 | À faire après la soutenance |
| Appliquer Prettier sur tout le dépôt (`npm run format`) | Style uniforme | À faire |
| Rendre le plan simulé (mode démo) moins alarmiste : une intervention jamais enregistrée n'est pas forcément « en retard » | Démo plus réaliste | À faire |
