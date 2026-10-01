# CarLoop Web — module M2 (Catalogue, recherche et avis) + module IA

Minimal web version of the part of CarLoop owned by **Akrem Argoubi** (M2), with an
AI module powered by **OpenRouter**. Stack: **PostgreSQL + Node/Express + React (TypeScript)**.

```
carloop-web/
├── server/   Express + TypeScript API, PostgreSQL, OpenRouter client
├── client/   React + TypeScript (Vite), Leaflet map
└── docker-compose.yml   deployment only (Dokploy)
```

## What is implemented

| M2 requirement (cahier des charges) | Where |
|---|---|
| Home with the 8 categories in a grid | `client/src/pages/Home.tsx` |
| Providers per category with starting price, rating, distance | `GET /api/providers`, `ProviderCard.tsx` |
| Keyword search, filters (price, rating, distance, availability), sort | `Providers.tsx`, `server/src/providers.service.ts` |
| Provider page: photo, services and prices, opening hours | `ProviderDetail.tsx`, `GET /api/providers/:id` |
| Providers on a map around the client, favourites | `ProvidersMap.tsx`, `/api/favorites/:id` |
| Rating and reviews, shown on the provider page | `/api/providers/:id/reviews` |

Out of scope here (other modules): accounts/auth (M1), booking and payment (M3),
tracking (M4), pro space and admin (M5). The logged-in client is **stubbed**: the API reads
the `x-user-id` header (the client always sends `1`, the seeded demo client). When M1 lands,
replace `currentUser` in `server/src/http.ts` with real JWT/session auth.

## AI module (OpenRouter)

Both features call OpenRouter **from the backend only**, so the API key never reaches the browser.

1. **Review summary** — `POST /api/ai/review-summary {providerId}`. Button on the provider page.
   Returns `{resume, points_forts, points_faibles, mots_cles}`.
2. **Assistant** — `POST /api/ai/assistant {message}`. Box on the home page: the client describes a
   problem ("mes freins grincent"), the AI picks the best service category and search keywords.

How the rules of the mini-projet are met:

| Rule | Implementation |
|---|---|
| No raw personal data sent to the LLM | `server/src/ai/privacy.ts` redacts e-mails, phone numbers, plates and URLs; reviews are sent as `[note/5] text` with **no author name or id** |
| Output validated before display | Answer parsed as JSON and checked with Zod (`ai/prompts.ts`); lists trimmed; the assistant may only return a category slug that exists in the DB |
| API error handling | `ai/openrouter.ts`: missing key → 503, 401/403 → bad key, 402/429 → quota, 20 s timeout → 504, bad JSON → 502. The UI shows a French message for each |
| Prompt injection | Untrusted text is wrapped in `<avis>` / `<message>` tags, `<` `>` are stripped, and the system prompt says it is data, not instructions |
| Cost control | 10 AI requests/min per IP, identical review summaries are cached in memory |

The prompts are in [server/src/ai/prompts.ts](server/src/ai/prompts.ts) (use them in the report).

---

# Step-by-step: run it locally (no Docker)

### Prerequisites
- Node.js 20+ (you have 24)
- A PostgreSQL database. Pick one:
  - **Local install**: <https://www.postgresql.org/download/windows/> (remember the `postgres` password), or
  - **Free hosted**: [Neon](https://neon.tech) or [Supabase](https://supabase.com) — copy the connection string and set `DATABASE_SSL=true`.
- An OpenRouter key: <https://openrouter.ai/keys> (the app works without it; only the AI buttons show an error).

### 1. Create the database
With a local Postgres, create an empty database (pgAdmin, or `psql -U postgres -c "CREATE DATABASE carloop;"`).
Tables and demo data are created automatically.

### 2. Configure and start the API
```bash
cd carloop-web/server
npm install
copy .env.example .env        # then edit .env: DATABASE_URL and OPENROUTER_API_KEY
npm run dev                   # http://localhost:4000
```
On start it creates the schema and seeds 8 categories, 8 providers and sample reviews
(only if the DB is empty). `GET http://localhost:4000/api/health` should return `{"ok":true,"ai":true}`.

### 3. Start the web app (second terminal)
```bash
cd carloop-web/client
npm install
npm run dev                   # http://localhost:5173
```
Vite proxies `/api` to the API, so there is nothing else to configure.

### 4. Try it
1. Home → click **Vidange** → results sorted by distance, then try price/rating filters and the **Carte** toggle.
2. Open **Garage El Mechtel** → **Résumer les avis** (AI) → post your own review.
3. Home → type *"mes freins grincent quand je ralentis"* → the assistant suggests **Mécanique lourde**.

Useful commands: `npm run typecheck` (both folders), `npm run build` (both), `npm run db:setup` in `server/` (re-run schema/seed manually).

### Choosing the model
Set `OPENROUTER_MODEL` in `server/.env`. Default `openai/gpt-4o-mini` (cheap, reliable JSON).
Any model from <https://openrouter.ai/models> works; free `:free` models are rate-limited and sometimes ignore JSON mode
(the backend extracts JSON from the text and validates it, so occasional failures show the "Réponse IA invalide" message).

---

# Deploying on Dokploy

`docker-compose.yml` runs three services: `db` (Postgres 16 with a volume), `server`, and `client`
(nginx serving the React build and proxying `/api` to `server`, so one domain serves everything).

1. Push this repo to GitHub.
2. Dokploy → **Create Service → Compose** → Provider **GitHub**, repo + branch, **Compose path**: `./carloop-web/docker-compose.yml`
   (Dokploy uses the compose file's folder as build context root, so the relative `./server` and `./client` paths work).
3. **Environment** tab: `POSTGRES_PASSWORD`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `APP_URL` (see `.env.example`).
4. **Domains** tab: add your domain → service `client`, port `80`, HTTPS on.
5. Deploy. The server creates and seeds the database on first start.

Nothing in the compose file publishes a host port: Dokploy's Traefik routes to the container port.
