# AGENTS – Tiangong LCA Next

Use this file as the jumping-off point for any coding agent. Keep it updated whenever build steps, workflows, or conventions change.

> Language contract: Only the English docs (no `_CN` suffix) are loaded into AI contexts. `_CN` mirrors exist for human readers—whenever you edit an English doc, sync the corresponding `_CN` file with equivalent content or release notes.

## Quick Orientation

- Node.js **>= 24** (run `nvm use 24` before `npm install`); repo ships a fallback `.env` with working Supabase keys—override only when pointing at a different Supabase project.
- React 18 + @umijs/max 4 + Ant Design Pro 5 + TypeScript; target `src/app.tsx` and `config/routes.ts`.
- Service-first: add types/api/helpers under `src/services/<feature>/{data,api,util}.ts`, then consume them from pages.
- UI is React function components only; reuse `src/components/**` primitives before building new ones.
- All user-visible strings go through Ant Design Pro i18n helpers (`FormattedMessage`, `intl.formatMessage`).
- Supabase access (auth, Postgres, storage, edge functions) is already wired; never instantiate ad-hoc clients outside the service layer.
- Do not add npm dependencies without explicit human approval.

## Core Commands

```
npm install
npm start
npm run lint
npm test
npm test -- tests/integration/<feature>/
npm run build
```

## Source-of-Truth Docs for Agents

- `docs/agents/ai-dev-guide.md` – exhaustive development spec (routing rules, service contracts, component patterns); mirror: `docs/agents/ai-dev-guide_CN.md`.
- `docs/agents/ai-testing-guide.md` – testing workflow checklist + commands; mirrors: `docs/agents/ai-testing-guide_CN.md`, with deep dives in `docs/agents/testing-patterns(.md|_CN.md)` and troubleshooting references in `docs/agents/testing-troubleshooting(.md|_CN.md)`.
- `docs/agents/util_calculate.md` – deep dive on `genLifeCycleModelProcesses`; mirror: `docs/agents/util_calculate_CN.md`.
- `README.md`, `README_CN.md`, `DEV*.md` – human-facing onboarding; reference instead of duplicating content here.

## Repo Landmarks

- `config/routes.ts` – mirrored routes for `/tgdata`, `/codata`, `/mydata`, `/tedata`; update every branch when adding shared pages.
- `src/services/**` – only surface allowed to talk to Supabase; expose typed helpers for React pages.
- `src/pages/<Feature>/` – page entry in `index.tsx` plus drawers/modals under `Components/`.
- `src/components/**`, `src/contexts/**`, `types/**` – shared UI, React contexts, and ambient types.
- `tests/{unit,integration}/**` – Jest suites; follow AI Testing Guide patterns for mocks and utilities.
- `docs/agents/**` – agent-specific references (supersedes the old GitHub prompt folder).

## Workflow Guardrails

- Investigate before writing code (`rg` for symbols, inspect closest existing feature, study service APIs).
- Extend services/types before UI; keep business logic out of React components.
- Keep list/drawer/modal patterns identical to existing table flows (table → toolbar → drawer forms).
- Respect access control helpers in `src/access.ts` and maintain i18n parity (EN + ZH keys defined in locale files).
- When editing lifecycle-model utilities, consult both util_calculate guides to avoid diverging from documented flow.

## Delivery Checklist

- Implement tests that mirror the change scope; use helpers from `tests/helpers/**`.
- `npm run lint` must pass (runs ESLint, Prettier check, and `tsc`).
- Run focused Jest suites (e.g., `npm test -- tests/integration/<feature>/`) plus any added specs.
- Keep diffs constrained to the relevant feature/service/tests/docs and update `docs/agents/**` or this file whenever behavior expectations change.
