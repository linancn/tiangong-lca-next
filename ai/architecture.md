---
title: next Architecture Notes
docType: guide
scope: repo
status: active
authoritative: false
owner: next
language: en
whenToUse:
  - when you need a compact mental model before editing routes, pages, services, or static resources
  - when deciding which layer owns a behavior change
  - when a path is mentioned without enough context to know its role
whenToUpdate:
  - when major route, runtime, or service layers move
  - when stable path ownership changes
  - when the current map becomes misleading
checkPaths:
  - ai/architecture.md
  - ai/repo.yaml
  - config/**
  - src/**
  - public/**
  - docker/**
lastReviewedAt: 2026-04-21
lastReviewedCommit: 25d9c1e2799929b4fb3f8a524b2a47931a7b0dc8
related:
  - ../AGENTS.md
  - ./repo.yaml
  - ./task-router.md
  - ./validation.md
---

## Repo Shape

This repo is a Umi-based React SPA with service-first data access, cache-backed static resources, and strict validation gates.

## Stable Path Map

| Path group              | Role                                                          |
| ----------------------- | ------------------------------------------------------------- |
| `config/routes.ts`      | route tree and route-family entrypoints                       |
| `config/config.ts`      | Umi runtime config                                            |
| `config/supabaseEnv.ts` | frontend env selection                                        |
| `src/app.tsx`           | runtime layout, auth redirect, cache monitors, theme behavior |
| `src/pages/**`          | route-level product pages                                     |
| `src/components/**`     | shared UI and reusable flows                                  |
| `src/services/**`       | app-side Supabase/API access and service logic                |
| `src/locales/**`        | UI strings                                                    |
| `public/**`             | static resource bundles consumed by the app                   |
| `docker/**`             | self-hosted sync helpers and mirrors                          |
| `electron/**`           | desktop packaging surface                                     |

## Runtime Model

Use this default read path:

`route -> page/component -> service -> backend or static resource`

Rules:

- route and page components orchestrate
- service modules own app-side data access
- static bundles are read through consuming services, not directly by pages
- cache monitors live near runtime setup, not inside feature pages

## Current Hotspots

- lifecycle-model and calculation-adjacent UI: `src/services/lifeCycleModels/**`, `src/services/lca/**`, `src/components/LcaTaskCenter/**`, `src/pages/Processes/Analysis/**`
- review, team, and system-management flows: `src/pages/Review/**`, `src/pages/ManageSystem/**`, `src/pages/Teams/**`
- cache-backed static resources: `public/classifications/**`, `public/locations/**`, `public/lciamethods/**`

## Cross-Repo Boundaries

- `database-engine` owns schema truth and Supabase branch governance
- `edge-functions` owns Edge runtime behavior
- `next-docs` owns public docs-site content
- `calculator` owns solver and compute internals
- `lca-workspace` owns root delivery completion after merge

## Common Misreads

- GitHub default branch `main` is not the daily trunk
- `docker/volumes/functions/**` is a synced mirror, not a primary edit surface
- app-side data access does not belong outside `src/services/**`
- a merged child PR does not finish workspace delivery
