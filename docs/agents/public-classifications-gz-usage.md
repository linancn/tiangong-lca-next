---
title: next Classification Bundle Reference
docType: reference
scope: repo
status: active
authoritative: false
owner: next
language: en
whenToUse:
  - when changing classification cache behavior
  - when changing classification file names or bundle contents
  - when changing services that resolve classification trees
whenToUpdate:
  - when classification bundle paths or file-selection rules change
  - when the cache read path changes
  - when the consuming services move
checkPaths:
  - docs/agents/public-classifications-gz-usage.md
  - public/classifications/**
  - src/services/classifications/**
  - src/components/ClassificationCacheMonitor/**
  - src/app.tsx
lastReviewedAt: 2026-04-23
lastReviewedCommit: f3256848c44466801a61316127c6fe19368f63ef
---

# Classification Bundle Reference

> Purpose: exact read path and file selection rules for `public/classifications/*.gz`.

## Use When

- changing classification cache behavior
- changing classification file names or bundle contents
- changing services that resolve classification trees

## Source Of Truth

- preload path: `src/app.tsx`, `src/components/ClassificationCacheMonitor/**`, `src/components/CacheMonitor/useResourceCacheMonitor.ts`
- on-demand read path: `src/services/classifications/util.ts`
- file selection logic: `src/services/classifications/api.ts`
- session-level tree cache: `src/services/classifications/cache.ts`

## Runtime Model

There are two layers:

1. pre-cache layer: after app shell load, all 8 files are warmed into IndexedDB when cache freshness rules require it
2. business-read layer: services read from IndexedDB first, then fetch and cache on demand if missing

Above those two layers, the repo also keeps a same-session in-memory classification-tree cache to avoid rebuilding the same tree repeatedly.

Pages and components do not read the `.gz` files directly.

## File Selection Map

| File group | Used when | Data carried |
| --- | --- | --- |
| `CPCClassification*.gz` | `Flow` and not `Elementary flow` | normal flow classification tree |
| `ILCDFlowCategorization*.gz` | `Flow` and `Elementary flow` | elementary-flow categorization tree |
| `ISICClassification*.gz` | `Process` or `LifeCycleModel` | process and life-cycle-model classification tree |
| `ILCDClassification*.gz` | `Contact`, `Source`, `UnitGroup`, `FlowProperty` | shared ILCD classification tree grouped by `@dataType` |

Chinese display overlays labels from the matching `_zh` file onto the English structural tree.

## Full Tree vs Partial Path

| Input pattern | Meaning | Common use |
| --- | --- | --- |
| `['all']` | load the full tree | form options, list filters, cache warmup |
| `[some id]` | load only the matching classification path | detail views for already-selected values |

## Cache And Read Order

1. app shell mounts `ClassificationCacheMonitor`
2. warm cache if version, file list, age, or key presence requires it
3. store parsed JSON in IndexedDB
4. business reads load from IndexedDB first
5. if missing, fetch on demand and cache immediately

## Current Non-Use

`categoryTypeOptions` contains `LCIAMethod`, but the current codebase does not show an active `getILCDClassification('LCIAMethod', ...)` path.

## One-Line Rule

- normal `Flow`: `CPCClassification*.gz`
- `Elementary flow`: `ILCDFlowCategorization*.gz`
- `Process` and `LifeCycleModel`: `ISICClassification*.gz`
- `Contact`, `Source`, `UnitGroup`, `FlowProperty`: `ILCDClassification*.gz`
