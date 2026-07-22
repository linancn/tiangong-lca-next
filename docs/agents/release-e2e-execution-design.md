---
title: next Release Semantic E2E Execution Design
docType: design
scope: repo
status: proposed
authoritative: false
owner: next
language: en
whenToUse:
  - when implementing Issue #654 release E2E environment, preflight, runner, diagnostics, or resume work
  - when deciding whether a release E2E failure may reuse prior phase evidence
  - when changing the local authenticated proof boundary or exact-candidate execution model
whenToUpdate:
  - when Issue #654 implementation decisions change
  - when a planned command becomes runtime truth or is replaced
  - when release E2E trust, identity, cleanup, or resume boundaries change
checkPaths:
  - docs/agents/release-e2e-execution-design.md
  - docs/agents/test_improvement_plan.md
  - DEV.md
  - docs/agents/repo-validation.md
  - docs/agents/testing-troubleshooting.md
  - package.json
  - playwright.config.ts
  - docker/e2e/**
  - scripts/e2e/**
  - tests/e2e/i18n/**
  - tests/unit/e2e/**
  - .github/workflows/i18n-semantic-e2e.yml
  - .github/workflows/build.yml
  - docs/plans/i18n/semantic-e2e-evidence.schema.json
  - docs/plans/i18n/semantic-e2e-evidence.json
lastReviewedAt: 2026-07-22
lastReviewedCommit: 8d7d9ee4ed25b3f5226116d5e63244ba324bfdc9
lastReviewedNote: 'Created for Issue #654 after the v0.0.54 release preparation exposed avoidable environment discovery, full-suite reruns, and browser/UI timing diagnosis.'
related:
  - ./test_improvement_plan.md
  - ./repo-validation.md
  - ./testing-troubleshooting.md
  - ../../DEV.md
---

# Release Semantic E2E Execution Design

> Status: proposed design for [Issue #654](https://github.com/linancn/tiangong-lca-next/issues/654). The commands and files below are not runtime truth until their implementation PRs merge. `DEV.md` remains authoritative for commands that currently exist.

## Decision Summary

Release semantic E2E will become one repository-owned, deterministic workflow instead of an operator-assembled environment:

1. provide idempotent environment install, read-only doctor/preflight, release run, bounded resume, and cleanup commands
2. run in a digest-pinned Playwright container whose only host prerequisites are Git and Docker
3. certify an exact committed Next archive; never mount `lca-workspace`, its `.git`, or unrelated submodules
4. build the production frontend once and serve that static candidate instead of using the Umi development server and MFSU
5. complete every environment, browser, candidate, authentication, capability, and ledger preflight before production fixture creation
6. keep the UI login identity role-neutral; business-role behavior remains owned by individual scenarios
7. preserve original failures in sanitized structured diagnostics with an exact next command
8. use explicit application readiness states and focused repeat stability before the final full run
9. reuse a passed phase only when candidate, environment, E2E contract, and cleanup identities are unchanged
10. retain the #647 trust boundary: GitHub Actions stays credential-free/read-only, while authenticated production-backed closure stays in an explicitly authorized local operator session

## Problem

The v0.0.54 release preparation demonstrated that the final browser proof itself was not the dominant cost. The avoidable cost came from discovering and repairing its execution environment while trying to certify a release.

| Observed failure class | Example | Why it was expensive |
| --- | --- | --- |
| environment discovery | occupied port, mismatched Playwright image, unwritable cache/HOME, Umi/MFSU paths | failures appeared only after an attempted full run |
| workspace coupling | the Next submodule `.git` pointer required the parent workspace Git metadata inside the improvised container | the operator explored mount layouts unrelated to browser behavior |
| hidden cause | candidate readiness replaced the original exception with one generic message | diagnosis required repeated probes instead of one actionable report |
| all-or-nothing execution | a late Firefox or Chromium failure invalidated the practical usefulness of earlier work | the operator restarted broad scopes to regain confidence |
| UI timing | Firefox navigation and Process drawer locale switching depended on implicit timing | a full browser run became the feedback loop for a focused race |
| duplicated ownership | local authenticated proof, public browser CI, tracked evidence, and the full Jest gate were not presented as one release state machine | the operator had to infer which proof was reusable and which must be repeated |

The target is not to weaken release proof. The target is to make every required cost intentional and every avoidable failure early, classified, and recoverable.

## Goals And Time Budgets

| Outcome | Reference-machine target |
| --- | --- |
| warm environment doctor/preflight | at most 2 minutes before any production write |
| cold environment install after image availability | at most 15 minutes, excluding external registry download speed |
| focused browser diagnosis | at most 5 minutes for one exact browser/spec scope |
| clean authenticated release closure | at most 45 minutes |
| operator work for a normal release | at most 10 minutes; the runner owns the waiting and cleanup |
| failure classification | the first failed phase emits its cause and next command without manual environment exploration |

Time budgets are observability targets, not reasons to skip required proof. The runner records actual phase durations so regressions can be measured.

## Non-Goals

- reducing the 49 stable assertion IDs or the required release browsers
- accepting retry-only passes as verified release evidence
- editing tracked evidence to simulate execution
- moving production credentials, auth state, or writes into GitHub Actions
- requiring `data_product_manager` or any other single business role for the complete suite
- mounting the parent workspace for convenience
- broadening production cleanup beyond the exact owned fixture
- changing product behavior only to conceal an unstable assertion

## Trust Boundaries

### Credential-Free CI Boundary

The reusable GitHub Actions browser matrix remains:

- credential-free
- read-only against production backend boundaries
- callable manually and by the exact-release workflow
- unable to create production fixtures or write verified authenticated evidence

### Authorized Local Operator Boundary

The full authenticated closure remains local-only and requires explicit authorization, runtime credentials, the production target assertion, both production-write guards, a protected recovery ledger, and verified-evidence opt-in.

The new runner automates that boundary; it does not relax it.

### Identity And Role Boundary

The browser login identity and fixture lifecycle authority are separate concepts:

- the UI login identity defaults to the ordinary `user` scenario
- role-specific UI tests declare and prove their own role boundary
- the fixture operator is checked only for the exact `codex-e2e` create/read/delete capability required by the run
- a synthetic role read may exercise deterministic UI state, but it must not claim that the supplied production account owns that role

Implementation should prefer separate UI-user and fixture-operator credentials when the backend exposes a narrowly scoped fixture endpoint. Until then, a shared credential may be used only if the capability check remains exact and role-neutral.

### Secret Boundary

Credentials must never enter:

- the container image or build context
- the candidate archive or manifest
- npm/Docker cache keys
- command-line output, structured reports, evidence, screenshots, traces, or video
- Git, GitHub artifacts, or the release package

Secrets enter at runtime through a protected read-only file or existing approved local environment and are redacted before diagnostics are persisted.

## Execution Architecture

```text
host controller
  -> freeze exact Next commit and tree
  -> export candidate archive and manifest
  -> ensure pinned E2E container
  -> run read-only doctor/preflight
  -> build production candidate once
  -> start deterministic static candidate server
  -> create exact guarded fixture only after preflight passes
  -> run focused or full Playwright scope
  -> clean and independently verify the fixture
  -> aggregate evidence and write a bounded continuation result
```

The host controller owns Git. The container owns dependencies, browsers, build, server, Playwright, and runtime artifacts.

## Environment Installation Contract

### Planned Command Surface

| Command | Planned behavior |
| --- | --- |
| `npm run e2e:env:install` | build or pull the pinned image, create project-scoped caches, install the exact lockfile tree, and write an environment manifest |
| `npm run e2e:env:doctor` | perform read-only environment and candidate-independent checks; never pull, build, authenticate, or write production data |
| `npm run e2e:release` | idempotently ensure the environment, freeze the committed candidate, preflight, run, clean, and aggregate evidence |
| `npm run e2e:release:resume` | continue only the exact failed/retryable phase bound by the saved receipt; reject arguments or identity drift |
| `npm run e2e:env:clean` | remove only project-owned containers, temporary workspaces, runtime artifacts, and opt-in caches |
| `npm run e2e:dev` | mount only the Next worktree for focused development proof; never emit release evidence |

The release command may perform the documented idempotent environment installation by default. An `--offline` mode must fail with the exact missing image/cache and the install command instead of reaching the network.

### Pinned Environment

The environment contract fixes:

- Node major and exact package-lock dependency tree
- Playwright npm version
- Playwright browser image digest and base OS
- browser executable revisions
- container user, HOME, XDG, npm cache, and runtime paths
- static candidate server implementation

The image must be addressed by digest. A floating image tag may be shown for humans but cannot be the verified identity.

### Host Prerequisites

Only Git and a running Docker engine are host prerequisites. The installer must not modify global Node, Python, Playwright, browser, package-manager, or operating-system dependencies.

If Git or Docker is absent, the command stops with one supported installation pointer. It does not attempt privileged host installation.

## Candidate Isolation And Mount Contract

Release proof must not mount the complete workspace.

### Candidate Preparation

1. require one explicit committed Next candidate
2. reject a dirty candidate unless the operator is running non-release `e2e:dev`
3. resolve commit SHA, tree SHA, package version, and lockfile hash on the host
4. export the exact commit with `git archive`
5. hash the archive before container execution
6. extract it into a new container-owned writable directory

The container does not need `.git` and does not run Git to infer candidate identity.

### Allowed Runtime Inputs

| Input | Access |
| --- | --- |
| exact Next candidate archive | read-only input, extracted into isolated writable runtime storage |
| candidate manifest | read-only |
| runtime secret file | read-only and excluded from artifacts |
| project-scoped npm/image cache | named volume, never evidence |
| evidence/diagnostic output directory | explicit writable output |
| temporary build, browser, and ledger directories | invocation-scoped writable storage |

Forbidden mounts include:

- `lca-workspace`
- root `.git`
- `.git/modules/tiangong-lca-next`
- unrelated submodules
- host `node_modules`, Umi/MFSU output, browser profile, or shared test runtime directories

## Production Candidate Contract

Release E2E tests the production bundle, not the Umi development server:

1. run the canonical production build once inside the pinned environment
2. serve the immutable output from a small deterministic static server
3. expose a non-secret readiness response containing candidate tree, package version, and bundle digest
4. make Playwright assert that identity before any test or fixture setup
5. stop the server and retain only bounded diagnostics at teardown

This removes MFSU and hot-reload state from release evidence and makes the browser target match the artifact class that will ship.

## Preflight Contract

Preflight is read-only until every prerequisite below passes.

| Order | Check group | Required proof |
| --- | --- | --- |
| 1 | host | Git candidate resolution and Docker availability |
| 2 | environment | image digest, Node, npm tree, Playwright package, and three browser revisions match the environment contract |
| 3 | storage | isolated HOME/XDG/cache/build/runtime/output paths are writable and not shared with another invocation |
| 4 | candidate | archive, commit, tree, version, lockfile, config, and bundle identities agree |
| 5 | browser startup | each required browser launches and exits in the pinned environment |
| 6 | frontend readiness | the candidate server returns the expected identity and renders the login control through the production bundle |
| 7 | backend target | every request target remains inside the audited production-backend contract |
| 8 | authentication | the configured UI test identity can authenticate; no business role is required globally |
| 9 | fixture capability | the operator can perform only the exact guarded fixture lifecycle needed by the run, preferably through a read-only capability probe |
| 10 | ledger | no unresolved primary/recovery ledger exists and a new protected recovery path can be created |
| 11 | discovery | Playwright discovers the expected project/assertion inventory with no focused or missing tests |

Production fixture intent is written only after all checks pass. If a capability can only be proven by mutation, that proof belongs to the guarded create phase rather than preflight and must retain current intent-ledger behavior.

## Failure Classification And Diagnostics

The runner emits one bounded human summary and one JSON report. JSON stdout remains parseable; progress and logs go to stderr, while large diagnostics go to the reported output path.

Every failure records:

- stable failure code
- phase and check ID
- candidate/environment/run identities
- original exception type and sanitized message
- retryability classification
- cleanup state
- evidence completeness
- exact next command
- output artifact path

It must not replace an original error with only a generic readiness message. Wrapping is allowed only when the original error remains available as `cause` and in the sanitized diagnostic chain.

Suggested coarse exit classes:

| Exit class | Meaning                                                      |
| ---------- | ------------------------------------------------------------ |
| `2`        | invalid or ambiguous command input                           |
| `10`       | environment/install/doctor failure                           |
| `20`       | candidate identity/build/server failure                      |
| `30`       | authentication, target, capability, or ledger safety refusal |
| `40`       | browser launch, navigation, assertion, or test failure       |
| `50`       | cleanup, aggregation, evidence, or receipt failure           |

Individual failure codes remain strings inside the report so the shell exit contract stays small.

### CLI Design Notes

- command surface: one underlying Node CLI with npm aliases; no ad-hoc shell recipe is canonical
- output contract: concise result first, completeness second, next command last; `--format json` and `--output <path>` are required
- completeness: report every planned phase as `passed`, `failed`, `skipped`, or `reused`
- ambiguity: never guess a candidate, ledger, browser project, or prior run
- error behavior: non-zero exit on any incomplete requested action
- next action: emit at most one safe default command and one inspection command
- validation: test help, JSON-only stdout, redaction, output-file behavior, exit mapping, and next-action accuracy

## Representation Decisions

### Candidate Manifest

- product role: immutable identity boundary between host Git state and container execution
- consumers: installer, runner, candidate server, reporter, evidence verifier
- truth status: contracted release input
- freedom level: F3 contracted schema object
- representation: versioned JSON with candidate commit/tree/version/archive/lockfile digests and environment/config identity
- mutation: immutable after creation
- promotion: only schema-versioned additive evolution with compatibility tests
- validation: recompute every digest before build and before evidence aggregation

### Preflight Report

- product role: human/Agent diagnosis and workflow projection
- consumers: operator, Codex, CI-readable tooling
- truth status: result of one invocation, not authorization truth
- freedom level: F2 semi-structured projection
- representation: stable envelope plus extensible ordered checks containing ID, status, summary, sanitized details, and next action
- mutation: rewritten only within the active invocation; final report becomes immutable
- promotion: elevate a field to the stable envelope only after repeated consumers require it
- validation: schema, redaction, phase completeness, and JSON stdout tests

### Release Continuation Receipt

- product role: controls whether prior proof may authorize a narrower continuation
- consumers: release runner and evidence aggregator
- truth status: audited safety input
- freedom level: F4 audited platform truth
- representation: protected, expiring, versioned receipt binding candidate, environment, config, test/evidence source, browser phase, fixture, and cleanup digests
- mutation: adjacent state transitions only; no hand editing or argument override
- promotion: none without an explicit migration and backward-refusal test
- validation: exact identity recomputation, expiry, transition graph, cleanup proof, and refusal tests

## Resume And Evidence Rules

Resume is an optimization, never a weakening of evidence.

### Reusable Results

A passed phase may be reused only when all of these remain exact:

- candidate tree and archive digest
- package version and lockfile digest
- pinned environment/image/browser revisions
- Playwright config and relevant E2E source digest
- backend target identity and route/assertion contract
- phase input and browser project
- fixture ownership and successful cleanup proof for that phase

### Mandatory Invalidation

Reject reuse after any:

- application, E2E helper/spec, config, environment, or evidence schema change
- candidate commit/tree/archive mismatch
- changed browser revision or backend target contract
- expired, malformed, copied, manually edited, or ambiguous receipt
- incomplete cleanup, unresolved ledger, leaked fixture, or missing recovery copy
- retry-only test pass where first-attempt success is required for verified evidence

### Recovery Classes

| Failure | Allowed next action |
| --- | --- |
| install/preflight before fixture intent | repair or install, then rerun preflight |
| infrastructure failure with no candidate/input drift and completed cleanup | resume the exact failed phase |
| one browser phase fails from a classified infrastructure condition | rerun that exact project only when prior phase receipts and cleanup remain valid |
| assertion or product behavior failure | run focused diagnosis; final evidence requires a new verified phase after the fix |
| source/config/test change | invalidate affected phase results and recompute their identity |
| cleanup or ledger uncertainty | stop; reconcile the exact fixture before any new create or resume |

The first implementation may support only pre-fixture and transport-level resume. Browser-phase reuse should ship later, after the receipt and cleanup model has independent safety tests.

## UI Race Prevention Contract

Release proof must wait for product states, not elapsed time.

### Required Patterns

- expose stable mounted/loading/ready state for asynchronous drawers and route surfaces
- wait for exact prerequisite requests and the rendered state they enable
- switch locale only after the initial localized surface reaches ready
- reject late responses from an older locale/request epoch in product code and focused tests
- centralize exact-URL navigation handling and retry only a classified transient browser error
- keep release evidence first-attempt-only even when a separate diagnostic retry is executed

### Prohibited Patterns

- fixed sleeps as readiness proof
- broad timeout increases as the first response to a race
- generic navigation retries for all errors
- querying final content before proving the owning surface mounted
- using a synthetic role response as proof of the production account's actual role
- running the complete release closure as the first feedback loop after changing one race-prone helper

### Focused Stability Loop

Before the final release run, any changed race-prone path must pass:

1. its unit/contract test
2. the exact failed browser/spec scenario
3. three to five consecutive focused executions on the affected browser
4. neighboring critical-browser scope when a shared navigation/readiness helper changed

Only then should the operator start one final complete authenticated closure.

## CI And Release Workflow

The two proof lanes remain separate and converge through identity verification:

| Lane | Environment | Credentials/writes | Release role |
| --- | --- | --- | --- |
| public semantic matrix | GitHub Actions, three browsers | none; read-only | mandatory exact-release candidate proof |
| authenticated closure | approved local pinned environment | runtime-only credentials; one guarded fixture | refreshes verified authenticated evidence |

Routine PR/dev pushes continue to avoid the heavy browser matrix under #647. A promotion or release verifier may check that authenticated evidence is current for the declared candidate inputs, but it must not receive the credentials or perform production writes.

After the local runner is stable, evaluate moving the credential-free matrix earlier to the `dev -> main` promotion PR and reusing its attestation on `main`. That follow-up must prove tree/merge identity equivalence before replacing the current exact-main-SHA release prerequisite.

## Planned Repository Shape

```text
docker/e2e/
  Dockerfile
  compose.yml
  environment.json
  entrypoint.sh

scripts/e2e/
  cli.mjs
  candidate.mjs
  environment.mjs
  preflight.mjs
  runner.mjs
  diagnostics.mjs
  receipt.mjs
  static-server.mjs

tests/unit/e2e/
  environment*.test.ts
  preflight*.test.ts
  diagnostics*.test.ts
  receipt*.test.ts
```

Exact file boundaries may be consolidated during implementation; the public command and trust contracts above should remain stable.

## Delivery Phases

### Phase 1: Environment And Doctor

- add the digest-pinned environment definition
- implement idempotent install, doctor, and clean commands
- add manifest, help, JSON output, redaction, and failure-code tests
- do not change current evidence or production-write behavior

### Phase 2: Exact Candidate And Production Server

- export an exact committed Next archive on the host
- remove container-side Git and parent-workspace mounts
- build once and serve the production bundle
- verify candidate identity from browser readiness

### Phase 3: Preflight And One-Command Run

- add ordered read-only preflight
- separate authentication from role and fixture capability
- integrate current ledger/create/cleanup contracts without weakening them
- make `e2e:release` the canonical local operator entrypoint

### Phase 4: Diagnostics And Race Hardening

- preserve original causes and emit bounded reports
- add explicit ready states to Process drawer and other affected surfaces
- enforce focused repeat stability for shared navigation and locale paths

### Phase 5: Safe Resume And Evidence Aggregation

- ship the F4 continuation receipt and state-machine tests
- support pre-fixture/transport resume first
- add browser-phase aggregation only after cleanup and invalidation proof is complete

### Phase 6: Promotion And Release Integration

- align release templates and current-evidence verification
- measure whether the public matrix can safely move to promotion time and be reused on main
- retain current exact-release behavior until equivalence is proven

Each phase should be a reviewable PR or a small, explicitly stacked series. Do not combine environment installation, production-write authorization, evidence-schema migration, and UI race changes into one unreviewable patch.

## Validation Plan

### Static And Unit Proof

- parse and validate every manifest/report/receipt schema
- test install idempotency and stale environment invalidation
- test JSON-only stdout and stderr separation
- test secret and production-response redaction
- test every failure class, next command, receipt expiry, transition, and mismatch refusal
- retain current production request, data safety, ledger, reporter, and locale-delivery contract tests

### Fault Injection

Inject and classify at least:

- Docker unavailable
- image/package/browser revision mismatch
- missing browser executable
- unwritable runtime/output/cache path
- dirty or ambiguous candidate
- archive/tree/bundle identity mismatch
- occupied or wrong candidate server
- candidate never renders the login control
- blocked production request
- failed authentication without logging credentials
- missing exact fixture capability
- orphaned, conflicting, or missing recovery ledger
- classified Firefox transient navigation failure
- Process drawer or locale readiness delay
- test failure with successful cleanup
- cleanup failure that forbids continuation

### End-To-End Proof

1. cold install from a clean project-specific environment
2. warm idempotent install
3. doctor/preflight with no production fixture created
4. focused repeated race-prone scenarios
5. one complete authorized release closure with `created=cleaned` and `leaked=0`
6. one retryable infrastructure failure and exact bounded resume
7. one identity-drift refusal proving stale results cannot be reused
8. existing credential-free GitHub matrix and release DAG contract proof

### Repository Gates

During implementation, use focused proof. At the final controlled checkpoint run Docpact, lint, production build, relevant Playwright discovery/browser scopes, and the managed full repository gate once. Do not surround that final gate with duplicate full coverage runs.

## Acceptance Criteria

- one documented command prepares and executes the normal release E2E workflow
- a new Git-and-Docker machine can install the complete project-owned environment without manual dependency repair
- release mode never mounts the parent workspace or relies on container-side Git
- preflight catches environment, candidate, browser, identity, target, authentication, capability, and ledger failures before fixture creation
- the tested frontend is the exact committed production bundle identified in evidence
- the global suite remains role-neutral and role-specific behavior remains scenario-owned
- every failure exposes its original sanitized cause, failed phase, completeness, cleanup state, and exact next command
- known navigation/drawer/locale paths pass focused repeat stability without fixed sleeps or blanket retries
- bounded resume accepts only unchanged identities and independently valid cleanup proof
- changed source, test, config, environment, backend contract, or receipt identity fails closed
- every production-writing run proves exact cleanup with `created=cleaned` and `leaked=0`
- a clean authenticated release closure meets the 45-minute reference target and normal promotion preparation requires no environment exploration

## Rollout And Rollback

- ship the new runner alongside the current command until parity is demonstrated
- mark the new path canonical only after one clean cold install, one warm run, and one real release-candidate closure
- keep current ledger and evidence verification as the safety authority during migration
- if the runner fails, roll back command ownership rather than weakening guards or accepting partial evidence
- remove the old manual recipe only after the new command is documented in `DEV.md`, validated in `repo-validation.md`, and exercised in a release

## Open Decisions

- whether the first container is built locally from a pinned Playwright base or published as a repository package
- whether the backend can expose a read-only fixture capability probe and later a narrowly scoped fixture endpoint
- whether browser-phase resume is worth its added F4 receipt complexity after preflight removes most avoidable failures
- whether public matrix attestation can move to promotion time without weakening exact-main-release identity
