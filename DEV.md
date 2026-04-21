# Development Bootstrap

> Purpose: local setup and the shortest safe work loop for this repo. Repo policy, proof rules, and document ownership live in `AGENTS.md`.

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

- repo rules and document ownership: `AGENTS.md`
- path and doc routing: `ai/task-router.md`
- minimum proof: `ai/validation.md`
- frontend mental model: `ai/architecture.md`
- narrow execution guides: `docs/agents/**`
