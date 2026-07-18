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
lastReviewedAt: 2026-07-18
lastReviewedCommit: 1122df8d34b76115d56ba3320532f660d37e70b7
lastReviewedNote: 'Reviewed the final async and unsupported-locale coverage closure after the French locale delivery; the documented bootstrap commands and safe work loop remain current.'
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
7. commit the final controlled tracked change and run `npm run push:checked -- origin <branch>`; its ordinary hook owns the one full gate

If no push will occur and a standalone handoff needs final evidence, run `npm run docpact:gate` and then `npm run prepush:gate` manually instead. Do not also push the same unchanged checkpoint merely to repeat those gates.

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
| audit one registry locale | `npm run i18n:locale:audit -- --locale <canonical-locale>` |
| build one locale's tracked context, quality, and activation artifacts | `npm run i18n:locale:artifacts:write -- --locale <canonical-locale>` |
| check one locale's context and quality | `npm run i18n:context:check -- --locale <canonical-locale>` then `npm run i18n:locale:quality:check -- --locale <canonical-locale>` |
| check tracked existing-translation corrections | `npm run i18n:corrections:check` |
| check one locale's activation boundary | `npm run i18n:locale:activation:check -- --locale <canonical-locale>` |
| enforce active German runtime assembly | `npm run i18n:de:audit` |
| validate the historical Issue #606 snapshot only | `npm run i18n:de:delta:review:check` |
| validate the historical Issue #601 Pilot only | `npm run i18n:de:pilot` |
| build | `npm run build` |
| local full test gate | `npm run prepush:gate` |
| final managed push | `npm run push:checked -- <normal-git-push-args>` |
| retry one receipt-bound failed transport | `npm run push:retry` |
| repo AI-doc lint | `scripts/docpact validate-config --root . --strict && scripts/docpact lint --root . --base <base> --head <head> --mode enforce` |

## Command Rules

- `npm start` and `npm run start:dev` are equivalent
- use `npm run start:main` only when the task explicitly requires the `main` environment
- prefer `npm run test:ci -- <jest-args>` over stacking flags after `npm test`
- use `npm run test:workflows -- --processes:create --frontend-url <url> --supabase-url <url> --supabase-publishable-key <key>` for one live data workflow script; use `--processes:all` or `--teams:all` when a full workflow suite is needed
- run `npm run test:api:smoke -- <workflow-args>` only with a target Supabase environment and configured test users; inspect its summary because child workflow failures are reported without making the command exit non-zero
- local pushes run the Husky pre-push hook, which runs `npm run docpact:gate` and then `npm run prepush:gate`
- the hook keeps an already-active Node.js 24 from `PATH`, including a CI `setup-node` runtime; it sources local NVM and runs `nvm use 24` only when the active Node is absent or has another major version
- treat `npm run prepush:gate` as the authoritative local test gate
- during normal delivery, use `npm run push:checked -- <normal-git-push-args>` and do not run the full gate manually immediately before its ordinary hook repeats it; focused proof belongs in the edit loop and the hook owns the final committed checkpoint
- ignored local evidence and GitHub metadata do not invalidate repository full-gate evidence; a controlled tracked change, relevant Node/dependency change, or gate/configuration change does
- after a controlled active-locale change, regenerate that locale's tracked artifacts, run the shared audit/context/quality/correction/activation checks, and keep `BLOCKED_CONTEXT`, unowned route views, topology drift, ICU drift, and undeclared corrections at zero
- `npm run i18n:de:audit` uses the same tracked automated activation boundary as every active registry locale; `i18n:de:pilot`, review, and delta commands validate only their frozen Issue #601/#602/#606 snapshots and are never active-release or full-gate inputs
- active locale commands and clean-runner proof must pass with `.local/**confirmation*` absent; historical reviewer forms and identity remain outside Git and GitHub
- a successful managed push leaves no retry receipt; only a non-zero transport result after both hook gates passed activates the ignored, one-hour, exact-intent receipt used by argument-free `npm run push:retry`
- a raw `git push` still runs the hook but cannot create that bounded recovery receipt; never invoke `git push --no-verify` or `HUSKY=0` manually
- run `npm run test:ci`, coverage commands, and `npm run prepush:gate` serially because they regenerate shared `.umi-test` state; do not add broad test/coverage runs around a full gate that already contains coverage

## If You Need More Than This File

- repo rules, branch facts, and minimal execution summary: `AGENTS.md`
- path and doc routing: `.docpact/config.yaml`
- minimum proof: `docs/agents/repo-validation.md`
- frontend mental model: `docs/agents/repo-architecture.md`
- branding, packaging, and local-stack surfaces: `docs/agents/repo-architecture.md`
- narrow source docs: the owning file under `docs/agents/**`
- additional governed source docs only after the core contract surface is insufficient: `README*`, testing references, rollout notes, PR templates, and proposal docs
