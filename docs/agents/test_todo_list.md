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
lastReviewedAt: 2026-07-16
lastReviewedCommit: e112fa85f4138b5094c965bd010825d8267ee75d
lastReviewedNote: 'Reviewed Issue #606 focused Calculation Bundle and release-read proof; the latest committed full-run baseline remains the one recorded below until the final push-hook checkpoint.'
---

# Testing Execution State

> Source of truth for the current operational testing state. Use this file for present-state execution facts, not for long-term strategy.

## Current Baseline

- latest verified full run: `npm run prepush:gate`
- verified commit: `e112fa85f4138b5094c965bd010825d8267ee75d`
- suites: `357`
- tests: `4464`
- tracked source files: `369`
- coverage: `100%` statements, branches, functions, and lines

## Current State

- repo is in full-closure maintenance mode
- there is no active ordered coverage queue right now
- touched code must stay at full closure
- locale topology, message ownership, ICU placeholders, and dynamic families are additionally protected by `npm run i18n:audit`
- the staged German workflow adds report-mode context/pilot evidence plus final `i18n:de:pilot` and `i18n:de:audit` enforcement; these final commands intentionally remain red while ignored local confirmation, reserved context, or leaf translations are incomplete and do not represent a coverage regression
- Issue #601 uses focused German proof during Pilot and batch iteration; the next full baseline is recorded only after the final controlled tracked checkpoint passes the one hook-owned `prepush:gate`
- Issue #606 adds 85-test focused proof across the release service, Calculation Bundle panel, public release panel, Data Processing integration, Process integration, and locale inventory; the final branch-wide proof remains owned by the push hook
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
