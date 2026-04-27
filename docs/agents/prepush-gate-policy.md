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
  - .github/workflows/**
lastReviewedAt: 2026-04-28
lastReviewedCommit: 232b36c46bfc7b0d6095af577334ad6efb4e6e61
---

# Pre-Push Gate Policy

> Status: design and rollout contract. Current runtime truth is intentionally not duplicated here; read `docs/agents/repo-validation.md`, `.husky/pre-push`, and the active workflows for the live behavior.

## Purpose

Define the intended trigger policy for the existing `npm run prepush:gate` command without changing the quality bar.

## Exact Gate Command

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

| Surface                         | Target rule                                            |
| ------------------------------- | ------------------------------------------------------ |
| local `pre-push` hook on `main` | always run the full gate                               |
| PRs into `dev`                  | run the full gate in CI                                |
| PRs into `main`                 | run the full gate in CI                                |
| feature-branch local pushes     | do not force the full gate automatically               |
| post-merge pushes               | keep branch-specific protection, do not lower the gate |

## Adoption Conditions

- hook behavior and CI behavior must match the documented policy
- no protected merge path may bypass the full gate
- branch policy must stay aligned with `dev -> main`
- any coverage collection exclusions must be explicit, reviewed, and backed by focused behavior tests for the excluded wrappers

## Short Rule Summary

- keep one authoritative full gate
- protect the actual merge points
- avoid forcing the heaviest gate on every local feature push
- reproduce `lint-and-test` and `Full Gate` serially on one workstation; GitHub runs them in isolated jobs
- keep `100%` coverage on every tracked file even when framework-heavy orchestration wrappers are excluded from direct collection
