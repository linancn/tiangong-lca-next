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
lastReviewedAt: 2026-04-23
lastReviewedCommit: f3256848c44466801a61316127c6fe19368f63ef
---

# Pre-Push Gate Policy

> Status: design and rollout contract. Current runtime truth still lives in `AGENTS.md`, `docs/agents/repo-validation.md`, and the active repo scripts.

## Purpose

Define the intended trigger policy for the existing `npm run prepush:gate` command without changing the quality bar.

## Exact Gate Command

```bash
npm run prepush:gate
```

## Current Runtime Truth

- the command above is the authoritative full gate
- local `.husky/pre-push` currently auto-runs it only for local `main` pushes
- protected-branch parity still expects the same gate in CI for `dev` and `main`

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

## Short Rule Summary

- keep one authoritative full gate
- protect the actual merge points
- avoid forcing the heaviest gate on every local feature push
