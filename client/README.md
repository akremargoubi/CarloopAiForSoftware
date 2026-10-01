# /client — Frontend CarLoop Web

Ce dossier accueillera le frontend **React + Vite + TypeScript**.

- **Aziz** : espace client (recherche de services, recherche sémantique, réservation, historique).
- **Amine** : espace professionnel (gestion des garages, services, réservations, avis).

## Contrat avec le backend

- API REST servie par `/server` sur `http://localhost:3000/api` (voir [`docs/API.md`](../docs/API.md)).
- Authentification : header `Authorization: Bearer <token>` (token renvoyé par `/api/auth/login`).
- CORS : l'origine du front doit correspondre à `CORS_ORIGIN` dans `server/.env`
  (par défaut `http://localhost:5173`, le port de Vite).
- Recherche sémantique : `GET /api/services/search?q=...` renvoie un champ `mode`
  (`"semantic"` ou `"keyword"`) à afficher discrètement à l'utilisateur.

## Initialisation (à faire par l'équipe front)

```bash
npm create vite@latest . -- --template react-ts
npm install
npm run dev
```

Respecter les règles de [`CLAUDE.md`](../CLAUDE.md) (TypeScript strict, aucun `any`).
