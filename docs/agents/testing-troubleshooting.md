---
title: next Testing Troubleshooting
docType: runbook
scope: repo
status: active
authoritative: false
owner: next
language: en
whenToUse:
  - when Jest tests fail, hang, timeout, or reopen coverage gaps
  - when narrowing a failing suite to the shortest recovery path
  - when troubleshooting guidance for repo tests changes
whenToUpdate:
  - when the shortest supported recovery commands change
  - when common failure modes or first actions change
  - when the troubleshooting playbook becomes stale
checkPaths:
  - docs/agents/testing-troubleshooting.md
  - docs/agents/testing-patterns.md
  - docs/agents/repo-validation.md
  - scripts/test-runner.cjs
  - playwright.config.ts
  - scripts/e2e/**
  - docker/e2e/**
  - tests/e2e/i18n/**
  - package.json
lastReviewedAt: 2026-07-23
lastReviewedCommit: 8d4f4a489484c56068ba54936209127568cf992b
lastReviewedNote: 'Reviewed for Issue #676 after the v0.0.58 production-readiness failure; added the version-only package-lock recovery distinction.'
---

# Testing Troubleshooting

> Purpose: shortest recovery path when tests fail, hang, timeout, or reopen coverage gaps.

## Focused Recovery Commands

Canonical baseline and proof ownership stays with `DEV.md` and `docs/agents/repo-validation.md`. Use this shortlist only for the narrow recovery command that matches the failure mode.

| Need | Command shape |
| --- | --- |
| focused integration | `npm run test:ci -- tests/integration/<feature>/ --runInBand --testTimeout=20000 --no-coverage` |
| focused unit or component | `npm run test:ci -- tests/unit/<scope>/ --runInBand --testTimeout=10000 --no-coverage` |
| detect open handles | `npm run test:ci -- <file> --runInBand --detectOpenHandles --no-coverage` |
| focused semantic localization E2E | `npm run e2e:dev -- <Playwright arguments>` |
| release environment diagnosis | `npm run e2e:env:doctor -- --format json` |
| exact pre-fixture continuation | `npm run e2e:release:resume` (no arguments) |

## Failure Diagnosis

| Symptom | Likely cause | First action |
| --- | --- | --- |
| timeout or maximum update depth | loop in effect, stale mock, unresolved async state | narrow to one file, then inspect effect triggers and mocked promises |
| auth or session flow failing | missing provider, missing auth mock, stale route state | reuse existing auth wrapper and compare against nearby passing tests |
| element not found | query too early, wrong role/text, render path not reached | assert the prerequisite state first, then switch to semantic query |
| a visible action exists but the expected request never starts | the control is present but still disabled while prerequisite data loads | wait for the control to become enabled, then interact; do not replace the product guard with an arbitrary delay |
| mock not hit | wrong import path or mock order | verify module path and set mocks before importing the subject |
| provider or context error | missing wrapper or wrong test utility | use the repo helper that already provides the required wrapper |
| data workflow smoke assertion mismatch | `fixtures/data/**`, `fixtures/result/**`, workflow default path, or last-run artifact drifted apart | compare the case in `tests/data-workflows/fixtures/result/README.md`, then update the paired input fixture, expected-result Markdown, workflow lib default, and unit proof together |
| release E2E fails before any browser test | Node/Git/Docker, pinned image, output permissions, candidate identity, browser launch, bundle readiness, backend/auth, recovery ledger, or discovery is invalid | run `npm run e2e:env:doctor -- --format json`, then inspect the first failed check in `preflight-report.json`; use its one next command instead of starting the full suite |
| release E2E refuses a dirty candidate | release evidence cannot identify a mutable worktree | commit the intended candidate before release proof, or use `npm run e2e:dev` for focused diagnosis; never mount the parent workspace to make the dirty tree appear runnable |
| release E2E reports `E2E_INVOCATION_LOCKED` | another install/run/resume/clean command still owns the project runtime | wait for that exact command to finish and retry the reported command; a dead PID lock is recovered automatically, so do not delete live runtime state |
| `e2e:release:resume` rejects or is unavailable | the receipt expired, arguments were supplied, identity/input drifted, or execution reached browser/fixture/cleanup work | start a fresh `npm run e2e:release`; resume is intentionally limited to one exact pre-fixture failure and always reruns preflight |
| Playwright refuses `E2E_BASE_URL` | the browser target is not the local candidate frontend | use a loopback candidate URL and let `playwright.config.ts` start `npm run start:main`; never point the Playwright frontend target at production |
| a public semantic browser job reports a flaky missing login control after cold startup | the global candidate probe passed, but a new page returned from `domcontentloaded` before its login route mounted | keep `failOnFlakyTests` enabled, make the page use the shared rendered-login readiness helper, move regenerable Umi/MFSU caches aside, and rerun the exact browser scope without a fixed sleep or global timeout increase |
| authenticated semantic E2E skips or fails before setup | the authorized local session lacks a mode-`0600` users env file, explicit authenticated/write/evidence options, the production target proof, or a safe recovery-ledger path | keep GitHub Actions credential-free/read-only; run `npm run e2e:release -- --authenticated --allow-production-data --write-verified-evidence --users-env-file <path>` locally, and inspect the role-neutral auth/safety preflight check rather than assuming a required business role |
| production-data release E2E reports `E2E_PRODUCTION_DATA_FORBIDDEN_IN_HOST_CI` | the host exported `CI` or `GITHUB_ACTIONS`, so the controller cannot prove a local operator boundary | run from a genuine local operator shell after removing only an accidentally inherited host marker; never clear a real CI marker or bypass the guard. The controller itself clears the release image's inherited markers only after this host check passes. |
| explicit production locale readiness rejects semantic evidence | one of the 49 assertion IDs, registry locales, required browsers, current backend/package/runtime/route/test/source bindings, or cleanup counts is incomplete or stale | inspect the first mismatched contract field. A root application-version-only package-lock change should pass through the verified runtime projection; any dependency or other bound-input drift requires the affected browser scope and complete authenticated closure. Never edit evidence to simulate execution. Routine activation/pre-push checks must not require current production-proof hashes. |
| teardown refuses cleanup or reports a leaked `codex-e2e` process | the intent ledger is invalid, the production row UUID/owner/five-field registry marker closure does not match, or exact-ID deletion failed | preserve the ignored ledger; inspect only the exact UUID row, restore verifiable ownership/marker evidence or escalate, and never broaden deletion; do not create another record until `created=cleaned` and `leaked=0` |
| teardown reports that the primary ledger has no matching recovery copy | another invocation is active, a stale teardown is reading a newer run's primary ledger, or the protected external recovery file was removed | stop every older E2E runner, verify the exact UUID through audit/read-only checks, and restore only the matching recovery copy; never let the orphaned primary ledger authorize deletion |
| Header locale changes reload the document or an old reference label returns after switching | Umi `SelectLang` lost `reload={false}` or an old-locale async response won the race | restore in-document switching, then rerun the same-document identity/URL proof and the delayed old-response race test before accepting the locale refresh |
| Playwright browser executable is missing | a direct host run lacks binaries, or the release image is absent/mismatched | for `e2e:dev`, run `npx playwright install chromium firefox webkit`; for release proof, run `npm run e2e:env:install` and do not repair browsers one by one on the host |
| one gate fails only while another Umi-generating command is running locally | concurrent focused tests, coverage, or full gate regenerated shared `.umi-test` | stop or await every heavy command, then rerun only the narrow failed command serially; do not chain broad test, coverage, and full-gate reruns |
| Jest exits non-zero without a failure or final summary and macOS writes a Node `.ips` report with `ClearStaleLeftTrimmedPointerVisitor` | native Node/V8 GC crash in the long-lived in-band coverage process, not a Jest assertion failure | confirm the crash signature once; keep `prepushGateReceipt.test.ts` in its repo-owned no-coverage process and run the remaining coverage suites through one worker at a time with the `64MB` idle-memory recycle boundary; do not rerun the unchanged monolithic gate |
| local `docpact:gate` or manual `ai-doc-lint` fails with `missing-review` after runtime, service, or test changes | required governed docs were not reviewed in the same PR | rerun `npm run docpact:gate`, inspect the required docs from `.docpact/config.yaml`, and touch the owning docs with a real review/update |
| feature/dev Docpact passed but the post-merge Release Gate reports `missing-review` | the earlier gate used a narrower feature or `dev` base, while the release gate checks the complete `main` promotion range | reproduce from the intended candidate with `DOCPACT_BASE_REF=origin/main npm run docpact:gate`, genuinely review every required document, publish a new patch version if an immutable release tag already exists, and backmerge the `main` hotfix to `dev` |
| `i18n:audit` reports missing, duplicate, or computed message IDs | locale topology drift, one key has multiple owners, or a runtime family is not enumerated | inspect the reported key and callsites, update the canonical manifest/decision record, then rerun the audit before translating or adding an allowlist |
| language-platform or hardcoding audit reports a new locale/language finding | a registry/Manifest join is incomplete, an alias/adapter conflicts, or business code owns a language literal outside the typed boundary | update the owning registry/Manifest and derive the consumer; use only an exact, issue-owned adapter exception when the literal is an unavoidable external boundary |
| activation reports `platformContractValid` but `productionActivationReady` is false | the platform structure is valid but a required reference resource is missing, development-only, or not yet official/project-reviewed | inspect `referenceResourceBlockers` and complete the owner Issue; do not relabel an English development base as localized data |
| canonical manifest is stale only because `origin/dev` advanced | an old checker resolved the moving ambient branch instead of the manifest's recorded source commit | run the fixed default `--check`, which validates the recorded commit and audited-input digest; use explicit `--base-ref` or `--write` only when intentionally advancing provenance |
| active locale or clean CI reports missing confirmation files | an active command accidentally depends on a historical German checker or ignored `.local` evidence | remove that dependency and rerun the registry-driven context/quality/correction/activation path; only explicit historical-checker tests may create private temporary fixtures |
| frozen German Pilot check reports context or `offlineReviewConfirmation` drift | the inherited Issue #601 snapshot, context ledger, producer evidence, or ignored approval no longer matches its frozen source | stop runtime activation work and inspect the frozen English, Chinese, German, callsites, and approval hashes; do not regenerate or silently reinterpret the approved baseline |
| active locale context, quality, or activation manifest is stale | a controlled catalog, route/view, registry, fallback, glossary, style, correction, or runtime input changed | inspect the affected closure, then regenerate the compact artifacts with `npm run i18n:locale:artifacts:write -- --locale <canonical-locale>` and rerun their checks |
| historical Issue #606 delta review is missing, malformed, or stale | an operator explicitly ran the frozen compatibility checker without its original ignored evidence | stop unless the task is specifically to validate that historical snapshot; never generate a new confirmation for active German corrections |
| local German review generation refuses to overwrite | an existing form may contain human notes or decisions | preserve the file, regenerate to another private path, or use explicit `--force` only after intentionally discarding the obsolete form |
| local German review rejects its input/output path | the path is inside the repository but outside ignored `.local/i18n-de-DE/`, is tracked, or traverses a symlink | keep completed evidence in the private ignored directory (or an external private path); never move it under tracked docs |
| active `i18n:de:audit` reports correction or activation drift | current German differs from the pinned accepted baseline without an exact dossier, or context/quality/runtime inputs changed | add or repair the compact tracked correction dossier, regenerate active artifacts, and rerun shared checks; never request a new private delta approval |
| managed push transport fails after both gates pass | `push:checked` activated the ignored exact-intent receipt and the remote may or may not have accepted the commit | run argument-free `npm run push:retry`; it succeeds idempotently when the exact SHA already arrived and otherwise retries only while the remote and all bound inputs remain unchanged |
| raw push fails after its hook passed but no receipt exists | only `push:checked` can bind the original push intent and activate bounded recovery after a failed transport | run a fresh `npm run push:checked -- <normal-git-push-args>` so its ordinary hook re-establishes evidence; never use `--no-verify` or `HUSKY=0` manually |
| every hook-driven receipt test exits before either fake gate on GitHub Ubuntu | the hook forced `nvm use 24` even though `setup-node` had already activated Node 24 outside NVM | verify the active Node major first, use it when already 24, and consult NVM only as a fallback |

## Open-Handle Playbook

1. rerun the narrowest failing file with `--detectOpenHandles`
2. inspect unresolved timers, intervals, subscriptions, or pending promises
3. confirm cleanup runs in `afterEach`, `useEffect`, or helper teardown
4. rerun the file without watch mode

## Coverage Gap Playbook

1. identify the touched file or reopened queue head
2. prefer a real test for the missing branch
3. if the branch is dead, remove it without changing behavior
4. rerun focused proof
5. rerun the coverage proof defined in `docs/agents/repo-validation.md` only after the gap is actually closed

## Final Verification

- rerun the narrow failing scope
- rerun neighboring suites if shared behavior changed
- rerun the baseline proof from `docs/agents/repo-validation.md` when the failure affected shipped behavior or repo gates
- for a concurrency-only failure, wait for all Umi-generating commands to exit and rerun the narrow failed proof serially before escalating; reserve the full gate for the final controlled checkpoint
- update the owning testing docs only if workflow or state changed
