# Unified German (`de-DE`) delivery workspace

Issue [#601](https://github.com/linancn/tiangong-lca-next/issues/601) prepares one region-neutral Standard German UI. `de-DE` is the canonical storage tag, but the product will not maintain separate German variants. Runtime normalization of `de` and every `de-*` input belongs to activation Issue [#602](https://github.com/linancn/tiangong-lca-next/issues/602).

This directory contains tracked candidate, context, terminology, and structural evidence. Completed human confirmation files are deliberately excluded: they stay under `.local/i18n-de-DE/`, are ignored by Git, and must not be pasted into an Issue, PR, or comment.

## Current gate state

- Canonical messages: 2,665 (`2,658` leaf keys plus `7` activation-entry keys).
- Staged German candidates: 7 activation-entry candidates; approved runtime candidates: 0.
- Runtime-evidenced context: 2,037.
- Reserved compatibility messages without current runtime evidence: 628; 9 currently have complete hash-pinned proposals awaiting Pilot confirmation, while the other 619 still lack a valid proposal and remain structural blockers that no confirmation can waive.
- Pilot: 90 high-risk candidates; its 9 reserved-context proposals are structurally complete.
- Blocked glossary choices in the pilot scope: 2.
- The local pilot confirmation is pending. Bulk translation remains blocked and no leaf translation files exist.

These counts are generated evidence, not a completion claim.

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

- `manifest.json`: generated canonical English/Chinese inventory and production references from Issue #600.
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
- `activation-entry-translations.json`: seven staged top-level candidates owned by #602; it does not activate German.
- `.local/i18n-de-DE/pilot-review-confirmation.md`: generated human-readable pilot form. It is ignored and local only.
- `.local/i18n-de-DE/catalog-review-confirmation.md`: later full-catalog form, generated only after all 2,665 candidates and contexts exist. Pilot approval cannot substitute for it.

## Commands

Refresh deterministic context and pilot artifacts in dependency order:

```bash
npm run i18n:de:audit:write
npm run i18n:de:pilot:write
```

Generate the local pilot form without overwriting an existing file:

```bash
npm run i18n:de:review:generate
```

Use `-- --force` only when intentionally replacing an obsolete form after preserving any useful notes. The generator writes atomically with local-only permissions. Repository-local input/output is accepted only below the ignored `.local/i18n-de-DE/` directory; tracked or non-ignored review files are rejected.

Check a filled local form:

```bash
npm run i18n:de:review:check
```

Inspect honest work-in-progress state:

```bash
npm run i18n:de:pilot:report
node scripts/i18n/audit-german-candidate.mjs --mode report --check
```

Final enforcement commands intentionally fail while required scope is incomplete:

```bash
npm run i18n:de:pilot
npm run i18n:de:audit
```

No command in this workflow posts a GitHub comment or calls the GitHub API.

## Local pilot confirmation workflow

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

## Pilot and catalog separation

Pilot confirmation approves exactly 90 candidates, 9 reserved-context proposals, and 2 term choices. It unlocks bulk translation only. It does not approve the other 2,575 messages or the other 619 currently reserved contexts.

After the 30 leaf modules, all context proposals, and all producer records exist, generate and check the separate form with `npm run i18n:de:review:catalog:generate` and `npm run i18n:de:review:catalog:check`. Final candidate enforcement requires that file, all 2,665 candidates, exact topology/key/ICU parity, zero invalid/missing context proposals, and zero unresolved Critical/Major issues. Human confirmation can clear only structurally complete proposals awaiting approval; it can never conceal a missing, malformed, or stale proposal. The full-catalog confirmation follows the same privacy and canonical-body rules and may be completed by the same person across the three review dimensions.

## Review sequence

1. Complete and pass the local pilot confirmation.
2. Create the 30 leaf modules and translate the 2,658 leaf keys using English, Chinese, and the complete context ledger; do not mechanically translate isolated strings.
3. Resolve all remaining reserved-context proposals and structural findings while retaining exact source/context hashes.
4. Generate and complete the separate local full-catalog confirmation.
5. Pass `npm run i18n:de:audit` and hand the reviewed but still inactive single bundle to #602.
6. #602 alone adds the top-level locale entry, Ant Design `de_DE`, Day.js `de`, selector/persistence behavior, and normalization of every `de`/`de-*` input to the one `de-DE` bundle.

Research candidates may be drafted while a context is blocked so the reviewer can compare concrete alternatives. They remain excluded from runtime assets and do not unlock a batch until the applicable local scope passes.
