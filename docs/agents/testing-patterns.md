---
title: next Testing Patterns Reference
docType: reference
scope: repo
status: active
authoritative: false
owner: next
language: en
whenToUse:
  - when choosing between unit, component, and integration tests in this repo
  - when shaping new Jest tests or reusing existing helpers
  - when a testing workflow change may affect reusable patterns
whenToUpdate:
  - when repo-standard test patterns change
  - when helper ownership or recommended commands change
  - when the current pattern guidance becomes misleading
checkPaths:
  - docs/agents/testing-patterns.md
  - docs/agents/repo-validation.md
  - docs/agents/testing-troubleshooting.md
  - tests/helpers/**
  - package.json
lastReviewedAt: 2026-04-23
lastReviewedCommit: b3a3fa77c43ef16d97959690a536805b4b379fb6
---

# Testing Patterns Reference

> Purpose: reusable test-selection rules, structure rules, and template patterns for this repo.

## Test Type Decision

| Use this test type | When                                                                  |
| ------------------ | --------------------------------------------------------------------- |
| unit               | logic lives mostly in one function, utility, or service module        |
| component          | UI behavior depends on render state, props, or local interactions     |
| integration        | behavior crosses page, service, auth, routing, or provider boundaries |

## Global Rules

- prefer semantic queries such as `getByRole`, `findByText`, and `waitFor`
- mock services before render
- keep test setup close to the behavior being proved
- prefer existing helpers over one-off fixtures
- do not add snapshots when explicit assertions are clearer

## Reusable Helpers

| Helper area                     | Use for                              |
| ------------------------------- | ------------------------------------ |
| `tests/helpers/mockBuilders.ts` | structured mock objects              |
| `tests/helpers/testData.ts`     | reusable data fixtures               |
| `tests/helpers/testUtils.tsx`   | render wrappers and common providers |

## Unit Pattern

1. isolate one function or service boundary
2. build the minimum input
3. assert outputs and side effects explicitly
4. cover the real branch conditions, not just the happy path

## Integration Pattern

1. render the real page or route-level surface
2. mock only external dependencies
3. drive the user flow through the visible UI
4. assert the user-visible result plus the key service interaction

Special cases:

- repo integration matrix pattern: use when one service path branches by source, type, or permission
- permission and URL-state pattern: use when behavior depends on auth, query params, or navigation state
- escalate to E2E only when browser-only behavior cannot be proved in Jest

## Component Pattern

1. render the component with realistic props
2. keep providers minimal but sufficient
3. assert the contract the parent relies on

## Command Patterns

| Task | Command |
| --- | --- |
| full gate | `npm test` |
| focused unit or component run | `npm run test:ci -- tests/unit/<scope>/ --runInBand --testTimeout=10000 --no-coverage` |
| focused integration run | `npm run test:ci -- tests/integration/<feature>/ --runInBand --testTimeout=20000 --no-coverage` |
| open-handle debug | `npm run test:ci -- <file> --runInBand --detectOpenHandles --no-coverage` |
| lint gate | `npm run lint` |

## Skip And TODO Policy

- do not leave permanent `it.skip` without a tracked reason
- if a test cannot be written because of an infrastructure blocker, document the blocker in the owning doc or task record

## Pre-Delivery Checklist

- correct test type chosen
- existing helpers reused where possible
- focused suites passed
- async leaks checked when the failure mode suggests it
- related testing docs updated if workflow rules changed
