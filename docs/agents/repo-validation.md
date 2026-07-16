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
  - .github/workflows/**
lastReviewedAt: 2026-07-16
lastReviewedCommit: e112fa85f4138b5094c965bd010825d8267ee75d
lastReviewedNote: 'Added scoped-first German proof and one final-HEAD full-gate ownership so unchanged checkpoints are not validated repeatedly.'
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
| process review-submit gate/job UI or service contract | `npm run lint`; focused review/gate/job tests such as `npm run test:ci -- tests/unit/services/workerJobs/api.test.ts tests/unit/services/reviews/taskCenter.test.ts tests/unit/components/LcaTaskCenter.test.tsx tests/unit/services/reviews/api.test.ts tests/unit/utils/review.test.ts tests/unit/pages/Processes/Components/edit.test.tsx --runInBand --testTimeout=30000`; `npm run build` | smoke `app_worker_jobs`, `app_dataset_review_submit_jobs`, the worker, and final process submit-review against a safe dev environment when credentials and a queued job are available | Next must render backend job states and gate evidence, enqueue/read submit jobs instead of calling final submit-review from the browser, recover task-center state from service-backed worker jobs, prefer the canonical root `review_submit.submit` worker job for task identity/actions, and avoid duplicating worker blocker heuristics or browser-authoritative checksum logic. |
| reviewed LCIA bundle under `public/lciamethods/**` or its validator | `npm run lcia-cache:verify`; `npm run lint`; focused LCIA cache/evidence tests; `npm run build` | `npm run prepush:gate` | verification must run before any web or Electron publication |
| other static bundles under `public/**` | `npm run lint`; `npm run build` | focused tests near the consuming feature | check both the asset and its readers |
| sync helpers under `docker/**` | `npm run lint`; `npm run build` | run the exact helper only when the task includes it | do not hand-edit synced mirrors |
| tests, coverage, or gate scripts | `npm run docpact:gate`; `npm run lint`; `npm run test:ci`; `npm run test:coverage`; `npm run test:coverage:assert-full` | `npm run prepush:gate` | coverage expectations remain strict |
| locale bundles, message IDs, or localized runtime copy | `npm run i18n:audit`; `npm run test:ci -- tests/unit/locales.test.ts --runInBand --testTimeout=20000 --no-coverage`; `npm run lint`; `npm run build` | `npm run prepush:gate`; browser smoke for selector, persistence, framework copy, fallbacks, and long-text layout when a locale is activated | all supported locales must match the canonical topology/key/placeholder contract; dynamic IDs require an audited family and unknown fallback |
| staged German Pilot feedback or confirmation only | validate the supplied form before regeneration; run `npm run i18n:de:review:check` and the Pilot report/enforcement against that input | focused `tests/unit/i18n/germanReviewWorkflow.test.ts` only when review/audit implementation changed | an ignored form is not a repository full-gate input; unsigned or AI-assisted feedback is not human approval |
| staged German context, glossary, Pilot candidate, or leaf batch | regenerate only the affected deterministic artifacts in dependency order; run candidate/Pilot report, topology/ICU proof, canonical `npm run i18n:audit`, and focused locale/workflow tests appropriate to the changed surface | `npm run i18n:de:pilot` only after valid local Pilot confirmation; `npm run i18n:de:audit` only after all 30 leaf modules, contexts, and the full-catalog confirmation exist | completed forms never enter Git/GitHub; Pilot changes invalidate Pilot evidence, while non-Pilot leaf edits invalidate only the affected batch/catalog evidence; Issue #601 must not activate `de-DE` |
| data workflow fixtures or workflow smoke harnesses | `npm run docpact:gate`; `npm run test:data-workflows:unit` | affected live smoke script only when credentials and target environment are part of the task, using `npm run test:workflows -- --<workflow> <workflow-args>`; `npm run test:api:smoke -- <workflow-args>` for broad supported API smoke coverage, then inspect its summary because child workflow failures do not make the command exit non-zero | keep `fixtures/data/**`, `fixtures/result/**`, workflow defaults, and unit path assertions aligned |
| repo docs only | `scripts/docpact lint --root . --files "<csv>" --mode enforce` | `scripts/docpact validate-config --root . --strict` when `.docpact/config.yaml` changes | still update review metadata and ownership as needed |

The local `pre-push` hook always runs `npm run docpact:gate` first, then runs the full `npm run prepush:gate` local test gate on every branch. The docpact gate defaults to `origin/dev` and can be redirected with `DOCPACT_BASE_REF=<ref>` for promote or hotfix branches. For a normal delivery, commit the final controlled tracked change and let that hook own the one authoritative full-gate run; do not manually run the same full gate immediately before pushing. Manual full-gate execution is for a no-push evidence handoff.

Run every Umi-generating `test:ci`, coverage, and `prepush:gate` command serially because they share `.umi-test`. The full gate already includes coverage; do not surround it with redundant broad test or coverage runs for the same checkpoint.

Full-gate evidence binds the exact committed `HEAD`, tracked tree, Node/dependency state, and test/lint/build/coverage/Docpact/gate configuration. Ignored review content, GitHub body changes, and read-only checks do not create a new repository checkpoint. Any changed controlled tracked input does, and requires one new final full-gate run. Issue #601 does not add a same-HEAD receipt cache or modify the hook; if push transport fails, retry with a normal push and allow the existing hook to run again rather than using `--no-verify` or `HUSKY=0`. The guaranteed efficiency improvement is single ownership of the normal final run, not a hook bypass.

For deployment-only workflow changes under `.github/workflows/build.yml` or the manual `.github/workflows/ci.yml` fallback, validate the workflow shape directly with YAML parsing, formatter checks, and shell syntax checks for edited deploy scripts. For EdgeOne CLI dependency changes, also validate the pinned temporary install path locally without calling the live deploy command. Do not run production deploy commands locally or from PR validation unless the task explicitly requires exercising live deploy credentials; the automatic EdgeOne Pages deploy step runs from canonical `main` pushes by creating the matching `v*` tag from `package.json.version` and continuing release in the same workflow run, unchanged-version `main` workflow hotfix pushes skip release when the matching tag already belongs to an older `main` commit, manual `v*` tag pushes and `workflow_dispatch` recovery runs remain supported when the target commit is already on `main`, and Electron publication must pre-create exactly one tag-scoped draft before the parallel matrix and finish by verifying the exact 12 expected non-empty assets in that one draft. The manual deploy fallback is guarded to `refs/heads/main` and checks out `github.sha`, and ordinary non-release branch pushes belong to the local pre-push gate.

Treat dataset-validation work under `src/pages/*/sdkValidation.ts`, `src/pages/Utils/validation/**`, `src/components/ValidationIssueModal/index.tsx`, and localized validator copy under `src/locales/**` as shipped runtime work even when most of the change looks like error-message plumbing.

Treat `npm run i18n:audit` as the deterministic structural proof for locale ownership and runtime message references. Linguistic and domain sign-off remain separate review evidence; a green structural audit does not prove translation quality.

For the staged German workflow, regenerate in dependency order: canonical manifest, German context ledger, then pilot review pack. The generated local pilot form contains all 90 dossiers plus 9 context proposals and 2 blocked terms; one person may confirm product-context, native-German, and LCA/TIDAS dimensions in its single JSON block. `i18n:de:pilot` verifies ledger freshness, the canonical scope digest, the exact normalized renderer body/body digest, and the current producer actor without network access. The completed file stays under `.local/i18n-de-DE/`, is ignored, and must not be quoted or attached to GitHub. The final candidate gate separately requires the canonical full-catalog form after all 2,665 candidates and all reserved-context proposals exist. Changed source context, policy implementation, producer, dossier, glossary choice, pilot risk scope, or German copy invalidates the applicable form. Human approval clears only complete pending proposals; missing, malformed, or stale proposals remain structural failures. Do not weaken counts or use automated output as human linguistic approval.

If a coverage change excludes framework-heavy wrapper files from `collectCoverageFrom`, document why those files are excluded and re-check the affected save, validation, navigation, and highlighting flows with focused tests before relying on `npm run prepush:gate`.

## Minimum PR Validation Note

Every PR note for this repo must state:

1. exact commands run
2. exact focused suites, if any
3. exact environments checked
4. whether `npm run prepush:gate` ran
5. whether any required proof lives in another repo
