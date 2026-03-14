# 测试改进计划（中文镜像）

> 快照日期：2026年3月14日。本文件用于记录测试工程的长期背景与策略；日常可执行 backlog 以 `docs/agents/test_todo_list.md` 为准。镜像约束：每次变更需同步英文版 `docs/agents/test_improvement_plan.md`。

## 当前基线

- 最新已验证全量运行命令：`npm run test:coverage`
- 当前全量运行规模：275 suites / 2248 tests
- 当前 Jest 全量覆盖率：
  - Statements: 84.83%
  - Branches: 71.60%
  - Functions: 80.07%
  - Lines: 85.15%
- `jest.config.cjs` 当前全局门槛：50%（branches/functions/lines/statements）。
- 眼下主要问题：**测试工程已经远超过“救门禁”阶段，当前战略重点变成了按有序热点清单持续收口，而剩余债务仍以页面层编排为主**。

## 原则

- 长期目标：把 `src/**` 推进到 100% 的有效覆盖。
- 覆盖率报告是执行顺序的事实来源；除非热点排序本身变化，否则不要主观改优先级。
- 优先补纯逻辑和页面编排里的分支缺口，再做大范围 UI 补测。
- 复用 `tests/helpers/**` 与 `tests/mocks/**`，避免临时造 mock。
- 测试改动保持小范围、可重复、可确定。
- 每次修改后必须执行 `npm run lint`。
- 在当前热点清单明显缩短前，不要再上调覆盖率阈值。

## 优先级待办

- [x] 忘记/重置密码流程已补 unit 覆盖。
- [x] graph/context/request/supabase bootstrap 等核心能力已覆盖。
- [x] 已将 branch 覆盖恢复到全局门槛以上，并建立更高的安全余量（当前 71.60%）。
- [x] 已扩展 `src/pages/Utils/index.tsx`、`src/pages/Utils/review.tsx` 和 `src/pages/Utils/updateReference.tsx` 的测试。
- [x] 已覆盖 contact/source/flow/flowproperty selector + drawer 工作流、lifecycle-model view/edit toolbar，以及上一轮 process/review 工作流热点。
- [x] 已直接补上 `Flows/Components/Property/*`、登录页 top actions、lifecycle toolbar utility helpers、required-fields 映射和 add-member modal。
- [x] 已把旧的全量长列表覆盖率工作流替换成“默认热点摘要 + `--full` 深挖”的双层报告方式。
- [ ] 先按报告顺序清掉当前 branch 低于 50% 的热点桶：`toolbar/editIndex.tsx`、`Flowproperties/edit.tsx`、`Flows/edit.tsx`、`password_reset.tsx`、`AISuggestion/index.tsx`、`Sources/edit.tsx`、`RejectReview/index.tsx`、`Contacts/edit.tsx`、`toolbar/eidtInfo.tsx` 等。
- [ ] 再清 50%-70% 的热点桶，包括 `Flows/Components/Property/create.tsx`、`Processes/form.tsx`、`Processes/edit.tsx`、selector drawers、`global.tsx` 以及前排 lifecycle service/util 文件。
- [ ] 继续按报告顺序推进 service 收口：`src/services/lifeCycleModels/util_calculate.ts`、`src/services/lifeCycleModels/util.ts`、`src/services/general/api.ts`、`src/services/unitgroups/util.ts`、`src/services/lifeCycleModels/api.ts`、`src/services/lifeCycleModels/util_allocate_supply_demand.ts`。
- [ ] 从当前 71.60% branch 基线继续往 100% 收口，方式是持续缩短有序热点清单，而不是临时改优先级。

## 执行循环

1. 从 `docs/agents/test_todo_list.md` 当前有序热点清单里选一个模块。
2. 仅为未覆盖分支补测试。
3. 用 `npm run test:ci -- <pattern> --runInBand --testTimeout=... --no-coverage` 跑聚焦套件。
4. 运行 `npm run lint`。
5. 再跑全量覆盖率（`npm run test:coverage`）。
6. 查看 `npm run test:coverage:report`；只有在热点顺序需要变化时，才展开 `node scripts/test-coverage-report.js --full`。
7. 在 `docs/agents/test_todo_list.md` 记录增量；若战略热点顺序变化，再同步更新本文件。

## 单项完成定义

- 测试稳定、可重复通过。
- 无无说明 `skip`。
- `npm run lint` 通过。
- 覆盖率增量可度量，并记录在 `docs/agents/test_todo_list.md`；若长期计划或热点顺序变化，再更新本文件。
