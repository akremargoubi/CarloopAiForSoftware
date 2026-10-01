# API CarLoop Web

Base URL : `http://localhost:3000/api` · Format : JSON · Auth : `Authorization: Bearer <token>`

## Conventions

**Erreurs** — toutes les erreurs ont la même forme, sans stack trace ni détail interne :

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Données invalides",
             "details": [{ "path": "email", "message": "Email invalide" }] } }
```

| Code HTTP | `error.code` | Quand |
|---|---|---|
| 400 | `VALIDATION_ERROR` / `BAD_REQUEST` | Entrée invalide (Zod), JSON mal formé |
| 401 | `UNAUTHORIZED` | Token absent, invalide ou expiré ; identifiants incorrects |
| 403 | `FORBIDDEN` | Rôle non autorisé ou ressource d'un autre utilisateur |
| 404 | `NOT_FOUND` | Ressource ou route inexistante |
| 409 | `CONFLICT` | Email déjà utilisé, transition de statut invalide, suppression bloquée par des réservations |
| 413 | `PAYLOAD_TOO_LARGE` | Corps > 100 ko |
| 429 | `TOO_MANY_REQUESTS` | Limite de débit atteinte |
| 500 | `INTERNAL_ERROR` | Erreur inattendue (journalisée côté serveur) |
| 501 | `NOT_IMPLEMENTED` | Fonctionnalité pas encore disponible |

**Pagination** — query `page` (≥ 1, défaut 1) et `pageSize` (1..50, défaut 20). Réponse :
`{ items, total, page, pageSize, totalPages }`.

**Identifiants** — cuid (ex. `cmg7x2k0f0000abcd1234efgh`) ; un id mal formé renvoie 400.

**Prix** — en dinars tunisiens (number, 3 décimales max).

**Rate limiting** — `/auth/login` et `/auth/register` : 10 req / 15 min / IP ;
`/services/search` : 30 req / min / IP ; `/ai/diagnose` : 3 req / min / utilisateur,
20 / jour / utilisateur, 45 / jour au total. En-têtes `RateLimit` (draft-8) renvoyés.

### Objets

```ts
User        { id, email, firstName, lastName, phone: string | null, role: 'CLIENT'|'PRO'|'ADMIN', createdAt }
Garage      { id, name, address, city, description, ownerId, createdAt, updatedAt, _count: { services } }
Service     { id, garageId, category, title, description, price, durationMinutes, createdAt, updatedAt,
              garage: { id, name, city, address } }
Reservation { id, scheduledAt, status: 'PENDING'|'CONFIRMED'|'CANCELLED'|'DONE', note, createdAt, updatedAt,
              client: { id, firstName, lastName, phone },
              service: { id, title, category, price, durationMinutes, garage: { id, name, city, address } } }
```

`category` ∈ `LAVAGE`, `VIDANGE`, `PNEUS`, `CLIM`, `ELECTRICITE`, `CARROSSERIE`, `MECANIQUE`, `DEPANNAGE`.

---

## Santé

### `GET /health` — public
`200` `{ "status": "ok", "embeddingModel": "ready" | "loading" | "failed" | "disabled" | "idle" }`

---

## Authentification

### `POST /auth/register` — public
Body :
```json
{ "email": "sana@example.tn", "password": "8 à 72 caractères", "firstName": "Sana", "lastName": "Ben Ali",
  "phone": "+216 20 123 456", "role": "CLIENT" }
