# German UI localization style guide

Status: proposed; native-German, product, and LCA/TIDAS approval are still required.

This guide governs the single TianGong German UI. The canonical technical tag is `de-DE`, the menu label is `Deutsch`, and every `de` or `de-*` request must resolve to this one bundle. The product does not maintain Austrian, Swiss, or other regional German copy. Use broadly understandable Standard German, `de-DE` orthography (including `ß`), and no region-specific vocabulary, examples, currencies, administrative terms, or formatting branches.

## Translation evidence and decision order

Translate a message only when its context ledger status permits it. Read, in order:

1. the canonical English text and source location;
2. the Chinese counterpart as disambiguation evidence, never as a German sentence template;
3. every production callsite, `defaultMessage`, component symbol, dynamic-family proof, and unknown-value handling record;
4. placeholders and ICU argument signatures;
5. the message's UI role, adjacent messages, user-visible consequence, and applicable glossary entries;
6. the authoritative evidence sources referenced by the glossary.

If the evidence conflicts, the product concept is unclear, or a reserved message has no reviewed annotation, mark `BLOCKED_CONTEXT` or `BLOCKED_TERM`. Do not guess. Machine translation, LLM output, Wikipedia, and general dictionaries may suggest candidates but cannot approve a decision.

## Voice and address

- Use professional, concise, formal German.
- When direct address is necessary, use `Sie`, `Ihr`, and the corresponding formal imperative. Never mix in `du`, `dein`, or `euch`.
- Prefer neutral, impersonal sentences where that is clearer: `Version {currentVersion} kann nicht eingereicht werden.`
- Do not blame the user. Describe the state, consequence, and recovery action.
- Use neutral role labels such as `Teammitglied`, `prüfende Person`, and `verantwortliche Person`. Do not introduce gender symbols or role terminology that the product owner has not approved.

## UI roles

### Buttons and compact actions

Use concise infinitives without a period: `Speichern`, `Löschen`, `Auswahl aufheben`. Distinguish concepts rather than reusing one convenient verb:

- `Löschen` permanently deletes an entity or persisted data.
- `Entfernen` removes an item from a selection, relation, or list without claiming the entity was deleted.
- `Zur Prüfung einreichen` starts the review workflow.
- `Prüfung genehmigen` and `Prüfung ablehnen` are review actions only after the state-machine context confirms that meaning.

### Labels, headings, and navigation

- Use sentence case; do not copy English Title Case.
- German nouns retain normal capitalization.
- A navigation label must use the same core term as the destination page title.
- Keep entity types explicit where adjacent entities can be confused: `Fluss`, `Flusseigenschaft`, `Austausch`, `Quelldatensatz`, and `Datenquelle` are not interchangeable.

### Confirmation dialogs

Use a complete, unambiguous question naming the destructive action and object where context permits it:

> Möchten Sie diesen Datensatz wirklich löschen?

The button remains `Löschen`; the body carries the consequence. Do not introduce a stronger consequence than the implementation has.

### Status, validation, error, and recovery text

- Use complete sentences with punctuation for status explanations, errors, warnings, and help text.
- State the failed action and the next useful action: `Der TIDAS-Export ist fehlgeschlagen. Versuchen Sie es erneut.`
- Preserve the actual severity and blocking behavior. `Empfohlen` and `Optional` must not imply that save is blocked.
- Keep human review (`Prüfung`), automated validation (`Validierung`), and formal compliance (`Konformität`) distinct.
- Do not expose internal enum spelling when a localized fallback is designed to hide it. Unknown runtime values remain interpolation data, never computed message IDs.

## Grammar, compounds, and typography

- Form ordinary German compounds as one word: `Datensatz`, `Flusseigenschaft`, `Einheitengruppe`, `Referenzfluss`.
- Join acronyms, brands, file formats, or letter sequences to German nouns with a hyphen: `TIDAS-Paket`, `ILCD-Format`, `LCIA-Methode`, `ZIP-Datei`, `Snapshot-ID`.
- Use German quotation marks `„…“` and the ellipsis character `…` in user-facing prose.
- Prefer `geografisch` consistently.
- Use a space before `%` in prose and labels, for example `95 %`, unless a runtime formatter controls the entire value.
- Do not add a final period to labels and buttons. Add punctuation to complete prose.
- Avoid grammar that depends on the unknown gender or case of a placeholder. Prefer `Datensatz „{name}“ wurde gelöscht.` over a construction whose article must agree with `{name}`.
- Preserve file names, paths, version numbers, UUIDs, chemical symbols, and units exactly unless the runtime formatter owns them.

## ICU, placeholders, rich text, and fragments

- Placeholder names and types are immutable. Never translate `{count}`, `{jobId}`, `{message}`, or any other argument name.
- ICU control tokens such as `plural`, `select`, `one`, `other`, and `#` are syntax, not copy.
- Every `one` and `other` branch must be a complete grammatical German phrase or sentence. Nested plural structures must preserve all branches and arguments.
- Do not hard-code German decimal or thousands separators into translations. Numbers, dates, and quantities must remain owned by ICU/Intl or the existing frontend formatter.
- Preserve rich-text tags and component placeholders exactly. Review their surrounding German word order in the rendered component.
- A fragment may be translated only after confirming every producer and consumer. Prefer a complete sentence over concatenated prefixes or suffixes; do not recreate fragment assembly in German.

## Domain terminology

The project glossary is binding once approved. In particular:

- `Ökobilanz` is the discipline or assessment; `Lebenszyklusmodell` is the model data type.
- `Fluss`, `Flusseigenschaft`, and `Austausch` encode different LCA concepts.
- `Quantitative Referenz`, `Referenzfluss`, `Referenzflusseigenschaft`, and `funktionelle Einheit` are distinct.
- `Sachbilanz`/`LCI` and `Wirkungsabschätzung`/`LCIA` are distinct phases.
- `Quelldatensatz` is an entity; `Datenquelle` is an origin of data or evidence.
- `Prüfung`, `Validierung`, and `Konformität` are separate workflows or concepts.

When a compact UI needs an abbreviation, retain the approved expansion elsewhere in the same surface or help copy. Do not invent a shorter synonym that changes the concept.

## Source-copy and token policy

`source-allowlist.json` is the machine-readable policy for German text that may intentionally preserve an English technical token or, exceptionally, an entire English message. It is not an evidence bibliography. `evidence-sources.yaml` records authoritative context and terminology evidence.

The preserve list is permission, not a mandate: a translator may retain a listed technical token where the context requires it. Unlisted source-language acronyms or product tokens must be reviewed. The mapping list defines intentional German mappings such as `AI` → `KI`; branded uses require an explicit message-level exception. Runtime values, placeholder contents, backend enum values, identifiers, paths, units, and symbols are data, not translatable source copy.

## Review and release gates

- A translator records a candidate and pins its `contextHash` and `translationHash`.
- An independent native-German reviewer must cover every message and must not be the translator.
- A German-capable LCA/TIDAS reviewer must cover every message marked for domain review.
- Product review resolves workflow semantics, dangerous actions, privacy/permission language, and blocked reserved-key context.
- Any source, context, or German change invalidates a hash-pinned approval.
- Release requires zero `BLOCKED_CONTEXT`, zero `BLOCKED_TERM`, zero stale approvals, and zero unresolved Critical or Major findings.
- Issue #601 must not add `src/locales/de-DE.ts` or activate a language menu. Runtime activation and all `de`/`de-*` normalization belong to Issue #602.
