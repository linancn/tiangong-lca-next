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
lastReviewedAt: 2026-04-23
lastReviewedCommit: f3256848c44466801a61316127c6fe19368f63ef
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
npm install
```

## Default Work Loop

1. `nvm use 24`
2. `npm start`
3. make the scoped change
4. run focused validation
5. run `npm run lint`
6. run `npm run build` when the change affects shipped behavior or static assets
7. run `npm run prepush:gate` before protected-branch parity is required

## Canonical Commands

| Task                            | Command                             |
| ------------------------------- | ----------------------------------- |
| start shared `dev` env          | `npm start`                         |
| explicit shared `dev` env       | `npm run start:dev`                 |
| explicit `main` env             | `npm run start:main`                |
| lint + typecheck                | `npm run lint`                      |
| shared CI-style test runner     | `npm test`                          |
| focused Jest suite              | `npm run test:ci -- <jest-args>`    |
| full coverage                   | `npm run test:coverage`             |
| strict full-coverage assertion  | `npm run test:coverage:assert-full` |
| coverage report + queue summary | `npm run test:coverage:report`      |
| build                           | `npm run build`                     |
| protected-branch parity gate    | `npm run prepush:gate`              |

## Command Rules

- `npm start` and `npm run start:dev` are equivalent
- use `npm run start:main` only when the task explicitly requires the `main` environment
- prefer `npm run test:ci -- <jest-args>` over stacking flags after `npm test`
- treat `npm run prepush:gate` as the authoritative local parity check

## If You Need More Than This File

- repo rules, branch facts, and minimal execution summary: `AGENTS.md`
- path and doc routing: `.docpact/config.yaml`
- minimum proof: `docs/agents/repo-validation.md`
- frontend mental model: `docs/agents/repo-architecture.md`
- branding, packaging, and local-stack surfaces: `docs/agents/repo-architecture.md`
- narrow source docs: the owning file under `docs/agents/**`
- additional governed source docs only after the core contract surface is insufficient: `README*`, testing references, rollout notes, PR templates, and proposal docs
