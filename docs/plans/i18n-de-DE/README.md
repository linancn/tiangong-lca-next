# Unified German (`de-DE`) delivery workspace

Issue [#601](https://github.com/linancn/tiangong-lca-next/issues/601) prepares one region-neutral Standard German UI. `de-DE` is the canonical storage tag, but the product will not maintain separate German variants. Runtime normalization of `de` and every `de-*` input belongs to activation Issue [#602](https://github.com/linancn/tiangong-lca-next/issues/602).

This directory deliberately contains candidates and review evidence before runtime code. Issue #601 must not add `src/locales/de-DE.ts` or a language-menu option.

## Current gate state

- Canonical messages: 2,665 (`2,658` leaf keys plus `7` activation-entry keys).
- Staged German candidates: 7 activation-entry candidates; human-review-approved candidates: 0. Candidates are not counted as completed translations.
- Runtime-evidenced context: 2,037.
- Reserved compatibility messages without current runtime evidence: 628; all default to `BLOCKED_CONTEXT`.
- Pilot: 90 high-risk candidates; 9 are reserved messages with proposed but unapproved context.
- Pilot domain review required: all 90 messages under the authoritative ledger-or-pilot union.
- Full-catalog German-capable LCA/TIDAS review required: all 2,665 messages. Known domain messages carry specific machine-readable reasons; all others use a conservative no-exemption default so heuristic classification cannot silently skip review.
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
- `context-annotations.json`: reviewable decisions for messages without runtime evidence. A reserved key remains blocked until an assigned human reviewer approves its evidence and pins the current source-context hash.
- `context-ledger.json`: generated, deterministic per-message context, context hash, candidate translation hash, and audit findings. Do not edit it manually.
- `pilot.json`: 90 proposed German candidates with rationale, risk, and required review domains.
- `pilot-review-pack.json`: generated reviewer-facing join of English, Chinese, runtime context, candidate, risk, and pinned hashes. Do not edit it manually.
- `review-log.yaml`: JSON-compatible YAML record for GitHub-verified human reviewer assignments, copyable record templates, named candidate producers, hash-pinned approvals, external attestations, and findings. A non-empty reviewer string or self-declared `human` flag is not valid evidence.
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

`i18n:de:pilot` first revalidates the context ledger, then requires fresh product, independent native-German, and domain approvals pinned to `contextHash`, `translationHash`, and the pilot `reviewScopeHash`. Duplicate decisions are invalid. `i18n:de:audit` additionally requires all 30 leaf modules, exact topology/key parity, zero blocked context/terms, full named production evidence, 100% independent native-German review, all applicable domain reviews, ICU branch parity, approved source-copy exceptions, and a fresh context ledger.

## Human evidence workflow

`review-log.yaml.recordTemplates` is the machine-readable source for pilot, structured producer, bulk-review, and external-attestation record shapes. An AI producer is a canonical `{type, id, displayName}` actor; a GitHub-human producer additionally carries `githubLogin` and uses the immutable numeric GitHub user ID as `id`. Human reviewer roles likewise record immutable reviewer and assigner IDs. The API verifies every current login↔ID binding, so a display name or renamed login cannot bypass independence. Reviewers do not need to infer fields from the scripts.

1. Record a reviewer GitHub login plus immutable numeric user ID, concrete qualification evidence, and the different assigning maintainer's login plus immutable user ID; set `identityType` to `github-human` and `status` to `assigned`.
2. Run report mode to generate the role-assignment marker under `reviewAttestationRequirements` in the ledger or pilot pack.
3. A different repository maintainer with `maintain` or `admin` permission posts a comment on Issue #601 whose entire trimmed body is that exact `decision=APPROVED` marker. Add the comment URL as `assignmentAttestationUrl`.
4. Copy the applicable review template, fill one current record per message/role, and rerun the generators. The generated review-scope marker binds the complete record set and all applicable hashes.
5. The assigned reviewer personally posts a comment on Issue #601 whose entire trimmed body is that exact `decision=APPROVED` scope marker. Add its digest and comment URL to `externalAttestations`.
6. Enforcement verifies that each comment actually belongs to Issue #601, its author's login and immutable user ID, exact whole-body marker, and maintainer permission through the GitHub API. Marker context binds the canonical audit, candidate gate, pilot gate, ICU parser, attestation verifier, and declared policy sources, so a review-policy implementation change requires new attestations. Assigned roles therefore require network access and, where needed, `GH_TOKEN` or `GITHUB_TOKEN`.

## Review sequence

1. Assign real GitHub human identities and qualification evidence for product-context, native-German, and German-capable LCA/TIDAS roles, then complete the externally verified assignment workflow above.
2. Product-context reviewers resolve the 9 blocked pilot contexts and the glossary's blocked product terms.
3. Reviewers inspect `pilot-review-pack.json`, not isolated German strings.
4. Every pilot message receives product-context, independent native-German, and domain approval.
5. Critical or Major findings are corrected, hashes are regenerated, and approvals are repeated for changed records.
6. Only after `npm run i18n:de:pilot` passes may the four file-owner lanes begin bulk translation.
7. Every bulk message receives independent native-German review; all ledger-marked LCA/TIDAS copy receives domain review.
8. #602 may activate the one bundle only after #601 enforcement is clean.

Research candidates may be drafted while context is blocked so reviewers can compare concrete alternatives. They are never approved translations, may not enter runtime locale assets, and do not unlock a batch until the context and review gates pass.
