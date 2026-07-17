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
lastReviewedAt: 2026-07-17
lastReviewedCommit: f6f5cfaf79361e58dd20a01b5b3108a4e3eb4f56
lastReviewedNote: 'Retained the checked-in full-closure reference and recorded Issue #606 release proof together with Issue #611 clean-runner privacy and Node-bootstrap regression coverage.'
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
- the active German runtime freezes merged `dev` commit `36836f2c` as the accepted 2,689-message baseline and binds Issue #606's 48 new release messages to one ignored local delta check without recording reviewer details in Git or GitHub
- German structural proof uses `i18n:audit`, `i18n:de:runtime:manifest:check`, `i18n:de:delta:review:check`, and final `i18n:de:audit`; the historical frozen `i18n:de:pilot` check remains independently fail-closed, focused proof stays in the edit loop, and each delivery gets one post-commit full gate through `push:checked`
- clean-checkout German suites inject missing private confirmation paths and require every tracked structural finding to stay at zero; the active-runtime suite expects only the Issue #606 delta-confirmation finding, while generated temporary forms retain positive and fail-closed approval coverage without making `.local` a repository-gate input
- pre-push receipt coverage includes a setup-node-style active Node 24 with an unusable NVM install, so runner bootstrap cannot exit before the repo-owned hook coordinator
- the production Release Gate delegates the complete coverage-enabled suite to one `prepush:gate` step and no longer repeats all Jest tests through an earlier standalone `test:ci`
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
