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
lastReviewedAt: 2026-08-19
lastReviewedCommit: e991feacf23090647455cd28e9f7f45a01ee74a6
lastReviewedNote: 'Reviewed for Next Issue #880: persistent ResultSet continuation preserves the current repository ownership, localization, validation, and release contracts.'
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
| `config/supabaseEnv.ts` | frontend env selection; explicit build values override file defaults, and qualification selects a fixed non-production profile |
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
| `scripts/e2e/**`, `docker/e2e/**` | test-only exact-candidate release-E2E orchestration, deterministic closed-simulator backend profile, isolated environment, static server, preflight, diagnostics, and bounded continuation |
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
- the startup system-status service treats `APP_RUNTIME_CONFIG_ENABLED` as a build-time emergency bypass: loading remains enabled by default, and only an explicit case-insensitive `false` returns the normal status without starting the Supabase RPC or its timeout
- UI copy changes must update every supported locale and the deterministic canonical-message audit; one message key owns one concept and one UI role
- a new locale may land reviewed leaf modules before activation, but it must not gain a top-level `src/locales/<locale>.ts` entry until manifest parity and the locale-specific review gate are complete
- language behavior is split across typed owners: `localeRegistry.ts` owns UI locale/adapters, `contentLanguageRegistry.ts` owns TIDAS/ILCD reading and authoring plus service-query resolution, `referenceResources/manifest.ts` owns classification/location availability and provenance, and `localeCapabilities.ts` is the derived joined view. The current canonical UI keys are `zh-CN`, `en-US`, `de-DE`, and `fr-FR`; business consumers and parameterized capability tests discover them from the registries. A fixed locale array may appear only in an explicitly labeled fail-closed product-contract test whose purpose is to force deliberate review when that snapshot changes
- app locale, content language, service-query language, and reference-resource language are separate boundaries. Content reading priorities, backend-query fallbacks, and reference-resource delivery states are declared independently; a native reference overlay exists only after its exact structure/evidence gate passes. Documentation, legal, and public-doc surfaces keep their separately disclosed fallbacks
- anonymous SPA access is limited to the explicit login/recovery allowlist. Root/Welcome, every other configured application route, case variants, and unmatched paths require the session guard and redirect anonymous users to the canonical login route; authenticated unmatched paths may render the localized 404. Role gates defer missing-session decisions to that global redirect, then enforce their role only after a user exists, so they cannot replace login with an anonymous 403. Localization route/view coverage records this access context but must never broaden it. Authenticated redirects that drive localized query/hash views must preserve their URL state
- query-, hash-, path-, loading-, empty-, error-, and retry-driven visible states belong to the locale catalog just like the default page view; pages and reusable components must not hide service failures behind a successful empty state
- LCIA result transport state and calculation-evidence trust state are separate: a failed or pending result query renders its own state and cannot be reinterpreted as missing or mismatched evidence; only a successfully returned numerical result enters the fail-closed evidence validator
- Contact, FlowProperty, Source, and UnitGroup keyword searches use `src/services/general/hybridSearch.ts` and their four allowlisted Hybrid Edge Functions. UUID-mention and empty-keyword list paths remain on their existing RPCs. The shared service forwards the current user JWT plus query/filter/paging and optional state/team context, returns Team Data as a genuine empty result when no team is selected, and preserves transport/auth/mapping failures as `success: false` instead of presenting them as empty data
- Process keyword searches use the indexed `search_processes` RPC and pass explicit escaped query terms without app-side field filtering. The `public_plus_owner_draft` calculation picker enables the database-owned actor-draft mode for its personal branch, requiring owner `state_code=0` rows regardless of team/review workflow metadata, then merges that result with public state-100 rows. Database migrations own the `search_text` lexical source and its PGroonga index
- computed message IDs must belong to an exact enumerated family that either proves a closed-world producer or implements a localized runtime fallback before an unknown value is formatted; opaque backend diagnostics are not locale keys
- static bundles are read through consuming services, not directly by pages
- governed classification/location bundles are generated from `reference-resource-manifest.json`, one stable base per resource, and scoped language overlays; `generatedManifest.ts`, gzip assets, cache revisions, prewarm lists, coverage, and digests are derived outputs verified by `npm run reference-data:check`
- cache monitors live near runtime setup, not inside feature pages
- documentation capture is an evidence adapter, not application runtime or semantic E2E: it uses a fresh browser context, never persists storage state, blocks non-auth mutations, and may write only below caller-declared documentation asset roots
- language options, labels, resolver priorities, service-query adapters, static resource files, and cache revisions are derived from their owning registry or manifest. `npm run i18n:platform:audit` verifies exact registry joins and `npm run i18n:hardcoding:audit` fails closed on unowned language literals outside a narrow, issue-owned adapter allowlist
- shared service code that can be loaded by Node smoke scripts must tolerate a missing initialized Umi runtime and fall back without crossing the `src/services/**` data boundary
- structured non-React content, such as the TIDAS import report descriptor, belongs in a typed pure module that consumes the registry's exact adapter topology; UI components render the descriptor instead of duplicating locale branches
- semantic localization E2E serves the candidate frontend on loopback with the existing `main` environment configuration. Direct development mode uses `npm run start:main`; release mode exports a clean commit, builds and serves its static production bundle in the isolated container, and receives only a read-only tracked-main environment proof plus an optional protected users file and exact recovery-ledger mount. Its direct Supabase client remains a test-only setup/teardown boundary under `tests/e2e/**`, uses the supplied user session rather than service-role authority, and may touch only the exact UUID-scoped `codex-e2e` tuple recorded in its ignored ledger; shipped app-side data access remains in `src/services/**`

