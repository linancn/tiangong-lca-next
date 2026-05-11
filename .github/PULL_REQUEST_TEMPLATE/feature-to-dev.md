---
title: next Feature To Dev PR Template
docType: template
scope: repo
status: active
authoritative: false
owner: next
language: en
whenToUse:
  - when opening a routine feature or fix PR into dev
  - when checking the expected validation and handoff note shape for dev-bound work
whenToUpdate:
  - when branch handoff expectations for dev-bound PRs change
  - when the validation note shape for routine repo delivery changes
checkPaths:
  - .github/PULL_REQUEST_TEMPLATE/feature-to-dev.md
  - AGENTS.md
  - docs/agents/repo-validation.md
lastReviewedAt: 2026-04-23
lastReviewedCommit: eb445ef00ab1d07b76a46d471e54377801117ee7
---

## Branch Contract

- base branch: `dev`
- validated environment: `dev` / `main` / `local Supabase`
- back-merge required after merge: `No` / `Yes (explain)`
- root workspace integration expected: `No` / `Yes (explain)`

- [ ] this PR targets `dev`
- [ ] if the work started from `main`, this PR documents why it is a hotfix or production-only exception

## Linked Issue

Closes #

## Change Facts

<!-- Changed paths, behavior change, and reason. Keep this factual and short. -->

## Validation Facts

<!-- Exact commands, exact environment, exact evidence. -->

## Risks And Follow-Up

<!-- Rollback notes, back-merge notes, root integration notes, or follow-up issues. -->
