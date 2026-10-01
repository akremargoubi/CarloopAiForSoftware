# Résultats de l'évaluation — recherche de services

> Fichier généré par `npm run eval` le 2026-10-01. Ne pas modifier à la main.

- **Modèle** : `Xenova/multilingual-e5-small` (ONNX q8, exécution locale)
- **Corpus** : 48 services indexés (seed)
- **Jeu de test** : 32 requêtes client (`eval/queries.json`) + 8 requêtes hors sujet
- **Pertinence** : un résultat est pertinent s'il appartient à la catégorie attendue
- Classement complet évalué **sans seuil** (le seuil est étudié séparément)

## Synthèse

| Méthode | Précision@1 | Précision@3 | MRR | Requêtes sans résultat |
|---|---|---|---|---|
| Sémantique (embeddings + cosinus) | 84.4 % | **100.0 %** | **0.906** | 0 / 32 |
| Mots-clés (Prisma `contains`) | 71.9 % | 96.9 % | 0.833 | 1 / 32 |

Latence moyenne de la recherche sémantique (embedding + classement) : **88 ms** par requête.

## Par catégorie

| Catégorie | Requêtes | P@3 sémantique | MRR sémantique | P@3 mots-clés | MRR mots-clés |
|---|---|---|---|---|---|
| LAVAGE | 4 | 100.0 % | 0.708 | 75.0 % | 0.625 |
| VIDANGE | 4 | 100.0 % | 1.000 | 100.0 % | 0.750 |
| PNEUS | 4 | 100.0 % | 0.833 | 100.0 % | 0.708 |
| CLIM | 4 | 100.0 % | 1.000 | 100.0 % | 1.000 |
| ELECTRICITE | 4 | 100.0 % | 0.875 | 100.0 % | 0.833 |
| CARROSSERIE | 4 | 100.0 % | 1.000 | 100.0 % | 1.000 |
| MECANIQUE | 4 | 100.0 % | 1.000 | 100.0 % | 1.000 |
| DEPANNAGE | 4 | 100.0 % | 0.833 | 100.0 % | 0.750 |

## Calibration du seuil de pertinence (`SEARCH_MIN_SCORE`)

- *Réussite in-scope* : la bonne catégorie figure dans le top 3 **au-dessus du seuil**.
- *Rejet hors sujet* : aucun résultat au-dessus du seuil pour une requête hors sujet.

| Seuil | Réussite in-scope | Rejet hors sujet | Moyenne |
|---|---|---|---|
| 0.20 | 100.0 % | 0.0 % | 50.0 % |
| 0.25 | 100.0 % | 0.0 % | 50.0 % |
| 0.30 | 100.0 % | 0.0 % | 50.0 % |
| 0.35 | 100.0 % | 0.0 % | 50.0 % |
| 0.40 | 100.0 % | 0.0 % | 50.0 % |
| 0.45 | 100.0 % | 0.0 % | 50.0 % |
| 0.50 | 100.0 % | 0.0 % | 50.0 % |
| 0.55 | 100.0 % | 0.0 % | 50.0 % |
| 0.60 | 100.0 % | 0.0 % | 50.0 % |
| 0.65 | 100.0 % | 0.0 % | 50.0 % |
| 0.70 | 100.0 % | 0.0 % | 50.0 % |
| 0.75 | 100.0 % | 0.0 % | 50.0 % |
| 0.80 | 100.0 % | 12.5 % | 56.3 % |
| **0.83** | 93.8 % | 75.0 % | 84.4 % |
| 0.85 | 53.1 % | 100.0 % | 76.6 % |
| 0.90 | 3.1 % | 100.0 % | 51.6 % |
| 0.95 | 0.0 % | 100.0 % | 50.0 % |

**Seuil recommandé : 0.83** (meilleure moyenne ; seuil actuellement configuré : 0.83).

### Requêtes hors sujet (meilleur score obtenu)

| Requête | Meilleur résultat | Score |
|---|---|---|
| recette de couscous au poisson | CARROSSERIE — Réparation de pare-chocs | 0.815 |
| réserver un hôtel à Djerba pour l'été | CLIM — Entretien climatisation avant l’été | 0.807 |
| prix d'un iPhone 15 en Tunisie | DEPANNAGE — Assistance routière autoroute A1 | 0.809 |
| cours particuliers de mathématiques bac | PNEUS — Géométrie et parallélisme | 0.807 |
| horaires du train Tunis Sousse | DEPANNAGE — Assistance routière autoroute A1 | 0.829 |
| acheter un appartement à Sousse | LAVAGE — Préparation esthétique avant revente | 0.831 |
| météo de demain à Bizerte | CARROSSERIE — Remplacement de pare-brise | 0.780 |
| réparer mon lave-linge qui fuit | MECANIQUE — Réparation de l’échappement | 0.844 |

## Détail par requête

Rang = position du premier service de la catégorie attendue (✗ = absent).

