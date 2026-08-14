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
  - tests/e2e/i18n/**
  - scripts/i18n/**
  - scripts/test-runner.cjs
  - scripts/e2e/**
  - scripts/release/**
  - docker/e2e/**
  - playwright.config.ts
  - package.json
  - .github/workflows/release-gate.yml
  - .github/workflows/release-readiness.yml
lastReviewedAt: 2026-08-14
lastReviewedCommit: b1b2b6785e5153ac767b45a915f2f53dc127d6ad
lastReviewedNote: 'Reviewed for Next Issue #846: startup maintenance, fail-open service, static fallback, refresh interaction, and environment-switch tests follow the existing component and service test patterns.'
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
- make mocks for stateful hooks preserve the identity of returned API objects across parent rerenders; update methods on the stable object instead of returning a fresh placeholder on each render
- pair shared hook mocks with a direct rerender regression that proves both object identity and the callable API the consumer relies on
- test release workflow policy at the contract boundary: parse or inspect the reusable gate and caller workflows, assert exact base/head wiring, and prove publication dependencies rather than invoking production actions
- test branch-sensitive push gates with isolated temporary Git remotes so `dev`, `main`, and main-semantic source branches prove their different command sequences without contacting a real repository
- test release-orchestration commands with temporary Git repositories plus fake `gh`/`npm`/Docpact executables: assert one JSON stdout document, exact remote/base/head/version identities, independent candidate and cumulative `main`-to-`dev` path evaluation, bounded review-only fixed-point behavior, branch-sensitive checked-push delegation, idempotent PR reuse, and stable fail-closed drift codes without creating real GitHub resources; additionally run a real Docpact canary in an isolated exact-`dev` clone to prove the current governed-document closure and metadata-only mutation boundary
- keep semantic E2E specs anywhere below `tests/e2e/i18n/**`; qualification discovery must recurse through nested directories, exclude only the dedicated harness-control spec, and fail closed when the discovered, executed, or designed-skip totals drift

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
- strict command-contract pattern: type the complete client payload, assert its exact serialized shape at the service boundary, and preserve versioned dataset identities as `{ id, version }` rather than weakening tests to identifier-only fixtures
- canonical async-task pattern: create multiple local projections for one backend worker/package identity, resolve queue and poll promises out of order, and assert one retained task, one poller, backend timestamps, and error delivery to the retained identity
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
5. build a compact context manifest from callsites, adjacent states, route/view ownership, source locales, glossary, style, fallbacks, ICU, and technical-token evidence; `BLOCKED_CONTEXT` must be zero before activation
6. translate and independently review high-risk lanes with automated evidence; this workflow has no Pilot, catalog approval, or delta approval state
7. represent every changed existing translation with an exact tracked correction dossier and verify the affected closure; uncertain wording may remain unchanged as a non-blocking candidate
8. preserve the frozen Issue #601/#602/#606 German confirmation boundary as historical compatibility evidence only; active German uses the same automated correction and activation gate as other registry locales
9. cross-check locale inventory with route/view inventory so component-local maps, media/error states, static pages, redirects, and query views cannot hide outside catalog parity
10. validate each edit with the narrowest proof that covers its risk; accumulate coherent locale work into batch audits rather than running lint, build, coverage, or the repository full gate for every message
11. bind the repository full gate to the final committed controlled checkpoint and use `push:checked` so the ordinary hook owns that one execution; only a failed transport after successful gates may activate the exact-intent receipt consumed by argument-free `push:retry`
12. prove in a clean runner that active locale/context/quality/correction/activation commands do not read `.local/**confirmation*`; historical German checker fixtures stay outside that dependency path
13. derive UI, content, service-query, and reference-resource expectations from their typed registries/Manifest; a new active locale must enter the same parameterized tests and fail closed on any missing capability or unowned language hardcoding. A unit test may repeat the current locale list only when its adjacent name or comment declares an intentional fail-closed product-contract snapshot that forces explicit review of additions, removals, labels, and order
14. bind route/view semantics to stable executable assertion IDs, not prose-only planned assertions; routine checks validate the tracked 49-ID/locale/browser/cleanup structure, while explicit production readiness additionally requires current route, test, source, backend, package, and runtime-asset bindings
15. make the semantic evidence reporter resolve formatting from the repository-owned evidence path and write repository-canonical JSON directly even when the actual destination is an external container mount; verify those raw bytes with the same canonical checker, then generate every locale summary in one invocation following the explicit `context -> structuralValidation -> quality -> activation` graph
16. run the isolated double-generation check after generator or evidence-input changes; both consecutive runs must preserve the exact Git diff so stale or non-canonical checked-in summaries fail before publication
17. when a digest-bound change is proven to affect only release-harness generation/formatting and not browser semantics, record only its exact evidence/current digest pair in the reviewed compatibility manifest; never exclude the path or accept future drift

Browser semantic E2E pattern:

- use `@playwright/test` `1.61.1` through `playwright.config.ts` and keep specs/helpers under `tests/e2e/i18n/**`
- use `npm run e2e:dev` for a dirty/focused worktree loop; it serves the candidate with `npm run start:main` and must still reject a non-loopback Playwright base URL
- use `npm run e2e:release` for release proof: require a clean commit, export only the Next candidate, build/serve the production bundle inside the digest-pinned image, and never mount the parent workspace, Git metadata, host dependencies, or browser profiles
- normal release orchestration checks qualification before version mutation: dry-run reports `valid` or `regeneration_required`, while `release:to-dev --apply` reuses the receipt or generates the exact provenance-bound receipt, includes it in the same Release PR, and runs `release:preflight` on the composed commit before checked push
- direct release proof outside that deterministic flow still requires `npm run e2e:qualify`, a separately reviewed receipt PR, and retry from the clean merged candidate; the receipt file and root version fields are excluded from the qualification input digest
- release-workflow unit fixtures must cover qualification reuse, automatic generation, generation failure, composed-candidate preflight failure, unexpected untracked JSON, immutable promotion identity, direct ancestry, the normal tree-identical two-parent promotion after `dev` advances, changed-tree rejection, and the rule that no failed qualification/preflight path reaches push or PR creation
- publication-workflow contract tests must prove proof reuse can pass an intentionally skipped full-gate ancestor with `!cancelled()`, while every tag, draft, web, Electron, and verification job still names each direct prerequisite and requires its result to be `success`
- finish environment, identity, browser-launch, bundle/login, backend, optional role-neutral auth, recovery-ledger, and test-discovery preflight before fixture intent; preserve the sanitized original cause in structured diagnostics
- serialize commands that mutate release-E2E runtime state; allow argument-free resume only for the exact HMAC-bound one-hour receipt issued before fixture intent, revalidate all candidate/environment/source/image/argument bindings, and rerun preflight; never reuse a browser pass, failed assertion, fixture phase, or cleanup result
- reproduce a race with an exact read-only scope such as `--project chromium --grep <pattern> --repeat-each 5`; the controller rejects repetition for a full matrix, production mutation, or verified evidence
- keep the global rendered-candidate probe and require every new login page/context to await the shared route-specific visible marker before interaction; use a bounded readiness timeout, never a fixed sleep, broader action timeout, disabled retry accounting, or relaxed `failOnFlakyTests`
- retain the 15-second assertion budget for public/CI semantics, but allow the explicitly authenticated production-backed closure 45 seconds for remote Process drawers; this scoped budget must not weaken routine browser checks
- derive locale and authoring-language loops from `LOCALE_REGISTRY` and `CONTENT_LANGUAGE_REGISTRY`; never copy the current locale list into a spec or reporter
- run the complete 49-route/view matrix in Chromium, require every target-declared semantic scenario in the evidence record, and run the critical selector, team authoring, and process lifecycle scenarios in Chromium, Firefox, and WebKit
- keep every semantic E2E GitHub Actions invocation credential-free and read-only; `workflow_dispatch` provides optional three-browser public semantics/contract proof and release reuses it for the exact candidate SHA, while routine PR/dev events do not trigger it; host `CI` or `GITHUB_ACTIONS` must fail production-data mode before Docker, and only an accepted local operator run may clear the image-inherited markers inside the container while still requiring `E2E_AUTHENTICATED=true` plus the two write guards (`E2E_ALLOW_PRODUCTION_DATA=true` and the exact one-process confirmation token); verified evidence is a separate explicit opt-in
- write an ignored UUID-scoped `codex-e2e` intent ledger before create; before delete, fetch the exact production row and verify its exact ILCD UUID path, authenticated owner, and per-language marker pairs at all five exact multilingual field paths
- delete only verified exact-ID row versions and fail unless `created=cleaned` and `leaked=0`; an absent or unverifiable attempted row is not successful cleanup evidence
- keep Header Umi `SelectLang` at `reload={false}` and prove locale switching within the same document: URL/document identity persist, mounted locale state refreshes, and a delayed old-locale reference response cannot overwrite the current selection
- stage deliberately stale IndexedDB/localStorage fixtures on a same-origin static document before navigating to the tested deep link, and send menu-dismissal keys to the visible menu/trigger rather than ambient page focus; Firefox may retry one exact navigation only after its known cancellation failed to commit that target
- disable screenshot, trace, video, and persisted/uploaded auth state; evidence contains only non-secret assertion results and content digests
- treat adding a registry locale or changing a bound route/source/test or executable dependency lock as evidence invalidation, not as a request to reuse the old result; a package-lock root application-version-only change may reuse evidence only after the raw evidence lock is verified at its recorded commit and the deterministic dependency projection remains exact
- when the user explicitly authorizes skipping E2E for an additive production request-guard expansion, bind only `tests/e2e/i18n/production-request-guard.ts` and its paired `tests/unit/e2e/productionRequestGuard.test.ts` proof to exact old/new digest pairs under `reviewed-read-only-request-guard-expansion`, require focused unit proof for every added read-only endpoint, and fail closed on any later digest drift
- when a release owner explicitly authorizes skipping the full authenticated E2E rerun for a promotion, record one owner-Issue-bound `user-authorized-release-candidate-e2e-skip` identity covering the complete `config`, `src`, `tests/unit`, and package manifest trees; require the full pre-push gate, permit it only for source and unit-test bindings, and fail closed on any candidate-tree drift

Release Gate proof pattern:

- emit proof only after every main-target PR gate step succeeds, and bind repository, PR number, PR base, candidate commit/tree, workflow path, run ID, run attempt, and artifact name in one short-lived artifact
- resolve reuse from the release merge itself: require exactly two parents, first-parent equality with the gated base, second-parent equality with the gated candidate, and equal release/candidate trees before consulting GitHub metadata
- require exactly one matching merged PR, successful readiness workflow and named Release Gate job, one unexpired artifact, and a byte-parsed payload whose identity fields all match; do not trust artifact naming alone
- return the full reusable gate as the successful fallback decision for every missing, ambiguous, expired, mismatched, unavailable, direct, squash, rebase, tag, or recovery-dispatch case; downstream publication depends on one aggregate qualification job, never directly on a conditionally skipped gate

Documentation capture profile pattern:

- keep only source-version facts under `config/docs-capture/**`: runtime/readiness, login/identity, allowed auth/session mutations, denial probes, and stable locator policy
- let the workspace compiler fail closed when the exact render-target profile is missing or incompatible
- prefer role, label, text, and test-id locators; the current profile intentionally rejects CSS
- never add the generic executor, account secret handling, dynamic origin, screenshot output, or Draft/evidence policy to Next; those belong to workspace tooling
- use a synthetic local Chromium canary only as cross-repo workspace proof after the exact Next profile and render-target commit are bound

Scope-closure provider qualification pattern:

- run `scripts/qualification/scope-closure-next-qualification.mjs` only from a clean tracked commit and let it export that commit into a temporary detached worktree
- require explicit isolated-non-production confirmation and loopback frontend/backend targets; reject production fingerprints before browser startup
- exercise the real Data Processing browser route across every relevant authenticated role plus anonymous routing, and prove all four artifact states, direct document navigation, bounded format presentation, integrity/expiry metadata, and localized expired guidance
- emit only the exact Worker-owned provider result schema and Next-owned consumer leaves; never include URLs, object locators, response payloads, credentials, cookies, or tokens
- rerun with the same run ID and commit and require byte-identical canonical JSON before aggregator handoff

Gate-bootstrap pattern:

- when a hook supports both `PATH` and a version manager, test the already-correct active runtime while the version-manager fallback is deliberately unusable; the hook must not replace a compatible runner-provided runtime
- when a long in-band coverage run reproducibly crashes the native runtime, isolate any operational suite that imports no `src/**`, then qualify the smallest useful fixed worker pool with a documented per-worker idle-memory recycle boundary on the affected platform; lock the exact selection/exclusion and worker contract in the isolated suite, and let the single coordinator retain the global 100% source threshold across worker replacements

## Focused Command Shapes

Canonical baseline and proof ownership stays with `DEV.md` and `docs/agents/repo-validation.md`. Use this file only for focused command shapes that support the test pattern you already chose.

| Need | Command shape |
| --- | --- |
| focused unit or component run | `npm run test:ci -- tests/unit/<scope>/ --runInBand --testTimeout=10000 --no-coverage` |
| focused integration run | `npm run test:ci -- tests/integration/<feature>/ --runInBand --testTimeout=20000 --no-coverage` |
| focused semantic localization browser proof | `npm run e2e:dev -- <Playwright arguments>` |
| exact-candidate release browser proof | `npm run e2e:env:doctor` then `npm run e2e:release -- <release options>` |
| open-handle debug | `npm run test:ci -- <file> --runInBand --detectOpenHandles --no-coverage` |
| active German runtime assembly | `npm run i18n:de:audit` |
| active locale context and quality | `npm run i18n:context:check -- --locale <canonical-locale>` then `npm run i18n:locale:quality:check -- --locale <canonical-locale>` |
| one-shot canonical locale summaries | `npm run i18n:locale:artifacts:write` then `npm run i18n:locale:artifacts:idempotence`; the isolated idempotence clone must reproduce generator-required remote refs such as `origin/main` |
| canonical semantic evidence format | `npm run i18n:evidence:canonical:check` |
| language platform and hardcoding | `npm run i18n:platform:audit` then `npm run i18n:hardcoding:audit` |
| all-active-locale activation | `npm run i18n:locale:all:check` |
| existing-translation correction overlay | `npm run i18n:corrections:check` |
| historical Issue #606 snapshot only | `npm run i18n:de:delta:review:check` |
| final managed push | `npm run push:checked -- <normal-git-push-args>` |
| receipt-bound transport retry | `npm run push:retry` |
| compact agent full gate | `npm run prepush:gate:agent` (full logs under `.local/test-logs/**`) |

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
