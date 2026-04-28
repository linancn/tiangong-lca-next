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
  - jest.config.cjs
  - .husky/pre-push
  - .github/workflows/**
lastReviewedAt: 2026-04-28
lastReviewedCommit: 232b36c46bfc7b0d6095af577334ad6efb4e6e61
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
npm run prepush:gate
```

## Proof Matrix

| Change type | Minimum local proof | Stronger proof when risk is higher | Notes |
| --- | --- | --- | --- |
| routes, pages, app runtime, shared UI | `npm run lint`; focused `npm run test:ci -- <jest-args>`; `npm run build` | `npm run prepush:gate` | shared UX changes often affect multiple entrypoints |
| services or env selection | `npm run lint`; focused `npm run test:ci -- <jest-args>`; `npm run build` | `npm run prepush:gate` | companion proof may live in another repo if schema or Edge runtime changed |
| static bundles under `public/**` | `npm run lint`; `npm run build` | focused tests near the consuming feature | check both the asset and its readers |
| sync helpers under `docker/**` | `npm run lint`; `npm run build` | run the exact helper only when the task includes it | do not hand-edit synced mirrors |
| tests, coverage, or gate scripts | `npm run lint`; `npm run test:ci`; `npm run test:coverage`; `npm run test:coverage:assert-full` | `npm run prepush:gate` | coverage expectations remain strict |
| repo docs only | `docpact lint --root . --files "<csv>" --mode enforce` | `docpact validate-config --root . --strict` when `.docpact/config.yaml` changes | still update review metadata and ownership as needed |

If the change touches `scripts/test-runner.cjs` or protected-branch gate reproduction, run `npm run test:ci` and `npm run prepush:gate` serially locally because both commands regenerate `.umi-test`.

Treat dataset-validation work under `src/pages/*/sdkValidation.ts`, `src/pages/Utils/validation/**`, `src/components/ValidationIssueModal/index.tsx`, and localized validator copy under `src/locales/**` as shipped runtime work even when most of the change looks like error-message plumbing.

If a coverage change excludes framework-heavy wrapper files from `collectCoverageFrom`, document why those files are excluded and re-check the affected save, validation, navigation, and highlighting flows with focused tests before relying on `npm run prepush:gate`.

## Minimum PR Validation Note

Every PR note for this repo must state:

1. exact commands run
2. exact focused suites, if any
3. exact environments checked
4. whether `npm run prepush:gate` ran
5. whether any required proof lives in another repo
