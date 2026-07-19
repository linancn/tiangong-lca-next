---
title: next Classification Bundle Reference
docType: reference
scope: repo
status: active
authoritative: false
owner: next
language: en
whenToUse:
  - when changing classification cache behavior
  - when changing classification file names or bundle contents
  - when changing services that resolve classification trees
whenToUpdate:
  - when classification bundle paths or file-selection rules change
  - when the cache read path changes
  - when the consuming services move
checkPaths:
  - docs/agents/public-classifications-gz-usage.md
  - src/services/referenceResources/**
  - scripts/reference-data/**
  - public/classifications/**
  - public/locations/**
  - src/services/classifications/**
  - src/services/locations/**
  - src/components/ClassificationCacheMonitor/**
  - src/components/LocationCacheMonitor/**
  - src/app.tsx
lastReviewedAt: 2026-07-19
lastReviewedCommit: a3c63306da7f6e4665158aeb0744f578c0e32050
---

# Classification And Location Bundle Reference

> Purpose: exact source, generation, validation, and read rules for governed classification and location bundles.

## Use When

- changing classification cache behavior
- changing classification file names or bundle contents
- changing services that resolve classification trees

## Source Of Truth

- authoritative provenance and delivery manifest: `src/services/referenceResources/reference-resource-manifest.json`
- stable English structures and per-language label overlays: `src/services/referenceResources/data/**`
- deterministic generator and validator: `scripts/reference-data/reference-resource-pipeline.mjs`
- generated typed runtime projection: `src/services/referenceResources/generatedManifest.ts`
- runtime resolver: `src/services/referenceResources/manifest.ts` and `resolver.ts`
- preload path: `src/app.tsx`, `src/components/ClassificationCacheMonitor/**`, `src/components/CacheMonitor/useResourceCacheMonitor.ts`
- on-demand read path: `src/services/classifications/util.ts`
- file selection logic: `src/services/classifications/api.ts`
- session-level tree cache: `src/services/classifications/cache.ts`

Do not hand-edit `generatedManifest.ts` or any `.min.json.gz` output. Change the manifest, stable base, or overlay, then run:

```bash
npm run reference-data:write
npm run reference-data:check
```

## Runtime Model

There are three layers:

1. source layer: one stable base structure per resource plus complete language overlays keyed by scoped identity
2. pre-cache layer: after app shell load, every native runtime asset derived from the manifest is warmed into IndexedDB when cache freshness rules require it
3. business-read layer: services read from IndexedDB first, then fetch and cache on demand if missing

Above the persisted cache/read layers, the repo also keeps a same-session in-memory classification-tree cache to avoid rebuilding the same tree repeatedly.

Pages and components do not read the `.gz` files directly.

## File Selection Map

| File group | Used when | Data carried |
| --- | --- | --- |
| `CPCClassification*.gz` | `Flow` and not `Elementary flow` | normal flow classification tree |
| `ILCDFlowCategorization*.gz` | `Flow` and `Elementary flow` | elementary-flow categorization tree |
| `ISICClassification*.gz` | `Process` or `LifeCycleModel` | process and life-cycle-model classification tree |
| `ILCDClassification*.gz` | `Contact`, `Source`, `UnitGroup`, `FlowProperty` | shared ILCD classification tree grouped by `@dataType` |

Every native locale uses a generated full runtime asset, while the tracked source remains a stable English structure plus a label-only overlay. Runtime filenames include the first 16 hex characters of the canonical JSON digest (`Stem.<digest>[_locale].min.json.gz`), so an old IndexedDB entry cannot be addressed after content activation. Filenames, prewarm lists, cache revisions, JSON digests, and gzip digests are derived from the same manifest. Every `.min.json.gz` file inside a declared `managedRuntimeDirectories` entry must be in the manifest's exact expected-file set; this also catches leftovers after deleting a resource or renaming its stem. `--write` removes stale files and `--check` rejects them.

## Identity And Coverage Contract

- CPC, ISIC, and ILCD flow categorization use ordered tree-index paths plus an `@id` assertion.
- ILCD classification additionally keys each path by canonical data type, source index, and same-type occurrence.
- ILCD locations use the location code as the stable key.
- Every native overlay must have exactly one non-blank label for every base identity and zero extra or duplicate keys.
- A label overlay may localize the typed-group name only through the manifest's complete one-to-one `dataTypeNames` mapping.
- `project-reviewed` translation evidence uses policy-versioned translation and review runs with distinct run IDs. Accepted records reconstruct their candidate from the final label; corrected records retain the original candidate. The validator recomputes the candidate, findings, corrections, and final-label digests and requires every final reviewed label to equal the runtime overlay label.
- Every `project-reviewed` locale also requires an explicit `official-unavailable` decision. The decision set must exactly cover the project-reviewed locales and is frozen to the verified resource edition, retrieval date, declared release URL, every digested external source-component scope, and every official secondary mapping ID. Adding a locale, replacing an edition, or changing a secondary mapping without refreshing that decision fails closed.
- Composite English bases use a separate source-provenance review bound to the frozen official-source audit instead of pretending that project extensions are publisher translations.
- Any structure drift, assertion mismatch, empty label, stale generated file, missing review entry, or nondeterministic output fails `npm run reference-data:check`.

The Chinese migration in Issue #634 removes the legacy extra `LifeCycleModel` classification group, aligns location codes and order to the base, restores `CN-AH-CAH` and `CN-SD-LWS`, removes non-base `CN-HI-SSS` and `CN-HI-DNZ`, and corrects `FR` to `法国` while keeping `GA` as `加蓬`.

## Provenance And Usage Terms

The manifest records edition verification, authority, source URL, retrieval date, upstream component digests, canonical-base digest, structure digest, usage-term status, overlay evidence, coverage, and review digest. Each resource also owns a frozen normalized official-source audit: its raw upstream digest and transform version are fixed in the manifest, and its ordered scoped projection classifies every base identity as `exact`, `project-modified`, or `project-extension`. `--write` cannot regenerate or re-stamp that audit, so changing a base without a separately reviewed audit update fails closed. Composite resources retain component-level provenance; ILCD flow categorization and the location catalog must not be described as wholly official.

The classification edition comparison performed for Issue #634 uses the exact current UNSD structures, not similarly named older editions:

| Resource | Verified structure source | Comparison result | Native translation policy |
| --- | --- | --- | --- |
| CPC | [CPC Ver. 3.0 structure CSV](https://unstats.un.org/unsd/classifications/Econ/Download/In%20Text/CPC_Ver_3.0_Structure_30Jun2025.csv), SHA-256 `5cd2c1c4890dd6be16af48e9bb940fed48efff9865f39ff15edaa921da25fb7c` | all 4,586 codes and their order match; the base removes 23 upstream trailing-space artifacts | UNSD lists only English for this edition, so `de`, `fr`, and `zh` use complete project-reviewed overlays |
| ISIC | [ISIC Rev. 5 structure CSV](https://unstats.un.org/unsd/classifications/Econ/Download/In%20Text/ISIC_Rev_5_english_structure.csv), SHA-256 `fc408f57bd3a4f33c35a4f384ec0010283dd72774892c8d48ae1330a8caeb57f` | all 830 codes and their order match; the base normalizes upstream whitespace only | UNSD lists only English for this edition, so `de`, `fr`, and `zh` use complete project-reviewed overlays; Rev. 4 translations must not be relabeled as Rev. 5 |

Both sources were retrieved on 2026-07-18. Edition verification does not by itself grant redistribution rights.

On 2026-07-19 the product owner [attested that existing authorization covers the production scope recorded for Issue #634](https://github.com/linancn/tiangong-lca-next/issues/634#issuecomment-5012071208). This is an operational product-owner attestation, not an invented publisher grant, license number, legal document, or file-ownership determination. Publisher terms remain linked as context.

The manifest binds that evidence to the following exact, digest-identified scope:

| Resource | Bound source | Attested production scope |
| --- | --- | --- |
| CPC 3.0 | `CPC_Ver_3.0_Structure_30Jun2025.csv` | redistribution, translation and derivative works, and public production deployment |
| ISIC Rev. 5 | `ISIC_Rev_5_english_structure.csv` | redistribution, translation and derivative works, and public production deployment |
| EF 3.1 ILCD classification | `stylesheets/ILCDClassification_Reference.xml` | file-level reuse and public production deployment, with source attribution, modification notice, and project extensions separately identified |
| EF 3.1 ILCD flow categorization | `stylesheets/ILCDFlowCategorization_Reference.xml` | file-level reuse and public production deployment, with source attribution, modification notice, and the TianGong extension separately identified |
| EF 3.1 ILCD locations plus the EU Vocabularies country-label crosswalk | `stylesheets/ILCDLocations_Reference.xml` and the digest-bound `20260617-0` SPARQL response | file-level reuse and public production deployment, with source attribution, modification notice, and project-modified/project-extension entries separately identified |

The generator derives `usageTerms.productionStatus`, but the string `status: production-cleared` is not sufficient. A cleared resource must also carry schema-versioned `product-owner-attestation` evidence whose date, HTTPS record URL, resource ID, verified edition, digest-bound source component scopes, uses, and conditions exactly match `clearanceRequirements`. The scope list must be an exact set, not a subset: it covers every digested external component that contributes runtime labels. An official secondary mapping must bind its raw-response digest to one of those components and independently declare `usageTerms.productionStatus: ready`; missing, blocked, or merely publisher-described terms are not production approval. Missing, mismatched, non-digest-bound, or unsupported evidence fails closed in provenance validation and `npm run reference-data:production:check`. Other usage-term statuses remain loadable for development but are rejected for production and reported as an Issue #634 blocker by `i18n:locale:*:production:check`.

## Full Tree vs Partial Path

| Input pattern | Meaning | Common use |
| --- | --- | --- |
| `['all']` | load the full tree | form options, list filters, cache warmup |
| `[some id]` | load only the matching classification path | detail views for already-selected values |

## Cache And Read Order

1. app shell mounts `ClassificationCacheMonitor`
2. warm cache if version, file list, age, or key presence requires it
3. store parsed JSON in IndexedDB
4. business reads load from IndexedDB first
5. if missing, fetch on demand and cache immediately

## Current Non-Use

`categoryTypeOptions` contains `LCIAMethod`, but the current codebase does not show an active `getILCDClassification('LCIAMethod', ...)` path.

## One-Line Rule

- normal `Flow`: `CPCClassification*.gz`
- `Elementary flow`: `ILCDFlowCategorization*.gz`
- `Process` and `LifeCycleModel`: `ISICClassification*.gz`
- `Contact`, `Source`, `UnitGroup`, `FlowProperty`: `ILCDClassification*.gz`
