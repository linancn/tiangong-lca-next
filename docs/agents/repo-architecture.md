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
  - scripts/e2e/**
  - playwright.config.ts
  - config/docs-capture/**
  - tests/e2e/i18n/**
lastReviewedAt: 2026-08-10
lastReviewedCommit: 93821284b4ac9d4ed08ac6f42498e48bd2d15fda
lastReviewedNote: 'Reviewed the Issue #799 Dev regression follow-up: an optimistic package task stays visible until canonical Worker reconciliation, without changing service ownership or the Edge mirror.'
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
| `src/services/dataProducts/**` | authenticated data-product commands, closure-check projections, result-package requests, and the curated `task-summary.v2` feed consumed by the global task center |
| `src/locales/**` | UI strings; every supported locale follows one canonical message manifest, with leaf topology, key ownership, placeholders, and dynamic families kept aligned |
| `src/global.less`, `src/style/**`, `src/manifest.json`, `src/service-worker.js`, `src/utils/appUrl.ts`, `src/utils/ruleVerification.ts`, `src/typings.d.ts` | browser shell support, global styling, and support utilities |
| `public/**` | generated or reviewed static resource bundles consumed by the app |
| `scripts/reference-data/**` | deterministic classification/location generation and fail-closed evidence validation |
| `scripts/e2e/**`, `docker/e2e/**` | test-only exact-candidate release-E2E orchestration, isolated environment, static server, preflight, diagnostics, and bounded continuation |
| `scripts/qualification/**`, `playwright.closure-download.config.ts`, `tests/browser/**` | test-only exact-commit scope-closure Next adapter and loopback browser contract accepted by the Worker provider aggregator |
| `playwright.config.ts`, `tests/e2e/i18n/**` | test-only semantic localization browser matrix, guarded production fixture ledger, and non-secret evidence reporter |
| `config/docs-capture/profile.v1.json` | source-bound product adapter facts consumed and validated by workspace-owned documentation capture tooling: runtime/readiness, login/identity, auth mutation allowlist, denial marker, and locator policy |
| `icons/**` | packaged app icons and release assets |
| other `docker/**` paths | self-hosted sync helpers and exact-revision, delete-aware mirrors; Edge function mirror provenance lives in `docker/volumes/functions/.source-revision.json` |
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
- LCIA result transport state and calculation-evidence trust state are separate: a failed or pending result query renders its own state and cannot be reinterpreted as missing or mismatched evidence; only a successfully returned numerical result enters the fail-closed evidence validator
- Contact, FlowProperty, Source, and UnitGroup keyword searches use `src/services/general/hybridSearch.ts` and their four allowlisted Hybrid Edge Functions. UUID-mention and empty-keyword list paths remain on their existing RPCs. The shared service forwards the current user JWT plus query/filter/paging and optional state/team context, returns Team Data as a genuine empty result when no team is selected, and preserves transport/auth/mapping failures as `success: false` instead of presenting them as empty data
- Process keyword searches use the indexed `search_processes_latest_v2` RPC and pass explicit escaped query terms without app-side field filtering. The `public_plus_owner_draft` calculation picker enables the database-owned strict owner-draft mode for its personal branch, requiring owner `state_code=0` rows with null team/review identity, then merges that result with public state-100 rows. Database migrations own the `extracted_md` lexical source and its PGroonga index
- computed message IDs must belong to an exact enumerated family that either proves a closed-world producer or implements a localized runtime fallback before an unknown value is formatted; opaque backend diagnostics are not locale keys
- static bundles are read through consuming services, not directly by pages
- governed classification/location bundles are generated from `reference-resource-manifest.json`, one stable base per resource, and scoped language overlays; `generatedManifest.ts`, gzip assets, cache revisions, prewarm lists, coverage, and digests are derived outputs verified by `npm run reference-data:check`
- cache monitors live near runtime setup, not inside feature pages
- documentation capture is an evidence adapter, not application runtime or semantic E2E: it uses a fresh browser context, never persists storage state, blocks non-auth mutations, and may write only below caller-declared documentation asset roots
- language options, labels, resolver priorities, service-query adapters, static resource files, and cache revisions are derived from their owning registry or manifest. `npm run i18n:platform:audit` verifies exact registry joins and `npm run i18n:hardcoding:audit` fails closed on unowned language literals outside a narrow, issue-owned adapter allowlist
- shared service code that can be loaded by Node smoke scripts must tolerate a missing initialized Umi runtime and fall back without crossing the `src/services/**` data boundary
- structured non-React content, such as the TIDAS import report descriptor, belongs in a typed pure module that consumes the registry's exact adapter topology; UI components render the descriptor instead of duplicating locale branches
- semantic localization E2E serves the candidate frontend on loopback with the existing `main` environment configuration. Direct development mode uses `npm run start:main`; release mode exports a clean commit, builds and serves its static production bundle in the isolated container, and receives only a read-only tracked-main environment proof plus an optional protected users file and exact recovery-ledger mount. Its direct Supabase client remains a test-only setup/teardown boundary under `tests/e2e/**`, uses the supplied user session rather than service-role authority, and may touch only the exact UUID-scoped `codex-e2e` tuple recorded in its ignored ledger; shipped app-side data access remains in `src/services/**`

### Data Product Closure Preflight And Task Feed

The closure-check and result-package command path is:

`src/pages/DataProcessing/index.tsx -> src/services/dataProducts/{closure,api}.ts -> app_data_product_commands`

The task-center recovery path is:

`src/components/LcaTaskCenter/index.tsx -> src/services/dataProducts/taskCenter.ts -> app_data_product_commands:list_task_feed`

Next owns scope selection, command orchestration, curated closure-issue presentation, artifact-state presentation, task-summary rendering, inline Task Center closure-detail recovery, and result-package deep-link navigation. Expanding a `lcia.scope_closure_check` task resolves its safe `closureCheckId` through `get_closure_check`, keeps lifecycle polling and artifact expiry client-bounded, and exposes only role-specific signed downloads allowed by the task capability projection; it does not decode raw worker or storage data. Next maps the backend's typed artifact states to explicit preparing, available, expired, failed, and unavailable UI states, keeps the bounded human XLSX action separate from the complete machine-result manifest action, and navigates directly to short-lived signed URLs without fetching or buffering artifact bytes. Requested LCIA methods cross the command boundary as exact `{ id, version }` identities derived from the reviewed static catalog; Next must not collapse them to identifier-only strings. Result-package generation remains unavailable until the selected closure check reports `passed`, a `valid` certificate, a `complete` scan, and matching scope/policy evidence; the backend revalidates those facts when it accepts `create_build`.

The repo-owned qualification adapter runs this actual page from an exact clean detached commit with a loopback-only backend contract. It proves the established anonymous, standard-user, admin/owner, and Data Product Manager route boundary plus artifact lifecycle, metadata, direct-navigation, and localized 410 behavior. Its provider-owned record contributes only Next consumer assertions; root and Worker orchestration remain authoritative for cross-provider aggregation and release qualification.

The global task center consumes only the whitelisted `task-summary.v2` projection for `lcia.scope_closure_check` and `lcia_result.package_build`. It must not decode raw worker rows, payloads, diagnostics, artifact locators, or infer domain validity from worker status. A closure execution failure is not an empty domain-issue result: the workbench renders the safe task-summary error, stable closure worker error code, and job identity in a separate failure state, and loads curated closure issues only after a `passed` or `blocked` completion. The Data Processing artifact projection similarly exposes only semantic role/format/filename, integrity, size, lifecycle/expiry, and signed-download metadata; it never exposes bucket or object paths. Database, Edge, and Worker remain authoritative for task state, closure evidence, artifacts, and authorization.

### Process Review-Submit Gate

Process review submission uses an asynchronous submit job:

`src/pages/Processes/Components/edit.tsx -> src/pages/Utils/review.tsx -> src/services/reviews/api.ts -> app_dataset_review_submit_jobs`

The task-center recovery path is:

`src/components/LcaTaskCenter/index.tsx -> src/services/reviews/taskCenter.ts -> src/services/workerJobs/api.ts -> app_worker_jobs`

Next owns only the UI orchestration for this job. It enqueues or reads the Edge job without treating any browser-computed checksum as authoritative, renders returned `queued`, `waiting_gate`, `submitting`, `submitted`, `blocked`, `stale`, `error`, and `cancelled` states, and shows user-facing guidance for backend-provided gate `blockingReasons` while keeping raw code/message/details as diagnostics. Next must not duplicate worker-owned blocker heuristics or infer submit readiness from worker internals.

After enqueue succeeds, the process edit page must stop long blocking loading and route attention to the task center. The task center treats service-returned `worker_jobs` / coordinator rows as the task fact source. The visible task identity and task actions should prefer the canonical root `review_submit.submit` worker job (`submitWorkerJobId` / `rootJobId`), while `review_submit.gate`, `gateWorkerJobId`, `gateRunId`, and retained `reviewSubmitJobId` values remain child evidence or diagnostics. LocalStorage may cache UI projections and dismissals for resume behavior, but it must not be the authority for review-submit job state.

When the job reaches `submitted`, Edge/Database have already validated the gate and called the final submit-review RPC on behalf of the original user. The browser must not call `app_dataset_submit_review` after a gate pass in the main process flow. Database/Edge own the persisted-row checksum, freshness, policy assertion, and final submit idempotency; stale, blocked, wrong-policy, or wrong-checksum runs must remain backend rejections.

### Unified Root And Reference Review

All seven dataset edit surfaces expose one `Submit Review` label. Process keeps the asynchronous Gate path above; Lifecycle Model, Contact, Source, Unit Group, Flow Property, and Flow submit without Gate evidence. The browser never chooses Root versus Reference: Database resolves that from the exact target and current rejected-reference relations.

Review Management consumes the central review projection. Its top-level pagination contains Root rows only. A Root remains visible when either the Root or one of its snapshot References matches the selected tab; expanding the row renders only References that match that same tab. A context-only Root exposes neither a Root checkbox nor Root review actions, while readable matching Roots and References retain their own actions. This keeps pagination and status membership database-owned without duplicating the complete Reference list in every tab.

Batch selection is one Root/Reference selection model. Selecting a Root loads and auto-selects its current-tab References, deduplicates a Reference shared by multiple Roots, preserves independently selected References, and disables submission while child loading is incomplete or failed. Removing a Root removes only the References that are no longer selected manually or through another Root. Simple Root and Reference reviews expose only approve/reject actions; Review Member approval has no opinion field and rejection requires a reason. Reviewer outcomes are advice, so the UI must not infer the Admin result from their votes.

Each readable Root or Reference row offers a view icon backed by the existing read-only Contact, Source, Unit Group, Flow Property, Flow, Process, or Lifecycle Model drawer. Rejection reasons remain in owner notifications and do not change dataset detail pages. Existing Contact `Sync to Open Data` behavior remains a separate entrypoint.

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
- `docker/volumes/functions/**` is a generated exact-Edge-revision mirror, not a primary edit surface; refresh it only through the delete-aware helper and retain its source receipt
- app-side data access does not belong outside `src/services/**`
- a merged child PR does not finish workspace delivery
