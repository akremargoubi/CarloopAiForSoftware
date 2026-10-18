# Évaluation des modules IA

Généré par `npm run eval -w server` le 18/10/2026 12:57:37.
12 cas annotés (voir `server/src/eval/cases.ts`), mêmes prompts et schémas Zod que l'application.

- **JSON valide** : réponse conforme au schéma Zod (après au plus une relance corrective).
- **Correct** : réponse valide ET conforme à l'attendu (bonne catégorie, filtres extraits, fourchette plausible, pas de donnée personnelle reprise...).
- **Relances** : nombre de cas où la première réponse était invalide et a été corrigée par la relance.

## Synthèse par modèle

| Modèle | JSON valide | Correct | Relances | Latence médiane | Tokens moyens (entrée / sortie) |
|---|---|---|---|---|---|
| `mock` | 100 % | 83 % | 0 | < 1 ms | - |
| `nvidia/nemotron-3-super-120b-a12b:free` | 100 % | 100 % | 1 | 11.6 s | 730 / 841 |
| `google/gemma-4-26b-a4b-it:free` | 8 % | 8 % | 0 | 1.4 s | 46 / 31 |

## Détail par cas

| Modèle | Module | Cas | Valide | Correct | Durée | Remarque |
|---|---|---|---|---|---|---|
| `mock` | diagnostic | Grincement au freinage | ✅ | ✅ | 0.0 s |  |
| `mock` | diagnostic | Clim chaude et odeur | ✅ | ✅ | 0.0 s |  |
| `mock` | diagnostic | Ne démarre plus le matin | ✅ | ❌ | 0.0 s | service "mecanique" au lieu de electricite |
| `mock` | diagnostic | Panne sur autoroute | ✅ | ❌ | 0.0 s | service "mecanique" au lieu de depannage |
| `mock` | diagnostic | Injection de prompt | ✅ | ✅ | 0.0 s |  |
| `mock` | search | Vidange Ariana samedi matin | ✅ | ✅ | 0.0 s |  |
| `mock` | search | Lavage Sousse budget | ✅ | ✅ | 0.0 s |  |
| `mock` | search | Rayure sans ville | ✅ | ✅ | 0.0 s |  |
| `mock` | quotes | Vidange Clio diesel | ✅ | ✅ | 0.0 s |  |
| `mock` | reviews | Résumé de 5 avis mitigés | ✅ | ✅ | 0.0 s |  |
| `mock` | reviews | Réponse à un avis négatif | ✅ | ✅ | 0.0 s |  |
| `mock` | maintenance | Plan Peugeot 208 urbaine | ✅ | ✅ | 0.0 s |  |
| `nvidia/nemotron-3-super-120b-a12b:free` | diagnostic | Grincement au freinage | ✅ | ✅ | 11.6 s |  |
| `nvidia/nemotron-3-super-120b-a12b:free` | diagnostic | Clim chaude et odeur | ✅ | ✅ | 42.3 s |  |
| `nvidia/nemotron-3-super-120b-a12b:free` | diagnostic | Ne démarre plus le matin | ✅ | ✅ | 7.4 s |  |
| `nvidia/nemotron-3-super-120b-a12b:free` | diagnostic | Panne sur autoroute | ✅ | ✅ | 18.7 s |  |
| `nvidia/nemotron-3-super-120b-a12b:free` | diagnostic | Injection de prompt | ✅ | ✅ | 18.7 s |  |
| `nvidia/nemotron-3-super-120b-a12b:free` | search | Vidange Ariana samedi matin | ✅ | ✅ | 4.1 s |  |
| `nvidia/nemotron-3-super-120b-a12b:free` | search | Lavage Sousse budget | ✅ | ✅ | 3.9 s |  |
| `nvidia/nemotron-3-super-120b-a12b:free` | search | Rayure sans ville | ✅ | ✅ | 4.3 s |  |
| `nvidia/nemotron-3-super-120b-a12b:free` | quotes | Vidange Clio diesel | ✅ | ✅ | 7.1 s |  |
| `nvidia/nemotron-3-super-120b-a12b:free` | reviews | Résumé de 5 avis mitigés | ✅ | ✅ | 13.4 s |  |
| `nvidia/nemotron-3-super-120b-a12b:free` | reviews | Réponse à un avis négatif | ✅ | ✅ | 7.1 s |  |
| `nvidia/nemotron-3-super-120b-a12b:free` | maintenance | Plan Peugeot 208 urbaine | ✅ | ✅ | 75.6 s |  |
| `google/gemma-4-26b-a4b-it:free` | diagnostic | Grincement au freinage | ❌ | ❌ | 1.3 s | AI_QUOTA_EXCEEDED : Quota du service IA dépassé. Réessayez plus tard. |
| `google/gemma-4-26b-a4b-it:free` | diagnostic | Clim chaude et odeur | ❌ | ❌ | 1.4 s | AI_QUOTA_EXCEEDED : Quota du service IA dépassé. Réessayez plus tard. |
| `google/gemma-4-26b-a4b-it:free` | diagnostic | Ne démarre plus le matin | ❌ | ❌ | 1.4 s | AI_QUOTA_EXCEEDED : Quota du service IA dépassé. Réessayez plus tard. |
| `google/gemma-4-26b-a4b-it:free` | diagnostic | Panne sur autoroute | ❌ | ❌ | 1.4 s | AI_QUOTA_EXCEEDED : Quota du service IA dépassé. Réessayez plus tard. |
| `google/gemma-4-26b-a4b-it:free` | diagnostic | Injection de prompt | ❌ | ❌ | 1.3 s | AI_QUOTA_EXCEEDED : Quota du service IA dépassé. Réessayez plus tard. |
| `google/gemma-4-26b-a4b-it:free` | search | Vidange Ariana samedi matin | ❌ | ❌ | 1.3 s | AI_QUOTA_EXCEEDED : Quota du service IA dépassé. Réessayez plus tard. |
| `google/gemma-4-26b-a4b-it:free` | search | Lavage Sousse budget | ❌ | ❌ | 1.3 s | AI_QUOTA_EXCEEDED : Quota du service IA dépassé. Réessayez plus tard. |
| `google/gemma-4-26b-a4b-it:free` | search | Rayure sans ville | ✅ | ✅ | 8.6 s |  |
| `google/gemma-4-26b-a4b-it:free` | quotes | Vidange Clio diesel | ❌ | ❌ | 1.3 s | AI_QUOTA_EXCEEDED : Quota du service IA dépassé. Réessayez plus tard. |
| `google/gemma-4-26b-a4b-it:free` | reviews | Résumé de 5 avis mitigés | ❌ | ❌ | 1.4 s | AI_QUOTA_EXCEEDED : Quota du service IA dépassé. Réessayez plus tard. |
| `google/gemma-4-26b-a4b-it:free` | reviews | Réponse à un avis négatif | ❌ | ❌ | 1.8 s | AI_QUOTA_EXCEEDED : Quota du service IA dépassé. Réessayez plus tard. |
| `google/gemma-4-26b-a4b-it:free` | maintenance | Plan Peugeot 208 urbaine | ❌ | ❌ | 1.5 s | AI_QUOTA_EXCEEDED : Quota du service IA dépassé. Réessayez plus tard. |

