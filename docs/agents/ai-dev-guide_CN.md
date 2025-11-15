# AI Development Spec（中文镜像）

> 说明：英文版 `docs/agents/ai-dev-guide.md` 是唯一面向 AI 的规范；本文件仅供人类同事阅读，修改英文版时务必同步更新此处。

## 环境与工具

- Node.js **>= 22**（`package.json` 明确要求），先执行 `nvm use 22` 或安装对应版本再 `npm install`。
- 必备 `.env`：`SUPABASE_URL`、`SUPABASE_PUBLISHABLE_KEY`。缺失时所有 Supabase 请求都会失败，且禁止在代码中硬编码秘钥，统一通过 `src/services/supabase.ts` 加载。
- 未经维护者许可，禁止新增 npm 依赖。

## 常用命令

```
npm install
npm run start:dev   # dev 环境，无 mock，REACT_APP_ENV=dev
npm start           # 通用 dev 命令
npm run lint        # eslint + prettier check + tsc
npm test -- tests/integration/<feature>/
npm run test:report
npm run build
```

## AI 交付流程

1. 使用 `rg`、`ls` 与现有路由查找最接近的参考实现。
2. 若功能影响 `/tgdata`、`/codata`、`/mydata`、`/tedata`，需要在 `config/routes.ts` 中同步四套分支。
3. 先扩展 `src/services/<feature>/`：`data.ts` 定义类型、`api.ts` 编写 Supabase 查询、`util.ts` 放纯函数。
4. 在 `src/pages/<Feature>/index.tsx` 搭建页面，再在 `Components/` 下实现 Drawer/Modal。
5. 优先复用 `src/components`（`TableFilter`、`ToolBarButton`、`ImportData`、`ExportData`、`AllVersionsList`、`ContributeData`、`Notification` 等）。
6. 按 `docs/agents/ai-testing-guide.md` 验证，运行 `npm run lint` 及对应 `npm test -- <pattern>`。
7. 处理生命周期模型算法时同时参考 `docs/agents/util_calculate.{md,_CN.md}`，保持实现与文档一致。

## 架构概览

- **技术栈**：React 18、`@umijs/max 4`、Ant Design Pro 5、TypeScript 5.9+。
- **入口**：`src/app.tsx`（布局/运行时配置）、`config/routes.ts`（菜单与路由）。
- **数据层**：Supabase Postgres、Supabase Auth、存储、Edge Function `update_data`；只能通过 `src/services/**` 访问。
- **领域 SDK**：`@tiangong-lca/tidas-sdk`（ILCD 数据模型与工具）。
- **测试**：Jest + Testing Library，`npm run test:report` 生成覆盖率。

## 目录约定

- `docs/agents/**`：AI 规范（已替换 `.github/prompts`）。
- `config/routes.ts`：Umi 路由/菜单中心。
- `src/access.ts`：权限辅助函数。
- `src/components/**`：复用组件（通过 `@/components` 引入）。
- `src/contexts/**`：共享状态 Context（单位、引用等）。
- `src/pages/<Feature>/`：页面入口 + `Components/` 抽屉/弹窗。
- `src/pages/Utils/**`：复用工具（审核、版本等）。
- `src/services/<feature>/{api,data,util}.ts`：Supabase 查询、类型、纯函数。
- `src/style/custom.less`：全局样式覆盖。
- `tests/{unit,integration}/**`：Jest 套件。
- `types/**`：全局类型声明。

## 功能模块蓝图

- **入口**：`dataSource = getDataSource(useLocation().pathname)`（`tg/co/my/te`），`lang = getLang(useIntl().locale)`。
- **表格**：`ProTable<RowType>` + `actionRef` 触发 `reload()`；`request` 调用 `<feature>TableAll(params, sort, lang, dataSource, tid, stateCode, extraFilters)`。
- **工具栏**：`TableFilter`（日期/状态/类型）、`ToolBarButton`、`ImportData`/`ExportData` 抽屉、审核入口。
- **列**：`index`、带 `generalComment` Tooltip 的名称列、`classificationToString`、`AllVersionsList` 渲染版本、`TableDropdown` 操作列。
- **Drawer/Modal**：宽度约 720px，使用本地 state 控制 Tab/表单，关闭时 `formRef.current?.resetFields()`。
- **审核流**：复用 `ReviewDetail`，传入 `processId`、`processVersion`、`searchTableName`。

