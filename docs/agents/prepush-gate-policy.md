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
  - scripts/docpact
  - scripts/docpact-gate.js
  - scripts/prepush-gate-receipt.cjs
  - .github/workflows/**
lastReviewedAt: 2026-07-17
lastReviewedCommit: 1739b195a1d6c6039c2229643174fa411e3c6522
lastReviewedNote: 'Reviewed Issue #621 and the v0.0.49 release checkpoint; single full-gate ownership and 100% src coverage remain unchanged.'
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

## Scope

This document owns the intended trigger policy only.

It does not own:

- the canonical proof bar
- the current live hook behavior
- the current CI implementation details
- scoped preparation gates such as `i18n:de:pilot` and `i18n:de:audit`; their issue-local review workflow is documented under `docs/plans/i18n-de-DE/`

## Target Trigger Rules

| Surface | Target rule |
| --- | --- |
| local `pre-push` hook on any branch | run docpact first, then run the full local gate |
| same-push transport retry | permit the repo-owned retry helper only when a managed original push failed after its hook completed and the ignored bounded receipt proves the exact clean HEAD, branch, ref update, remote, toolchain, dependency tree, gate inputs, and Docpact base are unchanged |
| ordinary GitHub branch pushes | do not run standalone remote test jobs |
| PRs into `dev` or `main` | rely on local test-gate evidence and docpact PR governance |
| canonical post-merge `main` pushes | read `package.json.version`, create the matching `v*` tag when missing, run release-gate tests, pre-create exactly one tag-scoped draft, then run web deploy and the Electron matrix; the workflow succeeds only after one draft contains the exact 12 expected non-empty assets |
| unchanged-version `main` workflow hotfix pushes | skip release when the matching `v*` tag already points to an older `main` commit |
| manual release tags or `workflow_dispatch` recovery on `main` commits | remain supported for recovery/backfill releases and run the same release gate before deploy/release |

## Adoption Conditions

- the hook accepts an already-active Node.js 24 from `PATH`; it falls back to local NVM only when the active Node is absent or has another major version, and fails clearly if Node 24 is still unavailable
- hook behavior and release-gate behavior must match the documented policy
- no release path may bypass the full gate
- branch policy must stay aligned with `dev -> main`
- any coverage collection exclusions must be explicit, reviewed, and paired with focused verification of the affected user-visible wrapper flows
- data workflow fixture expansions stay under the existing `tests/**` docpact trigger; they do not change the protected-branch gate policy unless the actual hook, CI command, or coverage bar changes
- review-only localization commands may remain explicit scoped local gates until human evidence is complete; ignored confirmation files are intentionally unavailable to clean-checkout CI and are never added to `npm run prepush:gate`

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
- protect the actual local and release gates
- keep one logical full-suite execution inside each production release workflow; `prepush:gate` runs the receipt suite once in an isolated no-coverage Jest process and every remaining suite once through a coverage-enabled coordinator with only one worker active at a time and a `64MB` idle-memory recycle boundary, so do not precede it with a second standalone `test:ci` or coverage run
- avoid spending GitHub Actions minutes on ordinary push-triggered test jobs
- keep release automation in the same `main` push workflow after the tag is created; do not rely on a second tag-push workflow run from `GITHUB_TOKEN`
- use `workflow_dispatch` with an existing `v*` tag when a release needs to be recovered with newer workflow code
- make draft creation single-writer before parallel Electron publication, fail closed when more than one release uses the tag, and verify the exact cross-platform asset set after every matrix run
- reproduce Umi-generating focused tests, coverage commands, and `npm run prepush:gate` serially on one workstation when they are needed; the full gate already contains the complete test inventory and unchanged 100% `src/**` coverage
- keep `100%` coverage on every tracked file, and treat any direct-collection exclusions as a reviewed exception rather than a default pattern