```
`phone` optionnel ; `role` ∈ `CLIENT` (défaut) | `PRO` (ADMIN interdit). Email normalisé en minuscules.
- `201` `{ "user": User, "token": "<jwt>" }`
- `400` entrée invalide · `409` email déjà utilisé · `429`

### `POST /auth/login` — public
Body : `{ "email", "password" }`
- `200` `{ "user": User, "token": "<jwt>" }`
- `400` · `401` « Email ou mot de passe incorrect » (message générique) · `429`

### `GET /auth/me` — connecté
- `200` `{ "user": User }` · `401`

> Le hash du mot de passe n'est jamais renvoyé. Durée du token : `JWT_EXPIRES_IN` (défaut 1 jour).

---

## Garages

| Méthode | URL | Rôle | Body / Query | Succès | Erreurs |
|---|---|---|---|---|---|
| GET | `/garages` | public | `?ville&page&pageSize` | `200` paginé de `Garage` | 400 |
| GET | `/garages/mine` | PRO | — | `200` `{ items: Garage[] }` | 401, 403 |
| GET | `/garages/:id` | public | — | `200` `Garage & { services: Service[] }` | 400, 404 |
| POST | `/garages` | PRO | `{ name, address, city, description }` | `201` `Garage` | 400, 401, 403 |
| PATCH | `/garages/:id` | PRO propriétaire (ou ADMIN) | champs partiels (≥ 1) | `200` `Garage` | 400, 401, 403, 404 |
| DELETE | `/garages/:id` | PRO propriétaire (ou ADMIN) | — | `204` | 401, 403, 404, 409 (réservations existantes) |

Contraintes : `name` 2..100, `address` 5..200, `city` 2..60, `description` 10..1000. Filtre `ville` insensible à la casse.

---

## Services

| Méthode | URL | Rôle | Body / Query | Succès | Erreurs |
|---|---|---|---|---|---|
| GET | `/services` | public | `?categorie&ville&garageId&page&pageSize` | `200` paginé de `Service` | 400 |
| GET | `/services/search` | public | `?q&ville&limit` (voir ci-dessous) | `200` | 400, 429 |
| GET | `/services/:id` | public | — | `200` `Service` | 400, 404 |
| POST | `/services` | PRO propriétaire du garage (ou ADMIN) | `{ garageId, category, title, description, price, durationMinutes }` | `201` `Service` | 400, 401, 403, 404 (garage) |
| PATCH | `/services/:id` | PRO propriétaire (ou ADMIN) | champs partiels (≥ 1, sauf `garageId`) | `200` `Service` | 400, 401, 403, 404 |
| DELETE | `/services/:id` | PRO propriétaire (ou ADMIN) | — | `204` | 401, 403, 404, 409 (réservations existantes) |

Contraintes : `title` 3..120, `description` 10..2000, `price` > 0 (≤ 100 000), `durationMinutes` 5..1440.
À chaque création / modification du texte (titre, catégorie, description), l'embedding du service est recalculé.

### `GET /services/search` — recherche sémantique — public

| Paramètre | Type | Règle |
|---|---|---|
| `q` | string | obligatoire, 1..300 caractères (après trim) |
| `ville` | string | optionnel, 2..60 caractères, insensible à la casse |
| `limit` | int | optionnel, 1..20, défaut 5 |
| `mode` | string | optionnel : `auto` (défaut, sémantique avec repli) ou `keyword` (force les mots-clés, pour comparer) |

Réponse `200` — mode sémantique :
```json
{
  "mode": "semantic",
  "query": "bruit quand je freine",
  "minScore": 0.83,
  "results": [
    { "score": 0.8646, "service": { "id": "…", "title": "Diagnostic bruit moteur et fuite d’huile",
      "category": "MECANIQUE", "price": 60, "durationMinutes": 60, "garage": { "name": "Cap Bon Garage", "city": "Nabeul", … }, … } },
    { "score": 0.8499, "service": { "title": "Réparation de l’échappement", … } },
    { "score": 0.8494, "service": { "title": "Remplacement plaquettes et disques de frein", … } }
  ]
}
```

Réponse `200` — repli mots-clés (modèle non chargé, en échec ou trop lent) :
```json
{ "mode": "keyword", "query": "plaquettes de frein", "fallbackReason": "model_unavailable", "results": [ … ] }
```
`fallbackReason` ∈ `model_unavailable` | `model_error` | `requested` (`mode=keyword`). En mode mots-clés, `score` = proportion des mots de la requête retrouvés.

- Les résultats sous le seuil `minScore` (`SEARCH_MIN_SCORE`) ne sont pas renvoyés : `results: []` = aucun service pertinent.
- `400` : `q` absent, vide ou > 300 caractères. `429` : limite de débit.

---

## Réservations (toutes authentifiées)

| Méthode | URL | Rôle | Body / Query | Succès | Erreurs |
|---|---|---|---|---|---|
| POST | `/reservations` | CLIENT | `{ serviceId, scheduledAt, note? }` | `201` `Reservation` (`PENDING`) | 400, 401, 403, 404 (service) |
| GET | `/reservations/mine` | connecté | `?status` | `200` `{ items: Reservation[] }` | 400, 401 |
| PATCH | `/reservations/:id/status` | voir règles | `{ status }` | `200` `Reservation` | 400, 401, 403, 404, 409 |

- `scheduledAt` : date ISO 8601 **avec fuseau** et **dans le futur** (ex. `2026-11-05T09:30:00+01:00`) ; `note` ≤ 500 caractères.
- `GET /mine` : un **CLIENT** voit ses réservations, un **PRO** celles des services de ses garages, un ADMIN toutes.
- Changement de statut :

| Acteur | Transitions autorisées | Sinon |
|---|---|---|
| PRO propriétaire du service (ou ADMIN) | `PENDING → CONFIRMED | CANCELLED`, `CONFIRMED → DONE | CANCELLED` | `409` |
| CLIENT auteur de la réservation | `PENDING → CANCELLED` uniquement | `403` |
| Tout autre utilisateur | — | `403` |

---

## IA — Diagnostic (Akrem)

### `POST /ai/diagnose` — CLIENT — **stub, renvoie 501**
Body (déjà validé) :
```json
{ "symptom": "10 à 1000 caractères",
  "vehicle": { "brand": "Peugeot", "model": "208", "year": 2016, "mileageKm": 120000, "fuel": "DIESEL" } }
```
`vehicle` et chacun de ses champs sont optionnels ; `fuel` ∈ `ESSENCE`, `DIESEL`, `HYBRIDE`, `ELECTRIQUE`, `GPL`.
- Actuel : `501 NOT_IMPLEMENTED` · `400` · `401` · `403` (non CLIENT) · `429`
- Cible : `200` `DiagnoseResult` (voir `server/src/services/ai.service.ts`).

---

## À venir

| Endpoint | Responsable | Notes |
|---|---|---|
| `POST /reviews` | **Amine** | CLIENT, une seule review par réservation `DONE` (contrainte unique en base), note 1..5 |
| Résumé IA des avis d'un garage | **Amine** | Modèle `Review` déjà présent |
| `POST /ai/diagnose` (implémentation) | **Akrem** | LLM via OpenRouter, table `Diagnostic` déjà présente |
