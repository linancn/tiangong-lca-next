---
title: French locale delivery evidence
docType: reference
scope: repository
status: active
authoritative: true
owner: tiangong-lca-next
language: en
whenToUse:
  - when maintaining or validating the fr-FR product locale
whenToUpdate:
  - when the French catalog, context, quality policy, or runtime activation changes
checkPaths:
  - src/locales/fr-FR.ts
  - src/locales/fr-FR/**
  - src/services/general/localeRegistry.ts
  - docs/plans/i18n-fr-FR/**
  - docs/plans/i18n/**
lastReviewedAt: 2026-07-17
related:
  - docs/agents/i18n-language-delivery-goal.md
  - docs/agents/repo-validation.md
---

# French locale delivery evidence

`fr-FR` is the only French product locale. `fr_FR` is restricted to framework and report adapter boundaries. The selector uses Umi’s native `🇫🇷` icon with the native label `Français`; the product does not define a second flag map or regional French bundle.

The delivery source baseline is `c26f306e82ac66f50a56aafe8f89ea96c0b0c67d`, the `dev` merge that carried the user-authored Goal from `main`. The shared canonical manifest remains at `docs/plans/i18n-de-DE/manifest.json` for backward path compatibility; it now discovers every locale from the typed registry and is not German-only.

Tracked compact evidence consists of:

- `glossary.json` and `style-guide.md`;
- `context-manifest.json`, generated from the shared source inventory, dynamic families, route-view matrix, fallbacks, and terminology inputs;
- `automated-review.json`, whose exact catalog, dossier, typed-content, route, module, and high-risk digests bind the independent automated review lanes;
- `quality-manifest.json`, generated from exact topology, key/ICU parity, content leak and source-equality checks, and the digest-bound independent automated review evidence;
- `locale-activation-manifest.json`, generated from registry adapters, context/quality/correction digests, fallback coverage, and CI-safe commands;
- shared `docs/plans/i18n/route-view-coverage.json`, `fallback-contract.json`, and `corrections.json`.

No French translation review, Pilot, approval form, reviewer identity, or `.local/**confirmation*` input exists. Full dossiers are reproducible from the pinned source SHA and compact inputs; they are not committed as duplicate per-message ledgers.

## Automated batch and independent-review record

The frozen catalog has 30 leaf modules, 3,019 leaf-owned messages, and 3,026 merged messages. The shared inventory records 3,995 literal references, 17 dynamic families, 39 closed dynamic callsites, and 10 route/view rows. The context generator reconstructs all 3,026 standard message dossiers plus two registry-driven TIDAS report-content dossiers, with zero blocked context or unowned static content.

Translation and evidence review ran in non-overlapping functional lanes, followed by a different automated reviewer context. The initial closure corrected 212 French IDs using canonical English, callsites, neighboring locales, and the glossary: 97 data-object/list/node references now use `processus` or `processus élémentaire`; 23 formal ACV review fields use `revue critique`; and 92 other terminology, UI-role, and naturalness findings were resolved. A final dashboard closure corrected six more French values. Three explicitly physical semantics retain `procédé(s)` across five IDs: manufacturing processes and two duplicated eILCD physical-function fields. New branch source messages also received natural Chinese and German dashboard copy before the candidate freeze; because they did not modify baseline-existing message IDs, the post-baseline correction ledger remains empty.

The final independent lane covers all 31 owner scopes (the 30 leaf modules plus `$entry`) and all 1,337 digest-classified high-risk messages. It checks callsite/UI role/state/consequence, ACV/TIDAS/eILCD terminology, ICU/placeholders/dynamic families, partial-English/CJK/forbidden/source-equality findings, cross-locale evidence, and focused runtime proof. Repeated low-risk families use validated rules plus representative cross-module sampling; no review item remains blocked and no human translation approval is part of the path.

All 158 values equal to canonical English were classified rather than ignored: 29 are technical tokens or fixed names, 128 are glossary-declared French cognates/interface terms or region proper names, and one is the canonical empty reserved value. Suspicious equality, Han leakage, forbidden glossary matches, missing content, and ICU/token drift are all zero in `quality-manifest.json`.

The route/view matrix owns anonymous `/`, `/welcome`, `/welcome?view=carbon-footprint`, account recovery, legal fallbacks, the role-gated dashboard, and the anonymous wildcard 404. Its generated evidence parses `config/routes.ts`, the public-route allowlist, navigation targets, query/hash parameters, component state signals, focused tests, and visible JSX/assistive literals. Configured application routes remain protected by default; the explicit wildcard fallback does not make a future configured route public. The root redirect preserves query state.

After controlled catalog and route-view changes are final, refresh in dependency order:

```bash
npm run i18n:locale:manifest:write -- --locale fr-FR
npm run i18n:locale:artifacts:write -- --locale fr-FR
```

Then check:

```bash
npm run i18n:locale:audit -- --locale fr-FR
npm run i18n:context:check -- --locale fr-FR
npm run i18n:locale:quality:check -- --locale fr-FR
npm run i18n:corrections:check
npm run i18n:locale:activation:check -- --locale fr-FR
```

The fallback contract is explicit: documentation and legal documents resolve to English with disclosure; dataset and service adapters resolve to English where the upstream contract has no French; the TIDAS import report emits `fr_FR`; environment branding uses `APP_TITLE_FR_FR` and `APP_LOGIN_SUBTITLE_FR_FR`; UI formatting uses `Intl` `fr-FR` and Day.js `fr`. The locale is LTR, so RTL implementation is not applicable.
