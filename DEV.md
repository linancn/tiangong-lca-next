---
title: next Development Bootstrap
docType: guide
scope: repo
status: active
authoritative: false
owner: next
language: en
whenToUse:
  - when setting up the repo locally
  - when checking the canonical local commands
  - when resetting the shortest safe work loop after time away
whenToUpdate:
  - when bootstrap commands change
  - when the default local work loop changes
  - when the owning doc pointers become stale
checkPaths:
  - DEV.md
  - AGENTS.md
  - .docpact/config.yaml
  - package.json
  - .nvmrc
lastReviewedAt: 2026-07-16
lastReviewedCommit: 62ac1df70ee1d21b952992a2d830f3fba94aad53
lastReviewedNote: 'Reviewed the scoped German local Markdown generation, digest-bound confirmation, refresh, and enforcement sequence.'
---

# Development Bootstrap

> Purpose: local setup and the shortest safe work loop for this repo. Repo contract and document ownership live in `AGENTS.md`; minimum proof lives in `docs/agents/repo-validation.md`.

## Use When

- setting up the repo locally
- checking the canonical local commands
- resetting your local work loop after time away

## Do Not Use For

- deciding branch policy
- deciding minimum proof for a change
- deciding which document owns a rule

## Prerequisites

- Node.js `24`
- `npm`
- local shell configured so `nvm use 24` works

## Bootstrap

```bash
nvm install
nvm use 24
npm ci
```

`npm ci` installs the exact dependency tree from the committed `package-lock.json`. Use `npm install` only when intentionally changing dependencies, and commit the resulting lockfile update.

## Default Work Loop

1. `nvm use 24`
2. `npm start`
3. make the scoped change
4. run focused validation
5. run `npm run lint`
6. run `npm run build` when the change affects shipped behavior or static assets
7. run `npm run prepush:gate` before pushing or handing off local gate evidence

## Canonical Commands

| Task | Command |
| --- | --- |
| start shared `dev` env | `npm start` |
| explicit shared `dev` env | `npm run start:dev` |
| explicit `main` env | `npm run start:main` |
| local docpact gate | `npm run docpact:gate` |
| lint + typecheck | `npm run lint` |
| shared CI-style test runner | `npm test` |
| focused Jest suite | `npm run test:ci -- <jest-args>` |
| data workflow unit proof | `npm run test:data-workflows:unit` |
| focused live data workflow | `npm run test:workflows -- --<workflow> <workflow-args>` |
| live API smoke workflows | `npm run test:api:smoke -- <workflow-args>` |
| full coverage | `npm run test:coverage` |
| strict full-coverage assertion | `npm run test:coverage:assert-full` |
| coverage report + queue summary | `npm run test:coverage:report` |
| deterministic locale audit | `npm run i18n:audit` |
| refresh staged German context ledger | `npm run i18n:de:audit:write` |
| refresh staged German pilot review pack | `npm run i18n:de:pilot:write` |
| generate local German pilot review form | `npm run i18n:de:review:generate` |
| check completed local German pilot form | `npm run i18n:de:review:check` |
| generate local German full-catalog review form | `npm run i18n:de:review:catalog:generate` |
| check completed local German full-catalog form | `npm run i18n:de:review:catalog:check` |
| inspect German pilot blockers | `npm run i18n:de:pilot:report` |
| enforce approved German pilot | `npm run i18n:de:pilot` |
| enforce complete German leaf candidate | `npm run i18n:de:audit` |
| build | `npm run build` |
| local full test gate | `npm run prepush:gate` |
| repo AI-doc lint | `scripts/docpact validate-config --root . --strict && scripts/docpact lint --root . --base <base> --head <head> --mode enforce` |

## Command Rules

- `npm start` and `npm run start:dev` are equivalent
- use `npm run start:main` only when the task explicitly requires the `main` environment
- prefer `npm run test:ci -- <jest-args>` over stacking flags after `npm test`
- use `npm run test:workflows -- --processes:create --frontend-url <url> --supabase-url <url> --supabase-publishable-key <key>` for one live data workflow script; use `--processes:all` or `--teams:all` when a full workflow suite is needed
- run `npm run test:api:smoke -- <workflow-args>` only with a target Supabase environment and configured test users; inspect its summary because child workflow failures are reported without making the command exit non-zero
- local pushes run the Husky pre-push hook, which runs `npm run docpact:gate` and then `npm run prepush:gate`
- treat `npm run prepush:gate` as the authoritative local test gate
- run staged German generation in dependency order: `npm run i18n:de:audit:write`, then `npm run i18n:de:pilot:write`
- use `npm run i18n:de:review:generate` only after the context ledger and pilot pack are fresh; it atomically writes an ignored local Markdown form, rejects tracked/non-private repository paths, and refuses to overwrite one without explicit `--force`; use the separate `i18n:de:review:catalog:*` pair only after the complete catalog exists
- `npm run i18n:de:pilot` and `npm run i18n:de:audit` are final scoped gates and intentionally fail while the local pilot/full-catalog confirmation, context, terminology, or leaf candidates are incomplete; no GitHub identity, comment, or API call is part of either gate
- when reproducing local or release gates manually, run `npm run test:ci` and `npm run prepush:gate` serially because both regenerate `.umi-test`

## If You Need More Than This File

- repo rules, branch facts, and minimal execution summary: `AGENTS.md`
- path and doc routing: `.docpact/config.yaml`
- minimum proof: `docs/agents/repo-validation.md`
- frontend mental model: `docs/agents/repo-architecture.md`
- branding, packaging, and local-stack surfaces: `docs/agents/repo-architecture.md`
- narrow source docs: the owning file under `docs/agents/**`
- additional governed source docs only after the core contract surface is insufficient: `README*`, testing references, rollout notes, PR templates, and proposal docs
