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
lastReviewedAt: 2026-09-05
lastReviewedCommit: 7210e700dec938743620a2ff3e1b3948eb3ed16f
lastReviewedNote: 'Created the living plan from the initial fork, hosted Supabase, and GitHub Pages assessment.'
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

Last updated: 2026-09-05

Overall state: planning and baseline assessment

| Area | State | Evidence or blocker |
| --- | --- | --- |
| Fork checkout | Complete | `origin` is `catiehe/tiangong-lca-next-practice` |
| Upstream remote | Complete | `upstream` is `linancn/tiangong-lca-next` |
| Working tree | Documentation changes pending commit | Current checkout is on `dev` |
| Daily branch | In progress | Local `dev` exists; the first push is pending |
| Node | Blocked | Required `24.19.0`; observed `24.14.0` |
| pnpm | Blocked in current managed workspace | Required `11.24.0`; pnpm could not create its tool directory under the managed home path |
| Local application baseline | Pending | Install and startup have not completed with the exact toolchain |
| Hash routing | Present | `config/config.ts` already uses hash history |
| GitHub Pages base path | Pending | `publicPath`, public assets, and auth callback URLs assume the origin root |
| Custom domain | Requires decision | `public/CNAME` still points to `lca.tiangong.earth` |
| Hosted Supabase Auth | Pending | Client exists; new project URL, publishable key, and redirect configuration are required |
| Hosted database | Pending | Schema and migrations belong to the separate `database-engine` repository |
| Edge Functions | Pending | Runtime source belongs to `tiangong-lca-edge-functions` |
| GitHub Pages workflow | Pending | Existing workflows target the canonical release system and EdgeOne |

Current next action: push `dev`, establish the exact Node/pnpm baseline, install dependencies, and record the untouched application's startup errors.

## Decisions

1. Use the repository's `dev` branch convention instead of creating `develop`.
2. Deliver the first milestone with one hosted Supabase development project. Create production only after the development milestone passes.
3. Treat the first usable release as the branded shell plus signup, login, logout, and recovery. Keep backend-dependent features unavailable until their contracts are migrated.
4. Use centralized capability flags for unavailable features.
5. Keep database migrations in the owning `database-engine` repository and Edge Function runtime changes in `tiangong-lca-edge-functions`.
6. Never expose a service-role key, database password, Supabase access token, or other server credential to the frontend or Pages build.
7. Use the official GitHub Pages artifact workflow rather than adapting the canonical EdgeOne release workflow.

## Milestone 0: Fork Baseline

- [x] Clone the fork.
- [x] Configure the upstream remote.
- [x] Confirm the initial working tree is clean.
- [x] Create local `dev` from the current fork `main`.
- [ ] Push `dev` to the fork and set its upstream tracking branch.
- [ ] Install and select Node `24.19.0`.
- [ ] Install and verify pnpm `11.24.0`.
- [ ] Run `pnpm install --frozen-lockfile`.
- [ ] Run `pnpm lint` before application changes.
- [ ] Run `pnpm start` and record terminal, browser-console, network, and visible UI failures.

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

- [ ] Choose the product name, organization name, colors, logos, favicon, and support contact.
- [ ] Replace branding configuration, package metadata, Electron metadata, icons, and relevant localized strings.
- [ ] Review legal and privacy content separately; do not present upstream organization details as the fork owner's details.
- [ ] Add centralized capability flags.
- [ ] Keep Welcome, login, signup, recovery, logout, and the bounded account surface enabled.
- [ ] Hide or clearly disable data, team, review, import/export, Edge, and calculation features.
- [ ] Set `APP_RUNTIME_CONFIG_ENABLED=false` until `api.qry_system_status()` exists in the hosted database.

Exit criteria: the application clearly identifies the fork, unavailable features do not issue failing backend requests, and the auth-only route set builds successfully.

## Milestone 2: GitHub Pages Compatibility

- [ ] Define an environment-driven application base path.
- [ ] Set the production base to `/tiangong-lca-next-practice/`.
- [ ] Make Umi `publicPath` use the selected base.
- [ ] Fix the loading script, logo, favicon, manifest, service-worker, and other root-relative asset references.
- [ ] Make external and Auth callback URLs preserve the project base path.
- [ ] Confirm hash URLs work when opened and refreshed directly.
- [ ] Remove `public/CNAME` for project Pages, or replace it only after configuring an owned custom domain in GitHub.
- [ ] Test the production bundle from the same subpath used by Pages.

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

- [ ] Add a fork-specific Pages workflow.
- [ ] Use Node `24.19.0` and pnpm `11.24.0`.
- [ ] Install with `pnpm install --frozen-lockfile`.
- [ ] Pass the hosted Supabase URL, publishable key, base path, and temporary runtime-config flag at build time.
- [ ] Run the appropriate static validation and production build.
- [ ] Upload `dist` with `actions/upload-pages-artifact`.
- [ ] Deploy through `actions/deploy-pages` with the `github-pages` environment.
- [ ] Configure `pages: write` and `id-token: write` permissions.
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
