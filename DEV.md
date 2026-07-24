---
title: next Development Bootstrap
docType: guide
scope: repo
status: active
authoritative: false
owner: next
language: en
whenToUse:
  - when setting up the repo locally
  - when checking the canonical local commands
  - when resetting the shortest safe work loop after time away
whenToUpdate:
  - when bootstrap commands change
  - when the default local work loop changes
  - when the owning doc pointers become stale
checkPaths:
  - DEV.md
  - AGENTS.md
  - .docpact/config.yaml
  - package.json
  - playwright.config.ts
  - playwright.docs-capture.config.ts
  - scripts/docs-screenshots/**
  - scripts/e2e/**
  - docker/e2e/**
  - tests/e2e/i18n/**
  - .github/workflows/i18n-semantic-e2e.yml
  - .github/workflows/release-gate.yml
  - .github/workflows/release-readiness.yml
  - .nvmrc
lastReviewedAt: 2026-07-23
lastReviewedCommit: fc41c27e32d75dad87a286dd190071a5068bcc25
lastReviewedNote: 'Reviewed for Issue #685: documented conditional local production preflight and the reusable main-target release-readiness gate.'
---

# Development Bootstrap

> Purpose: local setup and the shortest safe work loop for this repo. Repo contract and document ownership live in `AGENTS.md`; minimum proof lives in `docs/agents/repo-validation.md`.

## Use When

- setting up the repo locally
- checking the canonical local commands
- resetting your local work loop after time away

## Do Not Use For

- deciding branch policy
- deciding minimum proof for a change
- deciding which document owns a rule

## Prerequisites

- Node.js `24`
- `npm`
- local shell configured so `nvm use 24` works

## Bootstrap

```bash
nvm install
nvm use 24
npm ci
```

`npm ci` installs the exact dependency tree from the committed `package-lock.json`. Use `npm install` only when intentionally changing dependencies, and commit the resulting lockfile update.

The direct development browser harness uses `@playwright/test` `1.61.1`. Install its browser engines only when using `npm run e2e:dev` or `npm run test:e2e:i18n` directly on the host:

```bash
npx playwright install chromium firefox webkit
```

Release proof does not use host browser binaries, host `node_modules`, Umi/MFSU caches, or the parent workspace. It requires the repo Node.js `24` launcher plus Git and a running Docker engine; the idempotent installer owns the pinned Playwright image and all E2E-specific runtime dependencies:

```bash
npm run e2e:env:install
npm run e2e:env:doctor
```

`e2e:env:doctor` is read-only and never pulls, builds, authenticates, or writes production data. A missing image exits early with the exact installer command.

## Default Work Loop

1. `nvm use 24`
2. `npm start`
3. make the scoped change
4. run focused validation
5. run `npm run lint`
6. run `npm run build` when the change affects shipped behavior or static assets
7. commit the final controlled tracked change and run `npm run push:checked -- origin <branch>`; its ordinary hook owns the one full gate

If no push will occur and a standalone handoff needs final evidence, run `npm run docpact:gate` and then `npm run prepush:gate` manually instead. Do not also push the same unchanged checkpoint merely to repeat those gates.

## Canonical Commands

| Task | Command |
| --- | --- |
| start shared `dev` env | `npm start` |
| explicit shared `dev` env | `npm run start:dev` |
| explicit `main` env | `npm run start:main` |
| local docpact gate | `npm run docpact:gate` |
| lint + typecheck | `npm run lint` |
| shared CI-style test runner | `npm test` |
| direct/focused semantic localization E2E development | `npm run e2e:dev -- <Playwright arguments>` (`npm run test:e2e:i18n` remains the CI-compatible alias) |
| validate docs screenshot capture contracts | `npm run docs:screenshot:test` |
| capture governed docs screenshots | `npm run docs:screenshot:capture -- --plan <plan.json> --result <result.json> --access-report <access.json> --allowed-output-root <next-docs-root>` |
| install the isolated release E2E environment | `npm run e2e:env:install` |
| read-only release E2E environment diagnosis | `npm run e2e:env:doctor` |
| run an exact committed release candidate | `npm run e2e:release -- <release options>` |
| resume one exact pre-fixture failure | `npm run e2e:release:resume` (no arguments) |
| clean project-owned release E2E runtime state | `npm run e2e:env:clean` (`--purge-images` is opt-in) |
| focused Jest suite | `npm run test:ci -- <jest-args>` |
| data workflow unit proof | `npm run test:data-workflows:unit` |
| focused live data workflow | `npm run test:workflows -- --<workflow> <workflow-args>` |
| live API smoke workflows | `npm run test:api:smoke -- <workflow-args>` |
| full coverage | `npm run test:coverage` |
| strict full-coverage assertion | `npm run test:coverage:assert-full` |
| coverage report + queue summary | `npm run test:coverage:report` |
| deterministic locale audit | `npm run i18n:audit` |
| language registry/Manifest contract audit | `npm run i18n:platform:audit` |
| business-language hardcoding audit | `npm run i18n:hardcoding:audit` |
| verify generated reference-resource assets and manifest | `npm run reference-data:check` |
| require every governed reference resource to have native reviewed assets and explicit production clearance | `npm run reference-data:production:check` (fails while rights or delivery blockers remain) |
| regenerate reference-resource assets and manifest from reviewed sources | `npm run reference-data:write` |
| audit one registry locale | `npm run i18n:locale:audit -- --locale <canonical-locale>` |
| execute deterministic structural validation and build one locale's tracked context, quality, and activation artifacts | `npm run i18n:locale:artifacts:write -- --locale <canonical-locale>` |
| check one locale's context and quality | `npm run i18n:context:check -- --locale <canonical-locale>` then `npm run i18n:locale:quality:check -- --locale <canonical-locale>` |
| check tracked existing-translation corrections | `npm run i18n:corrections:check` |
| check one locale's activation boundary | `npm run i18n:locale:activation:check -- --locale <canonical-locale>` |
| check every active locale's activation boundary | `npm run i18n:locale:all:check` |
| require every active locale to be production-ready | `npm run i18n:locale:all:production:check` (fails while any owned blocker remains) |
| run the combined credential-free production preflight | `npm run release:preflight` |
| enforce active German runtime assembly | `npm run i18n:de:audit` |
| validate the historical Issue #606 snapshot only | `npm run i18n:de:delta:review:check` |
| validate the historical Issue #601 Pilot only | `npm run i18n:de:pilot` |
| build | `npm run build` |
| local full test gate | `npm run prepush:gate` |
| final managed push | `npm run push:checked -- <normal-git-push-args>` |
| retry one receipt-bound failed transport | `npm run push:retry` |
| repo AI-doc lint | `scripts/docpact validate-config --root . --strict && scripts/docpact lint --root . --base <base> --head <head> --mode enforce` |

After explicit user authorization, an operator runs the complete authenticated closure from a clean committed candidate. The runtime-only users file must be mode `0600`; `--role` selects a credential entry but does not impose a global business-role requirement:

```bash
chmod 600 .env.users.local
npm run e2e:release -- \
  --authenticated \
  --allow-production-data \
  --write-verified-evidence \
  --users-env-file .env.users.local
```

The controller first refuses this production-data command when the host has `CI` or `GITHUB_ACTIONS` set. After that local-operator check passes, it clears only the release image's inherited CI markers at container runtime so the unchanged in-container production-write guards can validate the explicit authorization. This command shape remains forbidden in semantic E2E GitHub Actions; CI keeps using the credential-free/read-only exact-SHA matrix.

## Command Rules

- `npm start` and `npm run start:dev` are equivalent
- documentation capture is a separate local operator workflow configured by `playwright.docs-capture.config.ts`; it must not inherit semantic-E2E credentials, fixtures, release evidence, or browser profiles
- set `DOCS_SCREENSHOT_ENV_FILE` to an external regular file with mode `0600`; that file may contain only the fixed login keys accepted by the capture contract and must never be committed, copied into a worktree, or named in a command argument
- a capture plan must declare one explicit shared browser locale; it may navigate, click, wait, assert, and apply explicitly read-only filters, while the browser guard aborts other POST/PUT/PATCH/DELETE requests except the declared authentication/session exchange
- missing or invalid credentials, login failure, route drift, or an uncorroborated denial fail the capture. Only a sanitized access report proving that a read-only identity response exactly matches the configured screenshot account plus an authoritative authorization denial may let the docs-impact workflow continue as a Draft PR without a required screenshot
- after capture, inspect every final PNG for private data and set the result's privacy review to complete before handing the evidence to `next-docs`
- use `npm run start:main` only when the task explicitly requires the `main` environment
- direct semantic E2E development is configured by `playwright.config.ts`, runs from `tests/e2e/i18n/**`, and serves the local worktree with `npm run start:main`; `E2E_BASE_URL` must remain a loopback URL
- release E2E accepts only a clean committed Next candidate, exports it with `git archive`, builds one production bundle in the digest-pinned Playwright image, serves that immutable bundle internally, and never mounts `lca-workspace`, `.git`, unrelated submodules, host dependencies, or browser profiles
- release preflight verifies the environment/candidate identities, writable isolated storage, all three browser launches, bundle/login readiness, production backend target, optional role-neutral login, recovery-ledger safety, and Playwright discovery before production fixture intent/create
- only one install/run/resume/clean invocation may mutate project-owned E2E state at a time; a dead owner lock is recovered automatically, while a live owner fails early instead of racing shared build/runtime/ledger state
- a failed build, server, or preflight phase may activate one ignored one-hour HMAC-bound continuation receipt; argument-free `npm run e2e:release:resume` revalidates the exact commit/tree/lock/environment/source/image/arguments and reruns preflight, while browser results and production-fixture phases are never reused
- race diagnosis may add `--project <browser> --spec <path>` or `--grep <pattern> --repeat-each <1-5>`; repeat is accepted only for a focused read-only scope and cannot write verified evidence
- diagnostics retain the sanitized original error chain and emit stable phase/check IDs, coarse exit classes (`2`, `10`, `20`, `30`, `40`, `50`), cleanup state, output path, and one exact next command
- semantic E2E GitHub Actions is credential-free and read-only: `workflow_dispatch` runs the three-browser public semantic/boundary matrix on demand, and the canonical release workflow calls the same matrix for the exact release SHA; routine PR/dev pushes do not trigger it
- the full authenticated closure runs only in an explicitly authorized local operator session with runtime credentials and `E2E_AUTHENTICATED=true`; the host controller refuses production-data mode when `CI` or `GITHUB_ACTIONS` is set, then an accepted local run overrides the image-inherited markers to empty inside the container; production write still requires both `E2E_ALLOW_PRODUCTION_DATA=true` and the exact one-process confirmation token, while tracked evidence additionally requires `E2E_WRITE_VERIFIED_EVIDENCE=true`; never move that closure or its credentials into a semantic E2E GitHub job
- before any create, authenticated E2E writes a UUID-scoped `codex-e2e` intent ledger; before any delete, it must read the production row and verify the UUID, authenticated owner, and exact marker coverage for all five multilingual fields across every registry authoring language
- use one protected `E2E_RECOVERY_LEDGER_PATH` per active invocation; recovery may proceed from the external copy alone after a crash, but a primary ledger without the configured recovery copy fails closed so a stale teardown cannot adopt another run
- teardown deletes only the verified exact-ID rows, records created/cleaned counts, and must prove `created=cleaned` and `leaked=0`
- shared Header language switching uses Umi `SelectLang` with `reload={false}`; semantic proof must retain the same document identity while refreshing locale-dependent state and reject a delayed old-locale reference response
- never persist or upload credentials, auth state, screenshots, traces, or video; the digest-bound semantic evidence contains assertions and non-secret digests only
- prefer `npm run test:ci -- <jest-args>` over stacking flags after `npm test`
- use `npm run test:workflows -- --processes:create --frontend-url <url> --supabase-url <url> --supabase-publishable-key <key>` for one live data workflow script; use `--processes:all` or `--teams:all` when a full workflow suite is needed
- run `npm run test:api:smoke -- <workflow-args>` only with a target Supabase environment and configured test users; inspect its summary because child workflow failures are reported without making the command exit non-zero
- local pushes run the Husky pre-push hook, which runs `npm run docpact:gate` first and `npm run prepush:gate` last; main-semantic pushes additionally run `npm run release:preflight` between them, while `dev` pushes keep the two-gate path
- PRs targeting `main` run the reusable clean-runner Release Gate against the exact PR base/head before merge; the post-merge workflow revalidates the exact release SHA and creates the tag only after both release jobs succeed
- the hook keeps an already-active Node.js 24 from `PATH`, including a CI `setup-node` runtime; it sources local NVM and runs `nvm use 24` only when the active Node is absent or has another major version
- treat `npm run prepush:gate` as the authoritative local test gate
- during normal delivery, use `npm run push:checked -- <normal-git-push-args>` and do not run the full gate manually immediately before its ordinary hook repeats it; focused proof belongs in the edit loop and the hook owns the final committed checkpoint
- ignored local evidence and GitHub metadata do not invalidate repository full-gate evidence; a controlled tracked change, relevant Node/dependency change, or gate/configuration change does
- after a controlled active-locale change, regenerate that locale's tracked artifacts, run the shared audit/context/quality/correction/activation checks, and keep `BLOCKED_CONTEXT`, unowned route views, topology drift, ICU drift, and undeclared corrections at zero
- treat `src/services/referenceResources/reference-resource-manifest.json` plus `src/services/referenceResources/data/**` as the editable source of truth for classification and location reference data; run `npm run reference-data:write` after an approved source, overlay, or review change and commit the resulting content-addressed assets and generated manifest together
- use `npm run reference-data:check` for read-only reproducibility proof; the command is also part of `npm run prepush:gate`
- production-effective workflows additionally run `npm run reference-data:production:check`; the normal development/pre-push gate intentionally reports but does not waive unresolved rights-clearance blockers
- `npm run i18n:de:audit` uses the same tracked automated activation boundary as every active registry locale; `i18n:de:pilot`, review, and delta commands validate only their frozen Issue #601/#602/#606 snapshots and are never active-release or full-gate inputs
- active locale commands and clean-runner proof must pass with `.local/**confirmation*` absent; historical reviewer forms and identity remain outside Git and GitHub
- a successful managed push leaves no retry receipt; only a non-zero transport result after both hook gates passed activates the ignored, one-hour, exact-intent receipt used by argument-free `npm run push:retry`
- a raw `git push` still runs the hook but cannot create that bounded recovery receipt; never invoke `git push --no-verify` or `HUSKY=0` manually
- run `npm run test:ci`, coverage commands, and `npm run prepush:gate` serially because they regenerate shared `.umi-test` state; do not add broad test/coverage runs around a full gate that already contains coverage

## If You Need More Than This File

- repo rules, branch facts, and minimal execution summary: `AGENTS.md`
- path and doc routing: `.docpact/config.yaml`
- minimum proof: `docs/agents/repo-validation.md`
- frontend mental model: `docs/agents/repo-architecture.md`
- branding, packaging, and local-stack surfaces: `docs/agents/repo-architecture.md`
- narrow source docs: the owning file under `docs/agents/**`
- additional governed source docs only after the core contract surface is insufficient: `README*`, testing references, rollout notes, PR templates, and proposal docs
