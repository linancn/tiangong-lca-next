# Contribution Path Analysis Design

Updated: 2026-03-13

## 1. Goal

Support contribution path analysis for **one process + one impact** and answer:

1. What is the total LCIA result for this process and impact?
2. Which upstream processes contribute the most?
3. Which upstream branches should users inspect first?

This design targets the current three-repo architecture:

- `tiangong-lca-calculator`
- `tiangong-lca-edge-functions`
- `tiangong-lca-next`

## 2. Non-goals

V1 explicitly does not include:

- cross-snapshot analysis
- uncertainty / Monte Carlo
- multi-process path analysis
- audit-grade exact Sankey edge allocation
- fully client-side recalculation for arbitrary thresholds

The first release should optimize for a stable, explainable, shippable path-analysis pipeline.

## 3. Current Constraints

The numerical base is already sufficient, but the query and presentation layer is not.

### 3.1 What already exists

- `solve_one` already supports `return_x / return_g / return_h`
- snapshot artifacts already contain sparse `A / B / C` data
- the worker already has async job execution, result persistence, and request deduplication via `lca_result_cache`

### 3.2 What is missing

- the `solve_all_unit` query sidecar only contains `h_matrix`, which is enough for hotspots and comparisons but not for path analysis
- `lca_query_results` is designed for synchronous slicing, not for a slower traversal-based analysis
- edge functions currently handle JSON artifacts, not `solve_one` HDF5 artifacts
- `snapshot-index-v1` only contains `process_id / process_index / process_version`, which is too thin for path-analysis display

Conclusion: contribution path analysis should not be added as a small mode inside `query-results`. It needs a dedicated analysis pipeline.

## 4. Design Principles

### 4.1 Keep path computation close to solver data

Do not make edge functions decode HDF5, and do not push sparse-matrix traversal to the browser.

Path computation should stay in `solver-worker`, which already knows how to:

- load snapshot artifacts
- read `A / B / C`
- run `solve_one`
- persist results into `lca_results`

### 4.2 Return analysis-ready results, not raw numerical internals

The frontend actually needs:

- total impact
- top contributing processes
- ranked upstream branches
- traversable nodes and relations

It does not need:

- raw full `x / g / h` vectors
- sparse matrix triplets
- HDF5 decode logic

### 4.3 In V1, keep node contributions exact and branch ranking exploratory

The hard part is not solving; it is attribution semantics.

V1 should clearly separate:

- **Exact quantities**
  - total impact for the selected root demand
  - direct characterized contribution of each process
- **Exploratory quantities**
  - branch priority
  - path ranking
  - traversal order

In other words, V1 should ship an **importance-first contribution graph**, not a full audit-grade path decomposition.

## 5. Recommended Architecture

Use a dedicated async analysis flow instead of extending `lca_query_results`.

### 5.1 High-level flow

```text
Next Analysis Page
  -> Edge: lca_contribution_path
    -> DB: lca_jobs + lca_result_cache
      -> Worker: analyze_contribution_path
        -> snapshot artifact + solve_one(x/g/h)
        -> path traversal
        -> result artifact: contribution-path:v1 (JSON)
  -> Edge: lca_contribution_path_result
    -> returns parsed JSON result
```

### 5.2 Why not `query-results + solve-one-query:v1`

That path is possible, but not recommended for V1:

- edge would end up owning too much traversal logic
- cycle handling, cutoff rules, and path ranking would accumulate in TypeScript
- the query layer would stop being a light result slicer and turn into a path-analysis engine

The better separation is:

- worker computes the analysis
- edge validates requests, resolves snapshots, deduplicates jobs, and returns results

## 6. V1 Semantics

### 6.1 Analysis target

The input is fixed to:

- `process_id`
- `impact_id`
- `amount` (default `1.0`)
- `data_scope` for snapshot resolution

### 6.2 Core outputs

V1 should return three result groups.

#### A. Summary

- total impact
- amount
- root process label
- impact label and unit
- expanded node count
- truncated node count
- coverage ratio

#### B. Process Contributions

This is the most important exact output in V1.

Each process appears once, with fields such as:

- `process_id`
- `process_index`
- `label`
- `location`
- `direct_impact`
- `share_of_total`
- `is_root`
- `depth_min`

`direct_impact` means the process' **direct characterized contribution** under the selected functional unit and impact.

#### C. Branches / Traversal

This is exploratory output for analysis and navigation.

Suggested fields:

