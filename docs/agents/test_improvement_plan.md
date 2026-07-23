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
  - scripts/e2e/**
  - docker/e2e/**
  - .github/workflows/i18n-semantic-e2e.yml
  - package.json
lastReviewedAt: 2026-07-23
lastReviewedCommit: 8d4f4a489484c56068ba54936209127568cf992b
lastReviewedNote: 'Reviewed for Issue #676 after the v0.0.58 production-readiness failure; runtime dependency proof now excludes only root release-version metadata.'
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
- the localization semantic E2E layer is deliberately bounded: 49 stable route/view assertion IDs, a Chromium full matrix, three-browser critical scenarios, registry-derived locale/content-language loops, and digest-bound evidence that invalidates itself when a locale, covered input, or executable dependency lock changes; root application release-version metadata is excluded only after the evidence's raw lock is proven at its recorded commit
- production-backed E2E uses a local candidate frontend and an explicitly authorized local operator trust boundary; GitHub Actions runs the credential-free/read-only browser matrix only on demand and for the exact release SHA, while host `CI`/`GITHUB_ACTIONS` rejects production-data mode before Docker. After that local check passes, the controller clears only image-inherited CI markers and still requires authenticated mode plus the two explicit production-write guards (and a separate verified-evidence opt-in), writes intent before create, verifies UUID/owner/five-field registry markers before delete, and ends with `created=cleaned`, `leaked=0`
- local release proof now treats environment setup as productized test infrastructure: a pinned-image installer, read-only doctor, archived clean candidate, one cached production build, ordered pre-fixture checks, phase-coded diagnostics, and exact one-hour continuation remove repeated environment exploration without weakening browser or cleanup evidence
- browser/UI race repair remains a focused loop (`e2e:dev` with one project/spec/grep plus explicit readiness states); only after focused repeat stability should an operator spend the complete release matrix, and no blanket retry or fixed sleep may substitute for first-attempt release proof
- same-document locale behavior is a first-class browser risk: Header Umi `SelectLang` stays `reload={false}`, and proof covers retained document identity plus stale-reference-response race rejection
- clean-runner localization tests should prove that active locale and full-gate commands pass with private confirmation files absent; generated private fixtures remain limited to historical German compatibility-checker tests
- proof should be risk-proportional and scoped-first: micro-edits use focused checks, coherent batches use subsystem audits, and the repository full gate runs once for the final committed controlled checkpoint
- gate ownership should prevent duplicate work: a normal delivery uses the push hook as the single full-gate owner, while a no-push handoff may run it manually instead
- each production release workflow should also have one full-suite owner: `prepush:gate`, which executes the complete test inventory once with at most one coverage worker active at a time, while the reusable browser semantic E2E matrix runs in parallel as a separate exact-release-SHA prerequisite without duplicating Jest coverage

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
