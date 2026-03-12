# LCA Analysis and Visualization Plan

Last updated: 2026-03-12

## 1. Purpose

This document defines a phased plan for bringing LCA analysis views into `tiangong-lca-next`.

The plan combines:

- common LCA analysis patterns used in tools such as openLCA and Brightway,
- the current solver and query capabilities already available in the Tiangong stack,
- the existing UI language of `tiangong-lca-next`,
- a chart selection strategy based on the Ant Design Charts 2.6.7 component set.

This is a product and implementation plan, not a solver-internal design note.

## 2. Current Baseline

## 2.1 What the current stack already supports

- `tiangong-lca-next` already exposes two result query modes in `src/services/lca/api.ts`:
  - `process_all_impacts`
  - `processes_one_impact`
- The process detail drawer already calls `process_all_impacts` and renders solver-backed LCIA results in a `ProTable`.
- The solver stack already provides:
  - snapshot-side `process_map` and `impact_map`,
  - `solve_all_unit`,
  - latest all-unit pointer,
  - query-friendly all-unit sidecar artifact.

## 2.2 Important technical boundary

The current `solve_all_unit` baseline is `h-only`.

That means the current stack is well suited for:

- impact profiles,
- hotspots,
- ranking,
- comparison,
- grouped summaries.

It is not yet sufficient for a true contribution tree or Sankey path analysis by itself. Those later features need a path-oriented endpoint built from `solve_one(return_x/g/h=true)` plus traversal logic.

## 2.3 Current front-end style

`tiangong-lca-next` uses a stable enterprise UI language:

- Ant Design Pro layout,
- `Drawer`, `Card`, `Descriptions`, `Tabs`, `ProTable`,
- light/dark theme switching,
- brand primary colors from `config/branding.ts`.

This matters because the first chart layer should feel like an extension of the current product, not a detached dashboard.

## 2.4 Dependency constraint

The repository does not currently include a charting dependency for Ant Design Charts, and `AGENTS.md` requires explicit human approval before adding npm dependencies.

This plan therefore separates:

- what should be built,
- what dependency is expected,
- what remains pending approval.

## 3. Product Goals

The first release of analysis and visualization should help users answer four questions quickly:

1. For one process, which impact categories are high?
2. For one impact category, which processes are the main hotspots?
3. Among several selected processes, which one is worse or better on one impact?
4. Which snapshot/result/source produced the numbers currently shown?

The first release should not aim to replicate the full analysis depth of desktop LCA tools. Instead, it should deliver a clear, auditable, web-native analysis layer on top of the current result APIs.

## 4. Design Principles

## 4.1 Traceability first

Every analysis view must display:

- `snapshot_id`,
- `result_id`,
- `source`,
- `computed_at`.

Charts are for interpretation; tables and metadata remain the source of truth.

## 4.2 Charts complement tables

Do not replace `ProTable` with charts. Each analysis panel should keep a precise tabular fallback or drill-down table.

## 4.3 Preserve the existing page rhythm

Phase 1 should prefer:

- chart panels inside existing drawers/pages,
- compact summary cards,
- charts above or beside tables.

It should avoid a heavy standalone dashboard unless the workflow truly needs one.

## 4.4 Prefer robust charts over decorative charts

For early LCA analysis, ranking and comparison matter more than visual novelty.

That means:

- prefer `Bar`, `DualAxes`, `Bullet`,
- use `Radar` only with normalization and small category counts,
- defer `Sankey` until path data exists,
- avoid `Pie` as a primary analytical chart.

## 4.5 Make normalization explicit

LCIA categories usually have different units and scales.

Therefore:

- raw values should stay in tables,
- profile charts that compare categories on one canvas should use normalized values,
- the UI must label when data is normalized vs raw.

## 5. Recommended Analysis Scope

## 5.1 Phase 1: Directly build on current APIs

Phase 1 is the minimum useful analysis release and should be considered the default target.

### A. Process Profile

Goal:

- show all impacts for one process.

Data source:

