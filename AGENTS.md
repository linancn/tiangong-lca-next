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
  - playwright.config.ts
  - playwright.docs-capture.config.ts
  - scripts/docs-screenshots/**
  - scripts/e2e/**
  - docker/e2e/**
  - tests/e2e/i18n/**
  - .nvmrc
  - .husky/pre-push
  - .github/workflows/**
lastReviewedAt: 2026-07-24
lastReviewedCommit: 0a062e45295919dddd001b8f3d83dace10615497
lastReviewedNote: 'Reviewed for promotion #690: repo ownership, branch policy, minimal execution facts, and documentation routing remain aligned with the deterministic release-harness changes.'
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
| `docs/agents/lcia-calculation-evidence.md` | reviewed LCIA bundle, cache trust, factor coverage, and calculation-evidence contract | Worker or Edge implementation truth |
| `docs/agents/util_calculate.md`, `docs/agents/team_management.md`, `docs/agents/data_audit_instruction.md` | narrow business or domain references | repo contract or bootstrap workflow |

Additional governed source docs, not part of the default first-load surface:

| Document | Owns | Does not own |
| --- | --- | --- |
| `README.md` and `README_CN.md` | repo landing context and high-level product overview | repo contract, proof bar, or branch policy truth |
| `docs/agents/i18n-language-delivery-goal.md` | reusable end-to-end Goal for adding or backfilling one context-grounded product language while converging all active locales across UI, content, reference resources, selector, validation, release, and workspace handoff | current runtime source truth, language-specific translation payloads/evidence, reference-resource source files, or active task status |
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
- locale identity and runtime adapters live in `src/services/general/localeRegistry.ts`; shared topology, canonical-message ownership, and dynamic-message audit rules live in `docs/plans/i18n-de-DE/manifest.json` plus the owning audit commands documented in `docs/agents/repo-validation.md`
- the reusable autonomous Goal for adding or backfilling one product language lives in `docs/agents/i18n-language-delivery-goal.md`; it preserves Umi's native flag icons, separates UI/content/reference-resource capabilities, audits every active registry locale, requires official-first classification/location localization, and keeps country/region variants outside the single-language product contract
- semantic localization E2E uses `playwright.config.ts` and `tests/e2e/i18n/**`; direct focused work uses `npm run e2e:dev`, while local release proof uses the repository-owned `e2e:env:install` / `e2e:env:doctor` / `e2e:release` controller against an archived clean commit and an isolated production bundle without mounting the parent workspace; the three-browser GitHub Actions matrix remains credential-free/read-only and release-required
- documentation screenshots use the separate `playwright.docs-capture.config.ts` and `scripts/docs-screenshots/**` entrypoint; the executor accepts a validated, read-only capture plan, reads credentials only from the mode-`0600` file named by `DOCS_SCREENSHOT_ENV_FILE`, blocks non-auth mutations, and emits sanitized result/access evidence rather than stored auth state
- the shared Header keeps Umi `SelectLang` mounted with `reload={false}` so locale changes refresh the current document in place; browser proof must cover same-document identity plus stale-reference-response race rejection
- the unified-German historical review record lives in `docs/plans/i18n-de-DE/README.md`; Pilot/catalog/delta confirmations validate only their frozen snapshots, while current `de-DE` copy is governed by the tracked baseline and automated correction overlay in `docs/plans/i18n/corrections.json` plus the shared context/quality/activation gate
- repo-local documentation maintenance is enforced locally by the pre-push docpact gate; `.github/workflows/ai-doc-lint.yml` is manual-dispatch fallback
- dataset-validation adapters live in `src/pages/*/sdkValidation.ts`; shared localized validation helpers live in `src/pages/Utils/validation/**`
- data workflow result fixture relationships live in `tests/data-workflows/fixtures/result/README.md`; proof selection stays in `docs/agents/repo-validation.md`
- run Umi-generating focused tests, coverage, and `npm run prepush:gate` serially; for normal delivery, use focused proof during iteration and let the push hook own the one full gate after the final controlled tracked change
- new npm dependencies require human approval
- production-writing E2E requires a host without `CI` or `GITHUB_ACTIONS`; only after that check may the controller clear image-inherited CI markers for the local container. Authenticated mode plus two write guards remain mandatory: `E2E_ALLOW_PRODUCTION_DATA=true` and `E2E_PRODUCTION_WRITE_CONFIRMATION=I_AUTHORIZE_ONE_CODEX_E2E_PRODUCTION_PROCESS`; verified tracked evidence additionally requires `E2E_WRITE_VERIFIED_EVIDENCE=true`. Before create it writes an intent ledger, and before delete it verifies the production row's UUID, authenticated owner, and all five multilingual fields across every registry authoring language, then proves `created=cleaned` and `leaked=0`

## Minimal Execution Facts

Keep these entry-level facts in `AGENTS.md`. Use `DEV.md` and `docs/agents/repo-validation.md` for the full command matrix and proof details.

- package manager: `npm`
- Node baseline: `24` via `.nvmrc` and `nvm use 24`
- shared dev environment: `npm start` (`npm run start:dev` is equivalent)
- explicit main-environment run: `npm run start:main`
- default lint gate: `npm run lint`
- deterministic locale audit: `npm run i18n:audit`
- language registry/Manifest contract audit: `npm run i18n:platform:audit`
- business-language hardcoding audit: `npm run i18n:hardcoding:audit`
- governed classification/location asset check: `npm run reference-data:check`; regenerate only through `npm run reference-data:write`; production publication must also pass `npm run reference-data:production:check`
- locale-specific context/quality/activation proof: `npm run i18n:locale:activation:check -- --locale <canonical-locale>`
- all-active-locale activation proof: `npm run i18n:locale:all:check`
- production-readiness gate (expected to fail while owned blockers remain): `npm run i18n:locale:all:production:check`
- existing-translation correction proof: `npm run i18n:corrections:check`
- local documentation gate before push: `npm run docpact:gate`, backed by `scripts/docpact` for local CLI discovery
- default CI-style test entry: `npm test`
- direct semantic localization E2E: `npm run e2e:dev` (`npm run test:e2e:i18n` remains the CI-compatible alias)
- governed documentation screenshot capture: `npm run docs:screenshot:capture -- --plan <plan.json> --result <result.json> --access-report <access.json> --allowed-output-root <next-docs-root>`
- documentation screenshot contract proof: `npm run docs:screenshot:test`
- exact-candidate local release E2E: `npm run e2e:env:install`, `npm run e2e:env:doctor`, then `npm run e2e:release`
- build when shipped behavior, branding/package surfaces, or static assets change: `npm run build`
- protected-branch parity gate: `npm run prepush:gate`
- credential-free production preflight for main candidates: `npm run release:preflight`
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
- `worker` for solver and compute behavior
- `lca-workspace` for root integration after merge

## Branch And Delivery Facts

- GitHub default branch: `main`
- true daily trunk: `dev`
- routine branch base: `dev`
- routine PR base: `dev`
- promote path: `dev -> main`
- PRs targeting `main` run the reusable Release Gate against their exact base/head; local main-semantic pushes run the same credential-free production preflight between Docpact and the full test gate
- canonical `main` branch pushes read `package.json.version`, run the reusable Release Gate plus exact-SHA credential-free semantic E2E, create or verify the matching `v*` tag only after both pass, then deploy the web app and build draft Electron releases in the same workflow run
- canonical `main` branch pushes whose `package.json` is unchanged and whose matching `v*` tag already points to an older `main` commit skip release instead of requiring a version bump
- manual `v*` tag pushes and `workflow_dispatch` runs for an existing `v*` tag whose target commit is already on `main` remain supported for recovery/backfill releases

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
- do not pass documentation screenshot credentials on the command line, persist browser profiles/storage state, or treat missing/invalid credentials as verified authorization denial
- do not use the screenshot executor for data creation or mutation; only the explicit authentication/session exchange may use non-GET requests
- do not treat a merged repo PR here as workspace-delivery complete if the root repo still needs a submodule bump

## Workspace Integration

A merged PR in `tiangong-lca-next` is repo-complete, not delivery-complete.

If the change must ship through the workspace:

1. merge the child PR into `tiangong-lca-next`
2. promote or select an eligible child SHA according to workspace policy
3. update the `lca-workspace` submodule pointer deliberately
