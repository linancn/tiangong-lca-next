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
  - playwright.config.ts
  - scripts/e2e/**
  - docker/e2e/**
  - tests/e2e/i18n/**
  - jest.config.cjs
  - .husky/pre-push
  - scripts/prepush-gate-receipt.cjs
  - .github/workflows/**
lastReviewedAt: 2026-07-23
lastReviewedCommit: 0706ad1c9808e90c48a029c6e09af04d0b72698f
lastReviewedNote: 'Reviewed for Issue #680 production closure payload hotfix; existing page/service proof and release-gate requirements remain sufficient.'
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
| persisted Calculation Bundle or public release readback | `npm run lint`; focused `lcaReleases`, `CalculationBundlePanel`, `LcaReleaseReadPanel`, Data Processing, Process view, and locale tests; `npm run i18n:audit`; `npm run build` | `npm run prepush:gate`; paired Database RPC, Edge projection, Worker bundle, and deterministic package proof; live smoke only when a deployed environment and user credentials are available | private bundle reads use the user session; raw downloads must verify stored byte size and SHA-256 before Blob save; public release reads expose sanitized projections and short-lived artifact downloads only |
| process review-submit gate/job UI or service contract | `npm run lint`; focused review/gate/job tests such as `npm run test:ci -- tests/unit/services/workerJobs/api.test.ts tests/unit/services/reviews/taskCenter.test.ts tests/unit/components/LcaTaskCenter.test.tsx tests/unit/services/reviews/api.test.ts tests/unit/utils/review.test.ts tests/unit/pages/Processes/Components/edit.test.tsx --runInBand --testTimeout=30000`; `npm run build` | smoke `app_worker_jobs`, `app_dataset_review_submit_jobs`, the worker, and final process submit-review against a safe dev environment when credentials and a queued job are available | Next must render backend job states and gate evidence, enqueue/read submit jobs instead of calling final submit-review from the browser, recover task-center state from service-backed worker jobs, prefer the canonical root `review_submit.submit` worker job for task identity/actions, and avoid duplicating worker blocker heuristics or browser-authoritative checksum logic. |
| reviewed LCIA bundle under `public/lciamethods/**` or its validator | `npm run lcia-cache:verify`; `npm run lint`; focused LCIA cache/evidence tests; `npm run build` | `npm run prepush:gate` | verification must run before any web or Electron publication |
| governed classification/location sources, overlays, manifest, generator, or runtime assets | `npm run reference-data:check`; focused reference-resource/resolver/cache tests; `npm run lint`; `npm run build` | `npm run reference-data:production:check`; `npm run i18n:locale:all:production:check`; `npm run prepush:gate` | generation must be deterministic; every native overlay and independent project review must have exact identity coverage; provenance and usage-term blockers remain fail closed |
| other static bundles under `public/**` | `npm run lint`; `npm run build` | focused tests near the consuming feature | check both the asset and its readers |
| sync helpers under `docker/**` | `npm run lint`; `npm run build` | run the exact helper only when the task includes it | do not hand-edit synced mirrors |
| tests, coverage, or gate scripts | `npm run docpact:gate`; `npm run lint`; focused contract proof for the changed runner or script | final `npm run prepush:gate` through `push:checked` | do not precede the final gate with a duplicate full-suite or coverage run; coverage expectations remain strict |
| Playwright semantic localization E2E, release runner, route/view assertion contract, or evidence schema | focused `npm run e2e:dev -- --list` / affected browser project; focused runner unit tests; `npm run e2e:env:doctor` when the pinned image is already installed; `npm run lint` | exact clean-candidate `npm run e2e:release`; add `--authenticated --allow-production-data --write-verified-evidence --users-env-file <0600-file>` only in an explicitly authorized local operator session | no semantic E2E GitHub Actions event may receive production credentials or write production; authenticated proof is role-neutral globally, must close all 49 assertion IDs, and must finish with exact verified-row cleanup plus `created=cleaned`, `leaked=0` |
| locale bundles, language capabilities, message IDs, or localized runtime copy | `npm run i18n:audit`; `npm run i18n:platform:audit`; `npm run i18n:hardcoding:audit`; `npm run reference-data:check`; for every registry locale run `npm run i18n:locale:audit -- --locale <canonical-locale>`, `npm run i18n:context:check -- --locale <canonical-locale>`, `npm run i18n:locale:quality:check -- --locale <canonical-locale>`, and `npm run i18n:locale:activation:check -- --locale <canonical-locale>`; `npm run i18n:corrections:check`; focused locale/runtime tests; `npm run lint`; `npm run build` | `npm run i18n:locale:all:production:check` for a release candidate; `npm run prepush:gate`; route-view browser smoke for selector, persistence, content-language read/write, framework copy, declared service/reference fallbacks, route/static views under their existing access context, and long-text layout | every registry locale must match the canonical topology/key/ICU and independently declared UI/content/service/reference capability contracts; dynamic IDs require an audited family and unknown fallback; route-view/context manifests must have zero blocked or unowned content and must not grant anonymous access; active commands never read translation confirmation files; the hardcoding allowlist is exact, issue-owned, and fails when stale; production readiness must fail closed while any reference-resource or other activation blocker remains |
| historical German human-review evidence only | use `i18n:de:pilot`, `i18n:de:review:*`, and `i18n:de:delta:review:*` only to validate the immutable Issue #601/#602/#606 snapshot they own | focused historical checker/renderer tests only when that compatibility implementation changes | these commands are outside active German and full-gate dependency paths; do not regenerate a form for a post-baseline correction, and never commit reviewer data |
| active German runtime or post-baseline correction | run `npm run i18n:audit`, `npm run i18n:context:check -- --locale de-DE`, `npm run i18n:corrections:check`, `npm run i18n:locale:quality:check -- --locale de-DE`, final `npm run i18n:de:audit`, and focused runtime tests | `npm run build`; applicable route-view/browser smoke; final `npm run prepush:gate` through `push:checked` | baseline `c26f306e82ac66f50a56aafe8f89ea96c0b0c67d` pins the accepted 2,737-message German catalog/runtime state; new source messages use the normal source-context closure, while a changed existing German value requires an exact tracked correction dossier and never a private confirmation |
| data workflow fixtures or workflow smoke harnesses | `npm run docpact:gate`; `npm run test:data-workflows:unit` | affected live smoke script only when credentials and target environment are part of the task, using `npm run test:workflows -- --<workflow> <workflow-args>`; `npm run test:api:smoke -- <workflow-args>` for broad supported API smoke coverage, then inspect its summary because child workflow failures do not make the command exit non-zero | keep `fixtures/data/**`, `fixtures/result/**`, workflow defaults, and unit path assertions aligned |
| repo docs only | `scripts/docpact lint --root . --files "<csv>" --mode enforce` | `scripts/docpact validate-config --root . --strict` when `.docpact/config.yaml` changes | still update review metadata and ownership as needed |

## Semantic Localization E2E Contract

The canonical command is `npm run test:e2e:i18n`, implemented with `@playwright/test` `1.61.1`, `playwright.config.ts`, and `tests/e2e/i18n/**`. The candidate frontend is always local (`npm run start:main`, loopback `E2E_BASE_URL`) while its configured backend is production; pointing the Playwright base URL at a production frontend fails closed.

The independent `.github/workflows/i18n-semantic-e2e.yml` workflow is one credential-free trust boundary:

- `workflow_dispatch` provides the optional on-demand check; routine pull requests and `dev` pushes do not trigger the browser matrix
- the canonical release workflow reuses it for the exact release SHA before any Web or Electron publication
- every invocation uses no production credentials, permits no production writes, and runs only contract discovery plus the public semantic/boundary matrix in Chromium, Firefox, and WebKit

The separate full authenticated closure is local-operator-only. It requires explicit user authorization, runtime credentials, the local candidate, `E2E_BACKEND_TARGET=production`, and `E2E_AUTHENTICATED=true`. Before Docker execution, the host controller rejects production-data mode whenever `CI` or `GITHUB_ACTIONS` is set. Only after that local check passes does it override the release image's inherited CI markers to empty inside the container; the container's safety check remains unchanged. Its two production-write guards are `E2E_ALLOW_PRODUCTION_DATA=true` and `E2E_PRODUCTION_WRITE_CONFIRMATION=I_AUTHORIZE_ONE_CODEX_E2E_PRODUCTION_PROCESS`; writing verified tracked evidence separately opts in with `E2E_WRITE_VERIFIED_EVIDENCE=true`. Semantic E2E GitHub Actions is never a transport for these credentials, flags, or writes.

The full route/view proof has 49 stable assertion IDs. Every ID requires its live route scenario plus any target-declared semantic scenarios; these cover anonymous fail-closed navigation, locale fallback/refresh, modal states, authoring options, responsive layout, persisted multilingual content, and reference refresh where applicable. Locales and authoring languages are derived from the typed registries, Chromium runs the entire route/view matrix, and the selector, team authoring, and process lifecycle critical scenarios run in all three browser engines. Adding a registry locale expands the expected locale sequence and invalidates any older evidence automatically.

Authenticated setup may create only UUID-scoped `codex-e2e` process data. It writes an ignored intent ledger before attempting create. Before any delete, cleanup reads the production row by UUID and verifies the authenticated owner, the UUID at its exact ILCD path, and language/marker pairs at each of the five exact multilingual field paths; marker strings scattered elsewhere do not attest ownership. Only then may it delete the exact-ID row version. Evidence must prove `created=cleaned` and `leaked=0`. Screenshots, trace, video, stored auth state, and credential-bearing artifacts are disabled. Routine locale/pre-push validation checks the evidence schema, record shape, 49-ID/required-scenario closure, browser/locale sets, cleanup counts, and declared digest-path inventory without requiring production proof to match the current checkout. The explicit production-readiness gate additionally requires the current route contract, backend target, executable package-lock semantics, runtime assets, semantic tests, and declared route/source files to match; drift there fails production closed. The evidence keeps the raw package-lock digest as execution provenance and verifies it against the recorded candidate commit before comparing a deterministic lock projection that excludes only the root application's release-version fields. Dependency ranges, resolved versions, integrity, registry, scripts, and every other lock field remain fail-closed. Candidate-wide `src/**` and `tests/unit/**` digests are retained as execution provenance rather than production invalidation inputs.

The shared Header wraps Umi `SelectLang` with `reload={false}`. Browser proof must show that locale switching preserves the current URL and document identity, refreshes locale-bound reference labels in the mounted page, and prevents a delayed response for the old locale from overwriting the current locale.

The local `pre-push` hook always runs `npm run docpact:gate` first, then runs the full `npm run prepush:gate` local test gate on every branch. The docpact gate defaults to `origin/dev` and can be redirected with `DOCPACT_BASE_REF=<ref>` for promote or hotfix branches. For a normal delivery, commit the final controlled tracked change and let that hook own the one authoritative full-gate run; do not manually run the same full gate immediately before pushing. Manual full-gate execution is for a no-push evidence handoff.

A passing feature-branch or `dev`-relative Docpact gate proves only that configured comparison range. Before a `dev -> main` promotion, check out the intended candidate head and run `DOCPACT_BASE_REF=origin/main npm run docpact:gate`; this closes the complete release range that the post-merge Release Gate checks from the merge commit's first parent. If that range reports `missing-review`, genuinely review and update every required governed document before promotion; do not hide active findings with a baseline, waiver, or narrower comparison base.

The hook uses an already-active Node.js 24 from `PATH`, including GitHub `setup-node`, before consulting NVM. It sources NVM and runs `nvm use 24` only when the active Node is missing or has another major version, then fails closed with an explicit version error if Node 24 is still unavailable.

Run every Umi-generating `test:ci`, coverage, and `prepush:gate` command serially because they share `.umi-test`. The full gate already includes coverage; do not surround it with redundant broad test or coverage runs for the same checkpoint.

Full-gate evidence binds the exact committed `HEAD`, tracked tree, Node/dependency state, and test/lint/build/coverage/Docpact/gate configuration. Ignored review content, GitHub body changes, and read-only checks do not create a new repository checkpoint. Any changed controlled tracked input does, and requires one new final full-gate run.

Use `npm run push:checked -- <normal git push arguments>` for the final managed push. Its ordinary hook runs the authoritative gates and returns a private gate-bound payload to the wrapper, but hook completion alone does not write an active receipt. When Git supplies no ref updates because the destination is already current, the hook skips checkpoint collection and both gates; a managed no-op still requires a private nonce-bound no-update acknowledgement, and that acknowledgement can never activate a retry receipt. A successful managed original push leaves no receipt. Only when a normal gate payload exists and the original update push returns non-zero does the wrapper activate an ignored, one-hour, bounded single-push-intent receipt under `.local/prepush-gate/`.

After that uncertain or failed transport, run `npm run push:retry` with no arguments. The repo-owned helper rejects operator-supplied remote, ref, SHA, or option arguments; it derives the exact target from the receipt, verifies the bound remote/refspec, HEAD/tree/branch, clean worktree, Node/npm, lockfiles and installed dependency tree, hook/gate inputs, and resolved Docpact base, then internally retries only the gate-bound commit SHA. Its exact-SHA `--no-verify` call is the only allowed bypass. If the remote already equals the target SHA, the helper clears the receipt and succeeds idempotently without another push or gate run. A successful helper transport also clears it. A failed retry may retain the receipt only while the remote remains at the bound pre-push SHA and the one-hour TTL remains valid; a pre-transport verification outage performs no push and leaves the bounded receipt available until verification recovers or the TTL expires. Expiry, malformed state, controlled-input drift, or any other verified remote state fails closed and invalidates it. A missing or invalidated receipt requires a new managed push and hook-owned gate run. Never invoke `git push --no-verify` or `HUSKY=0` manually. This bounded recovery path is not a reusable same-HEAD gate cache.

For deployment-only workflow changes under `.github/workflows/build.yml` or the manual `.github/workflows/ci.yml` fallback, validate the workflow shape directly with YAML parsing, formatter checks, and shell syntax checks for edited deploy scripts. For EdgeOne CLI dependency changes, also validate the pinned temporary install path locally without calling the live deploy command. Do not run production deploy commands locally or from PR validation unless the task explicitly requires exercising live deploy credentials; the automatic EdgeOne Pages deploy step runs from canonical `main` pushes by creating the matching `v*` tag from `package.json.version`, then requires both the normal Release Gate and the reusable credential-free semantic E2E matrix for the exact release SHA before publication. Unchanged-version `main` workflow hotfix pushes skip release when the matching tag already belongs to an older `main` commit, manual `v*` tag pushes and `workflow_dispatch` recovery runs remain supported when the target commit is already on `main`, and Electron publication must pre-create exactly one tag-scoped draft before the parallel matrix and finish by verifying the exact 12 expected non-empty assets in that one draft. The manual deploy fallback is guarded to `refs/heads/main` and checks out `github.sha`, and ordinary non-release branch pushes belong to the local pre-push gate.

The production Release Gate runs the complete Jest test inventory exactly once through `npm run prepush:gate`. To avoid a confirmed macOS Node/V8 native GC crash in the long-lived in-band process, `test:coverage` first runs only `prepushGateReceipt.test.ts` without coverage, then runs every remaining suite through one Jest worker at a time with a `64MB` idle-memory recycle boundary. The deliberately low absolute boundary makes suite-to-suite worker replacement predictable across local and CI hosts; Jest's coordinator retains the unchanged `src/**/*` collection and global 100% thresholds across replacements. The isolated receipt suite imports no `src/**`, so this process model changes neither tested behavior nor source coverage. Do not add a preceding standalone `npm run test:ci` or coverage run. The separate early LCIA verification remains a lightweight fail-fast publication check and `prepush:gate` retains the authoritative complete quality bar.

Treat dataset-validation work under `src/pages/*/sdkValidation.ts`, `src/pages/Utils/validation/**`, `src/components/ValidationIssueModal/index.tsx`, and localized validator copy under `src/locales/**` as shipped runtime work even when most of the change looks like error-message plumbing.

`CalculationBundlePanel` and `LcaReleaseReadPanel` are framework-heavy read-orchestration wrappers excluded from statement instrumentation, matching the existing wrapper policy. Their shipped behavior is still proved by focused component tests covering persisted refresh, directional LCI/LCIA rendering, legacy and authorization empty states, oversized-result protection, source-Process identity resolution, validation evidence, short-lived signed-link retry, and download actions. The underlying `src/services/lcaReleases/api.ts` transport, integrity, error, and decompression contracts remain inside the 100% coverage gate.

Treat `npm run i18n:audit` as the deterministic structural proof for locale ownership and runtime message references. Pair it with `npm run i18n:platform:audit` for registry/manifest/capability closure and `npm run i18n:hardcoding:audit` for business-layer language-literal ownership, then run the registry-driven context, quality, correction, route-view, and activation checks for every active locale. The hardcoding audit must cover equality/ternary branches, logical-or and nullish defaults such as `locale || 'en-US'` and `locale ?? 'zh-CN'`, and fixed root `lang` metadata embedded in an exported complete HTML document. Runtime defaults and exported root `lang`/`dir` must instead derive from the typed locale registry/runtime policy. These tracked gates prove the configured automated quality and language-capability model without creating a human translation-approval state.

Locale tests normally derive their iteration set from the registry. A fixed supported-language array may remain only when the adjacent test text or comment identifies it as an intentional fail-closed product snapshot gate: adding or removing a product language must then fail until the expected product contract is reviewed. Such a snapshot is validation-only, must not feed business behavior, and is not a substitute for registry-parameterized capability coverage.

Canonical-manifest `--check` reuses the checked-in `source.baseRef` and immutable `source.baseCommit` unless `--base-ref` is explicitly supplied. Advancing an ambient branch such as `origin/dev` without changing audited locale/callsite inputs therefore does not stale a release checkout; `--write` and an explicit `--base-ref` still resolve and record the requested current commit.

Clean-checkout Jest, active German validation, new-locale activation, and the repository full gate must succeed without `.local/**confirmation*`. The old German Pilot/catalog/delta tools may still exercise generated private fixtures when their frozen compatibility code is tested, but they are not current-catalog or release-gate inputs.

For active German, do not reinterpret or delete the inherited Issue #601/#602/#606 evidence. The accepted current boundary is pinned at `c26f306e82ac66f50a56aafe8f89ea96c0b0c67d` in `docs/plans/i18n/corrections.json`. New source messages pass the shared context closure. Any post-baseline change to an existing `zh-CN` or `de-DE` value must add one compact dossier with exact before/after text, evidence, affected closure, tests, and digest. `npm run i18n:corrections:check` proves that the ledger exactly matches the active catalog; no new human confirmation is requested or inferred.

If a coverage change excludes framework-heavy wrapper files from `collectCoverageFrom`, document why those files are excluded and re-check the affected save, validation, navigation, and highlighting flows with focused tests before relying on `npm run prepush:gate`.

## Minimum PR Validation Note

Every PR note for this repo must state:

1. exact commands run
2. exact focused suites, if any
3. exact environments checked
4. whether `npm run prepush:gate` ran
5. whether any required proof lives in another repo
6. for semantic localization E2E, which browser/trust boundary ran and, for an authenticated run, the non-secret `created/cleaned/leaked` counts