| Requête | Attendu | Rang sém. | Top 1 sém. | Rang mots-clés | Top 1 mots-clés |
|---|---|---|---|---|---|
| lavage intérieur avant de vendre ma voiture | LAVAGE | 1 | LAVAGE (0.91) | 1 | LAVAGE (0.67) |
| les sièges sont pleins de taches de café | LAVAGE | 1 | LAVAGE (0.84) | 1 | LAVAGE (0.50) |
| ma voiture est couverte de poussière après le sirocco | LAVAGE | 2 | VIDANGE (0.84) | ✗ | — |
| je veux que la peinture brille comme neuve | LAVAGE | 3 | CARROSSERIE (0.87) | 2 | CARROSSERIE (0.25) |
| c'est le moment de changer l'huile du moteur | VIDANGE | 1 | VIDANGE (0.87) | 2 | MECANIQUE (0.50) |
| voyant d'entretien allumé, 15000 km depuis la dernière révision | VIDANGE | 1 | VIDANGE (0.85) | 2 | ELECTRICITE (0.29) |
| la boîte auto donne des à-coups en passant les vitesses | VIDANGE | 1 | VIDANGE (0.84) | 1 | VIDANGE (0.40) |
| entretien périodique pour mon moteur gasoil | VIDANGE | 1 | VIDANGE (0.88) | 1 | VIDANGE (0.75) |
| la voiture tire à droite quand je roule | PNEUS | 1 | PNEUS (0.86) | 1 | PNEUS (0.33) |
| j'ai roulé sur un clou, mon pneu est à plat | PNEUS | 1 | PNEUS (0.84) | 2 | DEPANNAGE (0.25) |
| mes pneus sont lisses il faut les changer | PNEUS | 1 | PNEUS (0.86) | 3 | DEPANNAGE (0.25) |
| vibrations dans le volant à 100 km/h | PNEUS | 3 | VIDANGE (0.85) | 1 | PNEUS (0.33) |
| la clim souffle de l'air chaud | CLIM | 1 | CLIM (0.86) | 1 | CLIM (0.75) |
| odeur de moisi quand j'allume la ventilation | CLIM | 1 | CLIM (0.83) | 1 | CLIM (0.25) |
| préparer la voiture pour les fortes chaleurs de l'été | CLIM | 1 | CLIM (0.88) | 1 | CLIM (0.75) |
| pas de chauffage dans l'habitacle en hiver | CLIM | 1 | CLIM (0.86) | 1 | CLIM (0.67) |
| la voiture ne démarre plus le matin, ça fait clic clic | ELECTRICITE | 2 | DEPANNAGE (0.86) | 1 | ELECTRICITE (0.33) |
| voyant moteur orange allumé sur le tableau de bord | ELECTRICITE | 1 | ELECTRICITE (0.85) | 1 | ELECTRICITE (0.67) |
| un de mes phares ne s'allume plus | ELECTRICITE | 1 | ELECTRICITE (0.83) | 1 | ELECTRICITE (0.50) |
| la vitre côté conducteur ne remonte plus | ELECTRICITE | 1 | ELECTRICITE (0.82) | 3 | PNEUS (0.25) |
| quelqu'un a cabossé ma portière sur le parking | CARROSSERIE | 1 | CARROSSERIE (0.82) | 1 | CARROSSERIE (0.25) |
| rayure profonde sur l'aile avant | CARROSSERIE | 1 | CARROSSERIE (0.84) | 1 | CARROSSERIE (0.33) |
| pare-brise fissuré par un caillou | CARROSSERIE | 1 | CARROSSERIE (0.88) | 1 | CARROSSERIE (0.75) |
| pare-choc arraché après un petit accrochage | CARROSSERIE | 1 | CARROSSERIE (0.87) | 1 | CARROSSERIE (0.60) |
| bruit quand je freine | MECANIQUE | 1 | MECANIQUE (0.86) | 1 | MECANIQUE (0.50) |
| la pédale d'embrayage patine en montée | MECANIQUE | 1 | MECANIQUE (0.85) | 1 | MECANIQUE (0.50) |
| claquement dans les roues sur les dos d'âne | MECANIQUE | 1 | MECANIQUE (0.83) | 1 | MECANIQUE (0.25) |
| fumée bleue et trace d'huile sous la voiture | MECANIQUE | 1 | MECANIQUE (0.84) | 1 | MECANIQUE (0.40) |
| voiture en panne sur l'autoroute | DEPANNAGE | 1 | DEPANNAGE (0.86) | 1 | DEPANNAGE (1.00) |
| j'ai laissé mes clés dans la voiture fermée | DEPANNAGE | 1 | DEPANNAGE (0.86) | 1 | DEPANNAGE (0.67) |
| plus une goutte d'essence au milieu de la route | DEPANNAGE | 3 | PNEUS (0.86) | 2 | MECANIQUE (0.25) |
| accident, il faut remorquer ma voiture | DEPANNAGE | 1 | DEPANNAGE (0.87) | 2 | ELECTRICITE (0.33) |
