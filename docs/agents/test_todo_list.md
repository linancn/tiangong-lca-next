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
  - scripts/release/**
  - docker/e2e/**
  - tests/e2e/i18n/**
  - .github/workflows/i18n-semantic-e2e.yml
  - tests/**
  - scripts/test-runner.cjs
  - scripts/test-coverage-report.js
  - .github/workflows/build.yml
  - .github/workflows/release-gate.yml
  - .github/workflows/release-readiness.yml
lastReviewedAt: 2026-08-13
lastReviewedCommit: a7babd6228fb65271378899bccb7d6fac5ae23cc
lastReviewedNote: 'Reviewed for Next Issue #819: current execution state records exact proof reuse and requalification of the two-worker full-coverage inventory at a 512MB recycle boundary.'
---

# Testing Execution State

> Source of truth for the current operational testing state. Use this file for present-state execution facts, not for long-term strategy.

## Checked-In Reference Baseline

- reference full run: `npm run prepush:gate`
- verified commit: `97130a89424f1a1f70988cb0c33f6c4ab7fb895c`
- suites: `413`
- tests: `5688`
- tracked source files: `462`
- coverage: `100%` statements, branches, functions, and lines

This is a checked-in reference, not a per-PR execution ledger. A delivery's post-commit, hook-owned full-gate result belongs in its PR validation evidence; update this section when the reference counts, coverage policy, or queue state materially changes.

## Current State

- repo is in full-closure maintenance mode
- there is no active ordered coverage queue right now
- touched code must stay at full closure
- Issue #799 adds focused TIDAS task-center coverage for duplicate queue aliases, persisted alias hydration, canonical backend timestamps, one active poller, and post-coalescing failure routing; it creates no open coverage queue
- Issue #778 adds hermetic contract coverage for the two deterministic release commands: JSON purity, non-mutating dry-run, qualification reuse and automatic exact-receipt generation, qualification/preflight failure before transport, rejection of unexpected untracked JSON, exact version fields, large-lockfile blob fallback, checked-push delegation, idempotent PR reuse, immutable promotion identity, independent version-candidate and cumulative `main`-to-candidate Docpact preflight, bounded automatic review, and fail-closed package/document/diagnostic/branch/dev/marker drift. A real isolated clone also proves the current review closure reaches a bounded fixed point without document-body changes. It creates no open coverage queue.
- Issue #693 moves profile validation, generic visual-plan, account-secret, run-scoped origin, output-containment, access classification, and capture compatibility proof to workspace tooling.
- Issue #748 adds a git-tracked scope-closure qualification adapter for the Next owner. Its isolated Chromium flow proves preparing, available, expired, and unavailable presentation; direct document navigation for bounded XLSX and machine-readable manifests; integrity/expiry metadata; localized 410 rerun guidance; and anonymous, standard-user, administrator, owner, and data-product-manager routing without production targets or mutation.
- locale topology, message ownership, ICU placeholders, and dynamic families are additionally protected by `npm run i18n:audit`
- active German pins the accepted 2,737-message catalog/runtime state at `c26f306e82ac66f50a56aafe8f89ea96c0b0c67d`; post-baseline existing-message changes use the tracked automated correction overlay, while Issue #601/#602/#606 confirmations retain frozen-history semantics only
- active locale proof uses `i18n:audit`, the registry/Manifest and hardcoding audits, registry-driven context/quality, `i18n:corrections:check`, and all-locale activation; focused proof stays in the edit loop, and each delivery gets one post-commit full gate through `push:checked`
- Issue #635 adds a separate Playwright semantic localization proof surface: `npm run test:e2e:i18n` derives all locale/content-language expectations from registries, binds 49 stable route/view assertion IDs, runs Chromium across the complete matrix, and requires the login/selector, team authoring, and process lifecycle critical scenarios in Chromium, Firefox, and WebKit
- semantic E2E GitHub Actions is credential-free/read-only and runs only contract discovery plus three-browser public semantics; it is optional through `workflow_dispatch`, mandatory for the exact release SHA, and absent from routine PR/dev triggers, while authenticated candidate-local/production-backend closure is restricted to an explicitly authorized local operator session with authenticated mode, both production-write guards, and an explicit verified-evidence opt-in
- Issue #654 adds `e2e:env:install`, read-only `e2e:env:doctor`, exact-candidate `e2e:release`, argument-free bounded `e2e:release:resume`, owned cleanup, and focused `e2e:dev`; release mode archives only a clean Next commit, uses a digest-pinned container and cached production build, performs all safe checks before fixture intent, and never mounts the workspace
- Issue #780 aligns semantic E2E role, team, and FlowProperty fixtures with the current Membership/Team/search RPC facades. It also makes canonical qualification discovery recursive so the nested lexical-search workflow is included in the fail-closed matrix: 81 canonical positions comprise 51 executed cases and 30 designed cross-browser skips, plus 12 harness controls for 93 qualification positions total. The explicitly authorized authenticated run for exact `dev` commit `42b7e37ad3334e69bad22932677e61f9dfb31774` passed 60 cases with 33 designed skips across Chromium, Firefox, and WebKit, closed all 49 assertion IDs, and finished the single UUID-scoped production fixture with `created=1`, `cleaned=1`, `leaked=0`. The evidence-bearing commit was then qualified credential-free with 63 passed positions, 30 designed skips, zero external requests, zero production writes, and no cleanup residue. This repair creates no open coverage queue.
- Issue #756 qualifies exact `dev` commit `4680e5a7ab67800268ae1627af999a4480cea646` for the v0.0.65 promotion: 48 canonical cases plus 12 harness-control cases passed across Chromium, Firefox, and WebKit, 24 designed cases skipped, all 49 assertion IDs closed, and external requests and production writes remained zero. The generated receipt must merge through the normal `dev` PR flow before production-readiness proof resumes from the resulting clean candidate.
- Issue #743 first refreshed the credential-free semantic-harness qualification for exact `dev` commit `3ac0ca60a7370d767ca003342180bb51f1b2dd7d`; that receipt merged through PR #744 before the clean production run. The evidence-bearing v0.0.64 commit `1cf3f5accdbf4ef745022ed69d8815e851df833f` was then requalified with 48 canonical cases plus 12 harness-control cases passed, 24 designed cases skipped, all 49 assertion IDs closed, and external requests, production writes, and cleanup residue all zero. The receipt path remains outside its own qualification digest, so committing this generated receipt preserves the qualified input identity.
- Issue #704 tracks two harness defects observed during authenticated production evidence refreshes. The evidence-writer repair now resolves the repository-owned Prettier configuration independently of `/e2e-output` and gives the checker a read-only external-artifact path, so raw container bytes can satisfy the same canonical contract without host normalization. The separate argument-free `e2e:release:resume` dispatch defect remains open under #704.
- Issue #660 keeps production-data E2E fail-closed on real CI hosts while allowing an authorized local run to override only the release image's inherited `CI`/`GITHUB_ACTIONS` markers before the unchanged in-container authorization and ledger checks
- Issue #743's tracked semantic evidence now comes from one explicitly authorized local authenticated execution of exact v0.0.64 candidate `2486dc7547fe0f840cba0beb13139a79783024d0`: 60 cases passed, 24 designed cases skipped, all 49 assertion IDs closed across Chromium, Firefox, and WebKit, and the single UUID-scoped production fixture finished `created=1`, `cleaned=1`, `leaked=0`. Production readiness remains fail closed on declared source/test/route bindings; routine pre-push checks validate the record structurally without requiring current production-proof hashes, package-lock verification rejects all executable dependency drift while tolerating only root release-version metadata after proving the evidence's raw lock at its recorded commit, and adding a registry locale still invalidates older evidence rather than silently shrinking coverage
- Header locale switching now keeps Umi `SelectLang` at `reload={false}`; focused proof covers same-document identity, URL retention, live reference-label refresh, and rejection of a delayed old-locale response
- clean-checkout active German and new-locale suites require zero confirmation-file dependencies; only explicit historical compatibility tests may exercise generated private fixtures
- pre-push receipt coverage includes a setup-node-style active Node 24 with an unusable NVM install, so runner bootstrap cannot exit before the repo-owned hook coordinator
- Issue #688 makes semantic evidence and locale summaries deterministic at the writer boundary: evidence is emitted in canonical JSON, all locale summaries are generated once in dependency order, and the isolated double-generation check requires the second run to preserve the exact Git diff
- Issue #688 also adds compact Agent/CI full-gate output while retaining complete Jest stdout/stderr and structured results under `.local/test-logs/**`; the Release Gate uploads those files for seven days on success or failure
- Issue #688 introduced exact non-browser semantic harness digest pairs, and Issue #703 added a bounded one-time release-candidate waiver plus request-guard pairs for the v0.0.62 promotion. Issue #698's fresh authenticated production evidence now directly covers the promoted product and request-guard inputs, so the active #703 waiver and all directly covered pairs are retired
- the back-merged #703 waiver mechanism remains fail closed for future reviewed exceptions, but the current manifest has no active release-candidate waiver. Only the post-evidence release-harness script and locale-contract test retain exact old/new pairs; duplicate, redundant, later-drifted, or unlisted mappings fail closed
- the earlier v0.0.62 main-to-dev back-merge was based before Issue #698 evidence PR #707 advanced `dev`, so it is superseded by the replacement back-merge that reconciles current `dev` with `main`; the replacement keeps the released v0.0.62 product state while treating the fresh authenticated production evidence as authoritative instead of restoring the retired Issue #703 waiver
- main-target PRs run the reusable Release Gate against their exact base/head and emit a 30-day exact proof only after success; main-semantic local pushes add `release:preflight` between Docpact and the full test gate, while `dev` pushes retain the normal two-gate path
- a canonical version-changing `main` push reuses that proof only when the exact merged PR, two parents, candidate tree, successful job, run attempt, and artifact payload all match; direct/squash/rebase merges, changed trees, expired or missing proof, API failure, manual tags, and recovery dispatches automatically run the full Release Gate
- release qualification delegates the complete Jest inventory to one `prepush:gate` execution—reused from the exact PR proof or run as the post-merge fallback—while the credential-free browser semantic E2E matrix validates the exact release SHA in parallel; tag creation and publication wait for both, and no earlier standalone `test:ci` is allowed
- Issue #819 keeps the exact complete coverage inventory on two workers but requires a `512MB` idle-memory recycle boundary and full managed-gate proof; lower boundaries that force collection around the normal instrumented worker footprint are not an accepted optimization
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
