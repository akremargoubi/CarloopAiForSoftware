# CLAUDE.md — CarLoop Web

Contexte et règles **communes à toute l'équipe** (et aux assistants IA). Toute contribution doit les respecter.

## Contexte

CarLoop Web : plateforme tunisienne où les **clients** trouvent, réservent et entretiennent leur véhicule,
et où les **professionnels** (garages) gèrent services, réservations, devis et avis. Un **admin** valide
les comptes pro. Mini-projet **« IA for Software Engineering » (ESPRIT)** : 5 modules d'IA générative
(voir [`docs/AI.md`](docs/AI.md)). Interface et données en **français** ; prix en **TND**.

## Stack

- Monorepo npm workspaces : `server/` et `client/`, Node ≥ 20, TypeScript strict, ESM.
- **Serveur** : Express 4, Mongoose 8 (MongoDB), Zod 3, JWT + bcryptjs, helmet, express-rate-limit.
- **IA** : LLM via l'API OpenRouter (compatible OpenAI), appelé uniquement par `server/src/ai/`.
- **Client** : React 18, Vite, React Router, TanStack Query, axios, Tailwind.
- **Tests** : Vitest partout ; Supertest + `mongodb-memory-server` côté serveur, Testing Library côté client.

## Architecture : un cœur + des modules indépendants

```
server/src/
  core/            config (seul lecteur de process.env), db, errors, constants, middlewares,
                   auth, users, providers, admin, seed commun, helpers de test
  ai/              couche IA partagée : runAiTask, llmClient, anonymizer, jsonExtract, AiLog
  features/<nom>/  un dossier par module : routes, controller, service, schema, model,
                   prompt, mock, seed, tests/
  features/index.ts  registre : UNE ligne par module (commenter = désactiver)

client/src/
  core/            api (axios), auth, layout, composants UI, pages communes, slots
  features/<nom>/  module.tsx (routes, liens de menu, slots, widgets), api.ts, components/, pages/, tests/
  features/routes.tsx  registre : UNE ligne par module
```

- Flux serveur : **routes → controller → service → modèle Mongoose**. Les routes déclarent les
  middlewares (auth, rôle, validation) ; le controller lit la requête et répond ; la logique métier et
  le **contrôle de propriété** sont dans le service.
- **Un module n'importe jamais un autre module.** Il ne dépend que de `core/` et `ai/`. Les échanges passent
  par l'API (ex. le formulaire de réservation lit `GET /api/vehicles`), par les URL
  (`/reserver?categorie=…&vehicule=…`) ou par les **slots** du client (`provider.sections`, `home.hero`…).
  Si un module a besoin des données d'un autre, il lit la collection MongoDB partagée, sans importer son code.
- Contrat serveur : `FeatureModule { name, router, seed? }` (`core/types/feature.ts`), router monté sous `/api`.
  Contrat client : `ClientFeature` (`client/src/core/types/feature.ts`).

## Couche IA (obligatoire pour tout appel LLM)

Tout appel passe par `runAiTask(nom, systemPrompt, message, schemaZod, { mock, knownNames })` :
anonymisation → appel LLM (timeout, nouvel essai sur 429/5xx) → extraction du JSON → **validation Zod** →
une seule relance corrective si la réponse est invalide → journal `AiLog` (sans donnée personnelle).

1. Chaque module fournit : un **prompt versionné** (`prompt.ts`), un **schéma Zod** de sortie (`schema.ts`) et
   un **mock** déterministe (`mock.ts`) qui doit passer le même schéma.
2. **N'envoyer au LLM que les données utiles** : jamais d'email, téléphone, plaque, identifiant, nom
   ni coût personnel. Passer les noms connus dans `knownNames` pour qu'ils soient masqués.
3. Vérifier en plus la cohérence avec le contexte quand c'est possible (ex. `prix_min ≤ prix_max`,
   échéance ≥ kilométrage actuel) via `superRefine`.
4. Erreurs typées converties en HTTP : `AI_TIMEOUT` 504, `AI_QUOTA_EXCEEDED` 429, `AI_NOT_CONFIGURED` 503,
   `AI_INVALID_OUTPUT` 502, `AI_UPSTREAM_ERROR` 502. Le client les affiche avec `AiErrorDisplay`.
5. La clé OpenRouter reste côté serveur ; le navigateur ne parle jamais au LLM.

## Règles

1. **Aucun `any`** (lint : erreur). Types explicites aux frontières (API, modèles).
2. **Toute entrée est validée par Zod** : `validateBody(schema)` dans les routes ; les paramètres
   d'URL (`:id`) sont validés dans le controller.
3. **Erreurs centralisées** : lever `badRequest`/`unauthorized`/`forbidden`/`notFound`/`conflict`
   (`core/errors.ts`). Format : `{ "error": { "code", "message", "details?" } }`, jamais de stack trace.
4. Routes asynchrones dans `asyncHandler` ; utilisateur courant via `requireUser(req)`.
5. **Aucun secret en dur** : `process.env` n'est lu que dans `core/config.ts`.
6. Mots de passe hachés (bcryptjs) ; le hash n'est jamais renvoyé. Les services renvoient des objets
   publics (`toPublic…`), jamais le document Mongoose brut.
7. **Contrôle d'accès** : un client ne voit que ses véhicules, réservations et conversations ; un pro ne
   gère que son garage, et doit être validé (`requireApprovedPro`) pour agir.
8. Imports relatifs serveur avec l'extension **`.js`** (ESM). Alias `@/` côté client.
9. Pas de dépendance nouvelle sans justification.
10. Commentaires de code en anglais, textes visibles par l'utilisateur en français.

## Tests

- Chaque module a au minimum `tests/schema.test.ts` (schéma + mock) et `tests/<nom>.api.test.ts`
  (parcours métier, contrôle d'accès, et réponse LLM invalide simulée avec `vi.stubGlobal('fetch', …)`).
- Les tests ne font **jamais** d'appel réseau réel ; chaque fichier de test a sa propre base en mémoire.
- Commits : Conventional Commits (`feat(maintenance): …`, `fix:`, `test:`, `docs:`, `chore:`).

## Commandes (racine)

```bash
npm run dev        # serveur (4000) + client (5173)
npm test           # tous les tests
npm run lint       # ESLint
npm run build      # build complet
npm run seed       # réinitialise la base de démo
npm run typecheck -w server
```
