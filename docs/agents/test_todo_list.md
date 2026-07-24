---
title: next Testing Execution State
docType: guide
scope: repo
status: active
authoritative: false
owner: next
language: en
whenToUse:
  - when checking the current operational testing state
  - when deciding whether a coverage queue is active
  - when validating the latest known full-coverage baseline
whenToUpdate:
  - when the verified baseline run changes
  - when the active queue state changes
  - when present-state testing facts become stale
checkPaths:
  - docs/agents/test_todo_list.md
  - package.json
  - playwright.config.ts
  - scripts/e2e/**
  - docker/e2e/**
  - tests/e2e/i18n/**
  - .github/workflows/i18n-semantic-e2e.yml
  - tests/**
  - scripts/test-runner.cjs
  - scripts/test-coverage-report.js
  - .github/workflows/build.yml
  - .github/workflows/release-gate.yml
  - .github/workflows/release-readiness.yml
lastReviewedAt: 2026-07-24
lastReviewedCommit: 0a062e45295919dddd001b8f3d83dace10615497
lastReviewedNote: 'Reviewed for promotion #690: refreshed the full-gate baseline and recorded deterministic evidence generation, artifact idempotence, and retained compact-mode logs.'
---

# Testing Execution State

> Source of truth for the current operational testing state. Use this file for present-state execution facts, not for long-term strategy.

## Checked-In Reference Baseline

- reference full run: `npm run prepush:gate`
- verified commit: `26ae31317d885ec6dc6879066c0e212f526f1a8e`
- suites: `403`
- tests: `5438`
- tracked source files: `454`
- coverage: `100%` statements, branches, functions, and lines

This is a checked-in reference, not a per-PR execution ledger. A delivery's post-commit, hook-owned full-gate result belongs in its PR validation evidence; update this section when the reference counts, coverage policy, or queue state materially changes.

## Current State

- repo is in full-closure maintenance mode
- there is no active ordered coverage queue right now
- touched code must stay at full closure
- Issue #670 adds an isolated 9-test `docs:screenshot:test` suite for visual-plan validation, explicit shared locale, external secret-file boundaries, output containment, shared viewport, and authenticated access-denial classification; it is focused tooling proof and does not alter the checked-in full-gate suite/test counts above
- locale topology, message ownership, ICU placeholders, and dynamic families are additionally protected by `npm run i18n:audit`
- active German pins the accepted 2,737-message catalog/runtime state at `c26f306e82ac66f50a56aafe8f89ea96c0b0c67d`; post-baseline existing-message changes use the tracked automated correction overlay, while Issue #601/#602/#606 confirmations retain frozen-history semantics only
- active locale proof uses `i18n:audit`, the registry/Manifest and hardcoding audits, registry-driven context/quality, `i18n:corrections:check`, and all-locale activation; focused proof stays in the edit loop, and each delivery gets one post-commit full gate through `push:checked`
- Issue #635 adds a separate Playwright semantic localization proof surface: `npm run test:e2e:i18n` derives all locale/content-language expectations from registries, binds 49 stable route/view assertion IDs, runs Chromium across the complete matrix, and requires the login/selector, team authoring, and process lifecycle critical scenarios in Chromium, Firefox, and WebKit
- semantic E2E GitHub Actions is credential-free/read-only and runs only contract discovery plus three-browser public semantics; it is optional through `workflow_dispatch`, mandatory for the exact release SHA, and absent from routine PR/dev triggers, while authenticated candidate-local/production-backend closure is restricted to an explicitly authorized local operator session with authenticated mode, both production-write guards, and an explicit verified-evidence opt-in
- Issue #654 adds `e2e:env:install`, read-only `e2e:env:doctor`, exact-candidate `e2e:release`, argument-free bounded `e2e:release:resume`, owned cleanup, and focused `e2e:dev`; release mode archives only a clean Next commit, uses a digest-pinned container and cached production build, performs all safe checks before fixture intent, and never mounts the workspace
- Issue #660 keeps production-data E2E fail-closed on real CI hosts while allowing an authorized local run to override only the release image's inherited `CI`/`GITHUB_ACTIONS` markers before the unchanged in-container authorization and ledger checks
- tracked semantic evidence remains fail closed for production readiness until one full local authenticated execution closes every assertion, matches the declared source/test/route bindings, writes its intent ledger before create, verifies UUID + owner + all five multilingual field markers before delete, and reports `created=cleaned` with `leaked=0`; routine pre-push checks validate the record structurally without requiring current production-proof hashes, package-lock verification rejects all executable dependency drift while tolerating only root release-version metadata after proving the evidence's raw lock at its recorded commit, and adding a registry locale still invalidates older evidence rather than silently shrinking coverage
- Header locale switching now keeps Umi `SelectLang` at `reload={false}`; focused proof covers same-document identity, URL retention, live reference-label refresh, and rejection of a delayed old-locale response
- clean-checkout active German and new-locale suites require zero confirmation-file dependencies; only explicit historical compatibility tests may exercise generated private fixtures
- pre-push receipt coverage includes a setup-node-style active Node 24 with an unusable NVM install, so runner bootstrap cannot exit before the repo-owned hook coordinator
- Issue #688 makes semantic evidence and locale summaries deterministic at the writer boundary: evidence is emitted in canonical JSON, all locale summaries are generated once in dependency order, and the isolated double-generation check requires the second run to preserve the exact Git diff
- Issue #688 also adds compact Agent/CI full-gate output while retaining complete Jest stdout/stderr and structured results under `.local/test-logs/**`; the Release Gate uploads those files for seven days on success or failure
- main-target PRs run the reusable Release Gate against their exact base/head, and main-semantic local pushes add `release:preflight` between Docpact and the full test gate; `dev` pushes retain the normal two-gate path
- the production Release Gate delegates the complete Jest inventory to one `prepush:gate` step while the reusable credential-free browser semantic E2E matrix validates the exact release SHA in parallel; tag creation and publication wait for both, and no earlier standalone `test:ci` is allowed
- a failed managed transport may be retried without repeating the full gate only through the ignored, exact-intent, one-hour receipt and argument-free `npm run push:retry`; any controlled-input drift requires a fresh managed push and gate
- Issue #606 plus the merged clean-runner assertions now has 87-test focused proof across the release service, Calculation Bundle panel, public release panel, Data Processing integration, Process integration, and locale inventory; the final branch-wide proof remains owned by the push hook
- dataset SDK validation adapters, shared localized validation helpers, and validation-report navigation now ride on the maintained full-closure baseline
- data workflow smoke fixtures now pair `fixtures/data/**` input JSON with `fixtures/result/**` expected-result Markdown; the current relationship map is in `tests/data-workflows/fixtures/result/README.md`
- file-level coverage collection currently excludes a small set of UI orchestration wrappers from direct collection, including the canvas-heavy national carbon dashboard wallboard shell; if that list changes, re-check save, validation, navigation, highlighting, or visual screenshot flows before treating the baseline as settled

## Reopen Conditions

Reopen an execution queue only when at least one of these becomes true:

- a touched source file drops below full closure
- a new source file is added without full proof
- a workflow or tooling change invalidates the current baseline
- a shared test helper regression forces a temporary exception queue

## Execution Order When Reopened

1. fix the touched file first
2. batch only adjacent files that share one mock, fixture, or harness
3. fix infrastructure blockers before creating speculative queue entries
4. rerun the smallest proof that confirms the gap is closed

## Reporting Workflow

- use `npm run test:coverage:report` as the default coverage review artifact
- use `node scripts/test-coverage-report.js --full` only when the full ordered file list is required
- treat this file as the owner of current testing state, not of testing strategy

## Update Rules

- workflow or baseline changed: update this file and `docs/agents/repo-validation.md`
- long-term strategy changed: update `docs/agents/test_improvement_plan.md`
- keep current-state facts here; move rationale and long-term goals elsewhere