- `process_all_impacts`

Main placement:

- existing process detail drawer, solver LCIA section.

Charts:

- primary: `Bar`
- optional secondary toggle: normalized `Radar`

Why:

- `Bar` is readable with long impact names and mixed magnitudes,
- `Radar` can be helpful only after normalization and only when the number of impact categories remains manageable.

Output:

- top summary cards,
- profile chart,
- existing `ProTable` below as the exact-value section.

### B. Impact Hotspots

Goal:

- show the top processes for one selected impact category.

Data source:

- `processes_one_impact`
- if the page needs whole-snapshot ranking, the query API should add server-side support for ranking, `top_n`, pagination, and sorting.

Main placement:

- a new lightweight "LCA Analysis" page or tab in `tiangong-lca-next`.

Charts:

- primary: `Bar`
- secondary: `DualAxes` Pareto view

Why:

- users usually want both the absolute ranking and the cumulative contribution.

Output:

- Top N chart,
- cumulative contribution chart,
- table with raw value, rank, share, and cumulative share.

### C. Selected Process Compare

Goal:

- compare several user-selected processes against one impact category.

Data source:

- `processes_one_impact`

Main placement:

- same "LCA Analysis" page, compare tab.

Charts:

- primary: grouped `Bar` or `Column`
- optional benchmark card: `Bullet`

Why:

- this is the cleanest way to support business comparison, internal benchmark, and short-list decisions.

Output:

- compare chart,
- benchmark summary,
- sortable comparison table.

### D. Small KPI summaries

Goal:

- summarize what the user is looking at before they read the full chart.

Charts/components:

- Ant Design `Statistic`,
- optional tiny trend graphic if later snapshots are available.

Use cases:

- current value,
- snapshot name/date,
- rank,
- percentile,
- delta vs selected benchmark.

## 5.2 Phase 2: Aggregation and cross-snapshot analysis

Phase 2 should start only after Phase 1 is stable.

### A. Grouped Results

Goal:

- aggregate results by business metadata such as geography, model, team, state, or tag.

Needs:

- additional metadata mapping beyond the current minimal `process_map`,
- query support for aggregation.

Charts:

- `Heatmap` for `group x impact`,
- `Treemap` for within-group share,
- `Bar` for sorted grouped ranking.

### B. Snapshot Compare

Goal:

- compare the same process or group across two snapshots.

Needs:

- multi-snapshot selection,
- stable comparison semantics,
- clear handling of changed process availability.

Charts:

- grouped `Bar` / `Column`,
- optional compact delta cards.

## 5.3 Phase 3: Path and uncertainty analysis

These should be explicitly deferred from the first release.

### A. Contribution Path Analysis

Goal:

- identify upstream paths and major branches contributing to one impact.

Needs:

- new backend path endpoint,
- `solve_one(return_x/g/h=true)`,
- graph traversal and pruning rules,
- impact/path thresholds.

Charts:

- `Sankey`,
- tree table,
- ranked branch list.

### B. Uncertainty / Scenario Analysis

Goal:

- support Monte Carlo style distributions or scenario comparison.

Needs:

- uncertainty-aware data model and compute path,
- clear statistical UX.

This should not be part of the first front-end release.

## 6. Chart Selection Guidance

This section maps analysis tasks to the Ant Design Charts 2.6.7 component set.

| Analysis task | Recommended chart | Phase | Notes |
| --- | --- | --- | --- |
| One process, all impacts | `Bar` | 1 | Default choice. Best readability with long labels. |
| One process, normalized shape | `Radar` | 1 optional | Use only after normalization and with small category count. |
| One impact, process ranking | `Bar` | 1 | Best default for hotspot ranking. |
| One impact, cumulative share | `DualAxes` | 1 | Use as Pareto: bar + cumulative line. |
| Selected process benchmark | `Bullet` | 1 | Good for target/baseline comparison. |
| Group vs impact matrix | `Heatmap` | 2 | Requires grouped aggregation support. |
| In-group share | `Treemap` | 2 | Useful after tags/grouping metadata exists. |
| Contribution path | `Sankey` | 3 | Only after path API exists. |

