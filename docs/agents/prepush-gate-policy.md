---
title: next Pre-Push Gate Policy
docType: contract
scope: repo
status: active
authoritative: false
owner: next
language: en
whenToUse:
  - when changing pre-push gate behavior
  - when deciding protected-branch parity expectations
  - when checking the intended trigger policy for `npm run prepush:gate`
whenToUpdate:
  - when hook or CI trigger behavior changes
  - when protected-branch policy changes
  - when the rollout contract becomes inaccurate
checkPaths:
  - docs/agents/prepush-gate-policy.md
  - docs/agents/repo-validation.md
  - .husky/pre-push
  - package.json
  - playwright.config.ts
  - scripts/e2e/**
  - docker/e2e/**
  - tests/e2e/i18n/**
  - scripts/docpact
  - scripts/docpact-gate.js
  - scripts/prepush-gate-receipt.cjs
  - scripts/release/**
  - scripts/test-runner.cjs
  - scripts/reference-data/**
  - .github/workflows/**
lastReviewedAt: 2026-08-13
lastReviewedCommit: 9e24439ded1686ed7a54eb9317c2e352ed5b7c95
lastReviewedNote: 'Reviewed for Next Issue #819: canonical releases reuse exact proof or run the complete fallback through the two-worker, 512MB-recycle coverage pool.'
---

# Pre-Push Gate Policy

> Status: design and rollout contract. Current runtime truth is intentionally not duplicated here; read `docs/agents/repo-validation.md`, `.husky/pre-push`, and the active workflows for the live behavior.

## Purpose

Define the intended trigger policy for the existing local docpact gate and `npm run prepush:gate` command without changing the quality bar.

## Exact Gate Command

```bash
npm run docpact:gate
```

`npm run docpact:gate` resolves the `docpact` CLI through `scripts/docpact`, so local pushes do not depend on bare `docpact` being available on `PATH`.

```bash
npm run prepush:gate
```

The full gate runs LCIA verification, `npm run reference-data:check`, lint/type checks, complete coverage, and the unchanged 100% coverage assertion in that order. Reference-data verification fails before the expensive suite when the source manifest, evidence, content-addressed filenames, generated registry, or gzip outputs drift.

`npm run prepush:gate:agent` enables the same gate with compact agent output. Jest writes its complete stdout/stderr and structured result JSON under `.local/test-logs/**`; the console contains only stage starts, failed suites/assertions, and final summaries. The reusable Release Gate enables this mode and uploads those files as a seven-day CI artifact even on failure, so compact output does not discard diagnostic evidence.

Production-effective workflows separately run `npm run reference-data:production:check`. This read-only gate includes reproducibility verification and then rejects any required resource without an `official`/`project-reviewed` native asset for every registry language or without explicit production clearance. It is not part of the normal pre-push gate because tracked rights blockers may remain while reviewed work is integrated on `dev`.

`npm run release:preflight` owns the credential-free production-readiness boundary by running both `npm run i18n:locale:all:production:check` and `npm run reference-data:production:check`. A local push whose source or destination has `main` semantics (`main`, `master`, `hotfix/*`, `promote/*`, `release/*`, or the equivalent `codex/` branch names) runs this preflight between Docpact and the full test gate. A push to `dev` remains governed by Docpact plus the full test gate only.

The deterministic release commands preserve this split by construction. `release:to-dev` rejects main-semantic branch names, requires current `main` to be an ancestor of `dev`, and checks the credential-free semantic qualification receipt before version mutation. When stale, it generates only the exact provenance-bound receipt and includes it in the same Release PR; dry-run reports the need without mutating. It then proves that only the three root version fields, that exact generated receipt when needed, and bounded Docpact review metadata changed, independently preflights both the version candidate's `dev`-relative paths and the complete `main`-to-candidate path set, commits the composed candidate, and runs `release:preflight` before delegating transport to `push:checked`. Its qualification/review phase is not a gate bypass: generation failure, unsupported diagnostics, unexpected untracked files, or semantic document/package drift stop before push, and the normal Docpact/full gate reruns on the committed candidate. `release:promote-dev-to-main` requires a `promote` branch that points exactly at the merged dev candidate and never writes evidence before delegating to the same managed main-semantic push. The only automatic retry is the existing argument-free `push:retry`, and only when the immediately preceding checked push created a new exact-intent receipt.

Playwright semantic localization proof remains separate from `prepush:gate`. Focused local diagnosis uses `npm run e2e:dev`; exact local release proof uses the repository-owned `e2e:env:install` / read-only `e2e:env:doctor` / `e2e:release` controller. Keeping both outside the routine hook prevents local pushes from requiring Docker, browsers, production credentials, or production data. GitHub Actions still owns only the credential-free/read-only public browser matrix; the full authenticated closure belongs exclusively to an explicitly authorized local operator session.

When direct `e2e:release` reports a missing or stale semantic-harness qualification receipt outside the normal release command, run `npm run e2e:qualify` and land the generated file through a reviewed `dev` PR before retrying from a clean candidate. For normal version delivery, use `release:to-dev --apply`; it performs that qualification before version mutation and safely includes a newly generated exact receipt in its Release PR. Receipt validation binds the semantic input digest while intentionally excluding the receipt file and root version fields; committing the generated receipt does not manufacture or replace the browser result.

Docs-impact screenshot execution is an isolated workspace tooling surface. Next contributes only the exact source commit's declarative `config/docs-capture/profile.v1.json`; the workspace package owns profile validation, plan compilation, secret-file handling, read-only actions, Playwright capture, and access classification. This proof does not join the routine pre-push/release gate and does not change semantic E2E's `screenshot: off`, trace, video, or auth-artifact policy.

Routine locale and pre-push checks validate the tracked semantic evidence record, schema, route/assertion closure, browser/locale coverage, cleanup result, and declared digest-path inventory without requiring its recorded file hashes to match the current checkout. Exact current backend, executable package-lock semantics, runtime-asset, semantic-test, and route/source digest matching belongs to the explicit production-readiness commands. The raw evidence lock must still match the lock at its recorded candidate commit; only the root application's release-version fields are removed from the deterministic cross-candidate comparison, while every dependency and remaining lock field stays fail-closed. The broad candidate `src/**` and `tests/unit/**` tree digests remain execution provenance only; production invalidation is driven by the narrower declared semantic evidence inputs.

For a reviewed change that affects only non-browser-semantic release-harness generation or formatting, `docs/plans/i18n/semantic-e2e-digest-compatibility.json` may attest an exact old/new digest pair instead of rerunning authenticated production E2E. The evidence writer must still resolve the repository-owned Prettier configuration independently of an external container output path, and the same canonical checker must accept the raw output without a host rewrite. An explicit user decision may also authorize the separate `reviewed-read-only-request-guard-expansion` scope, which is valid only for the production request-guard file and its paired unit-test proof, only for additive named read-only endpoints, and only with focused guard-suite proof. Neither scope is a wildcard or path exclusion: every entry binds the existing evidence commit, owner Issue, current digest, focused proof commands, and automatic sunset at the next verified evidence for that SHA. Any further drift or any route, source/runtime, package dependency, authorization, production mutation, or cleanup change remains a hard production-readiness failure.

Issue #703 additionally carries an explicit release-owner decision to skip the authenticated E2E rerun for the v0.0.62 candidate. Its one-time record binds exact complete `config`, package-manifest, `src`, and `tests/unit` identities and requires `release:preflight` plus the full managed `prepush:gate`. It is not a reusable flag: any tree drift fails, and route coverage, E2E harness, package-lock, runtime assets, backend target, and safety invariants remain outside the waiver.

## Scope

This document owns the intended trigger policy only.

It does not own:

- the canonical proof bar
- the current live hook behavior
- the current CI implementation details
- scoped locale preparation and historical German compatibility gates; active locale proof is documented in `docs/agents/repo-validation.md`, while frozen German history is retained under `docs/plans/i18n-de-DE/`

## Target Trigger Rules

| Surface | Target rule |
| --- | --- |
| local `pre-push` hook on any branch | run Docpact first and the full local gate last; additionally run `release:preflight` between them when the push has main semantics |
| same-push transport retry | permit the repo-owned retry helper only when a managed original push failed after its hook completed and the ignored bounded receipt proves the exact clean HEAD, branch, ref update, remote, toolchain, dependency tree, gate inputs, and Docpact base are unchanged |
| ordinary GitHub branch pushes | do not run broad duplicate remote test jobs or the Playwright browser matrix |
| PRs into `dev` | rely on local test-gate evidence, focused proof, and Docpact PR governance; run browser semantic E2E manually only when risk warrants it |
| PRs into `main` | run the reusable Release Gate against the exact PR base/head, including production readiness and the complete test inventory; after every step succeeds, upload a 30-day proof bound to the repository, PR, base, head/tree, workflow run, attempt, and artifact name; keep the credential-free browser semantic matrix on the post-merge release candidate |
| `dev -> main` promotion candidate | use `release:to-dev` so the version PR preflights Docpact against the cumulative current-`main` to candidate path set; the immutable promotion and main-target Release Gate recheck that complete base/head range |
| semantic E2E `workflow_dispatch` | remains credential-free/read-only and runs the same contract/public browser boundary; it never receives production credentials or authorizes production writes |
| local authenticated semantic E2E | run `e2e:release` only in an explicitly authorized operator session with a protected runtime-only credential file, archived clean candidate, verified local-bundle/production-backend targeting, explicit authenticated/write/evidence options, and exact cleanup |
| canonical post-merge `main` pushes | read `package.json.version`; reuse a successful PR Release Gate only when the exact merged PR, two parents, unchanged candidate tree, workflow/job result, run attempt, unexpired artifact, and payload all match, otherwise run the full reusable gate; run exact-SHA credential-free semantic E2E in parallel, create or verify the matching `v*` tag only after both qualification paths pass, pre-create exactly one tag-scoped draft, then run web deploy and the Electron matrix; the workflow succeeds only after one draft contains the exact 12 expected non-empty assets |
| unchanged-version `main` workflow hotfix pushes | skip release when the matching `v*` tag already points to an older `main` commit |
| manual release tags or `workflow_dispatch` recovery on `main` commits | remain supported for recovery/backfill releases and always run the full reusable Release Gate before deploy/release |

## Adoption Conditions

- the hook accepts an already-active Node.js 24 from `PATH`; it falls back to local NVM only when the active Node is absent or has another major version, and fails clearly if Node 24 is still unavailable
- hook behavior and release-gate behavior must match the documented policy
- no release path may bypass the full gate
- branch policy must stay aligned with `dev -> main`
- any coverage collection exclusions must be explicit, reviewed, and paired with focused verification of the affected user-visible wrapper flows
- data workflow fixture expansions stay under the existing `tests/**` docpact trigger; they do not change the protected-branch gate policy unless the actual hook, CI command, or coverage bar changes
- semantic E2E keeps its local candidate frontend on a loopback URL, derives locales from registries, disables screenshot/trace/video/auth artifacts, and keeps every semantic E2E GitHub Actions run credential-free/read-only
- docs-impact capture remains on-demand and isolated from semantic E2E; workspace tooling owns its external absolute mode-`0600` account file, mandatory run-scoped origin, non-auth mutation guard, and explicit next-docs output roots, while Next owns only the source-bound profile consumed from the exact rendered commit
- an authorized local production-data run is rejected before Docker when host `CI` or `GITHUB_ACTIONS` is set; after the local check passes, the controller clears only those image-inherited markers at container runtime and still requires `E2E_AUTHENTICATED=true`, `E2E_ALLOW_PRODUCTION_DATA=true`, and the exact one-process confirmation token; `E2E_WRITE_VERIFIED_EVIDENCE=true` separately opts into tracked evidence. It writes its intent ledger before create; cleanup verifies the production row UUID, authenticated owner, and all five multilingual-field markers across registry authoring languages before exact-ID deletion, then proves `created=cleaned` and `leaked=0`
- Header Umi `SelectLang` remains `reload={false}` so same-document locale refresh and delayed old-response race behavior stay browser-verifiable
- historical German review commands may remain explicit compatibility gates, but active locale/context/quality/correction/activation and `npm run prepush:gate` must never read ignored confirmation files

## Short Rule Summary

- keep one authoritative full gate
- do not require an NVM-managed copy of Node 24 when the runner or operator already has Node 24 active on `PATH`
- for a normal delivery, let the existing push hook own the single full-gate execution after the final controlled tracked change; do not invoke the same gate manually immediately before that push
- use manual full-gate execution only when a no-push handoff needs the evidence
- use `npm run push:checked -- <normal git push arguments>` for the final managed push; its ordinary Git hook runs both authoritative gates and returns a private gate-bound payload to the wrapper
- an already-up-to-date push supplies no ref updates, so the hook skips checkpoint collection and both gates; a managed no-op succeeds only with a private nonce-bound no-update acknowledgement, which can never activate a retry receipt
- hook completion alone never creates a reusable receipt: a successful managed original push leaves no receipt, and only a non-zero original push after a valid hook payload activates an ignored, one-hour, bounded single-push-intent receipt under `.local/prepush-gate/`
- the checked-push session directory and nonce remain private to the hook coordinator and are removed from Docpact and test-gate subprocess environments, so nested tests or helper pushes cannot forge the outer session's successful-gate payload
- after that uncertain or failed transport, use `npm run push:retry` with no arguments; remote, ref, and commit come only from the receipt, and any operator-supplied target argument is rejected
- when the original checked transport fails after both gates passed, the wrapper prints the exact standalone next action `Next: npm run push:retry`
- the helper rechecks the remote/refspec, HEAD/tree/branch, clean worktree, Node/npm, lockfiles and installed dependency tree, hook/gate inputs, and resolved Docpact base before it internally performs the receipt-bound exact-SHA `--no-verify` transport; this internal helper call is the only bypass authority
- if the remote already equals the receipt-bound target SHA, the helper clears the receipt and succeeds idempotently without another push or gate run
- a successful helper transport deletes the receipt; a retry transport failure may retain it only while the remote remains at the bound pre-push SHA and the one-hour TTL is valid, and a pre-transport verification outage performs no push and leaves the bounded receipt available until verification recovers or the TTL expires; expiry, malformed state, controlled-input drift, or any other verified remote state fails closed and invalidates it
- never invoke `git push --no-verify` or `HUSKY=0` manually; a missing or invalidated receipt requires a new managed push and hook-owned gate run
- run the lightweight docpact gate before the full local test gate so governed-doc review failures surface early
- before a `dev -> main` promotion, run `DOCPACT_BASE_REF=origin/main npm run docpact:gate` from the intended candidate head; the main-target PR Release Gate repeats this proof before merge, and the post-merge workflow accepts its exact run-bound proof only for a structurally matching unchanged-tree merge or reruns the complete gate
- protect the actual local and release gates
- keep one logical full-suite qualification for each canonical release candidate: normally reuse the exact successful main-target PR proof, but run one post-merge `prepush:gate` fallback whenever proof identity cannot be established; that command runs the receipt suite once in an isolated no-coverage Jest process and every remaining suite once through a coverage-enabled coordinator with exactly two workers and a `512MB` per-worker idle-memory recycle boundary, so do not precede it with a second standalone `test:ci` or coverage run
- keep agent/CI console output bounded to stage, failure item, and final summary lines while preserving full Jest logs and structured results under `.local/test-logs/**` for artifact upload
- avoid spending GitHub Actions minutes on ordinary push-triggered test jobs
- keep semantic E2E independent from `prepush:gate`: routine PR/dev events do not trigger it, manual and release invocations have no production credentials or writes, and only an explicitly authorized local operator run may close the authenticated 49-ID digest-bound proof
- keep routine locale/pre-push validation structural and deterministic; revalidate current semantic evidence file hashes only in the explicit production-readiness gate
- keep release automation in the same `main` push workflow, but create the tag only after exact Release Gate qualification—reused proof or full fallback—and exact-SHA semantic E2E pass; do not rely on a second tag-push workflow run from `GITHUB_TOKEN`
- use `workflow_dispatch` with an existing `v*` tag when a release needs to be recovered with newer workflow code
- make draft creation single-writer before parallel Electron publication, fail closed when more than one release uses the tag, and verify the exact cross-platform asset set after every matrix run
- reproduce Umi-generating focused tests, coverage commands, and `npm run prepush:gate` serially on one workstation when they are needed; the full gate already contains the complete test inventory and unchanged 100% `src/**` coverage
- keep `100%` coverage on every tracked file, and treat any direct-collection exclusions as a reviewed exception rather than a default pattern
