---
title: next Lifecycle Model Calculation Reference
docType: reference
scope: repo
status: active
authoritative: false
owner: next
language: en
whenToUse:
  - when changing `src/services/lifeCycleModels/util_calculate.ts`
  - when changing `src/services/lifeCycleModels/util_allocate_supply_demand.ts`
  - when debugging submodel generation, allocation, scaling, or LCIA output
whenToUpdate:
  - when the frontend-side calculation pipeline changes
  - when helper responsibilities move between modules
  - when generation or allocation rules become inaccurate
checkPaths:
  - docs/agents/util_calculate.md
  - src/services/lifeCycleModels/**
  - src/services/lca/**
  - src/components/LcaTaskCenter/**
  - src/pages/Processes/Analysis/**
lastReviewedAt: 2026-04-28
lastReviewedCommit: 232b36c46bfc7b0d6095af577334ad6efb4e6e61
---

# Lifecycle Model Calculation Reference

> Purpose: exact reference for `genLifeCycleModelProcesses` and the helper pipeline that generates or updates life-cycle-model submodels.

## Use When

- changing `src/services/lifeCycleModels/util_calculate.ts`
- changing `src/services/lifeCycleModels/util_allocate_supply_demand.ts`
- debugging submodel generation, allocation, scaling, or LCIA output

## Do Not Use For

- repo-wide workflow rules
- branch or validation policy
- solver internals outside the frontend-side calculation pipeline
- dataset-validation adapter changes that only affect save-time normalization, editor navigation, or review messaging

## Source Of Truth

- main pipeline: `src/services/lifeCycleModels/util_calculate.ts`
- allocation helper: `src/services/lifeCycleModels/util_allocate_supply_demand.ts`
- LCIA helper: `src/services/lciaMethods/util.ts`
- ordered-dataset shaping adjacent to calculation and review flows: `src/services/lifeCycleModels/persistencePlan.ts`

## Entry Function

| Field | Value |
| --- | --- |
| function | `genLifeCycleModelProcesses(id, modelNodes, lifeCycleModelJsonOrdered, oldSubmodels)` |
| primary output | `{ lifeCycleModelProcesses: any[] }` |
| side effects | updates `lifeCycleModelJsonOrdered.lifeCycleModelDataSet.lifeCycleModelInformation.technology.processes.processInstance[*].@multiplicationFactor` |

## Inputs And Outputs

| Input | Meaning |
| --- | --- |
| `id` | current life-cycle-model ID |
| `modelNodes` | canvas or model nodes, including quantitative-reference and target metadata |
| `lifeCycleModelJsonOrdered` | ordered LCA model JSON with `processInstance` data |
| `oldSubmodels` | previously generated submodels used for update or reuse decisions |

| Output                    | Meaning                                                      |
| ------------------------- | ------------------------------------------------------------ |
| `lifeCycleModelProcesses` | generated or updated submodel array with empty items removed |

## Pipeline Summary

| Step | Helper or logic | Result |
| --- | --- | --- |
| 1 | read reference process and target amount | `refProcessNodeId`, `modelTargetAmount` |
| 2 | build model-process maps | `mdProcesses`, `mdProcessMap` |
| 3 | query and normalize database processes | `dbProcessMap` |
| 4 | compute reference scaling | `refScalingFactor` |
| 5 | build graph and mark dependence | `up2DownEdges`, edge indices, `dependence` |
| 6 | propagate scaling | `processScalingFactors` |
| 7 | aggregate by node | `sumAmountNodeMap` |
| 8 | allocate supply to demand | `mainAllocateResult`, `secondaryAllocateResult` |
| 9 | write back remaining amounts and edge state | `remainingRate`, `exchangeAmount`, `isBalanced`, `unbalancedAmount` |
| 10 | build child processes | allocated and non-allocated child-process list |
| 11 | collect final-product groups | grouped candidate chains |
| 12 | scale and aggregate group exchanges | `resultExchanges`, grouped exchange list |
| 13 | compute LCIA | `LCIAResults` |
| 14 | create or update submodels | final submodel records |

## Core Data Contracts

| Structure | Required meaning |
| --- | --- |
| reference process | comes from `lifeCycleModelInformation.quantitativeReference.referenceToReferenceProcess` |
| reference exchange | database exchange that matches the quantitative reference and defines reference flow ID plus direction |
| `Up2DownEdge` | upstream/downstream relation plus `flowUUID`, `dependence`, `mainDependence`, and allocation write-back fields |
| `DbProcessMapValue` | normalized database process entry with `exchanges`, `refExchangeMap`, and `exIndex` |
| `sumAmountNode` | per-node aggregate with scaling factor and `main`, `secondary`, `none`, and remaining exchange buckets |
| allocation result | `{ allocations, remaining_supply, remaining_demand, total_delivered }` |
| child process | split view of one node's aggregated exchanges, including allocated-output metadata |

## Main Rules

- `dependence ∈ { upstream, downstream, none }`
- primary allocation channel uses edges marked `upstream` or `downstream`
- secondary allocation channel uses edges marked `none`
- `getFinalProductGroup` may use `mainDependence` when `dependence === 'none'`
- primary-group reference exchange is aligned to `modelTargetAmount`
- root `refScalingFactor` falls back to `1` when the model target amount or reference mean amount is zero or missing
- old submodels are reused only when `nodeId`, `processId`, `allocatedExchangeFlowId`, and `allocatedExchangeDirection` all match
- persistence-plan helpers that prepare ordered datasets for validation or review must stay schema-compatible with these calculation-facing structures even when they do not execute allocation logic

## Helper Contract Table

| Helper | Owns | Key rule |
| --- | --- | --- |
| `buildEdgesAndIndices` | build `Up2DownEdge[]` and input or output indices | choose main output/input flow from reference flow first, then highest allocated flow |
| `assignEdgeDependence` | mark `dependence` across the graph | alternate expansion direction and demote non-main same-direction edges to `none` with `mainDependence` recorded |
| `calculateScalingFactor` | traverse and propagate scaling by shared `flowUUID` | input edges expect `downstream`; output edges expect `upstream` |
| `nextScaling` | compute edge amount and next scaling factor | returns zero values when `baseAmount`, `targetAmount`, or `curSF` makes the calculation invalid |
| `mergeExchangesById` | merge exchange arrays by `@dataSetInternalID` | sum `meanAmount` and `resultingAmount` without mutating inputs |
| `sumAmountByNodeId` | aggregate node-level scaling and exchanges | skip zero-scaling or missing-node records |
| `allocateSupplyToDemand` | same-flow supply/demand matching | max-flow over allowed edges with absolute plus relative tolerance and optional `prioritizeBalance` |
| `allocatedProcess` | split a node into allocated-output and remaining-output child processes | fallback to the reference output when no allocated output exists |
| `getFinalProductGroup` | recursively collect one subproduct chain | skip cycle edges and use `mainDependence` when required |
| `calculateProcess` | scale group exchanges | do not apply extra group-share scaling to the allocated reference exchange |
| `sumProcessExchange` | aggregate grouped exchanges | aggregate by `direction × flowId` and mark the quantitative reference |
| `normalizeRatio` | safe ratio calculation | snap near-0 and near-1 values to reduce floating noise |
| `LCIAResultCalculation` | compute final LCIA rows | load cached factors first, fetch and cache if missing |

## Numerical And Edge Rules

- missing `referenceToReferenceProcess`: throw immediately
- missing reference process in database: throw immediately
- zero or missing `baseAmount` in `nextScaling`: return `{ exchangeAmount: 0, nextScalingFactor: 0 }`
- denominator near zero in `normalizeRatio`: return `0`
- tolerance uses `max(tolerance, relTolerance * scale)` where `scale = max(totalSupply, totalDemand)`
- if tolerance is too large, valid small flows can collapse to zero allocation
- use `relTolerance` to preserve legitimate low-magnitude flows
- when `remainingRate` for the primary reference exchange is in `(0, 1)`, non-reference exchanges and LCIA rows are rescaled by `1 / remainingRate` after the reference exchange is pinned to `modelTargetAmount`

## LCIA Helper Rules

- read from IndexedDB-backed cache first
- fetch and decompress missing `.json.gz` files on demand
- key factor lookup by `${flowId}:${direction}`
- aggregate by LCIA method key
- keep raw exchange aggregation logic outside the LCIA helper
- browser runtime depends on the IndexedDB-backed resource cache and gzip decode support via `DecompressionStream`

## Update When

Update this document when any of these changes:

- helper ownership changes
- `dependence` semantics change
- allocation tolerance or priority behavior changes
- child-process grouping rules change
- primary-group reference-alignment rules change
- LCIA load or cache behavior changes
