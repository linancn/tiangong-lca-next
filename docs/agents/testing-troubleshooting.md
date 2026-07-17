---
title: next Testing Troubleshooting
docType: runbook
scope: repo
status: active
authoritative: false
owner: next
language: en
whenToUse:
  - when Jest tests fail, hang, timeout, or reopen coverage gaps
  - when narrowing a failing suite to the shortest recovery path
  - when troubleshooting guidance for repo tests changes
whenToUpdate:
  - when the shortest supported recovery commands change
  - when common failure modes or first actions change
  - when the troubleshooting playbook becomes stale
checkPaths:
  - docs/agents/testing-troubleshooting.md
  - docs/agents/testing-patterns.md
  - docs/agents/repo-validation.md
  - scripts/test-runner.cjs
  - package.json
lastReviewedAt: 2026-07-17
lastReviewedCommit: f6f5cfaf79361e58dd20a01b5b3108a4e3eb4f56
lastReviewedNote: 'Retained Issue #606 focused-suite and active-delta recovery guidance while adopting Issue #611 clean-runner provenance, private-evidence, and setup-node hook recovery.'
---

# Testing Troubleshooting

> Purpose: shortest recovery path when tests fail, hang, timeout, or reopen coverage gaps.

## Focused Recovery Commands

Canonical baseline and proof ownership stays with `DEV.md` and `docs/agents/repo-validation.md`. Use this shortlist only for the narrow recovery command that matches the failure mode.

| Need | Command shape |
| --- | --- |
| focused integration | `npm run test:ci -- tests/integration/<feature>/ --runInBand --testTimeout=20000 --no-coverage` |
| focused unit or component | `npm run test:ci -- tests/unit/<scope>/ --runInBand --testTimeout=10000 --no-coverage` |
| detect open handles | `npm run test:ci -- <file> --runInBand --detectOpenHandles --no-coverage` |

## Failure Diagnosis

