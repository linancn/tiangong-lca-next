# 测试待办清单（Test Todo List）

> 这是**可执行**测试待办的事实来源。本文件用于执行排期；长期背景信息保留在 `docs/agents/test_improvement_plan.md`。镜像约束：修改本文件时，同步更新英文版 `docs/agents/test_todo_list.md`。

## 范围（依据 AGENTS 测试要求）

本清单对齐 `AGENTS.md` 的交付约束：

- 变更必须补对应测试，
- 运行聚焦 Jest 套件，
- `npm run lint` 必须通过，
- 流程预期变化时同步更新文档。
- 当测试工作流、覆盖率基线或 backlog 状态变化时，必须同步 `docs/agents/ai-testing-guide.md` 和本文件；若长期策略背景也变化，还要在同一 diff 中同步 `docs/agents/test_improvement_plan.md` 及 `_CN` 镜像。

## 基线快照（2026年3月12日）

最新已验证全量覆盖率运行（`NODE_OPTIONS=--max-old-space-size=8192 npm run test:coverage`）：

- Test suites：247 passed
- Tests：1920 passed
- 覆盖率：
  - Statements: 80.56% (14802/18372)
  - Branches: 66.86% (7193/10757)
  - Functions: 74.31% (2920/3929)
  - Lines: 80.84% (14177/17536)
- 相比上一版已记录基线的增量：
  - Test suites：+51
  - Tests：+202
  - Statements：+7.77
  - Branches：+8.75
  - Functions：+11.02
  - Lines：+7.82
- 当前全局 branch 门槛：50%
- 门禁状态：**已通过**（高于门槛 16.86 个百分点）

## 缺口评估

1. branch 门禁恢复已经不是当前主线；现在的阶段是“收口”，整体 branch 已来到 66.86%。
2. 剩余页面热点主要集中在 lifecycle model 页面栈和几个薄 wrapper 文件：`src/pages/LifeCycleModels/Components/create.tsx`、`src/pages/LifeCycleModels/Components/edit.tsx`、`src/pages/LifeCycleModels/Components/delete.tsx`、`src/pages/LifeCycleModels/Components/form.tsx`、`src/pages/LifeCycleModels/Components/modelResult/index.tsx`，以及 `src/pages/Unitgroups/Components/form.tsx` 仍接近零分支覆盖。
3. 第二梯队缺口集中在 create/edit wrapper 页面：`src/pages/Sources/Components/edit.tsx`、`src/pages/Contacts/Components/edit.tsx`、`src/pages/Flowproperties/Components/edit.tsx`、`src/pages/Flows/Components/edit.tsx` 和 `src/pages/Account/index.tsx`。
4. 上一版文档里的 P1 阻塞项这一轮已经明显下降：`toolbar/editIndex.tsx`、`reviewProcess/tabsDetail.tsx`、`Processes/edit.tsx`、`ReviewProgress.tsx`、unitgroup selectors、process exchange view 和 `Utils/review.tsx` 都已移出“最高风险列表”。
5. service 层后续工作现在主要由 `src/services/lifeCycleModels/util_calculate.ts`（branch 64.21%）领头，其后是 `src/services/unitgroups/util.ts`、`src/services/lifeCycleModels/util_allocate_supply_demand.ts`、`src/services/lifeCycleModels/util.ts` 和 `src/services/general/api.ts`。

## 优先级待办

### P0 – Branch Coverage 门禁收口（已完成）

- [x] 恢复全局 branch 门禁，并建立可量化安全余量（当前 66.86%）。
- [x] 收掉上一轮 review/process/unitgroup/toolbars/selectors 及相邻 utility 热点。
- [x] 直接补上 `Flows/Components/Property/*`、`Flows/delete.tsx`、`Flows/select/{description,drawer}.tsx`、`LoginTopActions`、lifecycle toolbar utils、required-fields 映射，以及 ManageSystem/Teams 的 add-member modal。
- [x] 用全量 coverage 和 `npm run lint` 完成回归验证。

P0 完成定义：

- 已达成：global branches 来到 66.86%，比门槛高 16.86 个百分点
- `npm run lint` 通过
- 改动模块的聚焦套件通过

