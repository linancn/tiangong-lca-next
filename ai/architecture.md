---
title: next Architecture Notes
docType: guide
scope: repo
status: active
authoritative: false
owner: next
language: en
whenToUse:
  - when you need a compact mental model of the frontend before editing routes, pages, services, or static resources
  - when deciding which layer owns a behavior change
  - when route families, caches, or app-side data boundaries are mentioned without exact paths
whenToUpdate:
  - when major route or service layers change
  - when app-side data boundaries move
  - when the current map becomes misleading
checkPaths:
  - ai/architecture.md
  - ai/repo.yaml
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
  - ./validation.md
  - ../docs/agents/ai-dev-guide.md
---

## Repo Shape

This repo is a Umi-based React SPA with service-first data access, mirrored route families, and a strict test and coverage gate.

## Stable Path Map

| Path group              | Role                                                     |
| ----------------------- | -------------------------------------------------------- |
| `config/routes.ts`      | route tree and mirrored route-family entrypoints         |
| `config/config.ts`      | Umi runtime config                                       |
| `config/supabaseEnv.ts` | app-side environment selection                           |
| `src/app.tsx`           | runtime layout, auth redirect, dark mode, cache monitors |
| `src/pages/**`          | feature pages and route-level UI behavior                |
| `src/services/**`       | app-side data access and service logic                   |
| `src/components/**`     | shared UI components and modal/task-center flows         |
| `src/locales/**`        | UI strings                                               |
| `public/**`             | static resource bundles consumed by the app              |
| `docker/**`             | self-hosted sync helpers and mirrors                     |
| `electron/**`           | desktop packaging surface                                |

## Route And Data Model

The app groups major product areas under route families such as:

- `/tgdata`
- `/codata`
- `/mydata`
- `/tedata`

These routes typically connect pages to services instead of embedding raw data-client logic directly in the component tree.

## Service-First Boundary

All app-side Supabase and API access belongs in `src/services/**`.

If a task wants to add a new client, token flow, or request contract, start there.

## Current Hotspot Clusters

### Lifecycle-model and calculation-adjacent UI

- `src/services/lifeCycleModels/**`
- `src/services/lca/**`
- `src/components/LcaTaskCenter/**`
- `src/pages/Processes/Analysis/**`

### Review, team, and system-management flows

- `src/pages/Review/**`
- `src/pages/ManageSystem/**`
- nearby services under `src/services/**`

### Static cache-backed resource bundles

- `public/classifications/**`
- `public/locations/**`
- `public/lciamethods/**`

## Cross-Repo Boundaries

- `database-engine` owns schema truth and Supabase branch governance
- `edge-functions` owns Edge runtime behavior
- `next-docs` owns public docs-site content
- `calculator` owns solver and compute internals
- `lca-workspace` owns root delivery completion after a child PR merges

## Common Misreads

- GitHub default branch `main` is not the daily trunk
- `docker/volumes/functions/**` is a synced mirror, not a primary edit surface
- app-side data access does not belong outside `src/services/**`
- a merged child PR does not finish workspace delivery