### TIDAS Package Export Task Identity

`src/services/tidasPackage/taskCenter.ts` owns the authenticated user's local UI projection for TIDAS package exports. The backend `workerJobId` is the canonical execution identity and `jobId` is the canonical package-request identity. Queue responses, persisted local aliases, polling results, and Worker refreshes that share either identity must reconcile into one visible task, retain the earliest local presentation identity, and adopt authoritative backend timestamps and lifecycle state. Local submission time and localStorage aliases must never replace backend identity, revive a removed alias, or make an old completed package appear to be a new export.

### Data Product Closure Preflight And Task Feed

The closure-check and result-package command path is:

`src/pages/DataProcessing/index.tsx -> src/services/dataProducts/{resultSets,closure,api}.ts -> app_data_product_commands`

The task-center recovery path is:

`src/components/LcaTaskCenter/index.tsx -> src/services/dataProducts/taskCenter.ts -> app_data_product_commands:list_task_feed`

`ResultSet` is the durable user-facing workflow identity. Data Processing creates or selects it before new work begins, keeps `resultSetId` in the stable URL, and derives the visible completeness, calculation, publication, and next-action states from authoritative task/publication projections rather than persisting a second frontend lifecycle. The same context filters closure history, generated packages, preview choices, and publications. Task Center links carry `resultSetId` back to the same workbench so closing a tab never strands a running check or calculation. Existing closure/package links without a ResultSet remain readable during additive rollout, but new closure requests bind the selected ResultSet.

Next owns scope selection, command orchestration, curated closure-issue presentation, artifact-state presentation, task-summary rendering, inline Task Center closure-detail recovery, and ResultSet continuation navigation. Expanding a `lcia.scope_closure_check` task resolves its safe `closureCheckId` through `get_closure_check`, keeps lifecycle polling and artifact expiry client-bounded, and exposes only role-specific signed downloads allowed by the task capability projection; it does not decode raw worker or storage data. Next maps the backend's typed artifact states to explicit preparing, available, expired, failed, and unavailable UI states, keeps the bounded human XLSX action separate from the complete machine-result manifest action, and navigates directly to short-lived signed URLs without fetching or buffering artifact bytes. Requested LCIA methods cross the command boundary as the complete stable set of exact `{ id, version }` identities derived from the reviewed static catalog; `defaultImpactCategory` only chooses the initially displayed result and never narrows or invalidates that calculation scope. Next must not collapse methods to identifier-only strings or maintain a second calculation-profile identity. Result-package generation remains unavailable until the selected closure check reports `passed`, a `valid` certificate, a `complete` scan, and matching scope/policy evidence; the backend revalidates those facts when it accepts `create_build`.

