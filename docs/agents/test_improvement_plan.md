# Test Improvement Plan / 测试优化计划

Goal / 目标：move Jest coverage to ~100% (lines + branches) across `src/**`, following `docs/agents/ai-testing-guide.md` for patterns and mocks. Track progress with `npm test -- --coverage` and keep parity with the `_CN` mirror.

🚨 Always run `npm run lint` after changes to ensure ESLint/Prettier/tsc are clean before responding. / 每次修改后务必执行 `npm run lint`，确认 ESLint/Prettier/tsc 均通过再回复。

## Principles / 原则

- Follow service-first structure; prefer unit tests on services/utilities before UI; reuse `tests/helpers/**` for providers and mocks / 先测服务与工具层，再测 UI，重用 `tests/helpers/**` 中的封装。
- Mock network/Supabase in the service layer; do not create ad-hoc clients in components / 网络与 Supabase 只在 service 层 mock，组件里不要新建客户端。
- Keep i18n strings routed through `FormattedMessage`/`intl` and assert rendered text via locale keys where possible / i18n 通过 `FormattedMessage`/`intl`，用文案 key 断言。
- Mirror each English test change with equivalent `_CN` doc notes when behavior expectations change / 行为说明更新时同步英文与 `_CN` 文档。
- Consult `docs/agents/ai-testing-guide.md`, `docs/agents/testing-patterns.md`, and `docs/agents/testing-troubleshooting.md` while planning and implementing tests to stay aligned with project patterns / 编写与规划测试时需查阅 `docs/agents/ai-testing-guide.md`、`docs/agents/testing-patterns.md`、`docs/agents/testing-troubleshooting.md` 以符合项目规范。

## TODO (priority order) / 待办（按优先级）

- [x] **Contexts & Graph infra**: add unit tests for `src/contexts/graphContext.tsx` and `src/components/X6Graph/index.tsx` (setGraph lifecycle, add/update/remove nodes/edges syncing, event registration cleanup, minScale/connecting options) and for `unitContext`/`refCheckContext` fallbacks & provider values / 上下文与图形：覆盖 GraphProvider 与 X6Graph 生命周期、节点/边增删改同步、事件解绑、配置项；补 `unitContext`/`refCheckContext` 默认返回与 Provider 行为。
- [x] **Request/access plumbing**: covered `src/requestErrorConfig.ts` (errorThrower branches, showType paths, interceptors) and `src/access.ts` admin gate with message/notification mocks via `tests/unit/requestErrorConfig.test.ts` + `tests/unit/access.test.ts` / 覆盖请求错误处理的各分支与拦截器，以及 `access.ts` 管理员判定，测试位于 `tests/unit/requestErrorConfig.test.ts`、`tests/unit/access.test.ts`，mock 掉消息与通知。
- [x] **Supabase client bootstrap**: unit test `src/services/supabase/index.ts` to assert `createClient` invoked with url/key/options (mock module to avoid network) / Supabase 启动：mock `createClient`，校验 url/key/options 参数。
- [x] **Flows create stack**: tests in `tests/unit/pages/Flows/Components/**` now cover `create.tsx`, `form.tsx`, `select/*`, `optiondata.tsx`, `view.tsx` (drawer open/close, import/copy/createVersion seeding, property add/set + flow type reset, tab persistence, submit success/failure toasts + reload, onClose cleanup, unit/ref checks in property table) / 流创建链路：`tests/unit/pages/Flows/Components/**` 已覆盖 `create.tsx`、`form.tsx`、`select/*`、`optiondata.tsx`、`view.tsx`（抽屉开关、导入/复制/新版本初始化、属性新增与类型重置、tab 保持、提交成功/失败提示与刷新、关闭清理、单位/引用校验渲染）。
- [ ] **Auth flows**: unit/integration tests for `src/pages/User/Login/password_forgot.tsx` and `password_reset.tsx` (form validation, submit success/failure, redirects), plus negative paths on main login if gaps remain / 认证：补忘记/重置密码页面的校验、提交成功/失败、跳转；若主登录仍有缺口，补失败/锁定等分支。
- [ ] **Utils (general)**: cover `src/pages/Utils/index.tsx` helpers (`getDataTitle`, `getAllVersionsColumns`, `getRules` patterns, `validateRefObjectId`, `getLocalValueProps`) using locale-aware assertions / 工具函数：给 `Utils/index.tsx` 的辅助函数加测试，校验多语言标题、规则 pattern 替换、引用字段验证与语言值映射。
- [ ] **Utils (refs & review)**: broaden `src/pages/Utils/review.tsx` coverage (ConcurrencyController queueing, ReffPath.set/findProblemNodes, checkRequiredFields variants, checkVersions flags, checkReferences error/non-existent paths, updateUnReviewToUnderReview/updateReviewsAfterCheckData success/failure) and `src/pages/Utils/updateReference.tsx` (getNewVersionShortDescription per type, getRefsOfNewVersion network happy/error, updateRefsData version/description swap) / 引用校验工具：覆盖并发控制、引用路径构建与问题节点提取、必填校验、版本对比与请求错误路径、更新状态 API 成功/失败；以及新版本引用生成与数据更新。
- [ ] **LCIA methods API**: add unit tests for `src/services/lciaMethods/api.ts` mirroring other service tests (happy/error, parameter forwarding, cache/adapter behavior if any) / LCIA 方法 API：按其他服务模式补成功/错误、参数透传、缓存或适配器分支。
- [ ] **Residual UI**: light snapshot/behavior tests for low-risk pages not yet covered (e.g., `src/pages/Admin.tsx` banner content) to close coverage gaps / 剩余 UI：为未覆盖的低风险页面（如 Admin）补轻量用例以消除覆盖空洞。

## Execution notes / 执行备注

- Use `npm test -- tests/unit/<scope>/` for focused runs; finish with `npm run lint` and a full `npm test -- --coverage` sweep before raising thresholds / 先用分目录测试命令聚焦，最后 `npm run lint` + 全量覆盖率跑一遍。
- Align new mocks with `tests/helpers/mockSetup.ts` and `tests/mocks/**`; avoid duplicating mock wiring / 复用既有 mock 配置，避免重复造轮子。
- When marking TODO items complete or adding progress notes, update both `docs/agents/test_improvement_plan.md` and `docs/agents/test_improvement_plan_CN.md` in the same change to keep the mirrors in lockstep / 勾选待办或新增进度时，需在同一次变更中同步更新 `docs/agents/test_improvement_plan.md` 与 `docs/agents/test_improvement_plan_CN.md`，确保两份文档严格同步。
