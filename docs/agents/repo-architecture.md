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
lastReviewedAt: 2026-06-02
lastReviewedCommit: 459ab89a217e42d0473dcc709fda7eef63d8bf4a
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
| `src/locales/**` | UI strings; keep `src/locales/en-US.ts` and `src/locales/zh-CN.ts` aligned when shared user-facing copy changes |
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
- UI copy changes must update both `src/locales/en-US.ts` and `src/locales/zh-CN.ts` when the same user-facing text ships in both languages
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

## Current Hotspots

- lifecycle-model and calculation-adjacent UI: `src/services/lifeCycleModels/**`, `src/services/lca/**`, `src/services/workerJobs/**`, `src/components/LcaTaskCenter/**`, `src/pages/Processes/Analysis/**`
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
