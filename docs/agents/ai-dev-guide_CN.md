# AI Development Spec（中文镜像）

> 说明：英文版 `docs/agents/ai-dev-guide.md` 是唯一面向 AI 的规范；本文件仅供人类同事阅读，需与英文版保持同步（结构、命令、约束一致）。

## 关键规则

- 所有实现均使用 TypeScript + React 18 函数组件，禁止类组件或任意范式混用。
- 只能通过 `src/services/**` 访问 Supabase；页面层不得直接实例化客户端。
- 所有用户可见文案必须调用 Umi i18n helper（`FormattedMessage` / `intl.formatMessage`）。
- 不得自行增加 npm 依赖，如确有需要必须先获人类维护者许可。
- 本规范为 AI 驱动开发的唯一信息源，禁止猜测或另找文档。

## AI 快速上手流程

1. 使用 `rg`/`ls` 找到最接近的现有功能（示例：`rg "getProcessTableAll" -n src`）。
2. 检查 `config/routes.ts`，若功能在多数据源共享，需同步 `/tgdata`、`/codata`、`/mydata`、`/tedata` 路由。
3. 先扩展 service：在 `data.ts` 定义类型、`api.ts` 编写 Supabase 查询、`util.ts` 放纯函数。
4. 在 `src/pages/<Feature>/index.tsx` 构建/更新页面，再在 `Components/` 填充 Drawer/Modal。
5. 优先复用 `src/components`（如 `TableFilter`、`ToolBarButton`、`ImportData`、`ExportData`、`AllVersionsList` 等）。
6. 参考 `docs/agents/ai-testing-guide.md` 进行验证，至少执行 `npm run lint` 及对应 `npm test`。

## 项目规格概览

- 运行栈：React 18、@umijs/max 4、Ant Design Pro 5、TypeScript 5.9+。
- 入口：`src/app.tsx`、`config/routes.ts`。
- 数据层：Supabase（Auth、Postgres、Edge Function `update_data`、存储），领域 SDK `@tiangong-lca/tidas-sdk`。
- 测试：Jest + React Testing Library（单元/集成），覆盖率命令 `npm run test:report`。

## 目录约定

- `docs/agents`：AI/文档中心（本文件及英文原件）。
- `config/routes.ts`：Umi 菜单/路由，新增页面先改此处。
- `src/access.ts`：运行时权限辅助。
- `src/components/**`：可复用 UI；统一通过 `@/components` 引入。
- `src/services/<feature>/{api,data,util}.ts`：Supabase 交互、类型、纯函数。
- `src/pages/<Feature>/`：页面入口 + 抽屉/弹窗组件。
- `tests/{unit,integration}/**`：Jest 用例。
- `types/`：全局类型声明。

## 功能模块蓝图

- 列表页使用 `ProTable`，`actionRef` 控制刷新，`request` 包含参数/排序/语言/数据源。
- 工具栏模式：`TableFilter` + `ToolBarButton` + `ImportData`/`ExportData` Drawer。
- 列定义示例：index 列、名称 Tooltip、分类 `classificationToString`、版本 + `AllVersionsList`、操作下拉。
- 抽屉/弹窗：`Components/create.tsx` 等内含 `ProForm`，通过本地 state 控制 Tab/数据。

## 服务层规范

- 方法命名 camelCase（`getProcessTableAll`、`createProcess`）。
- `list_function`：统一处理排序、分页、数据源过滤（tg/co/my/te）、额外查询参数，再映射扩展字段。
- 错误处理：`console.error` + `{ data: [], success: false }`。
- `detail/create/update`：对应 Supabase select/insert 或 `supabase.functions.invoke("update_data")` 并传 token。
- `util`：仅包含纯计算（如 `classificationToString`、`percentStringToNumber`）。

## UI 交互规范

- Layout 配置于 `src/app.tsx`（暗黑模式、语言选择、通知、头像）。
- 消息统一用 Ant Design `message.success/error`，字符串来自 i18n。
- Loading 状态以 `useState<boolean>` + `Spin` 控制。
- 表格/表单/Drawer/Modal 均沿用 Ant Design Pro 模式。
- 导入导出使用 `ImportData`、`ExportData` 组件，审核流用 `ReviewDetail`。

## 复用资源

- `src/components/TableFilter`、`ToolBarButton`、`AllVersions`、`ImportData`、`ExportData`、`ContributeData`、`Notification`、`LCIACacheMonitor`。
- `src/services/general/**` 中的公共 helper（团队、语言、分类、日期等）。
- `src/contexts` 内的 Context（单位换算、引用更新等）。

## 国际化规范

- 资源文件：`src/locales/en-US.ts`、`src/locales/zh-CN.ts`。
- 组件内使用 `<FormattedMessage id="..." />`，逻辑内用 `intl.formatMessage`。
- 新文案需同时更新两份 locale；命名约定 `pages.<feature>.<scope>`。
- 数字/日期使用 `intl.formatNumber/Date` 或封装 helper。

## 状态与上下文

- 以 Hooks (`useState`, `useRef`, `useEffect`) 管理本地状态。
- 表格刷新：`actionRef.current?.reload()`。
- Form 引用：`useRef<ProFormInstance>()` 并在关闭 Drawer 时重置。
- 共享状态尽量通过 Context/props 传递，禁止全局单例。

## 类型与校验

- 首选 `@tiangong-lca/tidas-sdk` 提供的领域类型。
- 表格/表单类型在 `src/services/<feature>/data.ts` 导出供页面使用。
- 表单校验使用 ProForm `rules` 或专用 helper；ILCD schema 校验走 `getRuleVerification`。
- ID 使用 `uuid` v4，新版本号用常量（如 `initVersion`）。
- 数值转换统一走 helper（`percentStringToNumber`、`comparePercentDesc` 等）。

## 质量门禁

- 每项功能需配套单元或集成测试，遵守 Testing Guide。
- 必跑 `npm run lint`，无 ESLint/Prettier/`tsc` 报错方可交付。
- 若涉及 Supabase Edge Function，需在 `tests/unit/services` 补 mock 测试。
- PR 范围保持精简，若跳过测试必须写明原因。

## 参考范例

- `src/pages/Processes/index.tsx`：全功能表格示例。
- `src/pages/Processes/Components/create.tsx`：ProForm 创建流程。
- `src/pages/LifeCycleModels/Components/edit.tsx`：Edge Function 更新。
- `src/services/processes/api.ts`：复杂列表查询与数据补全。
- `src/services/general/util.ts`：纯工具函数示例。
- `src/app.tsx`：应用布局与初始状态处理。
