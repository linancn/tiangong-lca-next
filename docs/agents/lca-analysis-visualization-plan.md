# LCA Analysis And Visualization Plan

> Status: proposed product and implementation plan. This document is not runtime truth.

## Problem

The repo already exposes solver-backed LCIA results, but it still needs a stable web-native analysis layer for:

1. one-process impact profiles
2. one-impact hotspot ranking
3. selected-process comparison
4. clear traceability of snapshot and result sources

## Current Baseline

| Area | Current fact |
| --- | --- |
| current result APIs | `process_all_impacts` and `processes_one_impact` already exist |
| current UI anchor | process detail drawer already renders solver-backed LCIA results in a table |
| technical boundary | current all-unit baseline is sufficient for profiles, hotspots, ranking, and comparison, but not for real path analysis by itself |
| UI language | Ant Design Pro layout, cards, drawers, tables, tabs, light/dark theme |
| dependency constraint | chart-library changes require approval |

## Design Rules

- traceability first: show snapshot and result provenance with every analysis view
- charts complement tables, not replace them
- preserve existing page rhythm before adding a heavyweight dashboard
- prefer robust analytical charts over decorative charts
- make normalization explicit whenever values across categories are compared on one canvas

## Phase Scope

| Phase   | Scope                                                                              |
| ------- | ---------------------------------------------------------------------------------- |
| phase 1 | process profile, impact hotspots, selected-process comparison, small KPI summaries |
| phase 2 | grouped or aggregated analysis                                                     |
| phase 3 | contribution-path and uncertainty or scenario analysis                             |

## Chart Selection Rules

| Use case | Preferred chart | Notes |
| --- | --- | --- |
| one-process impact profile | `Bar` | normalized `Radar` is optional and only valid when normalization is explicit |
| one-impact hotspot ranking | `Bar` plus optional Pareto-style cumulative view | ranking clarity matters more than novelty |
| selected-process comparison | grouped `Bar` or `Column`; optional `Bullet` summary | keep raw values in the table |
| path analysis | defer Sankey until a path-specific data contract exists | do not fake exact path widths |

## Front-End Information Architecture

- enhance the existing process detail drawer instead of replacing it
- add a lightweight analysis page or tab for hotspot and comparison views
- keep current calculation entry points unchanged in early phases

## Phase 1 Surfaces

| Surface | Primary use | Data source |
| --- | --- | --- |
| process detail drawer | one-process impact profile plus provenance and raw table | `process_all_impacts` |
| analysis `Hotspots` tab | one-impact ranking plus cumulative-share view | `processes_one_impact` or a ranked query wrapper built on it |
| analysis `Compare` tab | selected-process comparison on one impact | `processes_one_impact` |

## Cross-Repo Work

| Repo                | Expected work                                                         |
| ------------------- | --------------------------------------------------------------------- |
| `tiangong-lca-next` | charts, tables, traceability UI, compare and hotspot surfaces         |
| `edge-functions`    | query support and result transport when current APIs are insufficient |
| `calculator`        | deeper analysis capabilities such as path-oriented outputs            |

## Acceptance Criteria For Phase 1

- users can inspect one-process profiles, one-impact hotspots, and selected-process comparisons
- raw values remain available in tables
- every analysis view shows `snapshot_id`, `result_id`, `source`, and `computed_at`
- chart values and table values reconcile
- loading, empty, and error states follow existing product patterns
- charts remain usable in both light and dark theme

## Delivery Order

1. extend the current process-detail LCIA section with a profile view
2. add hotspot ranking on a lightweight analysis surface
3. add selected-process comparison
4. stabilize state handling, formatting, and theme behavior
5. defer grouped analysis until phase 1 is stable
6. defer contribution-path and uncertainty work to later phases

## Open Questions

- whether and when chart dependencies should expand
- what grouped-analysis metadata should look like
- how normalized views should be labeled and explained