## Analyse

**Choix du modèle.** `nvidia/nemotron-3-super-120b-a12b:free` obtient 12/12 cas valides et corrects, dont le cas
d'injection de prompt. Les deux modèles `google/gemma-4-*:free` étaient indisponibles le jour du test : OpenRouter
renvoyait une erreur 429 du fournisseur gratuit (un seul appel abouti sur 12). Ce n'est pas un échec de qualité mais de
disponibilité : nous configurons donc nemotron en principal et gemma en secours
(`OPENROUTER_MODEL=nvidia/nemotron-3-super-120b-a12b:free,google/gemma-4-31b-it:free`).

**Mode démo (règles).** Les réponses simulées sont toujours valides mais se trompent sur 2 cas sur 12 (diagnostic
« ne démarre plus » et « panne sur autoroute ») : un système par mots-clés ne comprend pas le contexte, ce qui justifie
l'usage du LLM.

**Latence.** Nemotron est un modèle à raisonnement : médiane 11,6 s, de 4 s (extraction de filtres) à 75 s (plan
d'entretien). Mesures prises : `reasoning.effort = low`, délai serveur `AI_TIMEOUT_MS = 90 s`, délai du front 180 s,
indicateurs de chargement dans l'interface. Un modèle payant rapide (ex. `openai/gpt-4o-mini`) répond en quelques
secondes : il suffit de changer `OPENROUTER_MODEL`, sans toucher au code.

**Tokens et coût.** En moyenne 730 tokens en entrée et 841 en sortie par appel. Les modèles `:free` ne coûtent rien
mais sont limités à 50 requêtes par jour sur ce compte. Réductions de coût en place : cache du résumé des avis
(régénéré seulement si un nouvel avis arrive), historique du chatbot limité à 10 messages, 30 entretiens et 40 avis au
maximum envoyés, recherche en deux étapes (MongoDB filtre d'abord, le LLM ne classe que 8 candidats au plus).

**Problème détecté par l'évaluation.** Au premier passage, le plan d'entretien échouait (`AI_INVALID_OUTPUT`) : le
modèle consommait les 1 500 tokens autorisés en raisonnement caché et le JSON était coupé. Correction : effort de
raisonnement réduit et limite portée à 6 000 tokens pour ce module, puis 12/12.

## Tests en conditions réelles (application complète, 18/10/2026)

API lancée avec la clé OpenRouter, base de démo (`npm run seed`), appels HTTP réels :

| Module | Requête | Résultat | Durée |
|---|---|---|---|
| Diagnostic | « voyant moteur orange clignote, la voiture tremble » (Peugeot 208) | ratés d'allumage, urgence critique, service mécanique | 10 s |
| Recherche | « vidange pas chère à Ariana samedi matin » | filtres corrects + critère « pas cher », garage classé et justifié | 18 s (1er essai : erreur 502 passagère du fournisseur) |
| Devis | plaquettes avant, Clio diesel 2015 | 130–220 TND, 1,2 h de main d'œuvre, hypothèses | 27 s |
| Plan d'entretien | Peugeot 208 du seed | 6 interventions, échéances valides, retards détectés | 131 s (avec une relance corrective) |
