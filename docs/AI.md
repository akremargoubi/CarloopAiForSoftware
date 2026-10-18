# Intelligence artificielle dans CarLoop Web

Ce document décrit la couche IA commune et les 5 modules. Il sert de base au chapitre « IA » du rapport.

## 1. Choix du modèle

Les 5 modules utilisent un **LLM généraliste** appelé via **OpenRouter**, une API compatible OpenAI qui donne
accès à de nombreux modèles derrière une même interface. Le modèle se règle par la variable `OPENROUTER_MODEL`
(par défaut dans l'exemple : `openai/gpt-4o-mini`). Changer de modèle ou de fournisseur ne touche pas au code.

Pourquoi un LLM plutôt que des modèles spécialisés :

- les 5 tâches sont des tâches de **langage** : comprendre une demande libre, raisonner sur un symptôme,
  résumer des avis, produire un plan en français ;
- un seul fournisseur et un seul pipeline à sécuriser, tester et surveiller ;
- la sortie est **structurée en JSON** puis validée : elle est exploitable directement par l'application.

## 2. Couche IA commune (`server/src/ai/`)

Aucun module n'appelle le LLM directement. Tous passent par `runAiTask()` :

```
données du module
   │
   ▼
1. Anonymisation         anonymizer.ts : emails, téléphones tunisiens, plaques (« 215 TU 4821 »),
                         adresses, noms connus → [EMAIL], [TELEPHONE], [PLAQUE], [ADRESSE], [NOM]
   ▼
2. Appel LLM             llmClient.ts : prompt système versionné + message, réponse JSON forcée
                         (response_format: json_object), timeout AI_TIMEOUT_MS, 1 nouvel essai
                         avec attente progressive sur 429 / 5xx
   ▼
3. Extraction du JSON    jsonExtract.ts : tolère les balises Markdown ou un texte autour
   ▼
4. Validation Zod        schéma propre au module (+ règles de cohérence avec le contexte)
   │  invalide ? → 1 relance corrective : le LLM reçoit la liste des erreurs et doit se corriger
   ▼
5. Journal AiLog         module, succès/code d'erreur, durée, modèle, tokens, nombre de données masquées
                         (aucun contenu, aucune donnée personnelle)
   ▼
résultat typé  ou  erreur typée (AI_TIMEOUT, AI_QUOTA_EXCEEDED, AI_INVALID_OUTPUT, …)
```

**Mode démo.** Sans clé API et avec `AI_MOCK=true`, chaque module renvoie une réponse simulée, calculée par
des règles simples (`mock.ts`). Elle passe par la **même validation Zod** : on peut faire la démonstration et
les tests sans réseau et sans coût.

**Protection.** Rate limiting dédié sur `/api/ai/*`, clé API uniquement côté serveur, données minimales envoyées
(chaque module choisit ce qu'il transmet, l'anonymiseur est un filet de sécurité en plus), erreurs affichées
au client avec un message adapté et un bouton « Réessayer » quand c'est pertinent.

## 3. Les 5 modules

Chaque module a son dossier `server/src/features/<nom>/` avec `prompt.ts` (prompt système versionné),
`schema.ts` (format de sortie), `mock.ts` (mode démo) et des tests.

### Module 1 — Recherche intelligente (`search`)

- **Entrée** : une phrase libre (« clim qui sent mauvais à Sousse samedi matin, max 120 dinars »).
- **Étape 1, extraction** : le LLM transforme la phrase en filtres `{ categorie, ville, budget_max, disponibilite, criteres }`.
  Le prompt lui interdit d'inventer une ville ou un budget absents de la phrase.
- **Requête MongoDB** : garages correspondant aux filtres. S'il n'y en a aucun, les filtres les moins
  importants sont relâchés un par un (`filtres_assouplis`).
- **Étape 2, classement** : le LLM classe au plus 8 candidats avec une justification courte.
- **Contrôles** : seuls les identifiants qui font partie des candidats sont gardés, sans doublon ; les garages
  oubliés par le LLM sont ajoutés en fin de liste. Le LLM ne peut donc ni inventer ni faire disparaître un garage.

### Module 2 — Diagnostic (`diagnostic`)

- **Entrée** : symptôme, véhicule optionnel (marque, modèle, année) et les 10 derniers messages de la conversation.
- **Sortie** : `reponse`, `causes_probables` (avec probabilité), `urgence`, `service_recommande` (une catégorie
  CarLoop), `conseil_securite`.
- **Intégration** : widget de chat sur toutes les pages ; le service recommandé ouvre la recherche de garages
  de cette catégorie. Les conversations sont enregistrées pour les utilisateurs connectés.

### Module 3 — Estimation de devis (`quotes`)

- **Entrée** : véhicule (marque, modèle, année, kilométrage, carburant), catégorie, description et, si un garage
  est choisi, le prix catalogue de son service comme référence.
- **Sortie** : `prix_min_tnd`, `prix_max_tnd`, `pieces_probables`, `main_oeuvre_heures`, `hypotheses`, `avertissement`.
- **Contrôle de cohérence** : `prix_min_tnd ≤ prix_max_tnd`, sinon relance corrective puis erreur.
- **Intégration** : affichée avant la confirmation de la réservation et jointe à la demande envoyée au garage ;
  le devis réel du professionnel reste celui qui fait foi.

### Module 4 — Analyse des avis (`reviews`)

- **Résumé** (public) : à partir des 40 derniers avis → `resume`, `sentiment_global`, `points_forts`,
  `points_faibles`, `score_confiance` (0-100). Le résultat est **mis en cache** et régénéré seulement si un
  nouvel avis arrive, ce qui limite les appels.
- **Réponse au client** (pro) : 2 propositions de réponse avec des tons différents ; le pro choisit, modifie et publie.
  Le nom du client est masqué avant l'envoi au LLM.

### Module 5 — Plan d'entretien (`maintenance`)

- **Entrée** : véhicule (marque, modèle, année, kilométrage, carburant, usage urbain/mixte/autoroute), date du
  jour (heure de Tunis) et les 30 derniers entretiens. **Jamais** la plaque, le surnom ni les coûts.
- **Sortie** : 3 à 8 `prochains_entretiens` (`intervention`, `echeance_km`, `echeance_date`, `priorite`,
  `categorie_service`) sur 12 mois ou 20 000 km, des `conseils` et un `resume`.
- **Contrôles de cohérence** : chaque échéance doit être ≥ au kilométrage actuel et ≥ à la date du jour (une
  intervention en retard est prévue « maintenant ») ; la catégorie doit exister dans CarLoop.
- **Mode démo** : intervalles usuels (vidange 10 000 km / 12 mois, distribution 100 000 km / 6 ans…) adaptés
  au carburant (pas de vidange pour un électrique) et recalés sur l'historique.
- **Intégration** : chaque intervention a un bouton « Réserver » qui ouvre la réservation avec la catégorie,
  le véhicule et l'intervention déjà remplis.

## 4. Tests de la partie IA

| Niveau | Ce qui est vérifié |
|---|---|
| `ai/tests/` | anonymiseur (19 cas), extraction du JSON, client LLM (timeout, 429, 5xx, nouvel essai), pipeline `runAiTask` (relance corrective, mode démo, journal) |
| `features/*/tests/schema.test.ts` | chaque schéma accepte une sortie valide, rejette les sorties incohérentes ; chaque mock respecte son schéma |
| `features/*/tests/*.api.test.ts` | parcours HTTP complet en mode démo, puis avec un faux LLM (`fetch` simulé) qui renvoie une réponse invalide : vérification du 502, de la relance et du contenu réellement envoyé (aucune donnée personnelle) |

Aucun test n'appelle le vrai fournisseur.
