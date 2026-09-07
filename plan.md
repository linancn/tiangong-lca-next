---
title: Hosted Supabase And GitHub Pages Rebuild Plan
docType: plan
scope: repo
status: active
authoritative: false
owner: next
language: en
whenToUse:
  - when planning or implementing this fork's hosted Supabase migration
  - when changing branding, frontend capabilities, authentication, routing, or GitHub Pages deployment
  - when reporting progress, decisions, blockers, or the next action for this rebuild
whenToUpdate:
  - after every work session that changes rebuild status, decisions, blockers, validation, or next actions
  - when a milestone starts or finishes
  - when the hosted Supabase or GitHub Pages deployment contract changes
checkPaths:
  - plan.md
  - AGENTS.md
  - .docpact/config.yaml
  - config/**
  - src/**
  - public/**
  - .github/workflows/**
  - .env
  - .env.development
lastReviewedAt: 2026-09-06
lastReviewedCommit: ab6cda0f4c126c3c9d1398b37c1453eed7705518
lastReviewedNote: 'Recorded the decision to defer custom visual assets and the completed GitHub Pages project-path implementation, workflow, tests, and local browser proof.'
related:
  - AGENTS.md
  - .docpact/config.yaml
  - DEV.md
  - docs/agents/repo-validation.md
  - docs/agents/repo-architecture.md
  - docs/agents/supabase-branching.md
---

# Hosted Supabase And GitHub Pages Rebuild Plan

## Goal

Run a separately branded fork of TianGong LCA Next at:

```text
https://catiehe.github.io/tiangong-lca-next-practice/
```

Use hosted Supabase projects instead of the repository's self-hosted Supabase stack. Restore application capabilities in bounded stages, beginning with a deployable branded frontend and hosted Supabase Auth.

## Plan Maintenance Rule

Every work session on this rebuild must read this plan before making changes. Update it before handing work back whenever progress, decisions, blockers, validation results, or the next action changed. Commit and push each plan update with the related project work, or as its own documentation commit when no related code change exists. Keep completed items checked, preserve material evidence, and maintain exactly one current next action.

## Current Status

Last updated: 2026-09-06

Overall state: Milestone 0 and GitHub Pages compatibility complete; custom visual assets deferred; hosted configuration and live deployment remain pending

| Area | State | Evidence or blocker |
| --- | --- | --- |
| Fork checkout | Complete | `origin` is `catiehe/tiangong-lca-next-practice` |
| Upstream remote | Complete | `upstream` is `linancn/tiangong-lca-next` |
| Working tree | Clean after controlled delivery | Local `dev` and `origin/dev` both point to the delivered baseline commits |
| Daily branch | Complete | Local `dev` exists and tracks `origin/dev` |
| Node | Complete for the current managed workspace | Selected checksum-verified official Node `24.19.0`; the managed shell has no `nvm`, so commands use the explicit verified toolchain path |
| pnpm | Complete | Repository-pinned pnpm `11.24.0` runs under Node `24.19.0` |
| Local application baseline | Complete | Frozen install, lint, dev startup, and Chromium inspection passed; only the recorded development warnings remain |
| Plan log delivery | Complete for Milestone 0 | The third controlled push completed the full gate and delivered the baseline/log commits to `origin/dev` |
| Organization and product naming | Confirmed | Organization: `PRISM`; product: `Future of LCA` |
| Color system | Selected | Measured Indigo: `#08111F`, `#142033`, `#F5F7FA`, `#6366F1`, `#22D3EE`, and `#F59E0B` |
| Logo and favicon | Deferred | The user chose to skip paid custom-asset design; keep the current assets only as a temporary development placeholder and do not treat them as approved PRISM identity |
| Support contact | Selected | Use the fork repository's GitHub Issues surface until the owner supplies a verified support mailbox; do not publish an invented email address |
| Hash routing | Present | `config/config.ts` already uses hash history |
| GitHub Pages base path | Complete | `APP_BASE_PATH` drives Umi, shell/static assets, maintenance fallback, external links, and Auth callbacks; the exact project-path bundle passed a local browser smoke with zero same-origin failures |
| Custom domain | Complete for project Pages | Removed `public/CNAME`; the fork will use `catiehe.github.io/tiangong-lca-next-practice/` unless an owned domain is deliberately configured later |
| Hosted Supabase Auth | Pending | Client exists; new project URL, publishable key, and redirect configuration are required |
| Hosted database | Pending | Schema and migrations belong to the separate `database-engine` repository |
| Edge Functions | Pending | Runtime source belongs to `tiangong-lca-edge-functions` |
| GitHub Pages workflow | Implemented, not deployed | Fork-specific `github-pages.yml` builds `main` with the exact toolchain, requires hosted Supabase repository variables, uploads `dist`, and deploys through the `github-pages` environment; repository settings and live proof remain pending |

Current next action: create the hosted Supabase development project, then configure its public URL and publishable key as GitHub repository variables so the Pages workflow can deploy without falling back to the upstream backend.

## Decisions

1. Use the repository's `dev` branch convention instead of creating `develop`.
2. Deliver the first milestone with one hosted Supabase development project. Create production only after the development milestone passes.
3. Treat the first usable release as the branded shell plus signup, login, logout, and recovery. Keep backend-dependent features unavailable until their contracts are migrated.
4. Use centralized capability flags for unavailable features.
5. Keep database migrations in the owning `database-engine` repository and Edge Function runtime changes in `tiangong-lca-edge-functions`.
6. Never expose a service-role key, database password, Supabase access token, or other server credential to the frontend or Pages build.
7. Use the official GitHub Pages artifact workflow rather than adapting the canonical EdgeOne release workflow.
8. Use `PRISM` as the organization name and `Future of LCA` as the product name.
9. Treat `calvinw/product-graph-editor` as UI inspiration only: retain its dark technical workspace character without copying its logo, composition, artwork, or distinctive devices.
10. Use the Measured Indigo palette for the identity: `#08111F` background, `#142033` surface, `#F5F7FA` text, `#6366F1` primary, `#22D3EE` accent, and `#F59E0B` support.
11. Use the fork repository's GitHub Issues surface as the initial support contact instead of inventing an unverified support mailbox.
12. Defer custom logo and favicon design instead of purchasing a Recraft plan; visual assets are not a prerequisite for the hosted foundation work.
13. Deploy the public fork from `main` at `/tiangong-lca-next-practice/`; use repository variables for hosted Supabase browser configuration and fail the workflow when either value is missing.

## Milestone 0: Fork Baseline

- [x] Clone the fork.
- [x] Configure the upstream remote.
- [x] Confirm the initial working tree is clean.
- [x] Create local `dev` from the current fork `main`.
- [x] Push `dev` to the fork and set its upstream tracking branch.
- [x] Install and select Node `24.19.0`.
- [x] Install and verify pnpm `11.24.0`.
- [x] Run `pnpm install --frozen-lockfile`.
- [x] Run `pnpm lint` before application changes.
- [x] Run `pnpm start` and record terminal, browser-console, network, and visible UI failures.

Expected commands:

```bash
git switch -c dev
git push -u origin dev
nvm install 24.19.0
nvm use 24.19.0
pnpm --version
pnpm install --frozen-lockfile
pnpm lint
pnpm start
```

Exit criteria: the exact toolchain works, the untouched app starts or has a reproducible failure record, and routine work can continue from `dev`.

## Milestone 1: Branded Auth-Only Application

- [x] Choose the product name, organization name, colors, and support contact.
- [ ] Replace the temporary development logo and favicon only if custom visual design is resumed later.
- [ ] Replace branding configuration, package metadata, Electron metadata, icons, and relevant localized strings.
- [ ] Review legal and privacy content separately; do not present upstream organization details as the fork owner's details.
- [ ] Add centralized capability flags.
- [ ] Keep Welcome, login, signup, recovery, logout, and the bounded account surface enabled.
- [ ] Hide or clearly disable data, team, review, import/export, Edge, and calculation features.
- [ ] Set `APP_RUNTIME_CONFIG_ENABLED=false` until `api.qry_system_status()` exists in the hosted database.

Exit criteria: the application clearly identifies the fork, unavailable features do not issue failing backend requests, and the auth-only route set builds successfully.

## Milestone 2: GitHub Pages Compatibility

- [x] Define an environment-driven application base path.
- [x] Set the production base to `/tiangong-lca-next-practice/`.
- [x] Make Umi `publicPath` use the selected base.
- [x] Fix the loading script, logo, favicon, manifest, service-worker, and other root-relative asset references.
- [x] Make external and Auth callback URLs preserve the project base path.
- [x] Confirm hash URLs work when opened and refreshed directly.
- [x] Remove `public/CNAME` for project Pages, or replace it only after configuring an owned custom domain in GitHub.
- [x] Test the production bundle from the same subpath used by Pages.

Exit criteria: the complete static shell loads at the project Pages URL with no root-path 404s, and Auth callbacks return to the same application base.

## Milestone 3: Hosted Supabase Development Auth

- [ ] Create one hosted Supabase development project.
- [ ] Record its project reference outside committed frontend configuration.
- [ ] Configure the frontend with only `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`.
- [ ] Set the Supabase Auth Site URL to the exact GitHub Pages application URL.
- [ ] Add exact localhost and production redirect URLs.
- [ ] Decide whether email/password, magic link, and signup confirmation are enabled.
- [ ] Configure SMTP before depending on production email delivery.
- [ ] Test signup, confirmation if enabled, login, refresh, logout, password recovery, and invalid/expired recovery links.
- [ ] Test two separate users to establish an authorization test baseline.

References:

- [Supabase redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)
- [Supabase Auth configuration](https://supabase.com/docs/guides/auth/general-configuration)

Exit criteria: Auth works locally and on GitHub Pages without privileged credentials in the browser or repository.

## Milestone 4: GitHub Pages Deployment

- [x] Add a fork-specific Pages workflow.
- [x] Use Node `24.19.0` and pnpm `11.24.0`.
- [x] Install with `pnpm install --frozen-lockfile`.
- [x] Wire the hosted Supabase URL, publishable key, base path, and temporary runtime-config flag into the build environment.
- [x] Run the appropriate static validation and production build.
- [x] Upload `dist` with `actions/upload-pages-artifact`.
- [x] Deploy through `actions/deploy-pages` with the `github-pages` environment.
- [x] Configure `pages: write` and `id-token: write` permissions.
- [ ] Enable GitHub Actions as the Pages publishing source in repository settings.
- [ ] Verify the deployed URL and Auth flow in a fresh browser session.

Reference: [GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)

Exit criteria: a push to the selected deployment branch produces a successful, repeatable Pages deployment.

## Milestone 5: Hosted Database Foundation

- [ ] Obtain or fork the owning `database-engine` repository.
- [ ] Inventory required PostgreSQL extensions and hosted Supabase availability.
- [ ] Inventory custom schemas, roles, grants, RLS policies, RPCs, triggers, Vault values, Storage buckets, and webhooks.
- [ ] Separate self-host-only infrastructure from portable database contracts.
- [ ] Link the database checkout to the development project.
- [ ] Run `supabase db push --dry-run` and review the complete plan.
- [ ] Apply migrations only from the database repository.
- [ ] Verify the `api` schema and frontend publishable/authenticated grants.
- [ ] Restore `api.qry_system_status()` before re-enabling runtime config.
- [ ] Never use `supabase db reset --linked` against production.

Expected review commands from the database checkout:

```bash
supabase link --project-ref <development-project-ref>
supabase db push --dry-run
supabase migration list
```

References:

- [Supabase local development workflow](https://supabase.com/docs/guides/local-development/cli-workflows)
- [Supabase environment management](https://supabase.com/docs/guides/deployment/managing-environments)

Exit criteria: a clean hosted development project can be created reproducibly from reviewed migrations and exposes only the intended frontend contracts.

## Milestone 6: Restore Product Capabilities

Enable each slice only after its database, authorization, UI, and error-state proof passes.

1. [ ] Public dataset reads and reference resources.
2. [ ] Authenticated profile and My Data reads.
3. [ ] My Data create, edit, and version operations.
4. [ ] Storage plus import/export.
5. [ ] Teams and membership authorization.
6. [ ] Review workflows and role enforcement.
7. [ ] Edge Functions and hybrid search.
8. [ ] Background jobs, task center, and packages.
9. [ ] Calculation workers, calculation results, and release storage.

For every slice:

- [ ] Verify anonymous, owner, other-user, and privileged-role behavior as applicable.
- [ ] Preserve service errors as errors rather than successful empty results.
- [ ] Record the focused test commands and results in the activity log.
- [ ] Update capability flags only after the feature passes hosted-development proof.

## Milestone 7: Production Project And Release

- [ ] Create a separate hosted Supabase production project.
- [ ] Configure production Auth URLs and email delivery.
- [ ] Apply the exact reviewed migration chain through controlled CI or an operator-reviewed release.
- [ ] Configure production Edge Functions, Vault values, webhooks, and Storage policies without exposing secrets to Pages.
- [ ] Seed only reviewed public/reference data; do not copy development users or test data.
- [ ] Run the repository proof required for every changed surface.
- [ ] Deploy the exact tested frontend commit.
- [ ] Run post-deploy read, Auth, authorization-denial, and cleanup checks.

Exit criteria: production is reproducible from source-controlled contracts, contains no development credentials or fixtures, and the deployed frontend uses only public browser configuration.

## Known Risks

- The frontend is not a standalone backend specification. It depends on database and Edge contracts owned by other repositories.
- GitHub Pages project paths affect static assets and Auth callback construction even though hash routing is already enabled.
- GitHub Pages cannot reproduce the current EdgeOne `/oauth/consent` rewrite. Keep that integration disabled until it has a compatible hosting or routing design.
- Hosted Supabase may not support every extension or self-host-specific role assumption used by the source database.
- Worker-backed calculation, package, AI, and data-product flows require infrastructure beyond Supabase Auth and Postgres.
- The tracked `.env` files contain browser configuration. They must never be expanded to contain privileged credentials.

## Activity Log

### 2026-09-07 — Project-path gate closure

- The first protected `dev` push correctly stopped before transport: the complete gate found stale registry-derived locale artifacts and a service-worker unit fixture that did not define the real `registration.scope` contract.
- Regenerated every locale artifact through `pnpm i18n:locale:artifacts:write`; no language payload or locale capability changed.
- Extended the service-worker contract to prove both root scope and `/tiangong-lca-next-practice/` project scope navigation fallbacks.
- Re-ran the three previously failing suites serially: 3 suites and 34 tests passed. The next repository action is a fresh protected push; after it succeeds, the product next action remains creating the hosted Supabase development project and configuring its two public GitHub repository variables.

### 2026-09-06 — GitHub Pages project-path foundation

- Accepted the user's decision to skip paid custom-asset design. Logo and favicon work is deferred; the current upstream visuals are temporary development placeholders, not approved PRISM identity.
- Added one validated `APP_BASE_PATH` owner and applied it to Umi `publicPath`, generated shell assets, branding defaults, legal links, TIDAS illustrations, classification/location/LCIA reads, map reads, maintenance fallbacks, external hash URLs, and password-recovery callbacks.
- Removed the upstream `public/CNAME` so a project Pages deployment cannot claim `lca.tiangong.earth`; made the standalone OAuth bridge script relative and the service-worker navigation fallback scope-relative.
- Added `.github/workflows/github-pages.yml` for `main` with Node `24.19.0`, pnpm `11.24.0`, frozen install, static preflight, project-path build, official Pages artifact upload/deploy actions, required Pages/OIDC permissions, and fail-closed hosted Supabase repository-variable checks.
- Added focused application-base and workflow contracts and updated affected tests. The serial focused run passed 12 suites and 250 tests.
- Built with `APP_BASE_PATH=/tiangong-lca-next-practice/ APP_RUNTIME_CONFIG_ENABLED=false pnpm build`; Webpack completed successfully. Served `dist` at that exact subpath and opened the hash login route in fresh Chromium: the application mounted, favicon and signup legal links retained the base, and there were zero same-origin 4xx responses, failed requests, or console errors.
- Live deployment was not attempted because the hosted Supabase development project, GitHub repository variables, and Pages publishing source are not configured. The next action is to create that hosted project and configure only its public browser URL and publishable key.

### 2026-09-06 — Milestone 1 delegated palette and logo attempt

- Interpreted the user's instruction to make the remaining choices as explicit auto/no-question authorization for the identity workflow.
- Selected and persisted Measured Indigo as the identity palette: background `#08111F`, surface `#142033`, text `#F5F7FA`, primary `#6366F1`, accent `#22D3EE`, and support `#F59E0B`.
- Chose the fork repository's GitHub Issues surface as the initial support contact so the application does not publish an invented or unverified mailbox.
- Prepared three original vector-symbol directions for PRISM: a calibrated-band `P`, a shared-datum refractive plane, and a stepped evidence trace. Each avoids the reviewed reference's logo and distinctive devices.
- Submitted the required three-candidate Recraft V4.1 vector batch twice, as required by the brand-asset workflow's retry policy. Both attempts failed before generation with `Requires basic plan or higher.` No logo candidate or favicon was produced, and no shipped branding file changed.
- The next action is to enable Basic-plan access for that required vector workflow, then generate the three marks, select the strongest under the delegated auto/no-question authority, derive the favicon, and continue the shipped-branding replacement.

### 2026-09-06 — Milestone 1 identity intake and palette review

- Confirmed the user-supplied identity naming: organization `PRISM`, product `Future of LCA`.
- Reviewed `calvinw/product-graph-editor` at commit `6a0f16506a00bb2ff29133447bd17e2476866fd7` as a non-authoritative UI reference. Its source-declared visual signals are a graphite workspace, violet/indigo interaction color, sky-blue graph accents, restrained status colors, thin borders, compact technical typography, and low-radius raised surfaces.
- Kept the reference's existing PRISM assets, logo, page composition, artwork, and distinctive devices out of this fork's identity direction; the reference controls general character only.
- Prepared three original, still-unapproved palette directions: Prism Signal (`#0B0D10`, `#111318`, `#F4F4F5`, `#8B5CF6`, `#38BDF8`, `#22C55E`), Measured Indigo (`#08111F`, `#142033`, `#F5F7FA`, `#6366F1`, `#22D3EE`, `#F59E0B`), and Living Spectrum (`#07110F`, `#12211D`, `#EFF8F4`, `#A78BFA`, `#2DD4BF`, `#4ADE80`).
- Rendered each direction as a deterministic 1200-by-900 palette board with an editable HTML companion. No palette has been selected or persisted as approved, and no shipped frontend file has changed.
- Deferred logo, favicon, and support-contact decisions until the palette review advances. The next action is the user's palette selection or requested color revision.

### 2026-09-06 — Exact toolchain and untouched application baseline

- Kept this Activity Log as the single persistent rebuild work log; future sessions must append their progress, decisions, blockers, validation, and next action here before handoff.
- Downloaded the official Linux x64 Node `24.19.0` archive into temporary workspace state and verified it against Node's published SHA-256 manifest before use. The managed shell still has no `nvm`, so repository commands used the exact verified binary through an explicit `PATH`.
- Verified pnpm `11.24.0` under Node `24.19.0`.
- Ran `pnpm install --frozen-lockfile` successfully. The 2,068-entry lockfile passed the repository supply-chain policy, 1,820 packages installed, postinstall completed, and `pnpm ignored-builds` reported no automatically ignored builds.
- Ran `pnpm lint` successfully: Oxlint, Prettier, and the TypeScript `7.0.2` web typecheck all passed.
- Started the untouched application with `pnpm start`; Umi `4.7.9` listened at `http://localhost:8000` and Webpack completed without an application startup error.
- Installed the repository-pinned Playwright Chromium and its container runtime libraries after the first browser launch identified the missing `libatk-1.0.so.0` host dependency.
- Loaded the application in a fresh headless Chromium context. The visible result was the TianGong LCA login page with login, signup, remember-me, and password-recovery controls; no visible error was present.
- Recorded zero failed requests and zero HTTP responses at status 400 or higher during the baseline observation window.
- Recorded three browser-console development warnings that generated code contains `async/await` while the configured target may not support it. The terminal also reported an outdated `caniuse-lite` database; neither warning prevented rendering.
- Stopped the development server after capture. No tracked application file changed during baseline setup or inspection.
- Installed Docpact `0.1.9` with an isolated current Rust toolchain after the host's Cargo `1.75.0` could not compile Rust 2024 edition packages. The first docs-only lint then exposed that governed `plan.md` had no matching rule trigger.
- Added the missing self-contained `next-hosted-rebuild-plan-contract` rule in `.docpact/config.yaml`; it keeps future plan sessions covered without forcing status facts into stable repo documents. Reviewed `AGENTS.md` and `DEV.md`; their contract and bootstrap content remain unchanged.
- Validated the documentation change with strict Docpact config validation, Docpact enforce-mode lint over all four changed files, Prettier, and `git diff --check`; all passed after formatting the machine-readable config.
- The first controlled `pnpm push:checked origin dev` attempt passed Docpact, LCIA cache verification, reference-data validation, lint, and all 47 pre-push receipt tests. Its coverage run completed 442 of 443 suites and all 5,974 executed assertions, but the operating environment sent `SIGTERM` to the Jest worker assigned to `tests/unit/i18n/localeDeliveryContracts.test.ts`; the hook correctly blocked the push, so no remote update occurred.
- Re-ran `tests/unit/i18n/localeDeliveryContracts.test.ts` alone with the exact Node toolchain, the repository Jest configuration, and `--runInBand`; all 18 tests passed in 186 seconds. This isolates the first gate failure to a transient worker termination rather than a test assertion or product defect.
- The second controlled push again passed Docpact, LCIA cache verification, reference-data validation, lint, and all 47 receipt tests. Its required two-worker coverage run completed 442 of 443 suites: 5,991 tests passed and one failed when the locale artifact idempotence test's nested shared-audit process terminated with a null exit status. The other 17 locale-delivery tests passed, and the hook again prevented any remote update.
- Checked the container cgroup immediately after the repeated failure: it recorded zero `oom`, `oom_kill`, or memory-limit events, and the kernel log is unavailable inside the container. The evidence therefore supports external process termination under concurrent coverage load but does not establish an OOM cause. A third identical retry was not attempted.
- Phase 1 diagnostic: ran `tests/unit/i18n/localeDeliveryContracts.test.ts` together with `tests/unit/locales.test.ts` under two Jest workers and no coverage; both suites passed, 30 tests total, in 205 seconds. The direct pair is therefore not sufficient to reproduce the failure.
- The third controlled `pnpm push:checked origin dev` passed Docpact, LCIA cache verification, reference-data validation, lint/typecheck, all 47 receipt tests, and the full coverage gate. All 443 suites passed, including locale delivery; the final report verified 484/484 tracked source files at 100/100/100/100. The hook then delivered `9abdcb61` to `origin/dev`.
- Completed Milestone 0. Milestone 1 is waiting for the fork's brand identity inputs before shipped frontend changes begin.

### 2026-09-05 — Initial assessment

- Confirmed the fork and upstream remotes.
- Confirmed a clean `main` checkout at `7210e700dec938743620a2ff3e1b3948eb3ed16f`.
- Confirmed that `dev` is absent locally and on the currently available remote refs.
- Found Node `24.14.0` instead of the required `24.19.0`.
- Found that pnpm could not initialize its managed tool directory in the current workspace environment.
- Found that the documentation gate cannot run because the `docpact` executable is not installed in this environment.
- Confirmed existing hash routing and identified root-relative Pages incompatibilities.
- Confirmed that Auth already uses the shared Supabase client and publishable key.
- Confirmed that the app expects the `api` schema and has broad RPC, Storage, Edge Function, and worker dependencies.
- Confirmed that existing web deployment targets EdgeOne and canonical-repository release behavior.
- Created this living plan and registered its maintenance rule in the repository contract.
- Recorded the requirement to commit and push every plan update.
- Created local `dev` from the fork's current `main`.
- Committed the living plan as `2da5a1d3` and pushed `dev` to the fork with upstream tracking.
