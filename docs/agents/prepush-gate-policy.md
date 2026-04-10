# Pre-Push Gate Policy – Tiangong LCA Next

> This file defines the intended `prepush:gate` trigger policy for this repository. Until the hook and CI changes land, `AGENTS.md` and the existing testing docs remain the runtime source of truth for the current behavior. Mirror requirement: update `docs/agents/prepush-gate-policy_CN.md` together with this file.

## Goal

Keep the repository-wide `100/100/100/100` coverage requirement intact while moving the heaviest gate away from every feature-branch push.

The policy should protect the merge points that matter:

- daily trunk: Git `dev`
- release/promote branch: Git `main`

It should not force every local feature-branch push to wait for the full `lint + full coverage + strict assertion` cycle.

## Exact Gate Command

The authoritative full gate command remains:

```bash
npm run prepush:gate
```

Today that means:

```bash
npm run lint
npm run test:coverage
npm run test:coverage:assert-full
```

This command stays unchanged. The policy only changes **when** it runs automatically.

## Target Trigger Rules

### 1. Local `pre-push` hook

Target behavior:

- If the current branch is `main`, `.husky/pre-push` must run `npm run prepush:gate`.
- If the current branch is anything other than `main`, `.husky/pre-push` should skip the heavy gate and exit successfully.

Result:

- local feature / fix / docs / chore branches are not blocked by the full gate on every push
- direct pushes to `main` still receive the strongest local protection

### 2. Pull requests into `dev`

Target behavior:

- every PR whose base branch is `dev` must run the full `prepush:gate` equivalent in GitHub Actions
- that CI check should be treated as a required merge check

Reason:

- `dev` is the real daily trunk for this repository
- the most important merge protection must exist at the `dev` PR boundary, not only at `main`

### 3. Pull requests into `main`

Target behavior:

- every PR whose base branch is `main` must also run the full `prepush:gate` equivalent in GitHub Actions
- that CI check should be treated as a required merge check

Reason:

- `main` is the promote / release branch
- release promotion should pass the same strict repository-wide quality gate

### 4. Feature-branch pushes

Target behavior:

- plain pushes to non-`main` working branches must **not** run the local heavy gate automatically
- plain pushes to non-protected branches do not need a second CI-only `100%` gate unless a separate workflow explicitly needs it

Reason:

- the branch is not a merge point
- the heavy gate belongs on protected integration boundaries, not on every checkpoint push

### 5. Post-merge pushes

Do not design the policy around a separate “merge completed” trigger.

Reason:

- a merge into `dev` or `main` already materializes as a push on that branch
- adding an extra `pull_request.closed` or “merged” trigger for the same heavy gate risks duplicate execution
- the authoritative merge protection should come from required PR checks before merge, not from a redundant after-merge rerun

## Manual Usage Rule

Even when the local hook skips the heavy gate on non-`main` branches, contributors and agents must still use:

```bash
npm run prepush:gate
```

when they need one of these:

- exact reproduction of the repository-wide full gate before opening or updating a PR
- confidence before a risky refactor or large test-impacting change
- diagnosis of CI failures on `dev` / `main` PR checks

In short:

- automatic trigger becomes narrower
- manual command remains fully available

## Why This Policy Is Preferred

### Protect the correct branch boundaries

This repo follows a dev-first branch model:

- routine work merges into `dev`
- promotions merge from `dev` into `main`

So the strongest automatic quality gate belongs on PRs into `dev` and `main`, not on every local push from every working branch.

### Keep the quality bar unchanged

The policy does **not** lower the quality standard.

It keeps:

- full lint
- full coverage run
- strict repo-wide `100%` assertion

It only moves the heavy enforcement to the branch boundaries that matter most.

### Reduce local iteration cost

The full gate is intentionally expensive. Running it on every feature-branch push slows down normal iteration, especially for:

- small checkpoint pushes
- doc-only updates
- branch-to-branch collaboration
- stacked PR cleanup and review follow-up

The repository still benefits from the gate, but contributors do not pay the full cost on every intermediate push.

## Implementation Contract

When this policy is implemented:

1. `.husky/pre-push` should branch on the current local branch name and only run the heavy gate for `main`.
2. GitHub Actions should run the full gate for PRs targeting `dev`.
3. GitHub Actions should run the full gate for PRs targeting `main`.
4. Branch protection should require those CI checks before merge.
5. The older docs that describe “every local push runs the heavy gate” must be updated in the same change set so the repo has one coherent story.

## Short Rule Summary

- Local auto gate: only on `main`
- Required CI gate: PR to `dev`
- Required CI gate: PR to `main`
- Manual full gate: always available via `npm run prepush:gate`
- No duplicate heavy gate just because a PR merge also creates a push event
