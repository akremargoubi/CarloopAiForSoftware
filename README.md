# CarLoop Web

Plateforme de réservation de services auto (lavage, vidange, pneus, clim, électricité, carrosserie,
mécanique, dépannage) avec **recherche sémantique locale** : le client décrit son problème avec ses
mots (« bruit quand je freine ») et obtient les services pertinents.

Mini-projet du cours **IA for Software Engineering** (ESPRIT).

| Dossier | Contenu |
|---|---|
| [`server/`](server/) | API REST Node.js / Express / TypeScript / Prisma + modèle d'embeddings local |
| [`client/`](client/) | Frontend React + Vite (à venir, voir [`client/README.md`](client/README.md)) |
| [`docs/API.md`](docs/API.md) | Référence de tous les endpoints |
| [`docs/MODEL.md`](docs/MODEL.md) | Modèle IA de recherche : choix, fonctionnement, évaluation (pour le rapport) |
| [`CLAUDE.md`](CLAUDE.md) | **Règles communes de l'équipe** (à lire avant de coder) |

## Prérequis

- **Node.js ≥ 22.12** (testé avec Node 24)
- **Docker Desktop** (pour PostgreSQL), démarré
- ~150 Mo d'espace disque pour le modèle (téléchargé une seule fois)

## Lancer le projet en 5 minutes

```bash
cd server

# 1. Configuration : copier l'exemple puis remplir les valeurs <...>
cp .env.example .env
#    - POSTGRES_PASSWORD : n'importe quel mot de passe local (le reporter dans DATABASE_URL et TEST_DATABASE_URL)
#    - JWT_SECRET        : node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
#    - SEED_USER_PASSWORD: mot de passe des comptes de démo

# 2. Dépendances
npm install

# 3. Base de données PostgreSQL (Docker, lit server/.env)
docker compose up -d

# 4. Migrations Prisma (crée les tables + génère le client)
npm run db:migrate

# 5. Données de démo + indexation des embeddings
#    (le 1er lancement télécharge le modèle ~115 Mo dans server/.model-cache/)
npm run seed

# 6. Serveur de développement → http://localhost:3000/api
npm run dev
```

Vérification : `curl http://localhost:3000/api/health` → `{"status":"ok","embeddingModel":"ready"}`
puis `curl "http://localhost:3000/api/services/search?q=bruit%20quand%20je%20freine"`.

> Si le port 3000 est déjà utilisé, changer `PORT` dans `server/.env` (et adapter les URL ci-dessous).

## Démo (soutenance) — sans le front

Ouvrir **http://localhost:3000/demo/** (page servie par le backend, même origine que l'API) :

1. **Recherche sémantique** : cliquer sur un exemple ou taper un problème → résultats avec score cosinus,
   seuil, et **comparaison côte à côte avec la recherche par mots-clés**.
   Lien direct possible : `/demo/?q=bruit%20quand%20je%20freine&ville=Sousse`.
2. **Réservation** : se connecter en `client1@carloop.test` (mot de passe = `SEED_USER_PASSWORD`) →
   « Réserver » sur un résultat → la réservation apparaît en *En attente*.
   Le bouton « Confirmer (interdit → 403) » montre le contrôle d'accès.
3. **Côté pro** : se déconnecter, se connecter avec le PRO propriétaire du garage (voir la liste) → « Confirmer »
   puis « Terminer » ; « Revenir en attente » montre une transition invalide (409).
4. **Repli** : arrêter le serveur, mettre `EMBEDDING_ENABLED=false` dans `server/.env`, relancer → la recherche
   affiche le mode `keyword` (raison : modèle indisponible). Remettre `true` ensuite.

Le journal noir en bas de page affiche chaque appel HTTP réel et son code de retour.

Requêtes qui illustrent bien le modèle : « voiture en panne sur l'autoroute », « la clim sent le moisi »,
« j'ai laissé mes clés dans la voiture fermée », « recette de couscous » (hors sujet → aucun résultat).

## Comptes de démo (créés par le seed, données factices)

| Rôle | Email | Mot de passe |
|---|---|---|
| ADMIN | `admin@carloop.test` | valeur de `SEED_USER_PASSWORD` |
| PRO | `pro1@carloop.test` … `pro8@carloop.test` | idem |
| CLIENT | `client1@carloop.test` … `client4@carloop.test` | idem |

## Commandes utiles (depuis `server/`)

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur en mode watch |
| `npm run build` / `npm start` | Compilation TypeScript / lancement de la version compilée |
| `npm test` | Tests Jest + Supertest (base `TEST_DATABASE_URL`, créée automatiquement ; modèle **toujours mocké**) |
| `npm run lint` / `npm run typecheck` | ESLint (`no-explicit-any`) / vérification des types |
| `npm run db:migrate` | Crée/applique une migration en dev (`-- --name <nom>`) |
| `npm run db:deploy` | Applique les migrations (CI / production) |
| `npm run seed` | Réinitialise la base de dev avec les données de démo puis indexe |
| `npm run reindex` | Recalcule les embeddings de tous les services |
| `npm run eval` | Évalue la recherche (précision@3, MRR) vs mots-clés → `server/eval/results.md` |

## Notes pour l'équipe

- **Akrem** : le contrat du diagnostic est dans `server/src/services/ai.service.ts`, la route
  `POST /api/ai/diagnose` existe déjà (stub 501, validation Zod et `aiLimiter` en place).
  Variables `OPENROUTER_API_KEY` et `OPENROUTER_MODELS` prévues dans `.env.example`.
- **Aziz / Amine** : voir [`docs/API.md`](docs/API.md). La recherche renvoie `mode` (`semantic` |
  `keyword`) ; une liste vide en mode sémantique signifie « aucun service assez pertinent ».
  Les avis (`POST /api/reviews`) sont à implémenter par Amine (le modèle `Review` existe).
- **Yassine (CI)** : la CI a besoin d'un PostgreSQL et des variables `DATABASE_URL`,
  `TEST_DATABASE_URL` (peuvent être identiques en CI avec `CI=true`) et `JWT_SECRET` ; enchaîner
  `npm ci && npx prisma generate && npm run lint && npm run typecheck && npm test && npm run build`.
  Les tests ne téléchargent jamais le modèle. Derrière un reverse proxy, mettre `TRUST_PROXY=true`.
- Ne jamais commiter `.env` ni `.model-cache/` (déjà dans `.gitignore`).
