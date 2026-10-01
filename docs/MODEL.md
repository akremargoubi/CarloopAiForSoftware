# Modèle IA — Recherche sémantique de services

> Document destiné au rapport du mini-projet « IA for Software Engineering ».
> Résultats détaillés et reproductibles : [`server/eval/results.md`](../server/eval/results.md) (`npm run eval`).

## 1. Problème

Un client ne connaît pas le vocabulaire des garages : il écrit « bruit quand je freine » et non
« remplacement plaquettes et disques ». Une recherche par mots-clés échoue dès qu'il n'y a pas de mot commun
(« poussière après le sirocco » ne contient pas « lavage »). On veut donc comparer le **sens** de la requête
à celui de chaque service.

## 2. Modèle retenu : `Xenova/multilingual-e5-small`

| Caractéristique | Valeur |
|---|---|
| Modèle d'origine | `intfloat/multilingual-e5-small` (Microsoft, licence MIT) |
| Version utilisée | `Xenova/multilingual-e5-small` — export **ONNX quantifié int8** pour transformers.js |
| Architecture | Encodeur Transformer (MiniLM 12 couches), ~118 M paramètres |
| Langues | ~100 langues dont le **français** (et l'arabe) |
| Sortie | Vecteur de **384 dimensions** |
| Taille sur disque | 113 Mo (téléchargé une fois dans `server/.model-cache/`) |
| Exécution | **Locale**, CPU, via `@huggingface/transformers` (ONNX Runtime) |
| Entraînement | Pré-entraîné par apprentissage contrastif sur des paires requête/passage ; **aucun ré-entraînement** de notre part |

### Pourquoi ce modèle ?

1. **Multilingue et adapté au français** : les clients écrivent en français, parfois approximatif.
2. **Conçu pour la recherche (retrieval)** : E5 est entraîné sur des paires *question → passage pertinent*,
   exactement notre cas (requête client → description de service). Il utilise les préfixes `query: ` et
   `passage: `, ajoutés automatiquement par `embedding.service.ts`.
3. **Petit et rapide** : ~100 ms par requête sur CPU (embedding + classement de 48 services), 113 Mo.
4. **Local** : aucune donnée utilisateur ne quitte le serveur (contrainte 11) ; pas de coût d'API, fonctionne hors ligne.
5. **Meilleur résultat mesuré** parmi les 4 candidats testés (section 6) — il a remplacé le candidat initial
   `paraphrase-multilingual-MiniLM-L12-v2`.

## 3. Fonctionnement

### Principe : texte → vecteur → similarité cosinus

Le modèle transforme un texte en un vecteur de 384 nombres (un *embedding*) tel que deux textes de sens proche
ont des vecteurs proches.

1. **Tokenisation** : le texte est découpé en sous-mots (SentencePiece, vocabulaire multilingue de 250 k tokens).
2. **Encodage** : les 12 couches Transformer produisent un vecteur contextualisé par token.
3. **Mean pooling** : moyenne des vecteurs des tokens (en ignorant le padding) → un seul vecteur par texte.
4. **Normalisation L2** : le vecteur est ramené à une norme 1.
5. **Similarité cosinus** : `cos(u, v) = u·v / (‖u‖‖v‖)` ; les vecteurs étant normalisés, c'est un simple
   **produit scalaire**. Score proche de 1 = sens très proche.

### Pipeline

```
                 ┌──────────────── INDEXATION (création / modification d'un service, npm run reindex) ───────────────┐
                 │                                                                                                     │
  Service ──► "passage: {titre}. {catégorie en clair}. {description}" ──► modèle e5-small ──► vecteur 384d ──► PostgreSQL
                 │                                                       (mean pooling + L2)            (Service.embedding Float[])
                 └─────────────────────────────────────────────────────────────────────────────────────────────────────┘

                 ┌────────────────────────────── RECHERCHE  GET /api/services/search?q=…&ville=…&limit=5 ──────────────┐
                 │                                                                                                     │
  Requête ──► Zod (1..300 car.) ──► modèle prêt ? ──non──────────────────────────────────────► recherche mots-clés ──┐ │
                 │                       │ oui                                                   (Prisma contains)   │ │
                 │                       ▼                                                                           │ │
                 │   "query: {q}" ──► embed() avec timeout (3 s) ──erreur / timeout──────────────────────────────────┤ │
                 │                       │ vecteur 384d                                                              │ │
                 │                       ▼                                                                           │ │
                 │   services indexés (filtre ville) ──► cosinus(requête, service) pour chacun                       │ │
                 │                       ▼                                                                           │ │
                 │   score ≥ SEARCH_MIN_SCORE (0.83) ? ──► tri décroissant ──► top N                                 │ │
                 │                       ▼                                                                           ▼ │
                 │           { mode: "semantic", minScore, results: [{ score, service }] }   { mode: "keyword", fallbackReason, results }
                 └─────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Implémentation (dossier `server/src/`)

| Fichier | Rôle |
|---|---|
| `services/embedding.service.ts` | Singleton : chargement **unique** du modèle au démarrage (non bloquant), `embed(text)` avec timeout, `embedBatch(texts)` |
| `services/indexing.service.ts` | Texte à encoder, embedding à la création / modification, `reindexAllServices()` |
| `services/search.service.ts` | `cosineSimilarity`, recherche sémantique, seuil, repli automatique |
| `services/keyword-search.service.ts` | Recherche par mots-clés (repli + référence d'évaluation) |
| `scripts/reindex.ts`, `scripts/eval.ts` | `npm run reindex`, `npm run eval` |

**Robustesse** : le serveur répond immédiatement au démarrage (mode mots-clés) pendant le chargement du modèle,
puis passe automatiquement en mode sémantique. Si le modèle ne se charge pas, ou si un calcul dépasse
`EMBEDDING_TIMEOUT_MS`, la requête est servie en mode mots-clés et la réponse l'indique (`mode`, `fallbackReason`).

## 4. Protocole d'évaluation

- **Corpus** : 48 services factices du seed (6 par catégorie, 13 garages, 10 villes).
- **Requêtes** : 32 requêtes écrites comme un client, 4 par catégorie, sans reprendre les titres des services
  (`server/eval/queries.json`), chacune annotée avec la **catégorie attendue**.
- **Pertinence** : un résultat est pertinent s'il appartient à la catégorie attendue.
- **Métriques** :
  - **Précision@3** : proportion de requêtes dont le top 3 contient au moins un service pertinent.
  - **MRR** (*Mean Reciprocal Rank*) : moyenne de `1 / rang du premier résultat pertinent` (0 si absent).
  - Précision@1 et nombre de requêtes sans aucun résultat.
- **Référence** : la recherche par mots-clés (mots ≥ 3 lettres hors mots vides, `contains` insensible à la
  casse sur titre et description + correspondance exacte du nom de catégorie, score = part des mots retrouvés).
- **Seuil** : 8 requêtes **hors sujet** (« recette de couscous », « horaires du train »…) servent à calibrer
  `SEARCH_MIN_SCORE`.

## 5. Résultats (modèle retenu, `npm run eval`)

| Méthode | Précision@1 | **Précision@3** | **MRR** | Sans résultat |
|---|---|---|---|---|
| **Sémantique — e5-small** | **84,4 %** | **100 %** | **0,906** | 0 / 32 |
| Mots-clés (Prisma `contains`) | 71,9 % | 96,9 % | 0,833 | 1 / 32 |

Latence moyenne de la recherche sémantique : **~100 ms** par requête (CPU, embedding + classement).

**Ce que gagne la recherche sémantique** — requêtes sans mot commun avec le service :

| Requête | Sémantique (rang) | Mots-clés (rang) |
|---|---|---|
| « ma voiture est couverte de poussière après le sirocco » | 2 | ✗ aucun résultat |
| « c'est le moment de changer l'huile du moteur » | 1 | 2 |
| « mes pneus sont lisses il faut les changer » | 1 | 3 |
| « la vitre côté conducteur ne remonte plus » | 1 | 3 |
| « accident, il faut remorquer ma voiture » | 1 | 2 |

**Où elle reste moins bonne** : « vibrations dans le volant à 100 km/h » (rang 3, mots-clés rang 1),
« la voiture ne démarre plus, ça fait clic clic » (rang 2 : le modèle place d'abord *Ouverture de véhicule,
clés enfermées*, une vraie erreur liée à l'idée de « voiture bloquée »). Pour « bruit quand je freine », la bonne
catégorie (MECANIQUE) arrive en tête mais via *Diagnostic bruit moteur* ; le service *plaquettes et disques de frein*
n'est que 3e.

### Calibration du seuil de pertinence

| Seuil | Bonne catégorie dans le top 3 (au-dessus du seuil) | Requêtes hors sujet rejetées |
|---|---|---|
| 0,80 | 100 % | 12,5 % |
| **0,83 (retenu)** | **93,8 %** | **75 %** |
| 0,85 | 53,1 % | 100 % |

Le seuil retenu (`SEARCH_MIN_SCORE=0.83`) maximise la moyenne des deux taux. Il est configurable et **doit être
recalibré** (`npm run eval`) si le modèle ou le corpus change.

## 6. Comparaison de modèles

Même corpus, mêmes 32 requêtes, exécution locale ONNX int8 (reproductible avec
`EMBEDDING_MODEL=<modèle> npm run reindex && npm run eval`).

| Modèle | Taille | P@1 | P@3 | MRR | Latence / requête |
|---|---|---|---|---|---|
| `paraphrase-multilingual-MiniLM-L12-v2` (candidat initial) | 113 Mo | 59,4 % | 78,1 % | 0,720 | ~110 ms |
| `paraphrase-multilingual-mpnet-base-v2` | 266 Mo | 75,0 % | 90,6 % | 0,834 | ~205 ms |
| `multilingual-e5-base` | 266 Mo | 71,9 % | 90,6 % | 0,825 | ~280 ms |
| **`multilingual-e5-small` (retenu)** | **113 Mo** | **84,4 %** | **100 %** | **0,906** | **~105 ms** |
| *Mots-clés (référence)* | — | 71,9 % | 96,9 % | 0,833 | — |

Le candidat initial (MiniLM « paraphrase ») fait **moins bien que les mots-clés** sur ce jeu : il est entraîné à
détecter des paraphrases (deux phrases qui disent la même chose), pas à associer une question à un passage qui y
répond. E5, entraîné pour la recherche, est à la fois **le plus précis et le plus rapide**.

## 7. Limites

- **Petit jeu d'évaluation, biais de construction** : 48 services et 32 requêtes rédigés par la même personne ;
  certains mots se recoupent, ce qui avantage la recherche par mots-clés. Les chiffres donnent une tendance, pas
  une mesure statistiquement robuste. Une vraie évaluation demanderait des requêtes de vrais clients.
- **Pertinence au niveau catégorie** : on vérifie la catégorie, pas le service exact (« bruit de frein » →
  n'importe quel service MECANIQUE compte comme pertinent).
- **Scores E5 « tassés »** : les scores varient peu (≈ 0,78–0,91), donc un seuil absolu sépare imparfaitement
  pertinent / hors sujet (6 % des bonnes réponses filtrées, 25 % des requêtes hors sujet non rejetées à 0,83).
  Exemple : « la vitre côté conducteur ne remonte plus » est bien classée (rang 1) mais son score (0,82) est
  sous le seuil, donc l'API renvoie une liste vide.
- **Recherche exhaustive en mémoire** : le cosinus est calculé en Node.js sur tous les services indexés
  (pas de pgvector, afin de rester en « Prisma uniquement »). Suffisant jusqu'à quelques milliers de services ;
  au-delà, utiliser un index vectoriel (pgvector / HNSW).
- **Pas de compréhension fine** : négations, nombres et unités (« à 100 km/h ») sont mal pris en compte ;
  le modèle n'a pas été spécialisé (*fine-tuning*) sur le vocabulaire automobile tunisien (darija, arabe).
- **Premier démarrage** : le téléchargement du modèle (113 Mo) nécessite Internet une seule fois ; ensuite tout
  fonctionne hors ligne. Chargement en mémoire : ~2 à 3 s.

## 8. Pistes d'amélioration

- **Recherche hybride** : combiner score sémantique et score mots-clés (les deux méthodes se trompent sur des
  requêtes différentes, voir section 5).
- **Seuil relatif** : garder les résultats proches du meilleur score plutôt qu'un seuil absolu.
- **Fine-tuning** léger sur des paires (requête client, service) réelles collectées via l'application.
- **pgvector** pour passer à l'échelle.
