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
lastReviewedAt: 2026-04-28
lastReviewedCommit: 232b36c46bfc7b0d6095af577334ad6efb4e6e61
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
| mock not hit | wrong import path or mock order | verify module path and set mocks before importing the subject |
| provider or context error | missing wrapper or wrong test utility | use the repo helper that already provides the required wrapper |
| one gate fails only while another heavy gate is running locally | shared `.umi-test` regeneration from concurrent commands | rerun `npm run test:ci` and `npm run prepush:gate` serially |
| `ai-doc-lint` fails with `missing-review` after runtime, service, or test changes | required governed docs were not reviewed in the same PR | rerun `docpact lint`, inspect the required docs from `.docpact/config.yaml`, and touch the owning docs with a real review/update |

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
- rerun CI-lane reproductions serially before escalating a failure that only appears during local parallel gate runs
- update the owning testing docs only if workflow or state changed
