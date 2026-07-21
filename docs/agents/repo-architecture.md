---
title: next Repo Architecture Notes
docType: guide
scope: repo
status: active
authoritative: false
owner: next
language: en
whenToUse:
  - when you need a compact mental model before editing routes, pages, services, or static resources
  - when deciding which layer owns a behavior change
  - when a path is mentioned without enough context to know its role
whenToUpdate:
  - when major route, runtime, or service layers move
  - when stable path ownership changes
  - when the current map becomes misleading
checkPaths:
  - docs/agents/repo-architecture.md
  - .docpact/config.yaml
  - config/**
  - src/**
  - public/**
  - docker/**
  - playwright.config.ts
  - tests/e2e/i18n/**
lastReviewedAt: 2026-07-21
lastReviewedCommit: 5c1723b98f005b40f913f1ed6e174d064388efcc
lastReviewedNote: 'Reviewed for Issue #645: public release readback remains in Data Processing and is no longer mounted in Process detail.'
related:
  - ../AGENTS.md
  - ../.docpact/config.yaml
  - ./repo-validation.md
---

## Repo Shape

This repo is a Umi-based React SPA with service-first data access, cache-backed static resources, and strict validation gates.

## Stable Path Map

| Path group | Role |
| --- | --- |
| `config/routes.ts` | route tree and route-family entrypoints |
| `config/config.ts` | Umi runtime config |
| `config/defaultSettings.ts`, `config/branding.ts`, `config/proxy.ts`, `config/oneapi.json` | app-shell defaults, branding, dev proxy, and support config |
| `config/supabaseEnv.ts` | frontend env selection |
| `src/app.tsx` | runtime layout, auth redirect, cache monitors, theme behavior |
| `src/access.ts`, `src/global.tsx`, `src/requestErrorConfig.ts`, `src/contexts/**` | app-shell access control, request behavior, and shared runtime state |
| `src/pages/**` | route-level product pages |
| `src/pages/*/sdkValidation.ts`, `src/pages/Utils/validation/**` | page-level SDK-code adapters plus shared localized validation messages, detail mapping, and form-support helpers |
| `src/components/**` | shared UI and reusable flows |
| `src/services/**` | app-side Supabase/API access, ordered-dataset shaping, typed locale normalization and runtime fallback for Node-loaded services, explicit anonymous-route policy, and service logic |
| `src/locales/**` | UI strings; every supported locale follows one canonical message manifest, with leaf topology, key ownership, placeholders, and dynamic families kept aligned |
| `src/global.less`, `src/style/**`, `src/manifest.json`, `src/service-worker.js`, `src/utils/appUrl.ts`, `src/utils/ruleVerification.ts`, `src/typings.d.ts` | browser shell support, global styling, and support utilities |
| `public/**` | generated or reviewed static resource bundles consumed by the app |
| `scripts/reference-data/**` | deterministic classification/location generation and fail-closed evidence validation |
| `playwright.config.ts`, `tests/e2e/i18n/**` | test-only semantic localization browser matrix, guarded production fixture ledger, and non-secret evidence reporter |
| `icons/**` | packaged app icons and release assets |
| `docker/**` | self-hosted sync helpers and mirrors |
| `electron/**` | desktop packaging surface |

## Runtime Model

Use this default read path:

`route -> page/component -> service -> backend or static resource`

Rules:

- route and page components orchestrate
- service modules own app-side data access
- UI copy changes must update every supported locale and the deterministic canonical-message audit; one message key owns one concept and one UI role
- a new locale may land reviewed leaf modules before activation, but it must not gain a top-level `src/locales/<locale>.ts` entry until manifest parity and the locale-specific review gate are complete
- language behavior is split across typed owners: `localeRegistry.ts` owns UI locale/adapters, `contentLanguageRegistry.ts` owns TIDAS/ILCD reading and authoring plus service-query resolution, `referenceResources/manifest.ts` owns classification/location availability and provenance, and `localeCapabilities.ts` is the derived joined view. The current canonical UI keys are `zh-CN`, `en-US`, `de-DE`, and `fr-FR`; business consumers and parameterized capability tests discover them from the registries. A fixed locale array may appear only in an explicitly labeled fail-closed product-contract test whose purpose is to force deliberate review when that snapshot changes
- app locale, content language, service-query language, and reference-resource language are separate boundaries. Content reading priorities, backend-query fallbacks, and reference-resource delivery states are declared independently; a native reference overlay exists only after its exact structure/evidence gate passes. Documentation, legal, and public-doc surfaces keep their separately disclosed fallbacks
- anonymous SPA access is limited to the explicit login/recovery allowlist. Root/Welcome, every other configured application route, case variants, and unmatched paths require the session guard and redirect anonymous users to the canonical login route; authenticated unmatched paths may render the localized 404. Role gates defer missing-session decisions to that global redirect, then enforce their role only after a user exists, so they cannot replace login with an anonymous 403. Localization route/view coverage records this access context but must never broaden it. Authenticated redirects that drive localized query/hash views must preserve their URL state
- query-, hash-, path-, loading-, empty-, error-, and retry-driven visible states belong to the locale catalog just like the default page view; pages and reusable components must not hide service failures behind a successful empty state
- computed message IDs must belong to an exact enumerated family that either proves a closed-world producer or implements a localized runtime fallback before an unknown value is formatted; opaque backend diagnostics are not locale keys
- static bundles are read through consuming services, not directly by pages
- governed classification/location bundles are generated from `reference-resource-manifest.json`, one stable base per resource, and scoped language overlays; `generatedManifest.ts`, gzip assets, cache revisions, prewarm lists, coverage, and digests are derived outputs verified by `npm run reference-data:check`
- cache monitors live near runtime setup, not inside feature pages
- language options, labels, resolver priorities, service-query adapters, static resource files, and cache revisions are derived from their owning registry or manifest. `npm run i18n:platform:audit` verifies exact registry joins and `npm run i18n:hardcoding:audit` fails closed on unowned language literals outside a narrow, issue-owned adapter allowlist
- shared service code that can be loaded by Node smoke scripts must tolerate a missing initialized Umi runtime and fall back without crossing the `src/services/**` data boundary
- structured non-React content, such as the TIDAS import report descriptor, belongs in a typed pure module that consumes the registry's exact adapter topology; UI components render the descriptor instead of duplicating locale branches
- semantic localization E2E serves the candidate frontend on loopback with the existing `main` environment configuration. Its direct Supabase client is a test-only setup/teardown boundary under `tests/e2e/**`, uses the supplied user session rather than service-role authority, and may touch only the exact UUID-scoped `codex-e2e` tuple recorded in its ignored ledger; shipped app-side data access remains in `src/services/**`

### Process Review-Submit Gate

Process review submission uses an asynchronous submit job:

`src/pages/Processes/Components/edit.tsx -> src/pages/Utils/review.tsx -> src/services/reviews/api.ts -> app_dataset_review_submit_jobs`

The task-center recovery path is:

`src/components/LcaTaskCenter/index.tsx -> src/services/reviews/taskCenter.ts -> src/services/workerJobs/api.ts -> app_worker_jobs`

Next owns only the UI orchestration for this job. It enqueues or reads the Edge job without treating any browser-computed checksum as authoritative, renders returned `queued`, `waiting_gate`, `submitting`, `submitted`, `blocked`, `stale`, `error`, and `cancelled` states, and shows user-facing guidance for backend-provided gate `blockingReasons` while keeping raw code/message/details as diagnostics. Next must not duplicate worker-owned blocker heuristics or infer submit readiness from worker internals.

After enqueue succeeds, the process edit page must stop long blocking loading and route attention to the task center. The task center treats service-returned `worker_jobs` / coordinator rows as the task fact source. The visible task identity and task actions should prefer the canonical root `review_submit.submit` worker job (`submitWorkerJobId` / `rootJobId`), while `review_submit.gate`, `gateWorkerJobId`, `gateRunId`, and retained `reviewSubmitJobId` values remain child evidence or diagnostics. LocalStorage may cache UI projections and dismissals for resume behavior, but it must not be the authority for review-submit job state.

When the job reaches `submitted`, Edge/Database have already validated the gate and called the final submit-review RPC on behalf of the original user. The browser must not call `app_dataset_submit_review` after a gate pass in the main process flow. Database/Edge own the persisted-row checksum, freshness, policy assertion, and final submit idempotency; stale, blocked, wrong-policy, or wrong-checksum runs must remain backend rejections.

### Calculation Bundle And Release Readback

The persisted calculation read path is:

`src/pages/DataProcessing/CalculationBundlePanel.tsx -> src/services/lcaReleases/api.ts -> authenticated Edge projection -> signed Calculation Bundle artifacts`

The public release read path is:

`src/pages/DataProcessing/index.tsx -> src/components/LcaReleaseReadPanel/index.tsx -> src/services/lcaReleases/api.ts -> public current-release projection`

Next owns read orchestration, release dataset identity display, directional LCI/LCIA rendering, integrity checks before parsing preview artifacts or saving raw Calculation Bundle downloads, and fresh signed-download requests. Verified raw downloads are saved through a local Blob instead of a cross-origin download anchor. The Calculation Bundle read requires the current user session. A public release projection may be anonymous only after Database and Edge expose it as the current published release. Next never approves or publishes a release, receives a service-role credential, or treats a private storage locator as public data.

## Current Hotspots

- lifecycle-model and calculation-adjacent UI: `src/services/lifeCycleModels/**`, `src/services/lca/**`, `src/services/lcaReleases/**`, `src/services/workerJobs/**`, `src/components/LcaReleaseReadPanel/**`, `src/components/LcaTaskCenter/**`, `src/pages/DataProcessing/CalculationBundlePanel.tsx`, `src/pages/Processes/Analysis/**`
- dataset validation, localized field guidance, and review jump targets: `src/pages/*/sdkValidation.ts`, `src/pages/Utils/validation/**`, `src/pages/Processes/sdkValidationUi.ts`, `src/pages/Processes/Components/**`, `src/components/ValidationIssueModal/index.tsx`, `src/components/LangTextItem/form.tsx`, `src/pages/Utils/review.tsx`
- review, team, and system-management flows: `src/pages/Review/**`, `src/pages/ManageSystem/**`, `src/pages/Teams/**`
- governed reference sources and outputs: `src/services/referenceResources/**`, `scripts/reference-data/**`, `public/classifications/**`, `public/locations/**`
- other cache-backed static resources: `public/lciamethods/**`, `public/maps/**`

## Cross-Repo Boundaries

- `database-engine` owns schema truth and Supabase branch governance
- `edge-functions` owns Edge runtime behavior, including `app_dataset_review_submit_gate` and `app_dataset_review_submit_jobs`
- `next-docs` owns public docs-site content
- `worker` owns solver and compute internals, including review-submit blocker heuristics
- `lca-workspace` owns root delivery completion after merge

## Common Misreads

- GitHub default branch `main` is not the daily trunk
- `docker/volumes/functions/**` is a synced mirror, not a primary edit surface
- app-side data access does not belong outside `src/services/**`
- a merged child PR does not finish workspace delivery