The repo-owned qualification adapter runs this actual page from an exact clean detached commit with a loopback-only backend contract. It proves the established anonymous, standard-user, admin/owner, and Data Product Manager route boundary plus artifact lifecycle, metadata, direct-navigation, and localized 410 behavior. Its provider-owned record contributes only Next consumer assertions; root and Worker orchestration remain authoritative for cross-provider aggregation and release qualification.

The global task center consumes only the whitelisted `task-summary.v2` projection for `lcia.scope_closure_check` and `lcia_result.package_build`, including the safe ResultSet identity and server-curated continuation link. It must not decode raw worker rows, payloads, diagnostics, artifact locators, or infer domain validity from worker status. A closure execution failure is not an empty domain-issue result: the workbench renders the safe task-summary error, stable closure worker error code, and job identity in a separate failure state, and loads curated closure issues only after a `passed` or `blocked` completion. The Data Processing artifact projection similarly exposes only semantic role/format/filename, integrity, size, lifecycle/expiry, and signed-download metadata; it never exposes bucket or object paths. Database, Edge, and Worker remain authoritative for task state, closure evidence, artifacts, and authorization.

### Review Submission And Review Admin Quality Diagnostic

Process, Flow, Source, and Contact review submission use the same stable command boundary as the other dataset types:

`src/pages/Processes/Components/edit.tsx -> src/pages/Utils/review.tsx -> src/services/reviews/api.ts -> app_dataset_submit_review`

Before calling that command, the Process editor validates the current saved record for TIDAS SDK validity, at least one exchange, and exactly one quantitative reference. Process, Flow, Source, and Contact then recursively validate their existing reference chains through the same reference-access, rule-verification, and referenced-version checks. Any blocking reference-chain issue prevents submission and is shown through the review-specific validation surface. The submit action does not calculate the full matrix, inspect Worker jobs, or require completeness or numerical-stability evidence. Database remains authoritative for authentication, workflow state, target identity, idempotency, and transactional invariants.

Review Admin has a separate manual quality-diagnostic path:

`src/pages/Review/Components/ReviewQualityDiagnostic.tsx -> src/services/reviews/api.ts -> admin_review_quality_diagnostic`

The browser may start a diagnostic or read the latest/server-identified run, but it never chooses the dataset scope. Database and Worker evaluate one server-owned snapshot of pending reviews and return joint completeness and numerical-stability sections. Next renders the run state, scope counts, findings, and structured details as informational evidence. It never interprets `clear`, `findings`, `not_evaluable`, or runtime failure as permission to enable or disable assignment, approval, rejection, or any other review transition.

The diagnostic is visible only to `review-admin`, starts only after an explicit click, and may refresh an active run. It creates no frontend Batch entity, waiver, risk-acceptance action, browser checksum, or revision identity. Historical review-submit Gate/task-center readers remain compatibility surfaces for already-running or retained legacy jobs only; new Process submissions must not enqueue them.

### Unified Root And Reference Review

All seven dataset edit surfaces expose one `Submit Review` label and submit without completeness or numerical-stability Gate evidence. Process performs its current-record checks above, while Process, Flow, Source, and Contact perform the recursive reference-chain checks above. The browser never chooses Root versus Reference: Database resolves that from the exact target and current rejected-reference relations.

Review Management consumes the central review projection. Its top-level pagination contains every matching Root and Reference as an independent row; Database owns tab membership, display-mode and exact target-type filtering, ordering, total count, and bounded pagination over that flat set. Display mode selects model/process rows, all other types, or all rows; combining it with a data type uses intersection semantics. The UI resets to page one and clears incompatible type/selection state when a filter changes, and top-level pages default to 50 rows. Only Process and Lifecycle Model Root rows can expand, and their relationship child table remains unfiltered and renders current References matching the same tab. Readable rows retain their own actions, so a Reference does not depend on a parent Root being present in the current page.

