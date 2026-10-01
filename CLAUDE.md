# CLAUDE.md — CarLoop Web

Ce fichier définit le contexte et les règles **communes à toute l'équipe** (et aux assistants IA).
Toute contribution doit les respecter. En cas de doute, demander à Firas (architecture/backend).

## Contexte

CarLoop Web est une plateforme où les **clients** trouvent et réservent des services auto
(lavage, vidange, pneus, clim, électricité, carrosserie, mécanique, dépannage), et où les
**professionnels** gèrent leurs garages, services et réservations.

Mini-projet du cours **« IA for Software Engineering » (ESPRIT)** : application web (front + back)
avec un module IA. Le rapport doit présenter les modèles IA utilisés.

Ce projet est **indépendant** du projet mobile CarLoop (Flutter) : ne pas réutiliser son code
ni son cahier des charges.

## Équipe et responsabilités

| Membre  | Périmètre |
|---------|-----------|
| Firas   | Architecture, backend de base (auth, garages, services, réservations), recherche sémantique (modèle d'embeddings) |
| Akrem   | Module IA de diagnostic par LLM (`POST /api/ai/diagnose`, via OpenRouter) |
| Aziz    | Front client (`/client`) |
| Amine   | Espace pro (front) + avis (`POST /api/reviews`, résumé IA des avis) |
| Yassine | Tests, CI, déploiement |

## Stack

- **Backend** : Node.js 24 + Express 5 + TypeScript 6 (dossier `/server`)
- **ORM** : Prisma 6 + PostgreSQL 16 (via `server/docker-compose.yml`)
- **Validation** : Zod 4
- **Auth** : JWT (`jsonwebtoken`) + `bcrypt`
- **Modèle IA (recherche)** : `Xenova/multilingual-e5-small` exécuté **en local** via
  `@huggingface/transformers` (ONNX int8, vecteurs de 384 dimensions). Choisi après comparaison de 4 modèles,
  voir `docs/MODEL.md`. Tout changement de modèle impose `npm run reindex` puis `npm run eval` (recalibrer le seuil).
- **Tests** : Jest + Supertest (base PostgreSQL de test dédiée)
- **Frontend** : React + Vite + TypeScript (dossier `/client`)

## Architecture backend

```
server/src/
  config/        env.ts (validation Zod des variables), prisma.ts (client unique)
  routes/        déclaration des routes + middlewares (aucune logique)
  controllers/   lecture/validation des entrées (Zod) → appel service → réponse HTTP
  services/      logique métier + accès données via Prisma (contrôle de propriété ici)
  middlewares/   authenticate, authorize, rate-limit, error-handler, not-found
  schemas/       schémas Zod (body, query, params)
  utils/         async-handler, http-error, validate, logger, mappers…
  scripts/       seed, reindex, eval
server/eval/     queries.json (jeu d'évaluation), results.md (généré)
server/tests/    tests Jest + Supertest
```

Flux obligatoire : **routes → controllers → services → Prisma**. Un controller n'importe jamais
Prisma ; un service n'importe jamais `express`.

## Règles (CONTRAINTES)

1. **ES2024** : `const`/`let`, `async`/`await`, jamais de callbacks.
2. **Aucun `any`** : types explicites partout, `strict` activé (lint : `no-explicit-any` = erreur).
3. **Toute entrée utilisateur est validée avec Zod** avant traitement (body, query, params),
   via `validate(schema, data)` dans le controller.
4. **Gestion d'erreurs centralisée** (`middlewares/error-handler.ts`) : codes 400/401/403/404/409/429/500/501.
   Lever une `HttpError` (`utils/http-error.ts`). Les réponses d'erreur n'exposent **jamais**
   de stack trace ni de détail interne. Format : `{ "error": { "code", "message", "details?" } }`.
5. **Architecture en couches** (SOLID, SRP) : voir ci-dessus.
6. **JSDoc sur chaque fonction exportée.**
7. **Aucun secret en dur** : tout passe par `process.env`, validé dans `config/env.ts`.
   L'application refuse de démarrer si une variable obligatoire manque.
   Ne jamais lire `process.env` ailleurs que dans `config/env.ts` (sauf scripts de test).
8. **Prisma uniquement**, jamais de SQL brut concaténé.
9. **Mots de passe hachés avec bcrypt** ; le hash n'est **jamais** renvoyé par l'API
   (utiliser les `select` publics des services).
10. **Contrôle d'accès** : un PRO ne modifie que ses propres garages/services ; un CLIENT ne
    voit que ses propres réservations. Les vérifications de propriété sont faites dans la
    couche `services/`.
11. **Le modèle de recherche tourne en local** : aucune donnée utilisateur envoyée à un service
    externe (seul le téléchargement initial des poids depuis Hugging Face sort du serveur).
    *Exception documentée* : le module de diagnostic (Akrem) appelle un LLM via OpenRouter ;
    il ne doit envoyer **que le texte du symptôme et les infos véhicule**, jamais de donnée
    personnelle (nom, email, téléphone, id).
12. **Pas de dépendance inutile** : toute nouvelle dépendance doit être justifiée dans la PR.

## Conventions

- Routes asynchrones enveloppées dans `asyncHandler`.
- Utilisateur courant : `requireUser(req)` (lève 401 si absent), jamais `req.user!`.
- Les embeddings ne sont **jamais** renvoyés par l'API (utiliser `serviceSelect`).
- Les prix sont stockés en `Decimal(10,3)` (TND) et renvoyés en `number`.
- Rate limiting : `authLimiter`, `searchLimiter`, `aiLimiter` (`middlewares/rate-limit.ts`),
  désactivés quand `NODE_ENV=test`.
- Les tests **ne téléchargent jamais le modèle** : `embedding.service` est toujours mocké.
- Commits : Conventional Commits (`feat:`, `fix:`, `test:`, `docs:`, `chore:`, `refactor:`).

## Commandes (depuis `/server`)

```bash
docker compose up -d          # PostgreSQL (dev + base de test)
npm run db:migrate            # migrations Prisma (dev)
npm run seed                  # données factices + indexation des embeddings
npm run dev                   # serveur en watch (http://localhost:3000)
npm run build                 # compilation TypeScript
npm test                      # tests Jest (base de test, modèle mocké)
npm run lint                  # ESLint
npm run reindex               # recalcule les embeddings de tous les services
npm run eval                  # évaluation du modèle → eval/results.md
```
