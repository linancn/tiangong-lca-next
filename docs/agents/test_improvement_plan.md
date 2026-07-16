---
title: next Testing Strategy
docType: design
scope: repo
status: active
authoritative: false
owner: next
language: en
whenToUse:
  - when deciding whether this repo needs new testing strategy work
  - when evaluating long-term testing direction beyond the current queue state
  - when strategy assumptions for repo tests change
whenToUpdate:
  - when the long-term testing strategy changes
  - when reopen conditions for strategy work change
  - when this strategy no longer matches the maintained testing model
checkPaths:
  - docs/agents/test_improvement_plan.md
  - docs/agents/test_todo_list.md
  - docs/agents/repo-validation.md
  - tests/**
  - package.json
lastReviewedAt: 2026-07-16
lastReviewedCommit: bb7c8da76e2bd0581f7f32e1bc00c4a166fa4581
lastReviewedNote: 'Added risk-proportional scoped-first proof and one final-checkpoint full gate without reopening gate-infrastructure strategy.'
---

# Testing Strategy

> Long-term testing strategy. Use `docs/agents/test_todo_list.md` for current operational state.

## Strategic State

- current strategy is maintenance, not expansion for its own sake
- full closure already exists; the job is to preserve it while the codebase changes
- add integration-test expansion only when it reduces real product risk
- validation-heavy surfaces such as process-editor SDK guidance, multilingual field checks, and review jump targets should prefer behavior-level tests over snapshot growth
- shared validation adapters and helper modules should stay unit-heavy; do not expand wrapper-only branch testing unless the user-visible contract actually changes
- data workflow smoke coverage should grow through paired data/result fixtures and workflow-lib unit proof only when the workflow phase or backend-facing assertion changes
- localization quality should combine deterministic topology/context/hash gates with local human language/domain confirmation; Jest validates form integrity and privacy boundaries but never claims that an automated audit proves fluency
- proof should be risk-proportional and scoped-first: micro-edits use focused checks, coherent batches use subsystem audits, and the repository full gate runs once for the final committed controlled checkpoint
- gate ownership should prevent duplicate work: a normal delivery uses the push hook as the single full-gate owner, while a no-push handoff may run it manually instead

## Operating Principles

- every touched behavior ships with matching proof
- current-state queue data belongs in `test_todo_list.md`
- make strategy changes explicit
- keep focused Umi-generating tests, coverage, and full gates serial; shared generated state makes parallel execution invalid evidence
- keep data workflow fixture relationships explicit so expected-result Markdown remains reviewable instead of becoming an opaque snapshot set
- dead branches should be removed instead of defended by artificial tests

## Integration Testing North Star

Add integration tests when they protect one of these:

- route-level user workflows
- auth and permission boundaries
- service wiring across providers or pages
- regression-prone shared UI behavior

## Reopen Strategy Work Only When

- current tests stop protecting important workflows
- repeated incidents show a missing integration boundary
- the validation system changes enough that the current model becomes misleading

## Done Definition

The strategy is working when:

- full closure remains intact
- test additions track real product risk
- current-state docs stay small because the queue stays closed
