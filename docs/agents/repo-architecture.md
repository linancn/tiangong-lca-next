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
lastReviewedAt: 2026-07-17
lastReviewedCommit: cc66ad9a4084063b3fea7659bb4271303a88ba2e
lastReviewedNote: 'Reviewed Issue #614 text-only language options across the shared login and application-header selector; architecture and ownership boundaries are unchanged.'
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
| `src/services/**` | app-side Supabase/API access, ordered-dataset shaping, runtime locale fallback for Node-loaded services, and service logic |
| `src/locales/**` | UI strings; every supported locale follows one canonical message manifest, with leaf topology, key ownership, placeholders, and dynamic families kept aligned |
| `src/global.less`, `src/style/**`, `src/manifest.json`, `src/service-worker.js`, `src/utils/appUrl.ts`, `src/utils/ruleVerification.ts`, `src/typings.d.ts` | browser shell support, global styling, and support utilities |
| `public/**` | static resource bundles consumed by the app |
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
- active app locales are exactly `zh-CN`, `en-US`, and one country-neutral product German exposed through the canonical `de-DE` runtime key; supported `de` / `de-*` aliases normalize and persist only as `de-DE`, while Umi, Ant Design `de_DE`, Pro Components, and Day.js `de` use that same selection
- app locale and TIDAS dataset language are separate boundaries: German UI continues to request English dataset text (`en`) and must not add a `de` schema/data-language value; German help, legal, and public-doc surfaces without German content visibly route to their English fallback
- computed message IDs must belong to an exact enumerated family that either proves a closed-world producer or implements a localized runtime fallback before an unknown value is formatted; opaque backend diagnostics are not locale keys
- static bundles are read through consuming services, not directly by pages
- cache monitors live near runtime setup, not inside feature pages
- shared service code that can be loaded by Node smoke scripts must tolerate a missing initialized Umi runtime and fall back without crossing the `src/services/**` data boundary

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

The public release read paths are:

`src/pages/DataProcessing/index.tsx -> src/components/LcaReleaseReadPanel/index.tsx -> src/services/lcaReleases/api.ts -> public current-release projection`

`src/pages/Processes/Components/view.tsx -> src/components/LcaReleaseReadPanel/index.tsx -> src/services/lcaReleases/api.ts -> public current Process projection`

Next owns read orchestration, exact UUID/version deep links, directional LCI/LCIA rendering, integrity checks before parsing preview artifacts or saving raw Calculation Bundle downloads, and fresh signed-download requests. Verified raw downloads are saved through a local Blob instead of a cross-origin download anchor. The Calculation Bundle read requires the current user session. A public release projection may be anonymous only after Database and Edge expose it as the current published release. Next never approves or publishes a release, receives a service-role credential, or treats a private storage locator as public data.

## Current Hotspots

- lifecycle-model and calculation-adjacent UI: `src/services/lifeCycleModels/**`, `src/services/lca/**`, `src/services/lcaReleases/**`, `src/services/workerJobs/**`, `src/components/LcaReleaseReadPanel/**`, `src/components/LcaTaskCenter/**`, `src/pages/DataProcessing/CalculationBundlePanel.tsx`, `src/pages/Processes/Analysis/**`
- dataset validation, localized field guidance, and review jump targets: `src/pages/*/sdkValidation.ts`, `src/pages/Utils/validation/**`, `src/pages/Processes/sdkValidationUi.ts`, `src/pages/Processes/Components/**`, `src/components/ValidationIssueModal/index.tsx`, `src/components/LangTextItem/form.tsx`, `src/pages/Utils/review.tsx`
- review, team, and system-management flows: `src/pages/Review/**`, `src/pages/ManageSystem/**`, `src/pages/Teams/**`
- cache-backed static resources: `public/classifications/**`, `public/locations/**`, `public/lciamethods/**`, `public/maps/**`

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
