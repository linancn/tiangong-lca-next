# Unified German (`de-DE`) delivery workspace

Issue [#601](https://github.com/linancn/tiangong-lca-next/issues/601) prepared and locally approved one region-neutral Standard German catalog. Activation Issue [#602](https://github.com/linancn/tiangong-lca-next/issues/602) established its single runtime bundle, and Issue [#606](https://github.com/linancn/tiangong-lca-next/issues/606) adds only the Calculation Bundle and Release UI delta. `de-DE` is the canonical app/storage tag; the product does not maintain separate German variants. Runtime aliases normalize to `de-DE`, while `de_DE` and `de` are controlled adapters for Ant Design/import-report schema and Day.js respectively.

This directory contains tracked candidate, context, terminology, and structural evidence. Completed human confirmation files are deliberately excluded: they stay under `.local/i18n-de-DE/`, are ignored by Git, and must not be pasted into an Issue, PR, or comment.

## Current gate state

- Accepted active baseline: merged `dev` commit `36836f2c` contains 2,689 messages in each of `en-US`, `zh-CN`, and the single `de-DE` runtime bundle; it carries forward the frozen #601 and merged #602 decisions without reopening them for Issue #606.
- Issue #606 delta: 48 new Calculation Bundle and canonical Release UI messages, with no modified baseline message or bundle-external prose item.
- Final topology: all three locales contain 2,737 messages and the same 30-module spread order.
- `runtime-activation-manifest.json` binds the accepted active baseline commit, current three-locale manifest, exact ordered 48-message delta, final count, adapter policy, and dataset-language fallback.
- Canonical-manifest checks reuse the checked-in source commit by default; a later movement of `origin/dev` does not invalidate unchanged locale/callsite evidence. `--write` or an explicit `--base-ref` is required to advance that provenance.
- The local #606 approval scope binds only those 48 new messages and their direct/dynamic callsite evidence. It does not reopen the already merged #601/#602 German catalog and activation decisions.
- Historical Pilot confirmation remains governed by its frozen local check; the separate 48-item #606 delta form is also local and ignored. Their checkers expose only generic approval state and never reviewer identity, date, decisions, response digest, or per-item notes.

These counts are generated evidence, not a completion claim.

The historical `context-ledger.json` remains the frozen #601 catalog evidence. The active #606 delta is derived against the accepted 2,689-message `dev` manifest and never rewrites that historical ledger.

## Goal and execution contract

The finished artifact is one active, region-neutral Standard German runtime catalog. Every new or changed candidate must be decided from canonical English and Chinese, concrete callsites or reviewed dynamic-family evidence, the product concept and user-visible consequence, neighboring messages and state transitions, LCA/TIDAS terminology, ICU structure, preserved technical tokens, and layout risk. A grammatically possible isolated-string translation is not sufficient.

Activation proceeds in five checkpoints:

1. preserve the accepted 2,689-message active German baseline from `dev` unchanged;
2. generate/check the three-locale canonical manifest and deterministic runtime activation manifest;
3. review only the 48 new Issue #606 Calculation Bundle and Release messages in the separate local delta form;
4. pass the active-runtime exact-assembly audit, including topology, ICU, token, baseline-value, adapter-literal, and regional-bundle checks;
5. run focused runtime proof, then the single final repository gate on the immutable delivery HEAD.

A generated delta form without a valid local approval block is useful review material but never satisfies the human checkpoint. Structural report mode remains runnable in that state, while enforcement fails closed; the current local form satisfies the checker.

Repository Jest and clean-release gates exercise that structural report boundary with explicit nonexistent confirmation paths. They require zero tracked structural findings and the expected missing-local-evidence findings; separate generated temporary forms prove approved behavior. No clean runner infers or claims human approval.

## Privacy and evidence boundary

GitHub may retain the task scope, implementation, generated candidate evidence, and resulting German product content. It must not retain:

- the local reviewer name or reference;
- the review date, checkboxes, decisions, or findings;
- a completed Markdown confirmation;
- a digest of the completed human response.

The tracked `scopeDigest` is allowed because it hashes only the material presented for review. It does not hash who approved it or how they answered. The checker prints only approval state and generic failure reasons; it does not echo the reviewer field or the form body.

One person may confirm all three review dimensions in the same local file:

1. product context and UI consequence;
2. natural, region-neutral Standard German;
3. LCA/TIDAS terminology.

The three dimensions are review questions, not three required identities. The candidate producer remains separately recorded as non-personal provenance.

## Artifact map

- `manifest.json`: generated active English/Chinese/German inventory, topology, ICU signatures, and production references.
- `decisions.yaml`: source-baseline decisions from Issue #600.
- `dynamic-families.json`: reviewed computed-message producers and fallback behavior.
- `glossary.yaml`: proposed German LCA/TIDAS and product terminology; unresolved choices stay explicit.
- `style-guide.md`: Standard German voice, grammar, ICU, fragment, token, and regional-neutrality rules.
- `evidence-sources.yaml`: authority and permitted-use register for product, TIDAS/ILCD, LCA, and language sources.
- `source-allowlist.json`: machine policy for exact English copy, preserved technical tokens, and intentional mappings.
- `context-annotations.json`: non-personal product-context proposals for reserved messages. It stores concept, UI role, consequence, rationale, evidence, and the current source-context hash, but never reviewer identity or decision.
- `context-ledger.json`: generated per-message English, Chinese, German candidate, runtime/context evidence, hashes, and structural findings. Do not edit it manually.
- `pilot.json`: 90 proposed German candidates with rationale, risk, and review dimensions.
- `pilot-review-pack.json`: generated machine source containing the 90 complete deterministic dossiers and current scope digest. It has no reviewer queues or human decisions.
- `review-log.yaml`: legacy-named, tracked provenance/policy manifest. It records non-personal candidate producers and local-evidence policy only; it is not a human review log.
- `translation-batches.json`: four non-overlapping leaf-file owner lanes and internal review slices.
- `activation-entry-translations.json`: the seven frozen #601 top-level translations assembled by `src/locales/de-DE.ts`.
- `runtime-activation-manifest.json`: deterministic, non-personal active-baseline and #606 delta contract. It contains only tracked-input digests, counts, message IDs, and runtime policy; it contains no reviewer identity, decision, response, or confirmation digest.
- `.local/i18n-de-DE/pilot-review-confirmation.md`: generated human-readable pilot form. It is ignored and local only.
- `.local/i18n-de-DE/catalog-review-confirmation.md`: completed #601 full-catalog form for the frozen 2,665-message baseline. #602 checks it locally against the immutable snapshot and does not regenerate it.
- `.local/i18n-de-DE/issue-606-delta-review-confirmation.md`: the independent 48-message Calculation Bundle and Release UI delta form.

## Commands

Refresh the deterministic active topology and activation manifest in dependency order:

```bash
npm run i18n:audit:write
npm run i18n:de:runtime:manifest:write
```

Generate the local #606 delta form without overwriting an existing file:

```bash
npm run i18n:de:delta:review:generate
```

Use `-- --force` only when intentionally replacing an obsolete form after preserving any useful notes. The generator writes atomically with local-only permissions. Repository-local input/output is accepted only below the ignored `.local/i18n-de-DE/` directory; tracked or non-ignored review files are rejected.

Check the filled delta form:

```bash
npm run i18n:de:delta:review:check
```

Inspect honest work-in-progress structural state without claiming human approval:

```bash
npm run i18n:de:pilot:report
npm run i18n:de:runtime:manifest:check
```

Final enforcement treats the merged 2,689-message runtime as the accepted baseline and requires separate private approval only for the 48-message #606 delta:

```bash
npm run i18n:de:audit
```

No command in this workflow posts a GitHub comment or calls the GitHub API.

## Frozen #601 pilot confirmation workflow (historical)

The steps below document how the original Pilot was reviewed. In active #602 work, do not regenerate these artifacts. `npm run i18n:de:pilot` now verifies that the tracked review pack still equals the immutable #601 snapshot and that the existing local confirmation still matches it.

1. Refresh the candidate ledger and pilot pack.
2. Generate `.local/i18n-de-DE/pilot-review-confirmation.md`.
3. Read all 90 entries with their English, Chinese, German candidate, callsite/dynamic evidence, product concept, UI role, user-visible consequence, terminology, ICU examples, length risks, rationale, and explicit questions.
4. Review the separate summaries for all 9 reserved-context proposals and both blocked glossary terms. `tidas.result-set` is included even though no pilot message directly uses it, because the pilot gate covers the complete current blocked-term policy.
5. Put message-specific change requests only inside the marked local note regions. If any Critical/Major issue remains, keep the applicable decision `PENDING` or use `CHANGES_REQUESTED`.
6. When everything is acceptable, fill the one JSON confirmation block: add a local reviewer reference and date, change all three decisions to `APPROVED`, and change all three approval flags to boolean `true`.
7. Run `npm run i18n:de:review:check`, then `npm run i18n:de:pilot`.
8. Do not add, commit, upload, paste, or quote the completed file. The gate reads it as a local input and never rewrites tracked artifacts.

The confirmation binds both:

- a canonical scope digest over the manifest/review-policy/pilot digests, candidate producer, all 90 context/translation/dossier/review-scope hashes, the 9 context proposals, and both blocked terms;
- the exact normalized body produced by the deterministic renderer, plus its visible-body digest, so deleting/replacing the English, Chinese, German, context, evidence, or risk material cannot be hidden by recomputing a digest. CRLF/LF line endings are normalized, while marked note regions remain writable.

Any material source, context, candidate, dossier, terminology, ICU parser, or review-policy change invalidates the old form and requires regeneration.

## Layered validation and evidence lifetime

Validation has three independent evidence domains. Do not invalidate or rerun a broader domain merely because a narrower one changed.

| Evidence domain | Controlled inputs | Proof during iteration | Invalidation |
| --- | --- | --- | --- |
| Frozen #601 Pilot/catalog | immutable #601 commit, 90-message Pilot pack, 2,665-message ledger/catalog, activation entries, provenance policy, and their existing ignored confirmations | frozen-snapshot comparison plus local Pilot/catalog confirmation checks; never regenerate these forms during #602 | a mismatch against the immutable #601 inputs blocks carry-forward and requires explicit investigation; #602 changes do not silently rewrite the baseline |
| Accepted active baseline | merged `dev` commit `36836f2c`, its 2,689-message three-locale manifest, and unchanged runtime policy | immutable Git snapshot and exact baseline-value comparison | a baseline commit, value, topology, or policy mismatch blocks carry-forward |
| Issue #606 runtime delta | the exact 48 new Calculation Bundle/Release messages, canonical three-locale manifest, dynamic-family callsite proof, runtime policy, and deterministic renderer | runtime-manifest report, private 48-item delta form, active topology/ICU/token/baseline-value audit, and focused locale/runtime tests | regenerate and re-confirm only after one of these delta inputs changes |
| Repository delivery checkpoint | exact committed `HEAD`, tracked tree, Node/dependency state, and lint/build/test/coverage/Docpact/gate configuration | the normal push hook runs Docpact and `npm run prepush:gate` once after the last controlled tracked change | a new controlled tracked change or relevant toolchain/dependency/configuration change requires one new final run |

Ignored local confirmation content and GitHub metadata are not repository full-gate inputs. They invalidate only the applicable local Pilot or catalog evidence. During normal delivery, do not run `npm run prepush:gate` manually and then immediately run a push whose hook repeats it. Let the hook own the one final full-gate execution. Run the full gate manually only for a no-push evidence handoff.

This workflow does not add a reusable passed-gate cache. Final delivery uses `npm run push:checked -- <normal git push arguments>` so the ordinary hook owns Docpact and the full gate once. A successful managed push leaves no receipt. Only a non-zero original transport result after a valid hook payload activates the ignored, one-hour, exact-intent receipt; argument-free `npm run push:retry` verifies the bound remote/refspec, commit, clean tree, toolchain, dependencies, gate inputs, and Docpact base before its internal exact-SHA `--no-verify` transport. Already-reached remote state succeeds idempotently; expiry, malformed state, controlled-input drift, or any other verified remote state fails closed. Raw `git push` still runs the hook but cannot activate this recovery path, and operators must never use `--no-verify` or `HUSKY=0` manually. Any Umi-generating focused test, coverage command, or full gate must finish before another starts because they share `.umi-test` state.

## Frozen #601 Pilot and catalog separation (historical)

Pilot confirmation approves exactly 90 candidates, 9 reserved-context proposals, and 2 term choices. It unlocks bulk translation only. It does not approve the other 2,623 messages or the other 619 currently reserved contexts.

After the 30 leaf modules, all context proposals, and all producer records existed, #601 generated and checked a separate full-catalog form. Its approval covered all 2,665 candidates with exact topology/key/ICU parity, zero invalid/missing context proposals, and zero unresolved Critical/Major issues. #602 verifies that frozen evidence against the immutable baseline; it does not regenerate or broaden the approval.

## Review sequence

1. Preserve merged `dev` commit `36836f2c` as the accepted 2,689-message baseline; investigate any frozen #601/#602 mismatch without regenerating inherited evidence.
2. Keep the one `de-DE` top-level bundle and its runtime/configuration adapters unchanged; no country-specific German bundle is allowed.
3. Generate the canonical three-locale manifest and deterministic runtime activation manifest.
4. Review and approve the separate private 48-item #606 delta form with its direct and dynamic-family callsite context.
5. Pass `npm run i18n:de:audit`, focused runtime/locale tests, and Docpact/scoped static checks.
6. Freeze the delivery commit and run the repository full gate once through `npm run push:checked -- <normal git push arguments>`; rerun it only if a controlled tracked input changes afterward or an expired failed-transport receipt has removed the bounded retry authority.

If step 4 becomes incomplete because a review-bound input changes, structural reports remain valid work-in-progress evidence but enforcement must fail closed until a fresh private form passes. A pending local human form is not a GitHub blocker record and must not be committed.
