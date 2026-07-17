---
title: next Repo Validation Guide
docType: guide
scope: repo
status: active
authoritative: false
owner: next
language: en
whenToUse:
  - when a change is ready for local proof
  - when deciding the minimum evidence required for a PR
  - when writing validation notes for this repo
whenToUpdate:
  - when canonical commands or quality gates change
  - when change categories require different proof
  - when coverage or deploy policy changes
checkPaths:
  - docs/agents/repo-validation.md
  - .docpact/config.yaml
  - package.json
  - jest.config.cjs
  - .husky/pre-push
  - scripts/prepush-gate-receipt.cjs
  - .github/workflows/**
lastReviewedAt: 2026-07-17
lastReviewedCommit: ba30c48a4157e5a30e3ab57b23263ae021923668
lastReviewedNote: 'Reviewed the v0.0.48 version-only release checkpoint; Calculation Bundle, Release-read, German delta, and clean-runner proof requirements are unchanged.'
related:
  - ../AGENTS.md
  - ../.docpact/config.yaml
  - ./repo-architecture.md
---

## Validation Order

1. identify the change type
2. run the minimum proof for that change type
3. add stronger proof only when the risk actually increases
4. record exact commands and environments in the PR

## Default Baseline

Unless the change is doc-only repo-maintenance work, the minimum local baseline is:

```bash
npm run lint
npm test
npm run build
```

The authoritative protected-branch gate is:

```bash
npm run docpact:gate
```

```bash
npm run prepush:gate
```

## Proof Matrix

| Change type | Minimum local proof | Stronger proof when risk is higher | Notes |
| --- | --- | --- | --- |
| routes, pages, app runtime, shared UI | `npm run lint`; focused `npm run test:ci -- <jest-args>`; `npm run build` | `npm run prepush:gate` | shared UX changes often affect multiple entrypoints |
| services or env selection | `npm run lint`; focused `npm run test:ci -- <jest-args>`; `npm run build` | `npm run prepush:gate` | companion proof may live in another repo if schema or Edge runtime changed |
| persisted Calculation Bundle or public release readback | `npm run lint`; focused `lcaReleases`, `CalculationBundlePanel`, `LcaReleaseReadPanel`, Data Processing, Process view, and locale tests; `npm run i18n:audit`; `npm run build` | `npm run prepush:gate`; paired Database RPC, Edge projection, Worker bundle, and deterministic package proof; live smoke only when a deployed environment and user credentials are available | private bundle reads use the user session; public release reads expose sanitized projections and short-lived artifact downloads only |
| process review-submit gate/job UI or service contract | `npm run lint`; focused review/gate/job tests such as `npm run test:ci -- tests/unit/services/workerJobs/api.test.ts tests/unit/services/reviews/taskCenter.test.ts tests/unit/components/LcaTaskCenter.test.tsx tests/unit/services/reviews/api.test.ts tests/unit/utils/review.test.ts tests/unit/pages/Processes/Components/edit.test.tsx --runInBand --testTimeout=30000`; `npm run build` | smoke `app_worker_jobs`, `app_dataset_review_submit_jobs`, the worker, and final process submit-review against a safe dev environment when credentials and a queued job are available | Next must render backend job states and gate evidence, enqueue/read submit jobs instead of calling final submit-review from the browser, recover task-center state from service-backed worker jobs, prefer the canonical root `review_submit.submit` worker job for task identity/actions, and avoid duplicating worker blocker heuristics or browser-authoritative checksum logic. |
| reviewed LCIA bundle under `public/lciamethods/**` or its validator | `npm run lcia-cache:verify`; `npm run lint`; focused LCIA cache/evidence tests; `npm run build` | `npm run prepush:gate` | verification must run before any web or Electron publication |
| other static bundles under `public/**` | `npm run lint`; `npm run build` | focused tests near the consuming feature | check both the asset and its readers |
| sync helpers under `docker/**` | `npm run lint`; `npm run build` | run the exact helper only when the task includes it | do not hand-edit synced mirrors |
| tests, coverage, or gate scripts | `npm run docpact:gate`; `npm run lint`; `npm run test:ci`; `npm run test:coverage`; `npm run test:coverage:assert-full` | `npm run prepush:gate` | coverage expectations remain strict |
| locale bundles, message IDs, or localized runtime copy | `npm run i18n:audit`; `npm run test:ci -- tests/unit/locales.test.ts --runInBand --testTimeout=20000 --no-coverage`; `npm run lint`; `npm run build` | `npm run prepush:gate`; browser smoke for selector, persistence, framework copy, fallbacks, and long-text layout when a locale is activated | all supported locales must match the canonical topology/key/placeholder contract; dynamic IDs require an audited family and unknown fallback |
| German human-review evidence only | validate the supplied private form before regeneration; use `npm run i18n:de:delta:review:check` for the active Issue #606 release-message delta | focused German review/runtime audit tests only when the checker, renderer, manifest, or review-policy implementation changed | ignored forms are not repository full-gate inputs; completed forms, reviewer identity, dates, decisions, and response digests never enter Git or GitHub |
| active German runtime bundle, manifest, or reviewed delta | run `npm run i18n:audit`, `npm run i18n:de:pilot`, `npm run i18n:de:runtime:manifest:check`, `npm run i18n:de:delta:review:check`, final `npm run i18n:de:audit`, and focused locale/runtime tests for the changed surface | `npm run build`; public and role-based browser smoke appropriate to the risk; final `npm run prepush:gate` through `push:checked` | activation must equal the accepted 2,689-message `dev` baseline plus Issue #606's declared 48 new release messages, with no modified baseline message or bundle-external prose item; changed review-bound inputs require a fresh private delta confirmation, while unrelated ignored/GitHub metadata does not invalidate the repository full gate |
| data workflow fixtures or workflow smoke harnesses | `npm run docpact:gate`; `npm run test:data-workflows:unit` | affected live smoke script only when credentials and target environment are part of the task, using `npm run test:workflows -- --<workflow> <workflow-args>`; `npm run test:api:smoke -- <workflow-args>` for broad supported API smoke coverage, then inspect its summary because child workflow failures do not make the command exit non-zero | keep `fixtures/data/**`, `fixtures/result/**`, workflow defaults, and unit path assertions aligned |
| repo docs only | `scripts/docpact lint --root . --files "<csv>" --mode enforce` | `scripts/docpact validate-config --root . --strict` when `.docpact/config.yaml` changes | still update review metadata and ownership as needed |

The local `pre-push` hook always runs `npm run docpact:gate` first, then runs the full `npm run prepush:gate` local test gate on every branch. The docpact gate defaults to `origin/dev` and can be redirected with `DOCPACT_BASE_REF=<ref>` for promote or hotfix branches. For a normal delivery, commit the final controlled tracked change and let that hook own the one authoritative full-gate run; do not manually run the same full gate immediately before pushing. Manual full-gate execution is for a no-push evidence handoff.

The hook uses an already-active Node.js 24 from `PATH`, including GitHub `setup-node`, before consulting NVM. It sources NVM and runs `nvm use 24` only when the active Node is missing or has another major version, then fails closed with an explicit version error if Node 24 is still unavailable.

Run every Umi-generating `test:ci`, coverage, and `prepush:gate` command serially because they share `.umi-test`. The full gate already includes coverage; do not surround it with redundant broad test or coverage runs for the same checkpoint.

Full-gate evidence binds the exact committed `HEAD`, tracked tree, Node/dependency state, and test/lint/build/coverage/Docpact/gate configuration. Ignored review content, GitHub body changes, and read-only checks do not create a new repository checkpoint. Any changed controlled tracked input does, and requires one new final full-gate run.

Use `npm run push:checked -- <normal git push arguments>` for the final managed push. Its ordinary hook runs the authoritative gates and returns a private gate-bound payload to the wrapper, but hook completion alone does not write an active receipt. When Git supplies no ref updates because the destination is already current, the hook skips checkpoint collection and both gates; a managed no-op still requires a private nonce-bound no-update acknowledgement, and that acknowledgement can never activate a retry receipt. A successful managed original push leaves no receipt. Only when a normal gate payload exists and the original update push returns non-zero does the wrapper activate an ignored, one-hour, bounded single-push-intent receipt under `.local/prepush-gate/`.

After that uncertain or failed transport, run `npm run push:retry` with no arguments. The repo-owned helper rejects operator-supplied remote, ref, SHA, or option arguments; it derives the exact target from the receipt, verifies the bound remote/refspec, HEAD/tree/branch, clean worktree, Node/npm, lockfiles and installed dependency tree, hook/gate inputs, and resolved Docpact base, then internally retries only the gate-bound commit SHA. Its exact-SHA `--no-verify` call is the only allowed bypass. If the remote already equals the target SHA, the helper clears the receipt and succeeds idempotently without another push or gate run. A successful helper transport also clears it. A failed retry may retain the receipt only while the remote remains at the bound pre-push SHA and the one-hour TTL remains valid; a pre-transport verification outage performs no push and leaves the bounded receipt available until verification recovers or the TTL expires. Expiry, malformed state, controlled-input drift, or any other verified remote state fails closed and invalidates it. A missing or invalidated receipt requires a new managed push and hook-owned gate run. Never invoke `git push --no-verify` or `HUSKY=0` manually. This bounded recovery path is not a reusable same-HEAD gate cache.

For deployment-only workflow changes under `.github/workflows/build.yml` or the manual `.github/workflows/ci.yml` fallback, validate the workflow shape directly with YAML parsing, formatter checks, and shell syntax checks for edited deploy scripts. For EdgeOne CLI dependency changes, also validate the pinned temporary install path locally without calling the live deploy command. Do not run production deploy commands locally or from PR validation unless the task explicitly requires exercising live deploy credentials; the automatic EdgeOne Pages deploy step runs from canonical `main` pushes by creating the matching `v*` tag from `package.json.version` and continuing release in the same workflow run, unchanged-version `main` workflow hotfix pushes skip release when the matching tag already belongs to an older `main` commit, manual `v*` tag pushes and `workflow_dispatch` recovery runs remain supported when the target commit is already on `main`, and Electron publication must pre-create exactly one tag-scoped draft before the parallel matrix and finish by verifying the exact 12 expected non-empty assets in that one draft. The manual deploy fallback is guarded to `refs/heads/main` and checks out `github.sha`, and ordinary non-release branch pushes belong to the local pre-push gate.

The production Release Gate runs the coverage-enabled complete Jest suite exactly once through `npm run prepush:gate`. Do not add a preceding standalone `npm run test:ci`; it exercises the same suite without producing an independent release artifact. The separate early LCIA verification remains a lightweight fail-fast publication check and `prepush:gate` retains the authoritative complete quality bar.

Treat dataset-validation work under `src/pages/*/sdkValidation.ts`, `src/pages/Utils/validation/**`, `src/components/ValidationIssueModal/index.tsx`, and localized validator copy under `src/locales/**` as shipped runtime work even when most of the change looks like error-message plumbing.

`CalculationBundlePanel` and `LcaReleaseReadPanel` are framework-heavy read-orchestration wrappers excluded from statement instrumentation, matching the existing wrapper policy. Their shipped behavior is still proved by focused component tests covering persisted refresh, directional LCI/LCIA rendering, legacy and authorization empty states, oversized-result protection, source-Process identity resolution, validation evidence, short-lived signed-link retry, and download actions. The underlying `src/services/lcaReleases/api.ts` transport, integrity, error, and decompression contracts remain inside the 100% coverage gate.

Treat `npm run i18n:audit` as the deterministic structural proof for locale ownership and runtime message references. Linguistic and domain sign-off remain separate review evidence; a green structural audit does not prove translation quality.

Canonical-manifest `--check` reuses the checked-in `source.baseRef` and immutable `source.baseCommit` unless `--base-ref` is explicitly supplied. Advancing an ambient branch such as `origin/dev` without changing audited locale/callsite inputs therefore does not stale a release checkout; `--write` and an explicit `--base-ref` still resolve and record the requested current commit.

Clean-checkout Jest and release gates must pass explicit nonexistent German confirmation paths and assert that only the expected local-confirmation findings remain while every tracked structural finding is zero. For Issue #606, the merged 2,689-message baseline is accepted, so the active-runtime clean-checkout test expects only the missing delta confirmation; the frozen Pilot test independently proves that its historical local confirmation still fails closed when explicitly absent. Positive approval behavior stays covered by generated private temporary fixtures. These repository tests do not claim human approval, and `i18n:de:pilot`, `i18n:de:delta:review:check`, and enforced `i18n:de:audit` continue to fail closed when the evidence they own is absent or stale.

For the active German workflow, merged `dev` commit `36836f2c` with 2,689 messages is the accepted immutable baseline for Issue #606; do not regenerate or reinterpret the inherited Issue #601/#602 decisions. After a controlled release-copy change, refresh the canonical manifest and runtime activation manifest, generate/check the separate private 48-message delta form, then enforce `i18n:de:audit`. The delta binds only the new Calculation Bundle and Release messages to English/Chinese, direct/dynamic callsites, product context, terminology, and layout risk; it contains no modified baseline messages or bundle-external prose items and exposes no reviewer identity or decisions. The completed file stays under `.local/i18n-de-DE/`, is ignored, and must not be quoted or attached to GitHub. Any changed baseline, delta-bound copy, context, family, policy, or renderer requires a fresh delta review. Missing, malformed, or stale evidence remains a structural failure, and automated output never substitutes for human linguistic approval.

If a coverage change excludes framework-heavy wrapper files from `collectCoverageFrom`, document why those files are excluded and re-check the affected save, validation, navigation, and highlighting flows with focused tests before relying on `npm run prepush:gate`.

## Minimum PR Validation Note

Every PR note for this repo must state:

1. exact commands run
2. exact focused suites, if any
3. exact environments checked
4. whether `npm run prepush:gate` ran
5. whether any required proof lives in another repo
