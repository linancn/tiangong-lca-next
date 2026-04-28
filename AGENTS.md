---
title: next Repo Contract
docType: contract
scope: repo
status: active
authoritative: true
owner: next
language: en
whenToUse:
  - when the task may change shipped frontend behavior, repo rules, validation, or documentation ownership
  - when routing work from the workspace root into this repo
  - when deciding which document owns a rule, command, or decision
whenToUpdate:
  - when repo facts, branch rules, quality gates, or documentation ownership change
  - when a command, environment rule, or repo boundary becomes inaccurate
  - when the current documentation system becomes redundant or ambiguous
checkPaths:
  - AGENTS.md
  - DEV.md
  - README.md
  - README_CN.md
  - .docpact/**/*.yaml
  - docs/agents/**
  - .github/PULL_REQUEST_TEMPLATE/*.md
  - package.json
  - .nvmrc
  - .husky/pre-push
  - .github/workflows/**
lastReviewedAt: 2026-04-28
lastReviewedCommit: 4aff6766513c9a50312879a34689e13b793086c3
related:
  - .docpact/config.yaml
  - docs/agents/repo-validation.md
  - docs/agents/repo-architecture.md
  - DEV.md
---

## Repo Contract

`tiangong-lca-next` owns shipped frontend behavior for TianGong LCA: routes, pages, UI components, app-side services, static resource consumption, and local product packaging surfaces.

Start here when the task may change what users see, how the frontend talks to the backend, how the repo is validated, or how repo documentation is organized.

## Documentation System Principles

This repository treats documentation as an information system, not as narrative writing.

Required principles:

- single source of truth: one rule has one owning document
- one document, one job: each document solves one problem clearly
- conclusion first: put purpose, rules, steps, and boundaries before background
- no redundant prose: keep facts, rules, commands, exceptions, and validation; remove filler
- no ambiguity: prefer explicit conditions and exact actions over vague guidance
- executable commands: any documented command must run as written
- verifiable rules: readers must be able to tell whether they followed the rule correctly
- rules before explanation: operational content comes before rationale
- stable structure: same document type uses the same section order where practical
- reference instead of duplication: when a rule already has an owner, link to it instead of restating it

## Documentation Roles

| Document | Owns | Does not own |
| --- | --- | --- |
| `AGENTS.md` | repo contract, documentation principles, branch and delivery rules, hard boundaries | deep implementation details, large reference material |
| `DEV.md` | local bootstrap and the shortest repeatable work loop | repo contract, branch policy, proof matrix |
| `.docpact/config.yaml` | machine-readable repo facts, routing intents, lint rules, governed-doc inventory | prose explanations and narrative summaries |
| `docs/agents/repo-validation.md` | minimum proof by change type and PR validation note shape | bootstrap, business logic details |
| `docs/agents/repo-architecture.md` | compact repo mental model and stable path map | execution checklists and present-state testing facts |
| `docs/agents/test_todo_list.md` | current testing execution state | long-term testing strategy |
| `docs/agents/supabase-branching.md` | frontend environment selection and database ownership workflow | schema truth |
| `docs/agents/public-classifications-gz-usage.md` | classification asset read path and file mapping | repo-wide workflow rules |
| `docs/agents/util_calculate.md`, `docs/agents/team_management.md`, `docs/agents/data_audit_instruction.md` | narrow business or domain references | repo contract or bootstrap workflow |

Additional governed source docs, not part of the default first-load surface:

| Document | Owns | Does not own |
| --- | --- | --- |
| `README.md` and `README_CN.md` | repo landing context and high-level product overview | repo contract, proof bar, or branch policy truth |
| `docs/agents/testing-patterns.md` | reusable test-selection and test-structure patterns | minimum proof bar or current queue state |
| `docs/agents/testing-troubleshooting.md` | shortest recovery path for failing or hanging tests | strategy or canonical proof requirements |
| `docs/agents/prepush-gate-policy.md` | intended protected-branch and pre-push rollout contract | live hook/runtime truth |
| `docs/agents/test_improvement_plan.md` | long-term testing strategy and reopen conditions | current operational queue or proof baseline |
| `docs/agents/contribution-path-analysis-design.md` and `docs/agents/lca-analysis-visualization-plan.md` | scoped design references for analysis features | current runtime truth or active delivery state |
| `.github/PULL_REQUEST_TEMPLATE/feature-to-dev.md` and `.github/PULL_REQUEST_TEMPLATE/promote-dev-to-main.md` | branch-specific PR note shape and handoff prompts | canonical proof rules or repo branch policy truth |

## Load Order

Read in this order:

1. `AGENTS.md`
2. `.docpact/config.yaml`
3. `docs/agents/repo-validation.md` or `docs/agents/repo-architecture.md`
4. the narrow source doc that owns the current subject

Do not start from additional governed source docs, proposal docs, or README-level material unless the core contract surface is insufficient for the current task.

## Operational Pointers

- local bootstrap and canonical day-to-day commands live in `DEV.md`
- minimum proof and protected-branch gate expectations live in `docs/agents/repo-validation.md`
- path-level ownership, routing intents, governed-doc inventory, and lint rules live in `.docpact/config.yaml`
- app-shell support, branding/package surfaces, and local-stack path mapping live in `docs/agents/repo-architecture.md`
- repo-local documentation maintenance is enforced by `.github/workflows/ai-doc-lint.yml` with `docpact lint`
- dataset-validation adapters live in `src/pages/*/sdkValidation.ts`; shared localized validation helpers live in `src/pages/Utils/validation/**`
- when reproducing both CI lanes locally, run `npm run test:ci` and `npm run prepush:gate` serially because both regenerate Umi test artifacts
- new npm dependencies require human approval

## Minimal Execution Facts

Keep these entry-level facts in `AGENTS.md`. Use `DEV.md` and `docs/agents/repo-validation.md` for the full command matrix and proof details.

- package manager: `npm`
- Node baseline: `24` via `.nvmrc` and `nvm use 24`
- shared dev environment: `npm start` (`npm run start:dev` is equivalent)
- explicit main-environment run: `npm run start:main`
- default lint gate: `npm run lint`
- default CI-style test entry: `npm test`
- build when shipped behavior, branding/package surfaces, or static assets change: `npm run build`
- protected-branch parity gate: `npm run prepush:gate`
- app-side Supabase and API access belongs only in `src/services/**`

## Ownership Boundaries

The authoritative path-level ownership map lives in `.docpact/config.yaml`.

At a human-readable level, this repo owns shipped frontend/runtime behavior plus repo-local governance and bootstrap docs.

This repo does not own:

- database schema, migrations, seeds, or Supabase branch governance
- Edge Function runtime behavior
- public docs-site content
- solver or compute-engine internals
- root workspace integration after merge

Route those tasks to:

- `database-engine` for schema truth and Supabase branch governance
- `edge-functions` for Edge runtime and API orchestration behavior
- `next-docs` for public docs-site content
- `calculator` for solver and compute behavior
- `lca-workspace` for root integration after merge

## Branch And Delivery Facts

- GitHub default branch: `main`
- true daily trunk: `dev`
- routine branch base: `dev`
- routine PR base: `dev`
- promote path: `dev -> main`
- `main` pushes deploy the web app
- `v*` tags build draft Electron releases

Do not infer daily workflow from GitHub default-branch UI alone.

## Documentation Update Rules

Use the role table in this file as the update map.

- if a machine-readable repo fact or governed-doc rule changes, update `.docpact/config.yaml` in the same change
- if a human-readable repo contract, branch rule, or hard boundary changes, update `AGENTS.md`
- if bootstrap, proof, architecture, or narrow workflow guidance changes, update only the document that owns that subject
- if a document is governed but not in the default first-load surface, route to it on demand instead of duplicating its rules into `AGENTS.md` or `DEV.md`
- do not copy the same rule into multiple docs just to make it easier to find

## Hard Boundaries

- do not author schema or migration truth here
- do not hand-edit `docker/volumes/functions/**`; refresh it via `docker/pull-edge-functions.sh`
- do not create ad-hoc Supabase clients outside `src/services/**`
- do not treat a merged repo PR here as workspace-delivery complete if the root repo still needs a submodule bump

## Workspace Integration

A merged PR in `tiangong-lca-next` is repo-complete, not delivery-complete.

If the change must ship through the workspace:

1. merge the child PR into `tiangong-lca-next`
2. promote or select an eligible child SHA according to workspace policy
3. update the `lca-workspace` submodule pointer deliberately
