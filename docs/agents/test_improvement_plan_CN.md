# 测试改进计划（中文镜像）

> 快照日期：2026年3月12日。本文件用于记录测试工程的长期背景与策略；日常可执行 backlog 以 `docs/agents/test_todo_list.md` 为准。镜像约束：每次变更需同步英文版 `docs/agents/test_improvement_plan.md`。

## 当前基线

- 最新已验证全量运行命令：`NODE_OPTIONS=--max-old-space-size=8192 npm run test:coverage`
- 当前全量运行规模：247 suites / 1920 tests
- 当前 Jest 全量覆盖率：
  - Statements: 80.56%
  - Branches: 66.86%
  - Functions: 74.31%
  - Lines: 80.84%
- `jest.config.cjs` 当前全局门槛：50%（branches/functions/lines/statements）。
- 眼下主要问题：**测试工程已经远超过“救门禁”阶段，当前战略重点变成了低覆盖的 lifecycle-model 页面栈、薄 wrapper 页面，以及剩余的 lifecycle calculation utility 分支债务**。

## 原则

- 优先补纯逻辑里分支密集的模块，再做大范围 UI 补测。
- 复用 `tests/helpers/**` 与 `tests/mocks/**`，避免临时造 mock。
- 测试改动保持小范围、可重复、可确定。
- 每次修改后必须执行 `npm run lint`。
- 在当前 66.86% branch 基线于 lifecycle-model 页面栈和 wrapper 热点上稳定前，不要再上调覆盖率阈值。

## 优先级待办

- [x] 忘记/重置密码流程已补 unit 覆盖。
- [x] graph/context/request/supabase bootstrap 等核心能力已覆盖。
- [x] 已将 branch 覆盖恢复到全局门槛以上，并建立更高的安全余量（当前 66.86%）。
- [x] 已扩展 `src/pages/Utils/index.tsx`、`src/pages/Utils/review.tsx` 和 `src/pages/Utils/updateReference.tsx` 的测试。
- [x] 已覆盖 contact/source/flow/flowproperty selector + drawer 工作流、lifecycle-model view/edit toolbar，以及上一轮 process/review 工作流热点。
- [x] 已直接补上 `Flows/Components/Property/*`、登录页 top actions、lifecycle toolbar utility helpers、required-fields 映射和 add-member modal。
- [ ] 下一轮优先推进 lifecycle-model 页面栈与薄 wrapper：`src/pages/LifeCycleModels/Components/{create,edit,delete,form}.tsx`、`src/pages/LifeCycleModels/Components/modelResult/index.tsx` 以及相邻 toolbar 剩余分支。
- [ ] 扩展 `src/pages/Sources/Components/*`、`src/pages/Contacts/Components/*`、`src/pages/Flowproperties/Components/edit.tsx`、`src/pages/Flows/Components/edit.tsx`、`src/pages/Account/index.tsx` 和 `src/pages/Unitgroups/Components/form.tsx` 这些 wrapper/create/edit 页面测试。
- [ ] 扩展 service 热点：`src/services/lifeCycleModels/util_calculate.ts`、`src/services/unitgroups/util.ts`、`src/services/general/api.ts` 及相邻 lifecycle utilities。
- [ ] 继续向更高质量门禁推进（下一阶段先稳定到 >= 70% branches，再向 75% 推进）。

## 执行循环

1. 从 `docs/agents/test_todo_list.md` 当前最高 branch-miss 列表里选一个模块。
2. 仅为未覆盖分支补测试。
3. 用 `npm run test:ci -- <pattern> --runInBand --testTimeout=... --no-coverage` 跑聚焦套件。
4. 运行 `npm run lint`。
5. 再跑全量覆盖率（当前本地已验证命令：`NODE_OPTIONS=--max-old-space-size=8192 npm run test:coverage`），在 `docs/agents/test_todo_list.md` 记录增量；若战略热点顺序变化，再同步更新本文件。

## 单项完成定义

- 测试稳定、可重复通过。
- 无无说明 `skip`。
- `npm run lint` 通过。
- 覆盖率增量可度量，并记录在 `docs/agents/test_todo_list.md`；若长期计划或热点顺序变化，再更新本文件。
