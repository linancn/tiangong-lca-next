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
  - tests/**
  - scripts/test-runner.cjs
  - scripts/test-coverage-report.js
lastReviewedAt: 2026-07-18
lastReviewedCommit: 84d9685a94fb2e6cfbb898a5346d1bb7725da779
lastReviewedNote: 'Reviewed the Issue #625 hook result and its focused 206-test, 100% closure; the checked-in reference baseline remains intentionally separate from per-PR evidence.'
---

# Testing Execution State

> Source of truth for the current operational testing state. Use this file for present-state execution facts, not for long-term strategy.

## Checked-In Reference Baseline

- reference full run: `npm run prepush:gate`
- verified commit: `e112fa85f4138b5094c965bd010825d8267ee75d`
- suites: `357`
- tests: `4464`
- tracked source files: `369`
- coverage: `100%` statements, branches, functions, and lines

This is a checked-in reference, not a per-PR execution ledger. A delivery's post-commit, hook-owned full-gate result belongs in its PR validation evidence; update this section when the reference counts, coverage policy, or queue state materially changes.

## Current State

- repo is in full-closure maintenance mode
- there is no active ordered coverage queue right now
- touched code must stay at full closure
- locale topology, message ownership, ICU placeholders, and dynamic families are additionally protected by `npm run i18n:audit`
- active German pins the accepted 2,737-message catalog/runtime state at `c26f306e82ac66f50a56aafe8f89ea96c0b0c67d`; post-baseline existing-message changes use the tracked automated correction overlay, while Issue #601/#602/#606 confirmations retain frozen-history semantics only
- active locale proof uses `i18n:audit`, registry-driven context/quality, `i18n:corrections:check`, and activation; focused proof stays in the edit loop, and each delivery gets one post-commit full gate through `push:checked`
- clean-checkout active German and new-locale suites require zero confirmation-file dependencies; only explicit historical compatibility tests may exercise generated private fixtures
- pre-push receipt coverage includes a setup-node-style active Node 24 with an unusable NVM install, so runner bootstrap cannot exit before the repo-owned hook coordinator
- the production Release Gate delegates the complete test inventory to one `prepush:gate` step: the nested-process receipt suite runs once without coverage in its own Jest process, while every remaining suite runs once through a single-worker coordinator that recycles workers above `64MB` and retains unchanged 100% `src/**` coverage; no earlier standalone `test:ci` is allowed
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
