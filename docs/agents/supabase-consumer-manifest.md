---
title: Next Supabase Consumer Manifest
docType: contract
scope: repo
status: active
authoritative: true
owner: next
language: en
whenToUse:
  - when changing app-side Supabase, PostgREST, Auth, Storage, Realtime, Edge Function, or signed-URL access
  - when supplying exact consumer evidence to database-engine schema migration work
whenToUpdate:
  - when the governed source roots, derivation rules, artifact schema, or verification command change
checkPaths:
  - contracts/supabase-consumer-manifest.v3.json
  - contracts/supabase-consumer-manifest.v3.schema.json
  - scripts/supabase-consumer-manifest.cjs
  - scripts/supabase-consumer-manifest.test.cjs
  - .github/workflows/supabase-consumer-manifest.yml
  - src/**
  - config/**
  - electron/**
lastReviewedAt: 2026-08-02
lastReviewedCommit: 33409ce1336d9cdfb3916d38a155cbf1c73bb7ab
lastReviewedNote: 'Created for Issue #753 from the immutable Next dev source tree; the artifact is candidate-only and preserves all external verification and delivery blockers.'
related:
  - AGENTS.md
  - docs/agents/repo-validation.md
  - docs/agents/repo-architecture.md
  - docs/agents/supabase-branching.md
---

# Next Supabase Consumer Manifest

## Contract

`contracts/supabase-consumer-manifest.v3.json` is a non-authorizing candidate inventory of every recognized shipped-source Supabase consumer occurrence in one immutable Git tree. It records exact file spans, operation, transport, credential profile, schema, object, consumer signature, expected ACL context, semantics, and upstream owner/status.

The artifact intentionally keeps `consumerZero=false`, lists all non-core `public` residue, and lists pending consumers. It does not authorize database freeze, hosted mutation, merge, deployment, or removal of compatibility objects.

## Derivation And Delivery Guard

The verifier reads blobs from `sourceTreeCommit` with `git cat-file`; it does not scan the manifest or current filesystem to derive occurrences. TypeScript/JavaScript is parsed with the TypeScript AST, and governed JSON is parsed structurally. Manifest verification requires exact ordered occurrence equality and global exactly-once spans.

The filtered governed tree is every tracked regular JS/TS/JSON blob under `src`, `config`, and `electron`. Both the immutable source tree and current delivery HEAD must produce the exact recorded path/mode/type/blob projection and SHA-256 digest. The manifest, schema, tests, workflow, and docs cannot make an old source snapshot appear current because they are outside the shipped-source roots; only the two exact audit-tool paths are named in the audit allowlist. Symlinks and non-regular governed files or artifacts fail closed.

The schema path and exact schema SHA-256 are bound by the verifier. A schema-byte change requires a reviewed verifier update and regenerated manifest; a manifest cannot select a permissive replacement schema.

## Dynamic And Alternate Syntax

Literal, dynamic, bracket-property, and chained `.from`, `.rpc`, `.schema`, Realtime, Storage, Auth, Edge Function, and relevant raw signed-fetch calls are AST-derived. Dynamic expressions remain visible as `<dynamic:...>` or `<dynamic-schema:...>` and remain pending upstream resolution. Destructured or detached Supabase capability helpers are rejected because they weaken exact call-site provenance.

Hard-coded service-role credential references and unapproved literal `*.supabase.co` origins are rejected. The shipped client profile remains browser publishable-key plus optional user session; SSR and service-role profiles stay explicit, non-authorizing assertions pending external verification.

## Commands

Regenerate only from the intended immutable source commit:

```bash
npm run supabase-consumer-manifest:verify
node scripts/supabase-consumer-manifest.cjs --write --source-commit <40-character-source-commit>
npm run supabase-consumer-manifest:check
```

Commit the generated artifact, verifier, schema, and tests together. After commit, rerun `npm run supabase-consumer-manifest:check` so the source/delivery ancestor and zero-drift gate evaluates the actual delivery HEAD.

## External Handoff

Database Engine Issue #357 must fetch the manifest and schema from the immutable delivery HEAD, hash the exact bytes, validate the canonical schema, independently rederive or verify the occurrence closure, and run the joint Supabase browser/SSR/Realtime lifecycle test before making any freeze decision. Workspace #484 remains the merge, deployment, promote, production, and root exact-SHA integration blocker.
