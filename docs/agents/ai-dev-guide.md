# AI Development Spec – Tiangong LCA Next

> Agents: this English file is canonical. Keep `docs/agents/ai-dev-guide_CN.md` in sync whenever you touch this doc, but ignore the mirror while executing tasks.

## Environment & Tooling

- Node.js **>= 24** (enforced by `package.json`); run `nvm use 24` or install the required runtime before `npm install`.
- Supabase env keys (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`) ship in the repo’s fallback `.env`, so local testing works without extra setup; override only when pointing at a different Supabase project and keep loading them via `src/services/supabase`.
- No new npm packages unless a human maintainer signs off.

## Core Commands

```
npm install
npm run start:dev   # dev env, no mock, REACT_APP_ENV=dev
npm start           # generic dev alias
npm run lint        # eslint + prettier check + tsc
npm test -- tests/integration/<feature>/
npm run test:report
npm run build
```

## AI Delivery Workflow

1. Explore with `rg`, `ls`, and existing feature routes to find the closest reference implementation.
2. Update `config/routes.ts` whenever a shared feature touches `/tgdata`, `/codata`, `/mydata`, `/tedata`; mirror entries across data sources.
3. Extend the service layer first: define types (`data.ts`), Supabase queries (`api.ts`), and pure helpers (`util.ts`) under `src/services/<feature>/`.
4. Build the page entry in `src/pages/<Feature>/index.tsx`, then fold drawers/modals into `src/pages/<Feature>/Components/`.
5. Prefer shared UI from `src/components` (e.g., `TableFilter`, `ToolBarButton`, `ImportData`, `ExportData`, `AllVersionsList`, `ContributeData`, `Notification`).
6. Validate work using `docs/agents/ai-testing-guide.md`, run `npm run lint`, and execute the most relevant `npm test -- <pattern>`.
7. For lifecycle-model math (`genLifeCycleModelProcesses`), consult both `docs/agents/util_calculate.md` and `_CN` to keep behavior aligned with documented flows.

## Architecture Snapshot

- **Runtime stack**: React 18, `@umijs/max 4`, Ant Design Pro 5, TypeScript 5.9+.
- **Entry points**: `src/app.tsx` (layout/runtime config) and `config/routes.ts` (menus & routing).
- **Data layer**: Supabase Postgres tables, Supabase Auth, storage, and edge function `update_data`; access exclusively via `src/services/**`.
- **Domain SDK**: `@tiangong-lca/tidas-sdk` for ILCD data models/helpers.
- **Testing**: Jest + Testing Library (`tests/unit/**`, `tests/integration/**`); coverage via `npm run test:report`.

## Directory Contract

- `docs/agents/**` – AI-specific specs (replaces `.github/prompts`).
- `config/routes.ts` – centralized Umi routing/menu definitions.
- `src/access.ts` – runtime access-control helpers.
- `src/components/**` – reusable widgets (import via `@/components`).
- `src/contexts/**` – React contexts for shared state (units, references, etc.).
- `src/pages/<Feature>/` – page entry (`index.tsx`) plus `Components/` for drawers/modals.
- `src/pages/Utils/**` – shared utilities for reviews, version helpers, imports.
- `src/services/<feature>/{api,data,util}.ts` – Supabase queries, typings, pure transforms.
- `src/style/custom.less` – global style overrides.
- `tests/{unit,integration}/**` – Jest suites (respect Testing Guide patterns).
- `types/**` – ambient declarations and shared TypeScript types.

## Feature Module Blueprint

- **Entry**: `src/pages/${Feature}/index.tsx` pulls `dataSource = getDataSource(useLocation().pathname)` (`tg` | `co` | `my` | `te`) and `lang = getLang(useIntl().locale)`.
- **Table**: Use `ProTable<RowType>` with `actionRef` for reloads; `request` delegates to `<feature>TableAll(params, sort, lang, dataSource, tid, stateCode, extraFilters)`.
- **Toolbar**: compose `TableFilter` (date/state/type filters), `ToolBarButton` actions, and toggles for `ImportData` / `ExportData` / review drawers.
- **Columns**: `index` (valueType "index"), `name` with tooltip on `generalComment`, `classification` via `classificationToString`, `version` rendered through `AllVersionsList`, `actions` via `TableDropdown` hooking to drawers or deletions.
- **Drawers/Modals**: keep width ~720px, manage local state for tabs/forms, and reset forms (`formRef.current?.resetFields()`) on close.
- **Review flows**: reuse `ReviewDetail` components with proper `processId`, `processVersion`, and `searchTableName` props.

## Service Layer Playbook

- CamelCase exports (`getProcessTableAll`, `createProcess`, `updateProcess`). Store shared select strings/constants near the top of the file.
- List functions: derive `sortBy`/`orderBy`, call `supabase.from(table).select(selectStr, { count: 'exact' }).order(...).range(...)`.
- Data-source filters:
  - `tg`: `state_code = 100`, optional `team_id = tid`.
  - `co`: `state_code = 200`, optional `team_id = tid`.
  - `my`: enforce auth via `supabase.auth.getSession()`, filter by requesting user, optional `stateCode`.
  - `te`: fetch `team_id` via `getTeamIdByUserId()` and filter accordingly.
- Enrich rows via `Promise.all` (e.g., `getILCDLocationByValues`, `getSubmodelsByProcessIds`), map derived fields (`classificationToString`, `genProcessName`, `getLangText`).
- `create*`: insert ordered JSON plus `rule_verification` results. `update*`: invoke Supabase edge function `update_data` with bearer token and `FunctionRegion.UsEast1`.
- Keep utilities pure (formatting, classification, calculations) inside `util.ts`; reuse `@tiangong-lca/tidas-sdk` types for IO contracts.
- Log Supabase errors (`console.error`) and return `{ data: [], success: false, error }` for predictable handling.

## UI Interaction & Shared Components

- Layout lives in `src/app.tsx` (dark-mode toggle, `SelectLang`, `Notification`, `AvatarDropdown`).
- Messaging: `message.success` / `message.error` with translated strings. Guard async flows with explicit loading state + `Spin`.
- Tables/forms/drawers/modals rely on Ant Design Pro primitives (`ProTable`, `ProFormText/Select/List`, `Drawer`, `Modal.confirm`).
- Search/filter widgets: `Input.Search`, `Select`, `Checkbox`, always controlled via React state.
- Data import/export: `ImportData`, `ExportData`, `ContributeData` components. Reviews: `ReviewDetail` + review form components under `Processes/Components/Review`.
- Frequently reused helpers: `TableFilter`, `ToolBarButton`, `AllVersions`, `Notification`, `LCIACacheMonitor`, contexts under `src/contexts`, and general helpers in `src/services/general/**`.

## Internationalization, State & Typing

- Locale files: `src/locales/en-US.ts` & `src/locales/zh-CN.ts` (plus per-feature splits). Use `<FormattedMessage id='...' />` in JSX and `intl.formatMessage` in logic.
- Follow naming convention `pages.<feature>.<scope>`; update both locale files for any new key. Format numbers/dates with `intl` helpers or `formatDateTime`.
- State management: prefer hooks (`useState`, `useRef`, `useEffect`). Keep `actionRef.current?.reload()` for table refresh and `formRef` for ProForm reset.
- Use contexts for cross-component state (UnitsContext, RefCheckContext, UpdateReferenceContext). Avoid mutable singletons.
- Import domain models from `@tiangong-lca/tidas-sdk` where possible; export row/form types from `src/services/<feature>/data.ts`.
- Validation lives in ProForm `rules` or helper functions ( `percentStringToNumber`, `comparePercentDesc`). IDs come from `uuid.v4`, versions from constants like `initVersion`.

## Quality Gates & Testing

- Every feature change needs matching unit/integration coverage; reuse helpers under `tests/helpers/**`.
- `npm run lint` must pass (ESLint + Prettier check + `tsc`). Resolve diagnostics before delivering work.
- Run targeted Jest commands (e.g., `npm test -- tests/integration/<feature>/`) plus any new suites you add.
- Supabase edge-function payloads demand unit tests in `tests/unit/services/**` to verify invocation shape.
- Keep diffs scoped; update this doc or other `docs/agents/**` files whenever you change expectations.

## Reference Patterns

- `src/pages/Processes/index.tsx` – canonical list + drawer flow.
- `src/pages/Processes/Components/create.tsx` – ProForm tabbed create drawer.
- `src/pages/LifeCycleModels/Components/edit.tsx` – edge function edit path.
- `src/services/processes/api.ts` – complex list queries with enrichment.
- `src/services/general/util.ts` – pure helpers and calculations.
- `src/app.tsx` – layout configuration, initial state fetching, and actions.
