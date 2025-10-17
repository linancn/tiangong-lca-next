# AI Development Spec (Spec Coding) - TianGong LCA Next

CRITICAL RULES:

- This file is the authoritative dev spec for AI-driven work. Do not guess or source external docs.
- Implement everything in TypeScript + React 18 function components; do not introduce legacy class components.
- Route all data access through the Supabase service layer under `src/services/**`; never instantiate raw clients inside page components.
- All user-facing text must use Umi i18n helpers (`FormattedMessage` / `intl.formatMessage`). No hard-coded literals.
- Never add new npm packages or dependencies; if something is truly required, pause and request explicit approval from a human maintainer.

---

## AI Quick Start Workflow

1. Inspect existing patterns with `rg` or `ls` (for example `rg "getProcessTableAll" -n src`) to identify the closest reference feature.
2. Confirm routing implications in `config/routes.ts`; mirror new entries under every data-source branch (`/tgdata`, `/codata`, `/mydata`, `/tedata`) when the feature is shared.
3. Extend the service layer first: define types in `src/services/<feature>/data.ts`, Supabase calls in `src/services/<feature>/api.ts`, and pure helpers in `src/services/<feature>/util.ts`.
4. Build or update the page entry in `src/pages/<Feature>/index.tsx`, following existing list-view patterns, then flesh out drawer/modal components inside `src/pages/<Feature>/Components/`.
5. Prefer shared UI from `src/components` (for example `TableFilter`, `ToolBarButton`, `AllVersionsList`, `ImportData`, `ExportData`, `ContributeData`, `Notification`) before adding new primitives.
6. Follow `.github/prompts/ai-testing-guide.prompt.md` for validation steps and finish with `npm run lint` (runs ESLint, Prettier check, and `tsc`) plus the relevant `npm test` command.

---

## Project Spec

```spec
ProjectSpec "Tiangong LCA Next" {
  runtime_stack = ["React 18", "@umijs/max 4", "Ant Design Pro 5", "TypeScript 5.9+"]
  entry_points = ["src/app.tsx", "config/routes.ts"]
  data_layer = {
    client = "@supabase/supabase-js"
    auth = "Supabase Auth (persistent sessions, auto refresh)"
    storage = "Supabase Postgres tables (processes, flows, contacts, sources, life_cycle_models, ...)"
    edge_functions = ["update_data"]
  }
  domain_sdk = "@tiangong-lca/tidas-sdk" // shared ILCD data models and helpers
  testing = {
    unit = "Jest + @testing-library/react"
    integration = "tests/integration/** (Playwright-like workflow via Testing Library)"
  }
  tooling = {
    lint = "npm run lint"
    dev_server = "npm start"
    build = "npm run build"
    coverage_report = "npm run test:report"
  }
}
```

---

## Directory Contract

```spec
DirectoryContract {
  ".github/prompts" -> developer-facing AI instructions (testing & dev spec)
  "config/routes.ts" -> centralised Umi routing and menu structure
  "src/access.ts" -> runtime access control helpers
  "src/app.tsx" -> Umi runtime config (layout, initialState, layout actions)
  "src/components/**" -> reusable UI/business widgets; import via "@/components"
  "src/contexts/**" -> React Context definitions shared across pages
  "src/pages/<Feature>/" -> feature entry (`index.tsx`) plus drawer/modal components
  "src/pages/Utils/**" -> shared page-level utilities (reviews, version helpers)
  "src/services/<feature>/{api,data,util}.ts" -> Supabase interaction, typings, pure transforms
  "src/style/custom.less" -> global style overrides (scoped where possible)
  "tests/{unit,integration}/**" -> Jest test suites (see AI Testing Guide)
  "types/" -> ambient type declarations (augment global namespaces)
}
```

---

## Feature Module Blueprint

