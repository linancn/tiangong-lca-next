---
title: next Promote Dev To Main PR Template
docType: template
scope: repo
status: active
authoritative: false
owner: next
language: en
whenToUse:
  - when opening a promotion PR from dev into main
  - when checking the expected validation and follow-up note shape for a promote PR
whenToUpdate:
  - when promotion handoff expectations change
  - when validation or back-merge note shape for promote PRs changes
checkPaths:
  - .github/PULL_REQUEST_TEMPLATE/promote-dev-to-main.md
  - AGENTS.md
  - docs/agents/repo-validation.md
lastReviewedAt: 2026-04-23
lastReviewedCommit: eb445ef00ab1d07b76a46d471e54377801117ee7
---

## Promotion Contract

- base branch: `main`
- source branch: `dev`
- validated environment before promotion: `dev` / `main` / `local Supabase`
- back-merge required after merge: `No` / `Yes (main -> dev, explain)`
- root workspace integration expected: `No` / `Yes (explain)`

- [ ] this PR promotes `dev` into `main`
- [ ] integrated behavior was verified in `dev` before promotion
- [ ] if the PR includes a direct `main` hotfix path, the required `main -> dev` back-merge plan is documented

## Linked Issue

Closes #

## Promotion Facts

<!-- What is being promoted and why it is ready for main. Keep this factual and short. -->

## Validation Facts

<!-- Exact commands, exact environment, exact evidence. -->

## Integration And Follow-Up

<!-- Workspace submodule bump, release-tag coordination, back-merge follow-up, or rollback notes. -->