Primary do-not-use rules for early phases:

- Do not use `Pie` as the main LCA analysis view.
- Do not introduce `Sankey` before contribution-path data exists.
- Do not plot raw multi-unit LCIA values in a `Radar`.

## 7. Front-End Information Architecture

## 7.1 Process Detail Drawer Enhancement

Enhance the existing process detail LCIA section instead of replacing it.

Recommended structure:

1. summary row
2. profile chart
3. metadata line (`source`, `snapshot`, `result`, `computed_at`)
4. raw result table

This keeps the current process-centric workflow intact.

## 7.2 Add a Lightweight LCA Analysis Page

Add a dedicated but compact analysis surface in `tiangong-lca-next` with two Phase 1 tabs:

- `Hotspots`
- `Compare`

This page should not try to be a large dashboard. It should follow the same `PageContainer + Card + Table + Drawer` language already used across the product.

## 7.3 Keep process calculation entry points unchanged

The current solve workflow and task-center pattern are already aligned with the product:

- submit task,
- monitor in task center,
- read results when ready.

The analysis layer should reuse that flow, not invent a new job interaction model.

## 8. Cross-Repo Work Items

Although this document lives in `tiangong-lca-next`, delivery spans three repositories.

## 8.1 `tiangong-lca-next`

Phase 1 work:

- add analysis UI panels and chart wrappers,
- keep table/chart synchronization,
- add normalized view toggle where needed,
- add export support for visible analysis data,
- support light/dark theme for charts,
- add unit tests for data transformation and rendering states.

## 8.2 `tiangong-lca-edge-functions`

Phase 1 work:

- harden `lca_query_results` for ranking and compare workflows,
- add sorting, pagination, and optional `top_n` for hotspot scenarios,
- keep `source/snapshot_id/result_id/meta` stable in all responses.

Phase 2 work:

- add grouped aggregation endpoints,
- add cross-snapshot comparison support.

Phase 3 work:

- add contribution-path query endpoints.

## 8.3 `tiangong-lca-calculator`

Phase 1 status:

- existing solver/query artifacts are already a good fit for profile/hotspot/compare.

Phase 2 work:

- expose richer metadata mapping for grouped analysis.

Phase 3 work:

- support path-oriented analysis inputs and outputs,
- support any future uncertainty/scenario backbone.

## 9. Implementation Order

Recommended order:

1. Extend the existing process LCIA section with Phase 1 profile visualization.
2. Add hotspot ranking page/tab based on current query mode plus minimal edge support.
3. Add selected-process compare view.
4. Stabilize formatting, export, empty/error states, and dark mode.
5. Start grouped analysis only after Phase 1 usage proves the value.
6. Leave contribution Sankey and uncertainty for a later release.

## 10. Acceptance Criteria

Phase 1 is complete when:

- one process can show all impacts as chart plus table,
- one impact can rank multiple processes as hotspot view,
- selected processes can be compared on one impact,
- every analysis view exposes `snapshot_id`, `result_id`, `source`, and `computed_at`,
- chart values and table values are consistent,
- empty/loading/error states match existing product conventions,
- charts behave correctly in both light and dark themes.

## 11. Risks and Open Questions

## 11.1 Dependency approval

Charting dependency selection and installation still require explicit approval in this repo.

## 11.2 Grouped analysis metadata

Current snapshot mappings are sufficient for direct process-level analysis but not yet enough for rich grouped reporting.

## 11.3 Normalization UX

Users must understand whether they are seeing:

- raw values,
- ranked raw values,
- normalized category profiles,
- grouped or aggregated values.

The UI should label these states explicitly.

## 11.4 Scope control

The biggest delivery risk is trying to build:

- dashboard,
- grouped analysis,
- Sankey,
- uncertainty,

all at once.

The intended release strategy is narrow and sequential:

- first rank and compare,
- then aggregate,
- then traverse.
