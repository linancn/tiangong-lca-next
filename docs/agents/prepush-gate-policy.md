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
  - .github/workflows/**
lastReviewedAt: 2026-06-18
lastReviewedCommit: d57e0d5bca10b05873f6701a14bc70ab02fbdbac
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

## Target Trigger Rules

| Surface | Target rule |
| --- | --- |
| local `pre-push` hook on any branch | run docpact first, then run the full local gate |
| ordinary GitHub branch pushes | do not run standalone remote test jobs |
| PRs into `dev` or `main` | rely on local test-gate evidence and docpact PR governance |
| canonical post-merge `main` pushes | read `package.json.version`, create the matching `v*` tag when missing, then run release-gate tests before web deploy and draft Electron release |
| unchanged-version `main` workflow hotfix pushes | skip release when the matching `v*` tag already points to an older `main` commit |
| manual release tags or `workflow_dispatch` recovery on `main` commits | remain supported for recovery/backfill releases and run the same release gate before deploy/release |

## Adoption Conditions

- hook behavior and release-gate behavior must match the documented policy
- no release path may bypass the full gate
- branch policy must stay aligned with `dev -> main`
- any coverage collection exclusions must be explicit, reviewed, and paired with focused verification of the affected user-visible wrapper flows
- data workflow fixture expansions stay under the existing `tests/**` docpact trigger; they do not change the protected-branch gate policy unless the actual hook, CI command, or coverage bar changes

## Short Rule Summary

- keep one authoritative full gate
- run the lightweight docpact gate before the full local test gate so governed-doc review failures surface early
- protect the actual local and release gates
- avoid spending GitHub Actions minutes on ordinary push-triggered test jobs
- keep release automation in the same `main` push workflow after the tag is created; do not rely on a second tag-push workflow run from `GITHUB_TOKEN`
- use `workflow_dispatch` with an existing `v*` tag when a release needs to be recovered with newer workflow code
- reproduce `npm run test:ci` and `npm run prepush:gate` serially on one workstation when both are needed
- keep `100%` coverage on every tracked file, and treat any direct-collection exclusions as a reviewed exception rather than a default pattern