Batch selection is one Root/Reference selection model. A top-level Reference can be selected directly. Selecting an expandable Process or Lifecycle Model Root loads and auto-selects its current-tab References, deduplicates a Reference shared by multiple Roots, preserves independently selected References, and disables submission while child loading is incomplete or failed. Selecting another Root type does not issue a child query. Removing a Root removes only the References that are no longer selected manually or through another Root. Simple Root and Reference reviews expose only approve/reject actions; Review Member approval has no opinion field and rejection requires a reason. Reviewer outcomes are advice, so the UI must not infer the Admin result from their votes.

Each readable Root or Reference row offers a view icon backed by the existing read-only Contact, Source, Unit Group, Flow Property, Flow, Process, or Lifecycle Model drawer. Rejection reasons remain in owner notifications and do not change dataset detail pages. Existing Contact `Sync to Open Data` behavior remains a separate entrypoint.

### Calculation Bundle And Release Readback

The persisted calculation read path is:

`src/pages/DataProcessing/CalculationBundlePanel.tsx -> src/services/lcaReleases/api.ts -> authenticated Edge projection -> signed Calculation Bundle artifacts`

The public release read path is:

`src/pages/DataProcessing/index.tsx -> src/components/LcaReleaseReadPanel/index.tsx -> src/services/lcaReleases/api.ts -> public current-release projection`

Next owns read orchestration, release dataset identity display, directional LCI/LCIA rendering, integrity checks before parsing preview shards or saving downloads, and fresh signed-download requests. The product download surface groups LCIA XLSX/CSV as result files, LCI Parquet/CSV as advanced data, and the manifest plus whole-bundle ZIP as audit evidence. Canonical `.ndjson.gz` shards remain available to the preview reader but are not enumerated as ordinary downloads. Verified downloads are saved through a local Blob instead of a cross-origin download anchor. The Calculation Bundle read requires the current user session. A public release projection may be anonymous only after Database and Edge expose it as the current published release. Next never approves or publishes a release, receives a service-role credential, or treats a private storage locator as public data.

## Current Hotspots

- lifecycle-model and calculation-adjacent UI: `src/services/lifeCycleModels/**`, `src/services/lca/**`, `src/services/lcaReleases/**`, `src/services/workerJobs/**`, `src/components/LcaReleaseReadPanel/**`, `src/components/LcaTaskCenter/**`, `src/pages/DataProcessing/CalculationBundlePanel.tsx`, `src/pages/Processes/Analysis/**`
- dataset validation, localized field guidance, and review jump targets: `src/pages/*/sdkValidation.ts`, `src/pages/Utils/validation/**`, `src/pages/Processes/sdkValidationUi.ts`, `src/pages/Processes/Components/**`, `src/components/ValidationIssueModal/index.tsx`, `src/components/LangTextItem/form.tsx`, `src/pages/Utils/review.tsx`
- review, team, and system-management flows: `src/pages/Review/**`, `src/pages/ManageSystem/**`, `src/pages/Teams/**`
- governed reference sources and outputs: `src/services/referenceResources/**`, `scripts/reference-data/**`, `public/classifications/**`, `public/locations/**`
- other cache-backed static resources: `public/lciamethods/**`, `public/maps/**`

## Cross-Repo Boundaries

- `database-engine` owns schema truth and Supabase branch governance
- `edge-functions` owns Edge runtime behavior, including the Review Admin `admin_review_quality_diagnostic` boundary and compatibility-only legacy review-submit routes
- `next-docs` owns public docs-site content
- `worker` owns the joint pending-review completeness and numerical-stability diagnostic internals and report production; its outcome does not control review workflow state
- `lca-workspace` owns root delivery completion after merge

## Common Misreads

- GitHub default branch `main` is not the daily trunk
- `docker/volumes/functions/**` is a generated exact-Edge-revision mirror, not a primary edit surface; refresh it only through the delete-aware helper and retain its source receipt
- app-side data access does not belong outside `src/services/**`
- a merged child PR does not finish workspace delivery
