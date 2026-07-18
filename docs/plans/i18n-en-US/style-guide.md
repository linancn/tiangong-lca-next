---
title: English locale style guide
docType: reference
scope: repository
status: active
authoritative: true
owner: tiangong-lca-next
language: en
whenToUse:
  - when adding or correcting en-US product copy
whenToUpdate:
  - when canonical product terminology or locale conventions change
checkPaths:
  - src/locales/en-US.ts
  - src/locales/en-US/**
  - docs/plans/i18n-en-US/glossary.json
lastReviewedAt: 2026-07-18
---

# English locale style guide

Use concise international English with sentence case. The canonical product locale is `en-US`; aliases resolve through the typed locale registry. Labels and buttons should predict their action, while errors and validation messages should state the failed action and a safe recovery step.

Keep TianGong, TIDAS, eILCD, ILCD, schema keys, identifiers, hashes, MIME types, file names, units, URLs, ICU placeholders, and code tokens unchanged. Distinguish process, flow, flow property, exchange, dataset, life-cycle model, review, validation, and compliance according to the repository glossary and audited callsites.

English is the canonical content language required for persisted multilingual fields. UI locale, content reading and authoring, service-query language, and reference-resource availability remain separate capabilities; do not infer one from another or add language-specific branches outside their registries.
