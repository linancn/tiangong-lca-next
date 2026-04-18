---
title: next Validation Guide
docType: guide
scope: repo
status: active
authoritative: false
owner: next
language: en
whenToUse:
  - when a tiangong-lca-next change is ready for local validation
  - when deciding the minimum proof required for page, service, test, or asset changes
  - when writing PR validation notes for tiangong-lca-next work
whenToUpdate:
  - when the repo gains new canonical commands or gate expectations
  - when change categories require different proof
  - when coverage or deploy policy changes
checkPaths:
  - ai/validation.md
  - ai/task-router.md
  - package.json
  - jest.config.cjs
  - .husky/pre-push
  - .github/workflows/**
  - config/**
  - src/**
  - public/**
  - docker/**
lastReviewedAt: 2026-04-18
lastReviewedCommit: 002be46cbcb8a650c30a0b8962defa50a4c8be93
related:
  - ../AGENTS.md
  - ./repo.yaml
  - ./task-router.md
  - ./architecture.md
  - ../docs/agents/ai-testing-guide.md
---

## Default Baseline

Unless the change is doc-only AI-contract work, the minimum local baseline is:

```bash
npm run lint
npm test
npm run build
```

For protected-branch parity, the authoritative full gate is:

```bash
npm run prepush:gate
```

## Validation Matrix

| Change type | Minimum local proof | Additional proof when risk is higher | Notes |
| --- | --- | --- | --- |
| `config/routes.ts`, `src/app.tsx`, `src/pages/**`, or `src/components/**` | `npm run lint`; focused `npm run test:ci -- <jest-args>`; `npm run build` | run `npm run prepush:gate` before PR or when the change affects shared UX flows broadly | Route and shared UI changes usually affect multiple entrypoints. |
| `src/services/**` or `config/supabaseEnv.ts` | `npm run lint`; focused `npm run test:ci -- <jest-args>`; `npm run build` | run `npm run prepush:gate` when the change affects shared data access or auth flow | If the issue depends on schema or Edge runtime truth, record the companion repo proof separately. |
| `public/**` static resource bundles | `npm run lint`; `npm run build` | run focused tests or one nearby feature suite if the asset change affects parsing or cache behavior | Review both assets and consuming services together. |
| `docker/**` sync helpers or mirrors | `npm run lint`; `npm run build` | run the specific sync helper only when the task explicitly includes it; never hand-edit mirrors | `docker/volumes/functions/**` is a synced mirror, not an edit surface. |
| tests, coverage, or gate scripts | `npm run lint`; `npm test`; `npm run test:coverage`; `npm run test:coverage:assert-full` | run `npm run prepush:gate` when the protected-branch gate changed directly | Coverage remains `100%` for `src/**/*.ts`. |
| AI docs only | run the root warning-only `ai-doc-lint` against touched files | do one scenario-based routing check from root into this repo | Refresh review metadata even when prose-only docs change. |

## Minimum PR Note Quality

A good PR note for this repo should say:

1. which commands ran
2. which focused suites covered the touched feature area
3. whether the full protected-branch gate ran or was intentionally deferred
4. whether any required database-engine or edge-functions proof lives elsewhere
