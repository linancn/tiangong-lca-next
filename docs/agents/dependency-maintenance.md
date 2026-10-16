---
title: Platform Dependency Maintenance
docType: guide
scope: repo
status: active
authoritative: false
owner: next
language: en
whenToUse:
  - when reviewing dependency proposals or changing monitoring and ordinary dependency CI
whenToUpdate:
  - when discovery scope, grouping, validation or activation prerequisites change
checkPaths:
  - .github/dependabot.yml
  - .github/workflows/dependency-pr.yml
  - docs/agents/dependency-maintenance.md
lastReviewedAt: 2026-10-16
lastReviewedCommit: 487ae2368843a5bc9f3a972e9a7fdec829512693
lastReviewedNote: 'Platform #1282: reconciled the residual real-Git checkout regression and leaf-tooltip assertion repair against released Main v0.0.137 at 487ae2368843a5bc9f3a972e9a7fdec829512693; retained the full-history workflow already delivered by #1279. Current runtime, dependency graph, release inputs, full gates and production boundaries remain unchanged; no new hosted qualification is claimed.'
related:
  - ../../AGENTS.md
  - repo-validation.md
  - prepush-gate-policy.md
---

# Dependency maintenance

Dependabot monitors the single root pnpm graph on Wednesdays at 05:00 and GitHub Actions at 05:20, in Asia/Shanghai. Both version-update entries target `dev`, use a seven-day cooldown, and initially permit two npm proposals and one Actions proposal. Related native UI/Umi generation, Supabase client, test runtime, compiler/lint and desktop tool patch/minor updates are grouped. Package majors and other packages remain individually visible. Pre-1.0 and prerelease adoption still require an explicit compatibility decision.

Keep the reviewed React/Ant Design/ProComponents generation, internal SDK, TypeScript adapter boundary, pnpm overrides, isolated linker, public-hoist patterns and lifecycle-script decisions intact. A proposal that outgrows an exact override or prerelease pin needs reviewed compatibility work; do not broaden policy merely to make installation pass. Embedded executable versions and toolchain/image identities remain separately governed. Preserve full-SHA Actions references when updating them.

## Ordinary dependency checks

`dependency-pr.yml` runs for relevant dependency, package-policy, runtime-selector and workflow paths in PRs targeting `dev` or `main`, including human-authored changes. It checks out the exact head with `fetch-depth: 0`, uses the existing pinned pnpm/Node setup, installs the frozen graph and runs the unchanged `pnpm prepush:gate`. Complete history and the `origin/main` and `origin/dev` refs are required by the locale audit, frozen German review and correction provenance contracts. Checkout fetches that history before removing its credentials; the candidate stays bound to its exact SHA. Full Jest logs remain available as a seven-day artifact. Manual runs have independent run identities; newer PR commits cancel only superseded runs for that PR.

Marked Dev Release PRs and Main candidates from `dev`, `codex/promote-*` or `codex/hotfix-*` defer to their existing exact Release Candidate or Main Candidate validation owner. The dependency job is skipped for those phases, not reported as proof. Existing candidate checks still reject invalid marker, lineage, version or head evidence; no protected gate is bypassed. Ordinary dependency proposals and human maintenance PRs outside those protected phases run the new job, including unmarked Main security proposals. This avoids a second aggregate execution on deterministic release/promotion/hotfix candidates.

This workflow has read-only repository access, no production/deployment credentials and no publication command. It does not call `release:static-preflight`, manufacture a Release PR marker or run browser E2E. The existing `ci.yml` remains Manual Web Deploy and has no PR trigger. The new check does not replace any required release or main-candidate check. Unrelated feature paths gain no automatic dependency workflow.

Preserve the canonical gate's complete inventory and 100% source coverage. Follow [the validation guide](repo-validation.md) for affected package, parser, UI, desktop and browser proof. Run Umi-generating commands serially. Use focused proof while iterating; the final checked push owns the one local aggregate gate. The ordinary dependency job proves source compatibility, not production locale, reference-resource, browser, image or deployment readiness.

## Default branch and release boundary

Dependabot reads its configuration from default `main`; a file left only on `dev` is not activation evidence. A workflow-only default-branch bootstrap may use the existing explicitly marked direct main-hotfix route: bind the tracked Issue, exact current Main base and candidate head, retain the package version, and satisfy the unchanged static/full Main Candidate gate. Merge must be followed by a separate `main -> dev` backmerge before delivery is complete. This is not a versioned Release PR or permission to bypass a failed readiness gate.

The existing Build/release resolver skips a later Main push when its package version is unchanged and the matching version tag already identifies the earlier release. Record the exact current tag/base/head skip evidence for the actual candidate; this configuration does not change that resolver or authorize tag, publication or deployment operations.

Security proposals use the default branch. Dev-targeted version options do not configure that separate security path. Triage Main security work through the existing supported hotfix/backmerge contracts; a Dependabot branch is not itself a marked hotfix, and green ordinary CI does not grant release eligibility.

## Deferred ecosystems and acceptance

Docker/Compose updater activation is deferred until owned image inputs have scoped build/runtime qualification. That follow-up must preserve immutable application/E2E image identities, their pnpm/Node and native dependencies, and the existing packaging/qualification gates. No Docker or Compose monitoring is enabled here.

The Edge runtime owns Deno/URL-import compatibility. The local `docker/volumes/functions/**` tree is a generated mirror; npm-root discovery does not cover its raw URLs or authorize editing it. Inventory supported imports and qualify updates in the owning Edge repository, then refresh this mirror only through the reviewed full-commit helper and source-revision receipt. This change does not claim Deno, raw-URL, mirror or image coverage.

Automatic merging is disabled for this rollout. Proposal discovery is allowed, but do not adopt a bot proposal while an independent merger remains enabled without a verified live Dependabot exclusion, including queued work. Native GitHub automatic-merge state alone does not establish that exclusion. Once authorized, use the workspace controller's existing-PR preview and bound continuation; preserve useful proposal context and exact Issue ownership, and never create a duplicate PR to work around intake.

Verify dependency graph/security settings and the first actual hosted updater job and candidate lockfile separately. A merged configuration, missing PR or local pass is not discovery-success evidence. Keep operational prerequisites and current validation in the owning Issue; exact root integration remains separate.

Reference: [Dependabot options](https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-options-reference).