```spec
FeatureModuleBlueprint(featureName: PascalCase) {
  page_entry = "src/pages/${featureName}/index.tsx"
  data_source = getDataSource(useLocation().pathname) // returns "tg" | "co" | "my" | "te"
  lang = getLang(useIntl().locale) // "en" | "zh"

  list_view = ProTable<RowType>() {
    actionRef: React.useRef<ActionType>()
    request = async (params, sort) => get<Feature>TableAll(params, sort, lang, dataSource, tid, stateCode, extraFilters)
    toolbar = [
      TableFilter (date, state, type filters),
      ToolBarButton (create, import, export, review entry),
      ImportData / ExportData drawers (toggle via local state)
    ]
    column_patterns = [
      index column => valueType "index"
      name => Tooltip with `generalComment`
      classification => derived via `classificationToString` or fallback "-"
      version => display + pass to `AllVersionsList`
      actions => dropdown (`TableDropdown`) to open drawers or trigger `ProcessDelete`
    ]
    pagination -> uses ListPagination (current, pageSize, total)
    onRowClick -> open view drawer; preserve query params id/version when deep linking
  }

  drawers_and_modals = {
    createDrawer = Components/create.tsx {
      formRef: React.useRef<ProFormInstance>()
      local_state = { activeTabKey, formData, exchangeDataSource, spinning }
      submit_flow = [
        validate -> `formRef.current?.validateFields()`
        transform -> domain util (`genProcessJsonOrdered`, `genProcessFromData`, etc.)
        call -> `create<Feature>(id, payload)` via service
        success -> `message.success`, `actionRef.current?.reload()`, close drawer
      ]
      copy_or_version = `actionType` prop; preload detail via `get<Feature>Detail(id, version)`
    }
    editDrawer = Components/edit.tsx {
      load -> `get<Feature>Detail`
      submit -> `update<Feature>(id, version, payload)` (Supabase edge function)
      reload -> `actionRef.current?.reload()`
    }
    viewDrawer = Components/view.tsx -> read-only rendering using shared display components
    deleteModal = Components/delete.tsx -> confirm, then call service to soft-delete or change `state_code`
    reviewDrawers = Components/Review/** -> follow Review detail pattern with `ReviewDetail`
  }

  support_files = {
    form = Components/form.tsx -> renders ProForm fields grouped by tabs
    optiondata = Components/optiondata.tsx -> exports static Select/Checkbox data arrays
    util = src/services/<feature>/util.ts -> deterministic helpers (no side effects)
    data = src/services/<feature>/data.ts -> exports table row & form types (import domain models from SDK)
  }
}
```

---

## Service Layer Spec

```spec
ServiceLayerSpec {
  naming = camelCase functions (`getProcessTableAll`, `createProcess`, `updateProcess`)
  select_fields = define constants (e.g., `const selectStr4Table = "\n  id,\n  ..."`)

  list_function(params, sort, lang, dataSource, tid, stateCode?, extra?) {
    sortBy = Object.keys(sort)[0] ?? "modified_at"
    orderBy = sort[sortBy] ?? "descend"
    query = supabase.from(tableName)
      .select(selectStr, { count: "exact" })
      .order(sortBy, { ascending: orderBy === "ascend" })
      .range((current - 1) * pageSize, current * pageSize - 1)

    // dynamic filters
    if dataSource === "tg" -> query.eq("state_code", 100).eq("team_id", tid) when tid.length > 0
    if dataSource === "co" -> query.eq("state_code", 200).eq("team_id", tid) when tid.length > 0
    if dataSource === "my" -> ensure authenticated session via `supabase.auth.getSession()`
    if dataSource === "te" -> `getTeamIdByUserId()` then `.eq("team_id", teamId)`
    apply feature-specific filters (stateCode, typeOfDataSet, keyword search)

    result = await query
    handle errors -> `console.error` (consistent with existing patterns) and return `{ data: [], success: false, error }`
    postprocess -> fetch reference data via Promise.all (e.g., `getILCDLocationByValues`, `getLifeCyclesByIds`)
    map rows -> attach derived fields (`classificationToString`, `getProcesstypeOfDataSetOptions`, etc.)
    return `{ data: mappedRows, success: true, total: result.count ?? 0 }`
  }

  detail_function(id, version) = supabase.from(table).select("*").eq("id", id).eq("version", version).single()
  create_function(id, payload) = supabase.from(table).insert([{ id, json_ordered: payload, rule_verification }]).select()
  update_function(id, version, payload) = supabase.functions.invoke("update_data", {
    headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
    body: { id, version, table, data: payload },
    region: FunctionRegion.UsEast1
  })
  util_functions = pure data shapers (`genProcessJsonOrdered`, `classificationToString`, `percentStringToNumber`)
}
```

---

## UI Interaction Spec

