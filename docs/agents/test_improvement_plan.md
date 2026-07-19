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
  - playwright.config.ts
  - .github/workflows/i18n-semantic-e2e.yml
  - package.json
lastReviewedAt: 2026-07-20
lastReviewedCommit: 91973faef33baa3534490e47688f7a538dd41861
lastReviewedNote: 'Reviewed for Issue #635: retained bounded browser coverage while restricting authenticated production-data proof to an authorized local operator session.'
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
- localization quality should combine deterministic topology, context, terminology-token, route-view, fallback, correction, and activation gates with a separately produced semantic/route/E2E proof; the deterministic structural artifact must not present itself as independent semantic review, and delivery does not create a human translation-approval state
- the localization semantic E2E layer is deliberately bounded: 49 stable route/view assertion IDs, a Chromium full matrix, three-browser critical scenarios, registry-derived locale/content-language loops, and digest-bound evidence that invalidates itself when a locale or covered input changes
- production-backed E2E uses a local candidate frontend and an explicitly authorized local operator trust boundary; every semantic E2E GitHub Actions event stays credential-free/read-only, while the local run uses authenticated mode plus the two explicit production-write guards (and a separate verified-evidence opt-in), writes intent before create, verifies UUID/owner/five-field registry markers before delete, and ends with `created=cleaned`, `leaked=0`
- same-document locale behavior is a first-class browser risk: Header Umi `SelectLang` stays `reload={false}`, and proof covers retained document identity plus stale-reference-response race rejection
- clean-runner localization tests should prove that active locale and full-gate commands pass with private confirmation files absent; generated private fixtures remain limited to historical German compatibility-checker tests
- proof should be risk-proportional and scoped-first: micro-edits use focused checks, coherent batches use subsystem audits, and the repository full gate runs once for the final committed controlled checkpoint
- gate ownership should prevent duplicate work: a normal delivery uses the push hook as the single full-gate owner, while a no-push handoff may run it manually instead
- each production release workflow should also have one full-suite owner: `prepush:gate`, which executes the complete test inventory once with at most one coverage worker active at a time, recycles that worker at the documented memory boundary, and retains unchanged 100% `src/**` coverage without a preceding duplicate `test:ci` or coverage run

## Operating Principles

- every touched behavior ships with matching proof
- current-state queue data belongs in `test_todo_list.md`
- make strategy changes explicit
- keep focused Umi-generating tests, coverage, and full gates serial; shared generated state makes parallel execution invalid evidence
- keep data workflow fixture relationships explicit so expected-result Markdown remains reviewable instead of becoming an opaque snapshot set
- keep browser evidence credential-free and non-visual: screenshots, traces, videos, and persisted auth artifacts are disabled; only non-secret assertion results and digests may become tracked proof
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