- `rank`
- `path_process_ids`
- `path_labels`
- `path_score`
- `terminal_reason`
  - `cutoff`
  - `max_depth`
  - `max_nodes`
  - `cycle_cut`
  - `leaf`

### 6.3 What V1 does not guarantee

These semantics should be delayed:

- exact edge-level impact allocation
- exact Sankey widths
- exact split values for repeated process instances across multiple branches

This boundary should be explicit in both docs and API contracts.

## 7. Repo Changes

## 7.1 `tiangong-lca-calculator`

### A. Add a new job type

Recommended new job type:

- `analyze_contribution_path`

Suggested payload:

```json
{
  "type": "analyze_contribution_path",
  "job_id": "<uuid>",
  "snapshot_id": "<uuid>",
  "process_id": "<uuid>",
  "process_index": 123,
  "impact_id": "<uuid>",
  "impact_index": 7,
  "amount": 1.0,
  "options": {
    "max_depth": 4,
    "top_k_children": 5,
    "cutoff_share": 0.01,
    "max_nodes": 200
  }
}
```

Notes:

- `process_index` and `impact_index` should be resolved in edge before enqueue
- `process_id` and `impact_id` should still be kept for traceability

### B. Add a new artifact format

Recommended format:

- `contribution-path:v1`

This should be JSON, not HDF5, because:

- this is an analysis result, not a raw numerical matrix
- edge and frontend can consume JSON directly
- the result structure is naturally tree/graph/list oriented

### C. Worker execution steps

Recommended flow inside `analyze_contribution_path`:

1. `ensure_prepared(snapshot_id)`
2. build one-demand RHS
3. run `solve_one(return_x=true, return_g=true, return_h=true)`
4. load `A / B / C` from snapshot artifact
5. compute direct characterized intensity per process for the selected `impact_index`
6. compute exact direct contribution per process using `x`
7. run an importance-first upstream traversal from the root process
8. apply `max_depth / top_k_children / cutoff_share / max_nodes`
9. build `summary + process_contributions + branches + links`
10. persist a `contribution-path:v1` artifact into `lca_results`

### D. Extend snapshot metadata

Recommended metadata additions to `snapshot-index-v1` or to a new analysis sidecar:

- `process_name`
- `location`
- `process_type`
- `team_id`

At minimum:

- `process_name` is mandatory for path analysis
- the other fields can also serve grouped results later

Preferred approach:

- add optional fields to `process_map` while keeping old readers backward-compatible

## 7.2 `tiangong-lca-edge-functions`

### A. Add a submit endpoint

Recommended endpoint:

- `POST /lca/contribution-path`

Suggested request body:

```json
{
  "scope": "prod",
  "snapshot_id": "optional-uuid",
  "data_scope": "current_user",
  "process_id": "<uuid>",
  "impact_id": "<uuid>",
  "amount": 1.0,
  "options": {
    "max_depth": 4,
    "top_k_children": 5,
    "cutoff_share": 0.01,
    "max_nodes": 200
  }
}
```

Suggested response modes:

- `queued`
- `in_progress`
- `cache_hit`

### B. Add a result endpoint

Recommended endpoint:

- `GET /lca/contribution-path/result?result_id=<uuid>`

Responsibilities:

- verify ownership
- download the JSON artifact
- return parsed `contribution-path:v1`

The browser should not interpret object-store artifacts directly.

### C. Reuse the existing cache model

Reuse:

- `lca_jobs`
- `lca_result_cache`
- `lca_results`

The request dedupe key should include:

- `snapshot_id`
- `process_id`
- `impact_id`
- `amount`
- `max_depth`
- `top_k_children`
- `cutoff_share`
- `max_nodes`

## 7.3 `tiangong-lca-next`

### A. Page placement

Do not add a new left-nav item.

Keep the entry in the current process analysis flow:

- `mydata/processes`
- `/mydata/processes/analysis`

Path analysis can be a new tab inside the analysis page:

- `Contribution Path`

### B. V1 UI

Do not start with Sankey. Ship three blocks first:

1. parameter area
   - data scope
   - process
   - impact method
   - amount
   - max depth
   - top k children
   - cutoff
2. summary area
   - total impact
   - coverage
   - expanded nodes
   - truncated nodes
   - snapshot / result / computed_at
3. result area
   - `Top upstream contributors` table
   - `Branch ranking` table
   - `Expandable relation table` or `Collapse`

Reuse existing Ant Design components only:

- `Card`
- `Form`
- `InputNumber`
- `Descriptions`
- `Statistic`
- `Table`
- `Collapse`
- `Tag`

### C. Why Sankey should wait

