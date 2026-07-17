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
lastReviewedAt: 2026-07-17
lastReviewedCommit: 7e2c5267aa1ee87e5c3986ea7cdf8ffb4b5fd0ea
lastReviewedNote: 'Reviewed Issue #614 component proof and the V8-safe single-worker recycle pattern for long-running coverage.'
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
8. preserve the frozen Issue #601 review boundary: its generated local form covers all 90 messages, 9 pilot context proposals, and 2 blocked terms; reject sparse self-hashed bodies, tracked/non-private paths, and any approval that attempts to hide an invalid context proposal
9. evolve active German only through an exact runtime manifest that assembles an accepted merged baseline with the declared feature delta; for Issue #606 require the separate local form to cover exactly its 48 new release messages, and never write completed human-review content into a tracked fixture
10. keep structural and linguistic evidence distinct: `i18n:audit` proves locale topology/ICU ownership, the frozen Pilot check proves the inherited approval snapshot, and runtime-manifest/delta checks prove only the declared active assembly; human German and LCA/TIDAS judgment stays in ignored local evidence
11. validate each edit with the narrowest proof that covers its risk; accumulate coherent German runtime work into batch audits rather than running lint, build, coverage, or the repository full gate for every message
12. bind the repository full gate to the final committed controlled checkpoint and use `push:checked` so the ordinary hook owns that one execution; only a failed transport after successful gates may activate the exact-intent receipt consumed by argument-free `push:retry`
13. keep clean-runner structure proof independent from ignored human evidence: inject a guaranteed-missing confirmation path, assert only the expected confirmation findings, and cover approved behavior with a generated private temporary form

Gate-bootstrap pattern:

- when a hook supports both `PATH` and a version manager, test the already-correct active runtime while the version-manager fallback is deliberately unusable; the hook must not replace a compatible runner-provided runtime
- when a long in-band coverage run reproducibly crashes the native runtime, isolate any operational suite that imports no `src/**`, then run all remaining suites through one worker at a time with a documented idle-memory recycle boundary; lock the exact selection/exclusion and worker contract in the isolated suite, and let the coordinator retain the global 100% source threshold across worker replacements

## Focused Command Shapes

Canonical baseline and proof ownership stays with `DEV.md` and `docs/agents/repo-validation.md`. Use this file only for focused command shapes that support the test pattern you already chose.

| Need | Command shape |
| --- | --- |
| focused unit or component run | `npm run test:ci -- tests/unit/<scope>/ --runInBand --testTimeout=10000 --no-coverage` |
| focused integration run | `npm run test:ci -- tests/integration/<feature>/ --runInBand --testTimeout=20000 --no-coverage` |
| open-handle debug | `npm run test:ci -- <file> --runInBand --detectOpenHandles --no-coverage` |
| active German runtime assembly | `npm run i18n:de:audit` |
| local Issue #606 delta approval | `npm run i18n:de:delta:review:check` |
| final managed push | `npm run push:checked -- <normal-git-push-args>` |
| receipt-bound transport retry | `npm run push:retry` |

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