### P1 – 当前页面 / 工作流热点

- [ ] 为 `src/pages/LifeCycleModels/Components/create.tsx`、`src/pages/LifeCycleModels/Components/edit.tsx`、`src/pages/LifeCycleModels/Components/delete.tsx`、`src/pages/LifeCycleModels/Components/form.tsx` 补聚焦测试。
- [ ] 为 `src/pages/LifeCycleModels/Components/modelResult/index.tsx` 补聚焦测试，并继续压 `src/pages/LifeCycleModels/Components/toolbar/editIndex.tsx` 和 `src/pages/LifeCycleModels/Components/toolbar/eidtInfo.tsx` 的剩余分支缺口。
- [ ] 扩展 `src/pages/Sources/Components/create.tsx`、`src/pages/Sources/Components/edit.tsx`、`src/pages/Sources/Components/delete.tsx` 的测试。
- [ ] 扩展 `src/pages/Contacts/Components/create.tsx`、`src/pages/Contacts/Components/edit.tsx`、`src/pages/Contacts/Components/delete.tsx` 的测试。
- [ ] 扩展 `src/pages/Unitgroups/Components/form.tsx`、`src/pages/Unitgroups/Components/create.tsx`、`src/pages/Unitgroups/Components/edit.tsx`、`src/pages/Unitgroups/Components/Unit/reference.tsx` 的测试。
- [ ] 继续收口 `src/pages/Flowproperties/Components/edit.tsx`、`src/pages/Flows/Components/edit.tsx` 和 `src/pages/Account/index.tsx` 这些 wrapper/page 文件。

P1 完成定义：

- lifecycle-model 页面栈和 wrapper 页面不再是 near-zero branch / line coverage
- 页面层 branch miss 前几名能持续下降
- create/edit wrapper 的测试真正命中页面编排逻辑，而不是只覆盖子组件

### P2 – Service / Utility 热点

- [ ] 扩展 `src/services/lifeCycleModels/util_calculate.ts` 的分支覆盖（当前 branch 64.21%；仍是 service 层主热点）。
- [ ] 扩展 `src/services/unitgroups/util.ts`（60.98% branch）和 `src/services/general/api.ts`（69.83% branch）。
- [ ] 随着页面热点下降，继续推进 `src/services/lifeCycleModels/util_allocate_supply_demand.ts`（68.27%）、`src/services/lifeCycleModels/util.ts`（69.61%）和 `src/services/lifeCycleModels/api.ts`（75.98%）的剩余分支闭环。

### P3 – 测试工程质量提升

- [ ] 新增测试统一复用共享 helper（`tests/helpers/mockBuilders.ts`、`testUtils.tsx`、`testData.ts`）。
- [ ] 将“仅 console 输出验证”的噪音测试尽量重构为行为断言。
- [ ] 如果页面 wrapper 存在于已测试子组件之上，至少补一条 wrapper 层测试，让覆盖率反映真实页面编排，而不是仅靠子组件抬数。
- [ ] 每完成一批，及时更新本文件及 `_CN` 镜像；若基线发生变化，重新跑全量 coverage，并同步 `docs/agents/ai-testing-guide.md` 与 `docs/agents/test_improvement_plan.md`。

## 单项执行流程（每个任务）

1. 一次只做一个模块。
2. 运行聚焦命令：

```bash
npm run test:ci -- <pattern> --runInBand --testTimeout=20000 --no-coverage
```

3. 运行 lint 门禁：

```bash
npm run lint
```

4. 每完成一批高优先级任务后，运行全量覆盖率：

```bash
NODE_OPTIONS=--max-old-space-size=8192 npm run test:coverage
```

5. 更新复选框状态并记录可量化增量。
6. 若工作流、基线或 backlog 预期变化，同步更新 `docs/agents/ai-testing-guide.md`；若长期背景变化，再同步 `docs/agents/test_improvement_plan.md`。

## 备注

- 现在还不建议提高覆盖率阈值；先把当前 66.86% 的 branch 基线在 lifecycle-model 页面栈和 wrapper 热点上稳定下来。
- 优先做“确定性高”的分支测试，不要先扩展大范围快照。
- 待办必须可执行，避免“多写点测试”这类泛化项。
