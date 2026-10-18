# API CarLoop Web

Base : `http://localhost:4000/api` (en dev, le front passe par le proxy Vite sur `/api`).

- **Auth** : `Authorization: Bearer <jwt>` (obtenu par `/auth/login` ou `/auth/register`).
- **Corps** : JSON, validé par Zod. Une entrée invalide renvoie `400 VALIDATION_ERROR` avec `details`.
- **Erreurs** : `{ "error": { "code": "NOT_FOUND", "message": "…", "details": … } }`.
- **Rate limit** : toutes les routes `/api/ai/*` sont limitées à `AI_RATE_LIMIT_PER_MIN` appels par minute,
  par utilisateur connecté (sinon par IP) → `429 RATE_LIMITED`.

Légende des accès : **public**, **optionnel** (fonctionne sans compte, enrichi si connecté), **client**,
**pro** (pro validé par l'admin), **admin**.

## Cœur

| Méthode | Route | Accès | Description |
|---|---|---|---|
| GET | `/health` | public | État du serveur, mode IA (`configured`, `mock`) et modules actifs |
| GET | `/meta` | public | Données de référence : catégories (valeur + libellé) et villes |
| POST | `/auth/register` | public | `{ name, email, password, phone?, role: "client"\|"pro", businessName?, city? }` (garage et ville obligatoires pour un pro, compte pro en attente de validation) |
| POST | `/auth/login` | public | `{ email, password }` → `{ token, user }` |
| GET | `/auth/me` | connecté | Utilisateur courant |
| GET | `/providers` | public | Garages actifs. Query : `categorie`, `ville`, `budget_max`, `limit` (≤ 50) |
| GET | `/providers/:id` | public | Fiche d'un garage (services, horaires, note) |
| GET | `/providers/mine` | pro (rôle) | Garage du pro connecté |
| PUT | `/providers/mine` | pro (rôle) | Modifie description, adresse, services, horaires |
| GET | `/admin/stats` | admin | Statistiques globales (utilisateurs, réservations, appels IA) |
| GET | `/admin/pros?status=pending` | admin | Comptes pro à valider |
| PATCH | `/admin/pros/:id` | admin | `{ approved: boolean }` |

## Module 1 — Recherche intelligente

| Méthode | Route | Accès | Description |
|---|---|---|---|
| POST | `/ai/search` | optionnel | `{ query, filtres? }` |

Si `filtres` est absent, le LLM extrait d'abord les critères de la phrase (catégorie, ville, budget,
disponibilité, critères libres), puis classe les garages candidats. Si `filtres` est fourni (filtres
manuels), l'extraction est sautée.

Réponse : `{ filtres, filtres_assouplis, resultats: [{ ...garage, justification }] }`. Les garages que le LLM
n'a pas classés sont ajoutés à la fin avec `justification: null`.
`filtres_assouplis` indique quels filtres ont été relâchés faute de résultat.

## Module 2 — Diagnostic

| Méthode | Route | Accès | Description |
|---|---|---|---|
| POST | `/ai/diagnostic` | optionnel | `{ message, conversationId?, vehicule?: { marque?, modele?, annee? }, historique? }` |
| GET | `/diagnostic/conversations` | connecté | Conversations de l'utilisateur |
| GET | `/diagnostic/conversations/:id` | connecté | Une conversation et ses messages |
| DELETE | `/diagnostic/conversations/:id` | connecté | Supprime une conversation |

Réponse : `{ conversationId, diagnostic: { reponse, causes_probables, urgence, service_recommande, conseil_securite } }`.
Connecté, la conversation est enregistrée (`conversationId`) ; anonyme, `conversationId` vaut `null`.

## Module 3 — Estimation de devis et réservations

