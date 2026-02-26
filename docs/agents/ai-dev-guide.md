# AI Development Spec – Tiangong LCA Next

> Canonical execution doc for development tasks. Start from `AGENTS.md`, then open this file only when implementing or refactoring product code. Mirror requirement: keep `docs/agents/ai-dev-guide_CN.md` in sync whenever this file changes.

## Environment & Guardrails

- Node.js **>= 24** (`nvm use 24`) before install/build/test.
- Supabase keys are preconfigured in fallback `.env`; read through `src/services/supabase` only.
- No new npm dependencies without human approval.
- Service-first architecture: extend `src/services/<feature>/{data,api,util}.ts` first, then page/UI.

## Minimal Dev Commands

```bash
npm install
npm run start:dev
npm run lint
npm run test:ci -- tests/integration/<feature>/ --runInBand --testTimeout=20000 --no-coverage
npm run build
```

## Read-on-Demand Sections

1. Routing/menu changes
   - `config/routes.ts`
2. Shared table/drawer page patterns
   - `src/pages/Processes/**`
3. Complex lifecycle-model math
   - `docs/agents/util_calculate.md`
4. Testing and verification details
   - `docs/agents/ai-testing-guide.md`

## Architecture Contract

- Runtime: React 18 + `@umijs/max` 4 + Ant Design Pro + TypeScript.
- Entry points:
  - `src/app.tsx` for runtime/layout config.
  - `config/routes.ts` for routing/menu.
- Data boundary:
  - Supabase access only in `src/services/**`.
  - Page/components consume typed service APIs.

## Feature Implementation Workflow

1. Investigate first (`rg`, similar feature, existing tests).
2. Add/update types in `data.ts`.
3. Add/update queries and orchestration in `api.ts`.
4. Keep pure transforms/calculation in `util.ts`.
5. Wire UI in `src/pages/<Feature>/index.tsx` + `Components/`.
6. Reuse shared components from `src/components/**`.
7. Add/adjust tests and run verification gates.

## UI & i18n Rules

- Use React function components.
- Keep table/list workflow consistent: table -> toolbar -> drawer/modal form.
- All user-visible strings must use i18n (`FormattedMessage`, `intl.formatMessage`).
- Add locale keys in both `src/locales/en-US.ts` and `src/locales/zh-CN.ts`.

## Data-Source Behavior (Important)

Common data-source branches in list APIs:

- `tg`: default public/published path.
- `co`: contributed/shared path.
- `my`: current-user scoped path (requires session).
- `te`: team-scoped path (resolve team context first).

Keep behavior aligned with existing feature implementations.

## Quality Gates

- Add tests covering changed behavior.
- `npm run lint` must pass.
- Run focused Jest suites relevant to changed files.
- Supabase edge-function payload shape changes must include unit tests in `tests/unit/services/**`.

## Delivery Rules

- Keep diffs focused on the target feature.
- Update docs when behavior/workflow/commands change.
- If the changed behavior affects other teams, update both English and `_CN` docs in the same commit.