```spec
UIInteractionSpec {
  layout = configured in `src/app.tsx` (DarkMode toggle, SelectLang, Notification, AvatarDropdown)
  messaging = use Ant Design `message.success` / `message.error` with translated strings
  loading = control via `useState<boolean>` flags + `Spin` components where requests are in-flight
  tables = `@ant-design/pro-components` ProTable with `ProColumns`; define renderers for tooltips, tags, and action dropdowns
  forms = `@ant-design/pro-components` ProForm variants (`ProFormText`, `ProFormSelect`, `ProFormList`) composed inside feature form components
  drawers = `Drawer` (for create/edit/view) with width ~720px; close handlers must reset form state and call optional callbacks
  modals = `Modal.confirm` for destructive actions; never mutate state before promise resolves
  search_inputs = Ant Design `Input.Search`, `Select`, `Checkbox`; keep controlled state in page component
  upload_import = `ImportData` component (passes parsed ILCD JSON array into drawer)
  export = `ExportData` component (calls Supabase or local transform, triggers download)
  reviews = `ReviewDetail` component for audit trail; supply `searchTableName`, `lang`, and column definitions
}
```

---

## Shared Resources to Reuse

- `src/components/TableFilter` for flexible filter popovers.
- `src/components/ToolBarButton` for toolbar actions with icon + text.
- `src/components/AllVersions` and `src/pages/Utils` helpers for multi-version management.
- `src/components/ImportData` / `ExportData` / `ContributeData` for ILCD data exchange.
- `src/components/Notification` and `src/components/LCIACacheMonitor` for global alerts.
- `src/services/general/{api,data,util}.ts` for cross-cutting helpers (`getTeamIdByUserId`, `getLang`, `classificationToString`, date utilities).
- React contexts in `src/contexts` (`UnitsContext`, `RefCheckContext`, `UpdateReferenceContext`) when shared state is unavoidable.

---

## Internationalization Spec

```spec
InternationalizationSpec {
  resource_files = ["src/locales/en-US.ts", "src/locales/zh-CN.ts"]
  pattern = `<FormattedMessage id="pages.process.location" defaultMessage="Location" />`
  runtime_strings = `intl.formatMessage({ id: "pages.process.view..." })`
  add_new_keys = update both locale files; keep the `pages.<feature>.<scope>` naming convention
  numbers_and_dates = use `intl.formatNumber`, `intl.formatDate`, or helper `formatDateTime`
  avoid = embedding translated text in constants; instead export id maps
}
```

---

## State and Context Spec

```spec
StateAndContextSpec {
  prefer local component state via React hooks (`useState`, `useRef`, `useEffect`)
  table refresh = `const actionRef = useRef<ActionType>(); actionRef.current?.reload()`
  form refs = `useRef<ProFormInstance>()`; reset using `formRef.current?.resetFields()`
  context usage = wrap complex flows (unit conversion, reference updates) in providers defined in `src/contexts`
  avoid global singletons or mutable exports; route shared state through context or props
}
```

---

## Typing and Validation Spec

```spec
TypingSpec {
  import domain models from "@tiangong-lca/tidas-sdk" when available (`Process`, `Flow`, `LCIAMethod`)
  table rows = exported types in `src/services/<feature>/data.ts` (e.g., `ProcessTable`)
  form types = derive from domain models using mapped types (`FormProcess`)
  validation = use ProForm `rules` or dedicated helpers; store ILCD schema validations via `getRuleVerification`
  id generation = use `uuid` (`v4`) for new dataset IDs; persist `version` using constants such as `initVersion`
  calculations = rely on helpers like `percentStringToNumber`, `comparePercentDesc`, `removeEmptyObjects`
}
```

---

## Quality Gates

- Implement per-feature unit or integration tests that follow `.github/prompts/ai-testing-guide.prompt.md`.
- Always run `npm run lint` before completion; address ESLint, Prettier, and `tsc` diagnostics.
- Execute targeted `npm test -- <pattern>` when modifying logic with existing coverage or when adding new suites.
- For supabase edge-function flows, add mock-based tests under `tests/unit/services` to verify payload shape.
- Keep pull requests small and scoped; note any skipped tests and justify them explicitly.

---

## Reference Patterns

- `src/pages/Processes/index.tsx` — full-featured table with filters, drawers, and Supabase-backed queries.
- `src/pages/Processes/Components/create.tsx` — canonical create flow with ProForm tabs and Supabase `insert`.
- `src/pages/LifeCycleModels/Components/edit.tsx` — edit drawer with edge function update.
- `src/services/processes/api.ts` — complex list function including auxiliary data hydration.
- `src/services/general/util.ts` — example pure helpers and calculation utilities.
- `src/app.tsx` — layout configuration, dark-mode toggle, and initial state fetching.
