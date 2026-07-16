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
  - tests/data-workflows/**
  - package.json
lastReviewedAt: 2026-07-16
lastReviewedCommit: e112fa85f4138b5094c965bd010825d8267ee75d
lastReviewedNote: 'Added scoped-first localization proof and final-checkpoint boundaries while preserving deterministic review and ICU patterns.'
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

Validation-specific rule:

- page-specific SDK-code adapters under `src/pages/*/sdkValidation.ts` and shared helpers under `src/pages/Utils/validation/**` should default to direct unit tests
- wrapper components that mainly coordinate drawers, forms, or modal jumps should keep behavior coverage through focused component or integration tests instead of artificial branch forcing

## Integration Pattern

1. render the real page or route-level surface
2. mock only external dependencies
3. drive the user flow through the visible UI
4. assert the user-visible result plus the key service interaction

Special cases:

- repo integration matrix pattern: use when one service path branches by source, type, or permission
- permission and URL-state pattern: use when behavior depends on auth, query params, or navigation state
- data workflow fixture pattern: keep each `tests/data-workflows/fixtures/result/**` expected-result file aligned with its same-scope `fixtures/data/**` payload, workflow lib default path, and unit proof; the fixture relationship map lives in `tests/data-workflows/fixtures/result/README.md`
- escalate to E2E only when browser-only behavior cannot be proved in Jest

## Component Pattern

1. render the component with realistic props
2. keep providers minimal but sufficient
3. assert the contract the parent relies on

## Localization Pattern

1. prove leaf-file topology and canonical key parity across every supported locale
2. compare placeholder names, occurrence counts, plural/select selectors, offsets, nesting, and per-branch coverage rather than translated word order
3. audit production literal message IDs and enumerate the exact members of each computed-ID family
4. require either a proven closed-world producer or a localized unknown-value fallback at every runtime-open boundary
5. keep linguistic/domain review evidence outside Jest; tests prove structure and behavior, not natural language quality
6. default any retained key without runtime evidence to `BLOCKED_CONTEXT`; require a complete non-personal proposal with concrete evidence, UI role, concept, consequence, and current source hash before local confirmation
7. approve a high-risk pilot before bulk translation, represent producers as canonical non-personal actors, and pin context, candidate, deterministic reviewer dossier, policy sources, pilot scope, and the exact normalized renderer body so any material change invalidates stale evidence
8. test that the generated local form covers all 90 messages, 9 pilot context proposals, and 2 blocked terms; reject sparse self-hashed bodies, tracked/non-private paths, and any approval that attempts to hide an invalid context proposal; keep linguistic/domain judgment outside Jest and never write the completed form into a tracked fixture
9. keep report mode honest during staged work; final enforcement may remain intentionally failing but must never hide missing modules, context, local confirmation, or translations
10. validate each edit with the narrowest proof that covers its risk; accumulate coherent German leaf work into batch audits rather than running lint, build, coverage, or the repository full gate for every message
11. bind the repository full gate to the final committed controlled checkpoint and let the normal push hook own that one execution; ignored review content and GitHub metadata stay in their narrower evidence domains

## Focused Command Shapes

Canonical baseline and proof ownership stays with `DEV.md` and `docs/agents/repo-validation.md`. Use this file only for focused command shapes that support the test pattern you already chose.

| Need | Command shape |
| --- | --- |
| focused unit or component run | `npm run test:ci -- tests/unit/<scope>/ --runInBand --testTimeout=10000 --no-coverage` |
| focused integration run | `npm run test:ci -- tests/integration/<feature>/ --runInBand --testTimeout=20000 --no-coverage` |
| open-handle debug | `npm run test:ci -- <file> --runInBand --detectOpenHandles --no-coverage` |

- run Umi-generating focused tests, coverage commands, and `npm run prepush:gate` serially because they share `.umi-test`; finish focused diagnosis before the one final full gate

## Skip And TODO Policy

- do not leave permanent `it.skip` without a tracked reason
- if a test cannot be written because of an infrastructure blocker, document the blocker in the owning doc or task record

## Pre-Delivery Checklist

- correct test type chosen
- existing helpers reused where possible
- focused suites passed
- async leaks checked when the failure mode suggests it
- related testing docs updated if workflow rules changed
