---
title: next Development Execution Guide
docType: guide
scope: repo
status: active
authoritative: false
owner: next
language: en
whenToUse:
  - when changing shipped frontend behavior
  - when refactoring app-side service logic
  - when updating route, page, component, locale, or static-resource consumers
whenToUpdate:
  - when development workflow or canonical commands change
  - when doc ownership references change
  - when the required execution order becomes inaccurate
checkPaths:
  - docs/agents/ai-dev-guide.md
  - AGENTS.md
  - .docpact/config.yaml
  - .docpact/validation.md
lastReviewedAt: 2026-04-23
lastReviewedCommit: f3256848c44466801a61316127c6fe19368f63ef
---

# Development Execution Guide

> Purpose: shortest reliable execution path for implementation and refactor work in this repo.

## Use When

- changing shipped frontend behavior
- refactoring app-side service logic
- updating route, page, component, locale, or static-resource consumers

## Do Not Use For

- deciding repo ownership or branch facts
- deciding minimum proof for a finished change
- deep domain references such as calculation internals

## Required Inputs

- changed behavior
- owning paths
- affected data source or upstream repo boundary
- affected test surface

## Guardrails

- use Node `24`
- use `npm`
- no new npm dependencies without approval
- app-side data access belongs in `src/services/**`
- routine work starts from `dev` and targets `dev`
- update locale keys in both `src/locales/en-US.ts` and `src/locales/zh-CN.ts` when UI copy changes

## Execution Order

1. inspect nearby code and tests with `rg`
2. confirm the owning layer and owning repo
3. implement service or utility changes before page wiring when both are involved
4. keep React components focused on orchestration
5. add or update tests with the change
6. update the owning document if behavior, commands, or rules changed
7. run focused proof, then run repo-level proof as required

## Command Shortlist

```bash
npm install
npm start
npm run lint
npm run test:ci -- <jest-args>
npm run build
npm run prepush:gate
```

## UI And Data Rules

- reuse existing shared components before creating new abstractions
- prefer Ant Design components, tokens, and existing project patterns over one-off styling
- keep environment selection in config and service layers, not in page logic
- do not create ad-hoc Supabase clients outside `src/services/**`

## Required Doc Updates

- runtime fact, routing rule, or hard boundary changed: update `AGENTS.md` and `.docpact/config.yaml`
- proof rule changed: update `.docpact/validation.md`
- repo mental model changed: update `.docpact/architecture.md`
- development workflow changed: update this file
- narrow domain rule changed: update the domain reference that owns it

## Done

- changed behavior implemented in the correct layer
- affected tests updated
- `npm run lint` passed
- focused proof passed
- `npm run build` passed when shipped behavior or assets changed
- docs updated only in their owning locations