## Service 层规范

- 导出命名使用 camelCase，常量（如 select 字符串）集中放在文件顶部。
- 列表函数：计算 `sortBy`/`orderBy`，调用 `supabase.from(...).select(..., { count: 'exact' }).order(...).range(...)`。
- 数据源过滤：`tg` => `state_code=100` + 可选 `team_id`；`co` => `state_code=200`；`my` => 校验 `supabase.auth.getSession()`、按用户过滤、可附加 `stateCode`；`te` => 借助 `getTeamIdByUserId()` 过滤团队。
- 通过 `Promise.all` 拉取补充数据（`getILCDLocationByValues`、`getSubmodelsByProcessIds` 等），使用 `classificationToString`、`genProcessName`、`getLangText` 等 helper。
- `create*`：插入 ordered JSON 与 `rule_verification`；`update*`：携带 Bearer token 调用 Supabase `update_data`（`FunctionRegion.UsEast1`）。
- `util.ts` 仅存放纯函数；类型尽量引用 `@tiangong-lca/tidas-sdk`。
- 捕获 Supabase 错误并返回 `{ data: [], success: false, error }`，保持调用方稳定。

## UI 交互与复用组件

- 布局与顶部导航在 `src/app.tsx`（暗黑模式、`SelectLang`、`Notification`、`AvatarDropdown`）。
- 消息统一使用 `message.success/error`，异步流程搭配 `useState<boolean>` + `Spin`。
- 表格/表单/Drawer/Modal 使用 Ant Design Pro 组件；搜索类控件（`Input.Search`、`Select`、`Checkbox`）保持受控。
- 数据导入/导出：`ImportData`、`ExportData`、`ContributeData`；审核组件位于 `Processes/Components/Review`。
- 重点复用：`TableFilter`、`ToolBarButton`、`AllVersions`、`Notification`、`LCIACacheMonitor`、`src/contexts/**`、`src/services/general/**`。

## 国际化、状态与类型

- 语言文件：`src/locales/en-US.ts`、`src/locales/zh-CN.ts` 及子模块拆分。JSX 使用 `<FormattedMessage />`，逻辑内使用 `intl.formatMessage`。
- key 命名遵循 `pages.<feature>.<scope>`，新增文案需同步两份语言包。数字/日期用 `intl.formatNumber/Date` 或 `formatDateTime`。
- 状态管理：优先 Hooks（`useState`、`useRef`、`useEffect`）；表格刷新 `actionRef.current?.reload()`，表单重置 `formRef`。
- 跨组件状态使用 Context（UnitsContext、RefCheckContext、UpdateReferenceContext），禁止可变单例。
- 类型：优先引入 `@tiangong-lca/tidas-sdk`，在 `src/services/<feature>/data.ts` 导出表格/表单类型。
- 校验：ProForm `rules` 或 helper（`getRuleVerification`、`percentStringToNumber`、`comparePercentDesc`）；ID 使用 `uuid.v4`，版本常量如 `initVersion`。

## 质量与测试

- 功能改动需配套单测或集测，复用 `tests/helpers/**`。
- 必须通过 `npm run lint`（ESLint + Prettier check + `tsc`）。
- 运行针对性的 Jest 命令（如 `npm test -- tests/integration/<feature>/`），并执行新增用例。
- Supabase Edge Function 调用需在 `tests/unit/services/**` 编写 payload 形状测试。
- PR 范围保持聚焦；若调整开发规范，需同步 `docs/agents/**`。

## 参考范例

- `src/pages/Processes/index.tsx`：完整列表 + 抽屉流程。
- `src/pages/Processes/Components/create.tsx`：ProForm Tab 创建抽屉。
- `src/pages/LifeCycleModels/Components/edit.tsx`：Edge Function 编辑逻辑。
- `src/services/processes/api.ts`：复杂列表查询与数据补全。
- `src/services/general/util.ts`：纯工具函数集合。
- `src/app.tsx`：布局、初始状态、操作栏实现。
