# CarLoop Web

Plateforme tunisienne de services automobiles (lavage, vidange, pneus, climatisation, électricité,
carrosserie, mécanique, dépannage) : les **clients** trouvent un garage, réservent et suivent l'entretien
de leurs véhicules ; les **professionnels** gèrent leur garage, leurs réservations et leurs avis.

Mini-projet du cours **IA for Software Engineering** (ESPRIT, A.U. 2026-2027). L'application intègre
**5 modules d'IA** générative, tous construits sur une couche IA commune (anonymisation, validation Zod,
gestion des erreurs, journalisation).

| Module | Ce que fait l'IA | Endpoint |
|---|---|---|
| 1. Recherche intelligente | Comprend une demande en langage naturel (« la clim sent mauvais, Sousse, samedi matin ») et classe les garages | `POST /api/ai/search` |
| 2. Diagnostic | Chatbot qui donne les causes probables d'un symptôme, l'urgence et le bon service | `POST /api/ai/diagnostic` |
| 3. Estimation de devis | Fourchette de prix indicative avant réservation (pièces, main d'œuvre, hypothèses) | `POST /api/ai/quote-estimate` |
| 4. Analyse des avis | Résumé des avis d'un garage + 2 propositions de réponse pour le pro | `POST /api/ai/reviews-summary/:id`, `POST /api/ai/review-reply` |
| 5. Plan d'entretien | Calendrier d'entretien personnalisé selon le véhicule, l'usage et l'historique | `POST /api/ai/maintenance-plan/:vehicleId` |

| Dossier | Contenu |
|---|---|
| [`server/`](server/) | API REST Express + TypeScript + MongoDB (Mongoose) |
| [`client/`](client/) | Front React + Vite + TypeScript + Tailwind |
| [`docs/API.md`](docs/API.md) | Référence des endpoints |
| [`docs/AI.md`](docs/AI.md) | Couche IA et détail des 5 modules (pour le rapport) |
| [`CLAUDE.md`](CLAUDE.md) | Règles communes de l'équipe (à lire avant de coder) |

## Prérequis

- **Node.js ≥ 20**
- **MongoDB** : local (`mongodb://localhost:27017`), Docker ou MongoDB Atlas
- Optionnel : une clé **OpenRouter**. Sans clé, l'application tourne en **mode démo** (réponses simulées).

## Lancer le projet

```bash
npm install                                # installe server/ et client/ (workspaces npm)

cp server/.env.example server/.env         # puis remplir JWT_SECRET (voir le commentaire dans le fichier)
cp client/.env.example client/.env

npm run seed                               # vide la base puis crée les données de démo
npm run dev                                # API → http://localhost:4000/api, front → http://localhost:5173
```

Vérification : `curl http://localhost:4000/api/health` →
`{"status":"ok","ai":{"configured":false,"mock":true},"features":["diagnostic","maintenance","quotes","reviews","search"]}`.

Pas de MongoDB installé ? `docker run -d --name carloop-mongo -p 27017:27017 mongo:7`.

### Avec Docker (tout-en-un)

```bash
JWT_SECRET=<chaine-aleatoire-de-32-caracteres> docker compose up --build
docker compose exec server npm run seed:prod   # données de démo
```

Front sur http://localhost:8080 (nginx redirige `/api` vers le serveur).

## IA : mode démo ou LLM réel

| Variable (`server/.env`) | Rôle |
|---|---|
| `OPENROUTER_API_KEY` | Clé OpenRouter. Vide → mode démo si `AI_MOCK=true`, sinon erreur `AI_NOT_CONFIGURED` |
| `OPENROUTER_MODEL` | Modèle utilisé (ex. `openai/gpt-4o-mini`) |
| `AI_MOCK` | `true` : réponses simulées quand aucune clé n'est fournie |
| `AI_TIMEOUT_MS` | Délai maximum d'un appel LLM (défaut 15 s) |
| `AI_RATE_LIMIT_PER_MIN` | Appels IA autorisés par utilisateur (ou IP) et par minute |

Les réponses simulées passent par la même validation que les vraies : la démo reste représentative.

## Comptes de démo (créés par `npm run seed`)

| Rôle | Email | Mot de passe |
|---|---|---|
| Admin | `admin@carloop.tn` | `Admin123!` |
| Client | `client1@carloop.tn` … `client5@carloop.tn` | `Client123!` |
| Pro | `pro1@carloop.tn` … `pro6@carloop.tn` | `Pro12345!` (`pro6` est en attente de validation) |

`client1` possède deux véhicules avec un historique d'entretien (module 5) ; les garages ont des réservations
et des avis (modules 3 et 4).

## Scénario de démo

1. **Accueil** : taper « bruit quand je freine, Ariana, budget 150 dinars » → garages classés, avec la raison du classement.
2. **Widget de diagnostic** (bulle en bas à droite) : « voyant moteur orange allumé » → causes, urgence, bouton vers les garages adaptés.
3. **Réserver** depuis une fiche garage : estimation IA du prix, puis choix d'un créneau (`client1`).
4. **Mes véhicules** → Peugeot 208 → « Générer mon plan » → chaque intervention a un bouton « Réserver ».
5. Se connecter en **pro1** : agenda, envoi d'un devis, puis « Mes avis » → réponses proposées par l'IA.
6. Se connecter en **admin** : statistiques et validation de `pro6`.

## Commandes

| Depuis la racine | |
|---|---|
| `npm run dev` | serveur et front en parallèle |
| `npm run build` | compilation serveur + build front |
| `npm test` | tests serveur (Vitest + Supertest + MongoDB en mémoire) et front (Vitest + Testing Library) |
| `npm run lint` | ESLint sur les deux projets |
| `npm run seed` | réinitialise la base de démo |

Les tests n'appellent jamais de vrai LLM (`fetch` est remplacé par un faux) et n'ont pas besoin de MongoDB :
`mongodb-memory-server` télécharge un binaire au premier lancement.