| Symptom | Likely cause | First action |
| --- | --- | --- |
| timeout or maximum update depth | loop in effect, stale mock, unresolved async state | narrow to one file, then inspect effect triggers and mocked promises |
| auth or session flow failing | missing provider, missing auth mock, stale route state | reuse existing auth wrapper and compare against nearby passing tests |
| element not found | query too early, wrong role/text, render path not reached | assert the prerequisite state first, then switch to semantic query |
| a visible action exists but the expected request never starts | the control is present but still disabled while prerequisite data loads | wait for the control to become enabled, then interact; do not replace the product guard with an arbitrary delay |
| mock not hit | wrong import path or mock order | verify module path and set mocks before importing the subject |
| provider or context error | missing wrapper or wrong test utility | use the repo helper that already provides the required wrapper |
| data workflow smoke assertion mismatch | `fixtures/data/**`, `fixtures/result/**`, workflow default path, or last-run artifact drifted apart | compare the case in `tests/data-workflows/fixtures/result/README.md`, then update the paired input fixture, expected-result Markdown, workflow lib default, and unit proof together |
| one gate fails only while another Umi-generating command is running locally | concurrent focused tests, coverage, or full gate regenerated shared `.umi-test` | stop or await every heavy command, then rerun only the narrow failed command serially; do not chain broad test, coverage, and full-gate reruns |
| local `docpact:gate` or manual `ai-doc-lint` fails with `missing-review` after runtime, service, or test changes | required governed docs were not reviewed in the same PR | rerun `npm run docpact:gate`, inspect the required docs from `.docpact/config.yaml`, and touch the owning docs with a real review/update |
| `i18n:audit` reports missing, duplicate, or computed message IDs | locale topology drift, one key has multiple owners, or a runtime family is not enumerated | inspect the reported key and callsites, update the canonical manifest/decision record, then rerun the audit before translating or adding an allowlist |
| canonical manifest is stale only because `origin/dev` advanced | an old checker resolved the moving ambient branch instead of the manifest's recorded source commit | run the fixed default `--check`, which validates the recorded commit and audited-input digest; use explicit `--base-ref` or `--write` only when intentionally advancing provenance |
| clean CI reports missing German confirmation files | a repository test implicitly read ignored `.local` evidence | pass an explicit nonexistent path and assert the expected confirmation-only findings; keep approved-form coverage in generated private fixtures and never add the real form to CI |
| frozen German Pilot check reports context or `offlineReviewConfirmation` drift | the inherited Issue #601 snapshot, context ledger, producer evidence, or ignored approval no longer matches its frozen source | stop runtime activation work and inspect the frozen English, Chinese, German, callsites, and approval hashes; do not regenerate or silently reinterpret the approved baseline |
| active German runtime manifest is stale | a controlled locale, runtime-family, context, policy, or activation input changed after generation | inspect the diff, then run `npm run i18n:de:runtime:manifest:write` only after the controlled change is final and rerun the manifest check |
| Issue #606 delta review is missing, malformed, or stale | the ignored local form is incomplete, its normalized body/hash changed, or the exact 48-message release scope no longer matches | regenerate with `npm run i18n:de:delta:review:generate`, obtain fresh human approval for the entire 48-item body, and run `npm run i18n:de:delta:review:check`; never commit or upload reviewer details |
| local German review generation refuses to overwrite | an existing form may contain human notes or decisions | preserve the file, regenerate to another private path, or use explicit `--force` only after intentionally discarding the obsolete form |
| local German review rejects its input/output path | the path is inside the repository but outside ignored `.local/i18n-de-DE/`, is tracked, or traverses a symlink | keep completed evidence in the private ignored directory (or an external private path); never move it under tracked docs |
| active `i18n:de:audit` reports frozen-snapshot, delta-inventory, descriptor-family, or assembly drift | the active catalog no longer equals the frozen baseline plus the declared reviewed delta, or one closed runtime family disagrees with its formatter/callsites | fix the structural mismatch without broadening the approved delta, refresh the runtime manifest, obtain new local delta approval only when its reviewed body changed, then rerun the narrow German gates |
| managed push transport fails after both gates pass | `push:checked` activated the ignored exact-intent receipt and the remote may or may not have accepted the commit | run argument-free `npm run push:retry`; it succeeds idempotently when the exact SHA already arrived and otherwise retries only while the remote and all bound inputs remain unchanged |
| raw push fails after its hook passed but no receipt exists | only `push:checked` can bind the original push intent and activate bounded recovery after a failed transport | run a fresh `npm run push:checked -- <normal-git-push-args>` so its ordinary hook re-establishes evidence; never use `--no-verify` or `HUSKY=0` manually |
| every hook-driven receipt test exits before either fake gate on GitHub Ubuntu | the hook forced `nvm use 24` even though `setup-node` had already activated Node 24 outside NVM | verify the active Node major first, use it when already 24, and consult NVM only as a fallback |

## Open-Handle Playbook

1. rerun the narrowest failing file with `--detectOpenHandles`
2. inspect unresolved timers, intervals, subscriptions, or pending promises
3. confirm cleanup runs in `afterEach`, `useEffect`, or helper teardown
4. rerun the file without watch mode

## Coverage Gap Playbook

1. identify the touched file or reopened queue head
2. prefer a real test for the missing branch
3. if the branch is dead, remove it without changing behavior
4. rerun focused proof
5. rerun the coverage proof defined in `docs/agents/repo-validation.md` only after the gap is actually closed

## Final Verification

- rerun the narrow failing scope
- rerun neighboring suites if shared behavior changed
- rerun the baseline proof from `docs/agents/repo-validation.md` when the failure affected shipped behavior or repo gates
- for a concurrency-only failure, wait for all Umi-generating commands to exit and rerun the narrow failed proof serially before escalating; reserve the full gate for the final controlled checkpoint
- update the owning testing docs only if workflow or state changed
