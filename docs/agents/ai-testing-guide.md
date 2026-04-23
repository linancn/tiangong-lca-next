---
title: next Testing Execution Guide
docType: guide
scope: repo
status: active
authoritative: false
owner: next
language: en
whenToUse:
  - when adding tests for a code change
  - when fixing failing tests
  - when deciding the minimum testing workflow for a scoped change
whenToUpdate:
  - when testing workflow or canonical commands change
  - when repo-local doc maintenance commands change
  - when coverage or gate expectations change
checkPaths:
  - docs/agents/ai-testing-guide.md
  - docs/agents/repo-validation.md
  - package.json
  - jest.config.cjs
  - .github/workflows/**
lastReviewedAt: 2026-04-23
lastReviewedCommit: f3256848c44466801a61316127c6fe19368f63ef
---

# Testing Execution Guide

> Purpose: shortest reliable execution path for adding, updating, and validating tests in this repo.

## Use When

- adding tests for a code change
- fixing failing tests
- deciding the minimum testing workflow for a scoped change

## Do Not Use For

- deep test templates
- detailed troubleshooting
- long-term testing strategy

## Guardrails

- reuse existing helpers and mocks under `tests/helpers/**` and `tests/mocks/**`
- do not add test-only dependencies without approval
- use `docs/agents/repo-validation.md` as the source of truth for proof thresholds and full-gate expectations

## Fast Workflow

1. identify the change scope and choose test type
2. inspect nearby production code and existing tests
3. read `docs/agents/test_todo_list.md` if coverage state or queue status matters
4. reuse project patterns from `docs/agents/testing-patterns.md`
5. write semantic assertions, not implementation-detail assertions
6. run focused proof first
7. run broader proof only when the risk actually requires it

## Command Shortlist

| Task | Command |
| --- | --- |
| shared CI-style run | `npm test` |
| focused integration suite | `npm run test:ci -- tests/integration/<feature>/ --runInBand --testTimeout=20000 --no-coverage` |
| focused unit or component suite | `npm run test:ci -- tests/unit/<scope>/ --runInBand --testTimeout=10000 --no-coverage` |
| single-file debug with open-handle detection | `npm run test:ci -- <file> --runInBand --detectOpenHandles --no-coverage` |
| full coverage run | `npm run test:coverage` |
| strict full-coverage assertion | `npm run test:coverage:assert-full` |

## Coverage Rules

- every code change must ship with matching tests
- when a file is touched, keep its coverage at full closure
- if the repo ever reopens a coverage queue, follow `docs/agents/test_todo_list.md`
- if a branch is provably dead or invalid, remove it instead of writing fake tests

## Related Docs

- patterns and templates: `docs/agents/testing-patterns.md`
- failure recovery: `docs/agents/testing-troubleshooting.md`
- current operational state: `docs/agents/test_todo_list.md`
- long-term testing strategy: `docs/agents/test_improvement_plan.md`

## Done

- tests match the real behavior change
- focused suites passed
- `npm run lint` passed
- full gate status is explicit through `docs/agents/repo-validation.md`
- any testing-workflow change is reflected in the owning docs