| Méthode | Route | Accès | Description |
|---|---|---|---|
| POST | `/ai/quote-estimate` | optionnel | `{ vehicule: { marque, modele, annee, kilometrage, carburant }, categorie, service?, description?, providerId? }` → `{ estimation }` |
| GET | `/bookings/slots?providerId=&date=AAAA-MM-JJ` | public | Créneaux libres d'un garage |
| POST | `/bookings` | client | `{ providerId, serviceId, scheduledAt, vehicule, description?, estimation? }` → 201 (409 si le créneau est pris) |
| GET | `/bookings/mine` | client | Réservations du client, avec leurs devis |
| GET | `/bookings/pro?status=` | pro | Agenda du garage |
| PATCH | `/bookings/:id/status` | client ou pro | `{ status: accepted\|rejected\|completed\|cancelled, note? }` (transitions contrôlées selon le rôle) |
| POST | `/bookings/:id/quotes` | pro | `{ items: [{ label, amountTnd }], message? }` : envoie un devis |
| PATCH | `/quotes/:id` | client | `{ decision: accepted\|declined }` |

`estimation` : `{ prix_min_tnd, prix_max_tnd, pieces_probables: [{ piece, prix_estime_tnd }], main_oeuvre_heures, hypotheses, avertissement }`.
Avec `providerId`, le prix catalogue du service du garage est fourni au LLM comme référence.

## Module 4 — Avis

| Méthode | Route | Accès | Description |
|---|---|---|---|
| POST | `/ai/reviews-summary/:providerId` | public | Résumé IA des avis (mis en cache, régénéré après un nouvel avis) |
| POST | `/ai/review-reply` | pro | `{ reviewId }` → `{ propositions: [{ ton, texte }] }` (2 propositions) |
| GET | `/reviews/provider/:providerId` | public | Avis publiés (auteur abrégé « Prénom N. ») |
| GET | `/reviews/reviewable` | client | Réservations terminées pas encore notées |
| POST | `/reviews` | client | `{ bookingId, rating: 1-5, comment }` (une seule fois par réservation terminée) |
| GET | `/reviews/pro` | pro | Avis reçus par le garage |
| PUT | `/reviews/:id/reply` | pro | `{ text }` : publie la réponse du garage |

Résumé : `{ summary: { resume, sentiment_global: positif|mitige|negatif, points_forts, points_faibles, score_confiance }, reviewsCount, cached, generatedAt }`
(`summary` vaut `null` si le garage n'a aucun avis).

## Module 5 — Véhicules et plan d'entretien

Toutes les routes sont réservées au **client** propriétaire du véhicule (404 pour un autre client).

| Méthode | Route | Description |
|---|---|---|
| GET | `/vehicles` | Véhicules du client |
| POST | `/vehicles` | `{ marque, modele, annee, kilometrage, carburant, usage: urbain\|mixte\|autoroute, plaque?, surnom? }` → 201 |
| GET | `/vehicles/:id` | `{ vehicle, records, plan }` (dernier plan généré ou `null`) |
| PUT | `/vehicles/:id` | Modifie le véhicule |
| DELETE | `/vehicles/:id` | Supprime le véhicule et son historique → 204 |
| POST | `/vehicles/:id/records` | `{ date: AAAA-MM-JJ, kilometrage, intervention, categorie, coutTnd?, notes? }` → 201 (le kilométrage du véhicule suit le dernier entretien) |
| DELETE | `/vehicles/:id/records/:recordId` | Retire un entretien → 204 |
| POST | `/ai/maintenance-plan/:vehicleId` | Génère et enregistre le plan → `{ plan, generatedAt }` |

`plan` : `{ prochains_entretiens: [{ intervention, echeance_km, echeance_date, priorite: faible|moyenne|haute, categorie_service }], conseils, resume }`.
Chaque échéance est ≥ kilométrage actuel et ≥ date du jour (sinon la réponse du LLM est rejetée).
La plaque, le surnom et les coûts ne sont jamais envoyés au LLM.

## Erreurs IA

| Code | HTTP | Cause |
|---|---|---|
| `AI_TIMEOUT` | 504 | Le LLM n'a pas répondu dans `AI_TIMEOUT_MS` |
| `AI_QUOTA_EXCEEDED` | 429 | Quota OpenRouter atteint (après un nouvel essai) |
| `AI_NOT_CONFIGURED` | 503 | Pas de clé et `AI_MOCK=false` |
| `AI_INVALID_OUTPUT` | 502 | Réponse non conforme au schéma, même après la relance corrective |
| `AI_UPSTREAM_ERROR` | 502 | Erreur du fournisseur (5xx répétés, réseau) |
