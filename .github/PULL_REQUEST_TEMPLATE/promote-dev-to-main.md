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
lastReviewedAt: 2026-07-29
lastReviewedCommit: 646652fb4ebf91bfab010f7918c576efefd206d4
---

## Promotion Contract

- base branch: `main`
- source branch: `dev`
- validated environment before promotion: `dev` / `main` / `local Supabase`
- back-merge required after merge: `No` / `Yes (main -> dev, explain)`
- root workspace integration expected: `No` / `Yes (explain)`

- [ ] this PR promotes `dev` into `main`
- [ ] integrated behavior was verified in `dev` before promotion
- [ ] the exact source inputs have a current hermetic semantic-harness qualification receipt
- [ ] one authorized production semantic E2E completed before this PR was opened, with current verified evidence, exact cleanup, and no leaked rows or artifacts
- [ ] the full managed release gate passed on the immutable candidate represented by this PR
- [ ] if the PR includes a direct `main` hotfix path, the required `main -> dev` back-merge plan is documented

Promotion is the verifier of immutable receipts and the reviewed `dev...main` diff. It is not the first execution surface for semantic harness behavior. Repository CI intentionally has no protected production actor credentials or external recovery ledger: it validates the checked-in qualification and production-evidence contracts, but cannot create production proof.

## Linked Issue

Closes #

## Promotion Facts

<!-- What is being promoted and why it is ready for main. Keep this factual and short. -->

## Validation Facts

<!--
Exact commands, exact environment, and exact evidence:
- qualification receipt path/digest, qualified source identity, 72 cases / 49 live IDs, browser
  runtime identities, zero external requests, and zero production writes
- authorized production evidence digest, 49/49 IDs, created/cleaned/leaked counts, and recovery
  ledger closure
- final managed gate receipt and candidate SHA/tree
-->

## Integration And Follow-Up

<!-- Workspace submodule bump, release-tag coordination, back-merge follow-up, or rollback notes. -->
