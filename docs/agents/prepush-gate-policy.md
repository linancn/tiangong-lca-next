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
  - scripts/reference-data/**
  - .github/workflows/**
lastReviewedAt: 2026-07-23
lastReviewedCommit: 0e35be718eb5c16267f25035140447053669b567
lastReviewedNote: 'Reviewed for Issue #682 promotion: retained the Issue #680 release-version trigger and package-lock evidence boundaries while keeping the Issue #670 docs capture outside routine gates.'
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

Production-effective workflows separately run `npm run reference-data:production:check`. This read-only gate includes reproducibility verification and then rejects any required resource without an `official`/`project-reviewed` native asset for every registry language or without explicit production clearance. It is not part of the normal pre-push gate because tracked rights blockers may remain while reviewed work is integrated on `dev`.

Playwright semantic localization proof remains separate from `prepush:gate`. Focused local diagnosis uses `npm run e2e:dev`; exact local release proof uses the repository-owned `e2e:env:install` / read-only `e2e:env:doctor` / `e2e:release` controller. Keeping both outside the routine hook prevents local pushes from requiring Docker, browsers, production credentials, or production data. GitHub Actions still owns only the credential-free/read-only public browser matrix; the full authenticated closure belongs exclusively to an explicitly authorized local operator session.

The docs-impact screenshot executor is a third, isolated Playwright surface. `npm run docs:screenshot:test` protects its plan, secret-file, path, read-only action, and access-classification contracts; the on-demand `docs:screenshot:capture` command uses `playwright.docs-capture.config.ts`. Neither command joins the routine pre-push/release gate, and neither changes semantic E2E's `screenshot: off`, trace, video, or auth-artifact policy.

Routine locale and pre-push checks validate the tracked semantic evidence record, schema, route/assertion closure, browser/locale coverage, cleanup result, and declared digest-path inventory without requiring its recorded file hashes to match the current checkout. Exact current backend, executable package-lock semantics, runtime-asset, semantic-test, and route/source digest matching belongs to the explicit production-readiness commands. The raw evidence lock must still match the lock at its recorded candidate commit; only the root application's release-version fields are removed from the deterministic cross-candidate comparison, while every dependency and remaining lock field stays fail-closed. The broad candidate `src/**` and `tests/unit/**` tree digests remain execution provenance only; production invalidation is driven by the narrower declared semantic evidence inputs.

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
| local `pre-push` hook on any branch | run docpact first, then run the full local gate |
| same-push transport retry | permit the repo-owned retry helper only when a managed original push failed after its hook completed and the ignored bounded receipt proves the exact clean HEAD, branch, ref update, remote, toolchain, dependency tree, gate inputs, and Docpact base are unchanged |
| ordinary GitHub branch pushes | do not run broad duplicate remote test jobs or the Playwright browser matrix |
| PRs into `dev` or `main` | rely on local test-gate evidence, focused proof, and docpact PR governance; run browser semantic E2E manually only when risk warrants it |
| `dev -> main` promotion candidate | run Docpact against the current `main` release base and the intended candidate head; a feature-branch or `dev`-relative pass does not close review evidence for the complete release range |
| semantic E2E `workflow_dispatch` | remains credential-free/read-only and runs the same contract/public browser boundary; it never receives production credentials or authorizes production writes |
| local authenticated semantic E2E | run `e2e:release` only in an explicitly authorized operator session with a protected runtime-only credential file, archived clean candidate, verified local-bundle/production-backend targeting, explicit authenticated/write/evidence options, and exact cleanup |
| canonical post-merge `main` pushes | read `package.json.version`, create the matching `v*` tag when missing, run release-gate tests and reusable exact-SHA credential-free semantic E2E, pre-create exactly one tag-scoped draft, then run web deploy and the Electron matrix; the workflow succeeds only after one draft contains the exact 12 expected non-empty assets |
| unchanged-version `main` workflow hotfix pushes | skip release when the matching `v*` tag already points to an older `main` commit |
| manual release tags or `workflow_dispatch` recovery on `main` commits | remain supported for recovery/backfill releases and run the same release gate before deploy/release |

## Adoption Conditions

- the hook accepts an already-active Node.js 24 from `PATH`; it falls back to local NVM only when the active Node is absent or has another major version, and fails clearly if Node 24 is still unavailable
- hook behavior and release-gate behavior must match the documented policy
- no release path may bypass the full gate
- branch policy must stay aligned with `dev -> main`
- any coverage collection exclusions must be explicit, reviewed, and paired with focused verification of the affected user-visible wrapper flows
- data workflow fixture expansions stay under the existing `tests/**` docpact trigger; they do not change the protected-branch gate policy unless the actual hook, CI command, or coverage bar changes
- semantic E2E keeps its local candidate frontend on a loopback URL, derives locales from registries, disables screenshot/trace/video/auth artifacts, and keeps every semantic E2E GitHub Actions run credential-free/read-only
- docs-impact capture remains on-demand and isolated from semantic E2E; it accepts only an external absolute mode-`0600` secret-file pointer, blocks non-authentication mutations, and writes screenshots only under an explicit next-docs output root
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
- the helper rechecks the remote/refspec, HEAD/tree/branch, clean worktree, Node/npm, lockfiles and installed dependency tree, hook/gate inputs, and resolved Docpact base before it internally performs the receipt-bound exact-SHA `--no-verify` transport; this internal helper call is the only bypass authority
- if the remote already equals the receipt-bound target SHA, the helper clears the receipt and succeeds idempotently without another push or gate run
- a successful helper transport deletes the receipt; a retry transport failure may retain it only while the remote remains at the bound pre-push SHA and the one-hour TTL is valid, and a pre-transport verification outage performs no push and leaves the bounded receipt available until verification recovers or the TTL expires; expiry, malformed state, controlled-input drift, or any other verified remote state fails closed and invalidates it
- never invoke `git push --no-verify` or `HUSKY=0` manually; a missing or invalidated receipt requires a new managed push and hook-owned gate run
- run the lightweight docpact gate before the full local test gate so governed-doc review failures surface early
- before a `dev -> main` promotion, run `DOCPACT_BASE_REF=origin/main npm run docpact:gate` from the intended candidate head; the post-merge Release Gate repeats this proof against the merge commit's first parent
- protect the actual local and release gates
- keep one logical full-suite execution inside each production release workflow; `prepush:gate` runs the receipt suite once in an isolated no-coverage Jest process and every remaining suite once through a coverage-enabled coordinator with only one worker active at a time and a `64MB` idle-memory recycle boundary, so do not precede it with a second standalone `test:ci` or coverage run
- avoid spending GitHub Actions minutes on ordinary push-triggered test jobs
- keep semantic E2E independent from `prepush:gate`: routine PR/dev events do not trigger it, manual and release invocations have no production credentials or writes, and only an explicitly authorized local operator run may close the authenticated 49-ID digest-bound proof
- keep routine locale/pre-push validation structural and deterministic; revalidate current semantic evidence file hashes only in the explicit production-readiness gate
- keep release automation in the same `main` push workflow after the tag is created; do not rely on a second tag-push workflow run from `GITHUB_TOKEN`
- use `workflow_dispatch` with an existing `v*` tag when a release needs to be recovered with newer workflow code
- make draft creation single-writer before parallel Electron publication, fail closed when more than one release uses the tag, and verify the exact cross-platform asset set after every matrix run
- reproduce Umi-generating focused tests, coverage commands, and `npm run prepush:gate` serially on one workstation when they are needed; the full gate already contains the complete test inventory and unchanged 100% `src/**` coverage
- keep `100%` coverage on every tracked file, and treat any direct-collection exclusions as a reviewed exception rather than a default pattern
