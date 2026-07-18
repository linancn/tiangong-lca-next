---
title: French locale style guide
docType: reference
scope: repository
status: active
authoritative: true
owner: tiangong-lca-next
language: en
whenToUse:
  - when adding or correcting fr-FR product copy
whenToUpdate:
  - when French product terminology or locale conventions change
checkPaths:
  - src/locales/fr-FR.ts
  - src/locales/fr-FR/**
  - docs/plans/i18n-fr-FR/glossary.json
lastReviewedAt: 2026-07-17
---

# French locale style guide

Use clear metropolitan French with sentence case. Address the user with formal or neutral constructions; prefer concise infinitive button labels and complete explanatory sentences.

The canonical product locale is `fr-FR`. `fr_FR` is allowed only at adapter boundaries such as Ant Design and generated report schema keys. The UI is left-to-right. Use French punctuation spacing, typographic apostrophes where practical, decimal commas through `Intl`, and preserve all ICU placeholders exactly.

Keep TianGong, TIDAS, eILCD, ILCD, IDs, hashes, MIME types, schema keys, units, URLs, file names, and code tokens unchanged. Keep `LCA`/`LCIA` only inside a fixed product name, schema field, or raw interface token; use the established French `ACV`/`ÉICV` terminology in ordinary prose. Translate the surrounding action and consequence, and distinguish process, physical procédé, flow, flow property, exchange, dataset, model, peer-review revue, content révision, release, and validation according to the glossary and callsite evidence.

Documentation and legal content have explicit English fallbacks. Labels must disclose that fallback; never invent `/fr` documentation or imply that English-only content is French. Dataset and service language adapters follow the typed locale registry.