V1 does not yet provide exact edge-level impact allocation.

If Sankey is forced in too early:

1. the chart will look exact while still being heuristic
2. users will ask why edge widths do not fully reconcile with total impact

So Sankey should be V2, after edge-attribution semantics are validated.

## 8. Suggested Result Shape

Suggested `contribution-path:v1` structure:

```json
{
  "version": 1,
  "format": "contribution-path:v1",
  "snapshot_id": "<uuid>",
  "job_id": "<uuid>",
  "process_id": "<uuid>",
  "impact_id": "<uuid>",
  "amount": 1.0,
  "options": {
    "max_depth": 4,
    "top_k_children": 5,
    "cutoff_share": 0.01,
    "max_nodes": 200
  },
  "summary": {
    "total_impact": 12.34,
    "unit": "kg CO2-eq",
    "coverage_ratio": 0.91,
    "expanded_node_count": 27,
    "truncated_node_count": 18,
    "computed_at": "2026-03-13T00:00:00Z"
  },
  "root": {
    "process_id": "<uuid>",
    "label": "Example process"
  },
  "impact": {
    "impact_id": "<uuid>",
    "label": "Global warming potential",
    "unit": "kg CO2-eq"
  },
  "process_contributions": [
    {
      "process_id": "<uuid>",
      "process_index": 123,
      "label": "Provider A",
      "location": "CN",
      "direct_impact": 4.56,
      "share_of_total": 0.37,
      "is_root": false,
      "depth_min": 2
    }
  ],
  "branches": [
    {
      "rank": 1,
      "path_process_ids": ["<uuid-root>", "<uuid-a>", "<uuid-b>"],
      "path_labels": ["Root", "Provider A", "Provider B"],
      "path_score": 3.21,
      "terminal_reason": "cutoff"
    }
  ],
  "links": [
    {
      "source_process_id": "<uuid-root>",
      "target_process_id": "<uuid-a>",
      "depth_from_root": 1,
      "cycle_cut": false
    }
  ],
  "meta": {
    "source": "solve_one_path_analysis",
    "snapshot_index_version": 1
  }
}
```

## 9. Traversal Recommendation

### 9.1 Exact part

V1 should only guarantee exactness up to process direct contributions:

1. use `solve_one` to get `x` for the selected root demand
2. take the selected impact row from `C`
3. combine it with `B` to get direct characterized intensity per process
4. multiply by `x` to get exact direct contribution per process

This value reconciles with the total impact and is the stable truth source for V1.

### 9.2 Traversal part

Use an importance-first upstream traversal:

1. start from the root process
2. find providers from the technosphere adjacency
3. rank children using a heuristic score
4. expand only `top_k_children`
5. stop on `cutoff / max_depth / max_nodes / cycle`

Recommended child score:

- use `abs(direct_contribution_of_child)` first
- add branch-specific activity weighting later if needed

### 9.3 Cycle handling

When a process already appears in the current ancestor chain:

- record a `cycle_cut` link
- stop expanding that branch
- do not attempt cycle reallocation in V1

## 10. Main Risks

### 10.1 Semantics risk

If V1 promises exact full path decomposition too early, it will quickly run into:

- repeated shared-upstream counting issues
- cycle splitting questions
- Sankey reconciliation problems

So V1 must clearly state:

- exact values live in `process_contributions`
- `branches` are for exploration and ranking

### 10.2 Metadata risk

If snapshot metadata still only exposes UUIDs, the UI will be difficult to use.

So before path analysis, at least:

- `process_name`
- `location`

should be added to snapshot metadata.

### 10.3 Performance risk

Path analysis is an on-demand heavy query, not a millisecond slice lookup.

Therefore V1 must:

- use async jobs
- deduplicate identical requests
- cache ready results

## 11. Recommended Delivery Order

### M1. Backend foundation

- `calculator`
  - add `analyze_contribution_path`
  - add `contribution-path:v1`
  - extend snapshot metadata
- `edge-functions`
  - add `lca_contribution_path`
  - add `lca_contribution_path_result`

### M2. Frontend V1

- add `Contribution Path` tab
- parameter form
- summary cards
- upstream contributors table
- branch ranking table

### M3. V2 enhancements

- stronger branch scoring
- graph visualization
- Sankey

## 12. One-line Conclusion

This feature is feasible and is a reasonable next step; the real difficulty is not the solver itself, but the path semantics and deciding which layer should own path computation.

The safest design is:

- **worker computes**
- **edge queues and returns**
- **frontend starts with table-oriented path analysis, not Sankey**
