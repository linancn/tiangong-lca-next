# 测试优化计划 / Test Improvement Plan

目标：在 `src/**` 范围内将 Jest 覆盖率提升至约 100%（行和分支），遵循 `docs/agents/ai-testing-guide_CN.md` 的模式与 mock，用 `npm test -- --coverage` 跟踪进度，并保持与英文文档同步。

🚨 每次修改后务必执行 `npm run lint`，确认 ESLint/Prettier/tsc 全部通过后再回复。

## 原则 / Principles

- 先服务与工具层、后 UI；复用 `tests/helpers/**` 的封装和 providers。
- 网络与 Supabase 只在 service 层 mock，组件中不要创建临时客户端。
- i18n 文案通过 `FormattedMessage`/`intl`，尽量用文案 key 断言渲染结果。
- 行为预期变更时，同时更新英文与 `_CN` 文档。
- 编写与规划测试时需查阅 `docs/agents/ai-testing-guide.md`、`docs/agents/testing-patterns.md`、`docs/agents/testing-troubleshooting.md`，确保遵循项目既定模式。

## 待办（优先级排序） / TODO (priority order)

- [x] **上下文与图形**：为 `src/contexts/graphContext.tsx` 与 `src/components/X6Graph/index.tsx` 补单测（setGraph 生命周期、节点/边增删改同步、事件注册与解绑、minScale/connecting 配置），补 `unitContext`/`refCheckContext` 的默认返回与 Provider 行为。
- [x] **请求/权限管道**：已覆盖 `src/requestErrorConfig.ts` 的 errorThrower 分支、各 showType 路径与拦截器，以及 `src/access.ts` 管理员判定，测试位于 `tests/unit/requestErrorConfig.test.ts`、`tests/unit/access.test.ts`；mock 掉 message/notification。
- [x] **Supabase 启动**：给 `src/services/supabase/index.ts` 写单测，mock `createClient` 并校验 url/key/options 参数。
- [x] **流创建链路**：`tests/unit/pages/Flows/Components/**` 已覆盖 `src/pages/Flows/Components/create.tsx`、`form.tsx`、`select/*`、`optiondata.tsx`、`view.tsx`（抽屉开关、导入/复制/新版本初始化、属性新增与类型重置、tab 保持、提交成功/失败提示与刷新、关闭清理、单位/引用校验渲染）。
- [ ] **认证流程**：补 `src/pages/User/Login/password_forgot.tsx`、`password_reset.tsx` 的表单校验、提交成功/失败、跳转；若主登录仍有缺口，补失败/锁定等分支。
- [ ] **通用工具**：覆盖 `src/pages/Utils/index.tsx` 的辅助函数（多语言标题、版本列处理、规则 pattern 替换、引用字段验证、语言值映射）。
- [ ] **引用校验工具**：扩展 `src/pages/Utils/review.tsx` 覆盖（ConcurrencyController 排队、ReffPath.set/findProblemNodes、checkRequiredFields 各分支、checkVersions 标记、checkReferences 的错误/缺失路径、updateUnReviewToUnderReview/updateReviewsAfterCheckData 的成功/失败），以及 `src/pages/Utils/updateReference.tsx`（不同类型的 getNewVersionShortDescription、getRefsOfNewVersion 的成功/异常、updateRefsData 的版本/描述更新）。
- [ ] **LCIA 方法 API**：为 `src/services/lciaMethods/api.ts` 补单测，按其他服务模式覆盖成功/错误、参数透传、缓存/适配分支（如有）。
- [ ] **零散 UI**：为目前未覆盖的低风险页面（如 `src/pages/Admin.tsx`）补轻量用例，填补覆盖空洞。

## 执行备注 / Execution notes

- 先用 `npm test -- tests/unit/<scope>/` 聚焦增量，再 `npm run lint` 并全量跑一次 `npm test -- --coverage` 后再调高阈值。
- 新增 mock 时与 `tests/helpers/mockSetup.ts`、`tests/mocks/**` 保持一致，避免重复造轮子。
- 勾选待办或新增进度说明时，需在同一变更中同步更新 `docs/agents/test_improvement_plan.md` 与 `docs/agents/test_improvement_plan_CN.md`，保持镜像一致。
