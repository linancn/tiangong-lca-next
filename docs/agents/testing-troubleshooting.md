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
  - scripts/release/**
  - docker/e2e/**
  - tests/e2e/i18n/**
  - package.json
  - .github/workflows/release-gate.yml
  - .github/workflows/release-readiness.yml
lastReviewedAt: 2026-08-17
lastReviewedCommit: d338df0622f177805905da29f65862175c7adb5f
lastReviewedNote: 'Reviewed for Next Issue #880: persistent ResultSet continuation preserves the current repository ownership, localization, validation, and release contracts.'
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
| a mocked hook API method is missing only after a state-driven rerender | the hook mock returns a new placeholder object on every render before its child can attach the API | preserve the hook result with a ref, update methods on that stable object, and add a direct parent-rerender identity regression before rerunning the affected flow |
| Task Center shows duplicate TIDAS exports or keeps an old completion timestamp after a new request | local submission/persisted aliases were treated as separate facts instead of reconciling the backend worker/package identity | run the focused `tests/unit/services/tidasPackage/taskCenter.test.ts` suite, compare `workerJobId` and `jobId`, and verify hydration, queue, polling, and Worker refresh all retain one canonical task with backend timestamps |
| provider or context error | missing wrapper or wrong test utility | use the repo helper that already provides the required wrapper |
| data workflow smoke assertion mismatch | `fixtures/data/**`, `fixtures/result/**`, workflow default path, or last-run artifact drifted apart | compare the case in `tests/data-workflows/fixtures/result/README.md`, then update the paired input fixture, expected-result Markdown, workflow lib default, and unit proof together |
| `release:to-dev` or `release:promote-dev-to-main` returns a drift error | the requested version, Issue marker, dev merge SHA, branch candidate, or current remote ref no longer matches the planned identity; a release-line error additionally means `main` is neither directly contained in `dev` nor an exact tree-identical two-parent promotion whose second parent remains in `dev` history | read the single JSON error, its structured alignment reason, and `next_action`; inspect the referenced PR/SHA and tree identities, then rerun dry-run against current remotes; do not force-update or reuse a mismatched release branch |
| `release:to-dev` returns `docpact_review_requires_manual_action`, `release_review_document_changed`, or another automatic-review boundary error | Docpact found more than review-only evidence, package semantics exceed the three version fields, or review marking would alter governed content | inspect the returned `.local/release-automation/*-docpact.json` report and exact path/reason; move substantive package or documentation work into a separately reviewed PR, and never broaden the automatic allowlist to make the release pass |
| the manual semantic workflow returns `semantic_qualification_failed`, `semantic_qualification_scope_invalid`, or qualification provenance mismatch | the fresh closed-simulator qualification failed or did not bind the selected business-PR candidate | inspect the manual workflow artifact and qualification report; fix the first candidate/harness failure on that same open PR, then rerun without hand-editing hashes or proof records |
| `e2e:qualify` reports every listed browser case passed or intentionally skipped but ends with `E2E_QUALIFICATION_INCOMPLETE` | canonical discovery or its fail-closed totals no longer include the complete recursive `tests/e2e/i18n/**` spec tree | compare `preflight-report.json` discovery counts with `semantic-harness-qualification.json`; restore recursive discovery and intentionally update the exact executed/designed-skip contract with unit and governance proof instead of weakening the closure check |
| `release:to-dev` returns `release_preflight_failed` | the fully composed version/Docpact candidate failed static locale or reference validation | inspect the retained release log, fix the first static contract failure in a separate scoped change, then rerun; no branch was pushed and no PR was created by the failed attempt |
| a deterministic release command returns `managed_push_failed` | its exact restricted push profile rejected branch/base/path identity, Docpact or static preflight failed, or the original transport failed | inspect the returned `.local/release-automation/**` log; if and only if that checked push created a new exact-intent receipt, the command already attempted `push:retry`, so fix the first reported structural/static/transport cause before rerunning `--apply` |
| release E2E fails before any browser test | Node/Git/Docker, pinned image, output permissions, candidate identity, browser launch, bundle readiness, backend/auth, recovery ledger, or discovery is invalid | run `npm run e2e:env:doctor -- --format json`, then inspect the first failed check in `preflight-report.json`; use its one next command instead of starting the full suite |
| release E2E refuses a dirty candidate | release evidence cannot identify a mutable worktree | commit the intended candidate before release proof, or use `npm run e2e:dev` for focused diagnosis; never mount the parent workspace to make the dirty tree appear runnable |
| `release:proof:verify` rejects a qualification proof | the proof key, candidate inputs, environment contract, or closure result does not match the current checkout | rerun the manual workflow for the exact current ref or rerun `e2e:qualify -- --proof <ignored-path>` locally; do not copy proof into tracked source or edit its hashes |
| release E2E reports `E2E_INVOCATION_LOCKED` | another install/run/resume/clean command still owns the project runtime | wait for that exact command to finish and retry the reported command; a dead PID lock is recovered automatically, so do not delete live runtime state |
| `e2e:release:resume` rejects or is unavailable | the receipt expired, arguments were supplied, identity/input drifted, or execution reached browser/fixture/cleanup work | start a fresh `npm run e2e:release`; resume is intentionally limited to one exact pre-fixture failure and always reruns preflight |
| Playwright refuses `E2E_BASE_URL` | the browser target is not the local candidate frontend | use a loopback candidate URL and let `playwright.config.ts` start `npm run start:main`; never point the Playwright frontend target at production |
| the manual semantic workflow reports missing login controls, detached menus, or lost URL state | the selected committed candidate or hermetic harness failed browser acceptance | fix the behavior or harness on the same open business PR, keep `failOnFlakyTests` enabled, and do not add a fixed sleep or make this workflow a release prerequisite |
| authenticated semantic E2E skips or fails before setup | the authorized local session lacks a mode-`0600` users env file, explicit authenticated/write/evidence options, the production target proof, or a safe recovery-ledger path | keep GitHub Actions credential-free/read-only; run `npm run e2e:release -- --authenticated --allow-production-data --write-verified-evidence --users-env-file <path>` locally, and inspect the role-neutral auth/safety preflight check rather than assuming a required business role |
| production-data release E2E reports `E2E_PRODUCTION_DATA_FORBIDDEN_IN_HOST_CI` | the host exported `CI` or `GITHUB_ACTIONS`, so the controller cannot prove a local operator boundary | run from a genuine local operator shell after removing only an accidentally inherited host marker; never clear a real CI marker or bypass the guard. The controller itself clears the release image's inherited markers only after this host check passes. |
| explicit production locale readiness rejects external semantic evidence | the artifact is absent or one of the 49 assertion IDs, registry locales, required browsers, current backend/package/runtime/route/test/source bindings, or cleanup counts is incomplete or stale | inspect the first mismatched contract field and rerun the authorized closure when required. Never edit evidence to simulate execution; the static release preflight intentionally checks only the proof contract. |
| Firefox reference-race E2E sees no pending stale consumer after a search/hash navigation | Firefox restored the current candidate document runtime and its warm in-memory reference cache, so clearing IndexedDB/localStorage did not force the intercepted asset request | cross an explicit neutral-document boundary before opening the next candidate deep link, then require the stale request/pending consumer and repeat the focused Firefox scope; do not weaken the race assertion or add a fixed sleep |
| WebKit reference-cache qualification fails with `route.fetch: socket hang up` during navigation | a count-only route handler unnecessarily proxied the static response, so navigation cancellation tore down the test-owned fetch | retain the request counter but use `route.fallback()` so the normal static-server transport owns the response; do not hide the failure with retry, a blanket catch, or a weaker cache assertion |
| a deterministic dev Release PR does not show browser E2E | browser qualification is intentionally outside release proof | if browser evidence is warranted, stop before release-to-dev and manually dispatch `i18n-semantic-e2e.yml` for the still-open business PR; release PR, promotion, and publication must not add a late browser gate |
| raw container semantic evidence fails the repository canonical checker | the writer resolved formatting from the external `/e2e-output` destination instead of the repository-owned evidence path | check the raw artifact with `node --import tsx scripts/i18n/check-semantic-evidence-format.mjs --path <artifact>`; fix repository-config resolution at the writer boundary and rerun the generating workflow, without host-side normalization or weakening the checker |
| a release gate fails but a matching new tag already exists | tag publication ran before the non-browser release proof or the tag was created manually | stop publication and inspect the tag owner/SHA; never move an immutable release tag. The canonical workflow must create a missing tag only after exact Release Gate proof verification, and any corrected candidate uses a new patch version |
| a main promotion PR or canonical `main` release fails proof verification | the exact dev proof was absent, expired, ambiguous, mismatched, unavailable; either merge was not the expected unchanged-tree two-parent merge; or the proof-bound main baseline drifted | inspect the proof resolver JSON and `Release Qualification` summary for `gate_reason`; do not rerun the aggregate late or bypass qualification. Repair the workflow on `dev` when needed and create a new patch candidate from the current main baseline |
| release qualification succeeds in proof-reuse mode but tag, draft, web, Electron, or verification jobs are skipped | a publication job inherited GitHub's implicit success condition from the intentionally skipped full-gate ancestor instead of evaluating explicit direct dependency results | require `!cancelled()` plus `success` for every direct prerequisite in that job; keep the qualification aggregator as the only place that accepts `reuse + skipped`, and never replace the publication guard with naked `always()` |
| teardown refuses cleanup or reports a leaked `codex-e2e` process | the intent ledger is invalid, the production row UUID/owner/five-field registry marker closure does not match, or exact-ID deletion failed | preserve the ignored ledger; inspect only the exact UUID row, restore verifiable ownership/marker evidence or escalate, and never broaden deletion; do not create another record until `created=cleaned` and `leaked=0` |
| teardown reports that the primary ledger has no matching recovery copy | another invocation is active, a stale teardown is reading a newer run's primary ledger, or the protected external recovery file was removed | stop every older E2E runner, verify the exact UUID through audit/read-only checks, and restore only the matching recovery copy; never let the orphaned primary ledger authorize deletion |
| Header locale changes reload the document or an old reference label returns after switching | Umi `SelectLang` lost `reload={false}` or an old-locale async response won the race | restore in-document switching, then rerun the same-document identity/URL proof and the delayed old-response race test before accepting the locale refresh |
| Playwright browser executable is missing | a direct host run lacks binaries, or the hermetic image is absent/mismatched | for `e2e:dev`, run `npx playwright install chromium firefox webkit`; for exact committed qualification, run `npm run e2e:env:install` and do not repair browsers one by one on the host |
| scope-closure qualification rejects the candidate or target before Playwright | the checkout is dirty, the commit is not exact, isolated-non-production confirmation is absent, a target is non-loopback, or an environment value has a production fingerprint | commit the intended candidate, supply only the documented confirmation and loopback backend target, and rerun the adapter; never weaken the guard or print the rejected value |
| scope-closure qualification browser assertions pass but provider evidence is rejected | the discovered test-title closure, canonical output, exact SHA/run ID, owned consumer leaves, or sensitive-field scan differs from the Worker schema | compare the adapter against the exact Worker `scope-closure-provider-owned-result.v1` schema and aggregator commit, restore the required browser case/title rather than hand-editing JSON, then run twice with the same run ID |
| docs capture reports `missing-credentials` or `invalid-authentication` | the secret pointer/file/mode is invalid, identity does not match, or login/MFA/session did not complete | verify only that `DOCS_SCREENSHOT_ENV_FILE` points to the external absolute regular mode-`0600` file; never source or print it, and do not convert this failure into an access-denied Draft |
| docs capture rejects `--base-url` before browser launch | the caller omitted the run-scoped origin or supplied credentials, a path, query, fragment, or non-HTTP(S) URL | rerun through the workspace runtime wrapper for a local candidate, or pass the explicitly approved production origin; never restore `DOCS_SCREENSHOT_BASE_URL` to the account file |
| docs capture reports environment failure instead of `verified-access-denied` | the probe returned `401`/`404`/`5xx`, timed out, lacked identity proof, or had only an uncorroborated UI denial | repair the exact authentication/route/locator/environment failure and rerun; only authenticated authoritative denial can enable the Draft exception |
| docs capture mutation guard reports a blocked request | the selected UI state attempted an application write outside the explicit auth/session allowlist | stop the capture, choose a read-only route/filter or safe fixture, and do not broaden the allowlist to production mutation endpoints |
| one gate fails only while another Umi-generating command is running locally | concurrent focused tests, coverage, or full gate regenerated shared `.umi-test` | stop or await every heavy command, then rerun only the narrow failed command serially; do not chain broad test, coverage, and full-gate reruns |
| Agent/CI full-gate output shows only a stage or failure summary and more Jest detail is needed | compact mode intentionally keeps the console bounded while retaining complete logs | inspect `.local/test-logs/**` locally or download the seven-day `release-gate-jest-logs-*` artifact from the Release Gate run; do not disable compact mode just to expand the CI console |
| locale artifact generation changes tracked summaries on a second identical run | the writer emitted non-canonical output, used the wrong dependency order, or retained ambient state | run `npm run i18n:locale:artifacts:write`, then `npm run i18n:locale:artifacts:idempotence`; fix the first non-idempotent writer or input instead of committing a second wave of generated hashes |
| locale artifact idempotence fails only in CI with `invalid object name 'origin/main'` | the isolated clone did not reproduce the remote ref consumed by the semantic backend-target check; a detached checkout has no accidental local `main` branch to mask it | copy the exact source `refs/remotes/origin/main` commit into the isolated clone before generation; do not weaken the backend-target check or depend on a local branch |
| Jest exits non-zero without an assertion failure and macOS writes a Node `.ips` report with `ClearStaleLeftTrimmedPointerVisitor` | native Node/V8 GC crash rather than a failed suite; a recycle boundary below the instrumented worker's normal footprint can amplify collection churn | confirm the crash signature once; keep `prepushGateReceipt.test.ts` in its repo-owned no-coverage process and verify the checked-in two-worker command retains the `512MB` recycle boundary, then run one bounded `--maxWorkers=1` diagnostic on the same Node/checkpoint only if the crash recurs; do not repeatedly rerun an unchanged crashing gate |
| local `docpact:gate` or manual `ai-doc-lint` fails with `missing-review` after runtime, service, or test changes | required governed docs were not reviewed in the same PR | rerun `npm run docpact:gate`, inspect the required docs from `.docpact/config.yaml`, and touch the owning docs with a real review/update |
| a manually assembled or historical feature/dev candidate passed Docpact but the deterministic dev Release PR reports `missing-review` | the earlier gate used a narrower feature or `dev` base, while release qualification checks the complete `main` promotion range | use `release:to-dev`, which independently preflights the version candidate and cumulative `main`-to-candidate path sets and records only bounded review evidence; for an already immutable candidate, genuinely review every required document in a separate `dev` PR and publish a new patch version rather than mutating the old candidate |
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
| checked push reports an ineligible ref update | the source is not the current exact branch/`HEAD`, the destination is not a branch, or more than one update was requested | correct the refspec shown by the command; the helper must reject this shape before Docpact/full tests, and an ordinary raw deletion-only push intentionally skips those gates |
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
