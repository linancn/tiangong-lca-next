# Unified German (`de-DE`) delivery workspace

Issue [#601](https://github.com/linancn/tiangong-lca-next/issues/601) prepares one region-neutral Standard German UI. `de-DE` is the canonical storage tag, but the product will not maintain separate German variants. Runtime normalization of `de` and every `de-*` input belongs to activation Issue [#602](https://github.com/linancn/tiangong-lca-next/issues/602).

This directory deliberately contains candidates and review evidence before runtime code. Issue #601 must not add `src/locales/de-DE.ts` or a language-menu option.

## Current gate state

- Canonical messages: 2,665 (`2,658` leaf keys plus `7` activation-entry keys).
- Runtime-evidenced context: 2,037.
- Reserved compatibility messages without current runtime evidence: 628; all default to `BLOCKED_CONTEXT`.
- Pilot: 90 high-risk candidates; 9 are reserved messages with proposed but unapproved context.
- Pilot domain review required: 81 messages.
- Qualified product-context, independent native-German, and German-capable LCA/TIDAS reviewers are not yet assigned.
- Bulk translation is blocked until the pilot is approved. No leaf translation files have been created yet.

These counts are generated evidence, not a completion claim. Run the commands below to refresh them.

## Artifact map

- `manifest.json`: generated canonical English/Chinese inventory and production references from Issue #600.
- `decisions.yaml`: human-maintained source-baseline decisions from Issue #600.
- `dynamic-families.json`: reviewed computed-message producers and fallback behavior.
- `glossary.yaml`: proposed German LCA/TIDAS and product terminology; blocked terms remain explicit.
- `style-guide.md`: Standard German voice, grammar, ICU, fragment, token, and regional-neutrality rules.
- `evidence-sources.yaml`: authority and permitted-use register for product, TIDAS/ILCD, LCA, and language sources.
- `source-allowlist.json`: machine policy for exact English copy, preserved technical tokens, and intentional mappings. It is not the evidence bibliography.
- `context-annotations.json`: reviewable decisions for messages without runtime evidence. A reserved key remains blocked until a named reviewer approves its evidence.
- `context-ledger.json`: generated, deterministic per-message context, context hash, candidate translation hash, and audit findings. Do not edit it manually.
- `pilot.json`: 90 proposed German candidates with rationale, risk, and required review domains.
- `pilot-review-pack.json`: generated reviewer-facing join of English, Chinese, runtime context, candidate, risk, and pinned hashes. Do not edit it manually.
- `review-log.yaml`: JSON-compatible YAML record for named, hash-pinned human approvals and findings.
- `translation-batches.json`: four non-overlapping leaf-file owner lanes and 200–350 key internal review slices.
- `activation-entry-translations.json`: seven staged top-level candidates owned by #602; it does not activate German.

## Commands

Refresh deterministic context and review artifacts:

```bash
npm run i18n:de:audit:write
npm run i18n:de:pilot:write
```

Inspect the honest pre-review state without failing the command:

```bash
npm run i18n:de:pilot:report
node scripts/i18n/audit-german-candidate.mjs --mode report --check
```

Final enforcement commands intentionally fail while required evidence is missing:

```bash
npm run i18n:de:pilot
npm run i18n:de:audit
```

`i18n:de:pilot` requires fresh product, independent native-German, and domain approvals pinned to both `contextHash` and `translationHash`. `i18n:de:audit` additionally requires all 30 leaf modules, exact topology/key parity, zero blocked context, ICU parity, approved source-copy tokens, and a fresh context ledger.

## Review sequence

1. Product-context reviewers resolve the 9 blocked pilot contexts and the glossary's blocked product terms.
2. Reviewers inspect `pilot-review-pack.json`, not isolated German strings.
3. Every pilot message receives a product-context and independent native-German approval; the 81 marked domain messages also receive domain approval.
4. Critical or Major findings are corrected, hashes are regenerated, and approvals are repeated for changed records.
5. Only after `npm run i18n:de:pilot` passes may the four file-owner lanes begin bulk translation.
6. Every bulk message receives independent native-German review; high-risk LCA/TIDAS copy receives domain review.
7. #602 may activate the one bundle only after #601 enforcement is clean.
