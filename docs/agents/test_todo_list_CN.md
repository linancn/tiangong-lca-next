# 测试待办清单（Test Todo List）

> 这是**可执行**测试待办的事实来源。本文件用于执行排期；长期背景信息保留在 `docs/agents/test_improvement_plan.md`。镜像约束：修改本文件时，同步更新英文版 `docs/agents/test_todo_list.md`。

## 范围（依据 AGENTS 测试要求）

本清单对齐 `AGENTS.md` 的交付约束：

- 变更必须补对应测试，
- 运行聚焦 Jest 套件，
- `npm run lint` 必须通过，
- 流程预期变化时同步更新文档。
- 当测试工作流、覆盖率基线或 backlog 状态变化时，必须同步 `docs/agents/ai-testing-guide.md` 和本文件；若长期策略背景也变化，还要在同一 diff 中同步 `docs/agents/test_improvement_plan.md` 及 `_CN` 镜像。

## 基线快照（2026年3月14日）

最新已验证全量覆盖率运行（`npm run test:coverage`）：

- Test suites：275 passed
- Tests：2248 passed
- 覆盖率：
  - Statements: 84.83% (15617/18408)
  - Branches: 71.60% (7689/10738)
  - Functions: 80.07% (3138/3919)
  - Lines: 85.15% (14965/17573)
- 相比上一版已记录基线的增量：
  - Test suites：+28
  - Tests：+328
  - Statements：+4.27
  - Branches：+4.74
  - Functions：+5.76
  - Lines：+4.31
- 当前全局 branch 门槛：50%
- 门禁状态：**已通过**（高于门槛 21.60 个百分点）

工作流说明（2026年3月14日）：

- 共享 `npm test` runner 会把 unit/src 阶段限制为 `--maxWorkers=50%`，用于规避 macOS 全量本地运行和 pre-push 中出现的 Jest worker 偶发 `SIGSEGV` 崩溃。
- `npm run test:coverage` 和 `npm run test:coverage:report` 现在都已内置所需堆内存，全量覆盖率直接用脚本即可。
- `npm run test:coverage:report` 现在是默认 review 产物：输出全局摘要、分类摘要、branch hotspots、line hotspots 和未覆盖行范围。只有在重排 backlog 或某个热点桶快扫完时，才用 `node scripts/test-coverage-report.js --full`。

## 缺口评估

1. branch 门禁恢复已经完成；当前阶段是“按顺序清热点”，整体 branch 已来到 71.60%。
2. 页面层编排仍是主要债务来源。当前最低的 branch 热点是 `src/pages/LifeCycleModels/Components/toolbar/editIndex.tsx`（18.15%）、`src/pages/Flowproperties/Components/edit.tsx`（25.00%）、`src/pages/Flows/Components/edit.tsx`（26.96%）、`src/pages/User/Login/password_reset.tsx`（27.77%）、`src/pages/Sources/Components/edit.tsx`（33.78%）和 `src/pages/Review/Components/RejectReview/index.tsx`（35.71%）。
3. 共享组件层的缺口已经明显收窄。当前最主要的 component 热点是 `src/components/AISuggestion/index.tsx`（42.22% lines / 29.19% branches）；其余大多已在 80-100% 区间。
4. service 层后续工作现在主要由 `src/services/lifeCycleModels/util_calculate.ts`（76.96% lines / 64.20% branches）领头，其后是 `src/services/lifeCycleModels/util.ts`（69.60% branches）、`src/services/general/api.ts`（71.12% branches）、`src/services/unitgroups/util.ts`（73.17% branches）、`src/services/lifeCycleModels/api.ts`（75.98% branches）和 `src/services/lifeCycleModels/util_allocate_supply_demand.ts`（77.22% branches）。
5. 覆盖率 review 现在应该由报告驱动，而不是靠直觉挑模块。默认只看热点摘要，只有在 backlog 顺序需要变化时才展开 `--full`。

## 优先级待办

### P0 – 报告工作流（已完成）

- [x] 全量 coverage 脚本现在默认带稳定的堆内存配置。
- [x] 默认覆盖率报告现在输出热点导向摘要，而不是无差别长列表。
- [x] 全量逐文件明细仍保留在 `node scripts/test-coverage-report.js --full`。

P0 完成定义：

- `npm run test:coverage` 和 `npm run test:coverage:report` 成为默认全量命令
- 热点摘要不打开 `coverage/index.html` 也能直接排 backlog
- 需要时仍能切到全量明细

### P1 – Branch 热点清扫（低于 50%，按此顺序执行）

- [ ] `src/pages/LifeCycleModels/Components/toolbar/editIndex.tsx` – 40.12% lines / 18.15% branches
- [ ] `src/pages/Flowproperties/Components/edit.tsx` – 52.12% lines / 25.00% branches
- [ ] `src/pages/Flows/Components/edit.tsx` – 60.53% lines / 26.96% branches
- [ ] `src/pages/User/Login/password_reset.tsx` – 74.62% lines / 27.77% branches
- [ ] `src/components/AISuggestion/index.tsx` – 42.22% lines / 29.19% branches
- [ ] `src/pages/Sources/Components/edit.tsx` – 62.87% lines / 33.78% branches
- [ ] `src/pages/Review/Components/RejectReview/index.tsx` – 76.11% lines / 35.71% branches
- [ ] `src/pages/Contacts/Components/edit.tsx` – 62.44% lines / 40.77% branches
- [ ] `src/pages/LifeCycleModels/Components/toolbar/eidtInfo.tsx` – 59.19% lines / 42.74% branches
- [ ] `src/pages/Flowproperties/Components/select/drawer.tsx` – 62.29% lines / 45.00% branches
- [ ] `src/pages/Unitgroups/Components/edit.tsx` – 68.71% lines / 45.67% branches
- [ ] `src/pages/Processes/Components/Exchange/select.tsx` – 84.05% lines / 45.71% branches
- [ ] `src/pages/Flows/index.tsx` – 67.60% lines / 46.77% branches

P1 完成定义：

- 上面这组热点里不再存在 branch 低于 50% 的文件
- 每个关闭的热点都至少有一条 wrapper/page 层编排测试，不只是子组件覆盖
- 默认热点报告里的未覆盖行范围能明显缩短，而不只是百分比好看

### P2 – 下一层热点桶（50%-70% branches / 低 line 异常）

- [ ] `src/pages/Flows/Components/Property/create.tsx` – 89.18% lines / 50.00% branches
- [ ] `src/pages/Sources/Components/select/drawer.tsx` – 69.38% lines / 50.00% branches
- [ ] `src/pages/Processes/Components/form.tsx` – 62.79% lines / 54.05% branches
- [ ] `src/pages/Contacts/Components/select/drawer.tsx` – 68.62% lines / 56.52% branches
- [ ] `src/pages/Processes/Components/edit.tsx` – 71.60% lines / 56.14% branches
- [ ] `src/global.tsx` – 73.33% lines / 61.53% branches
- [ ] `src/services/lifeCycleModels/util_calculate.ts` – 76.96% lines / 64.20% branches
- [ ] `src/services/lifeCycleModels/util.ts` – 100.00% lines / 69.60% branches

### P3 – Service / Utility 收口

- [ ] `src/services/general/api.ts` – 80.18% lines / 71.12% branches
- [ ] `src/services/unitgroups/util.ts` – 100.00% lines / 73.17% branches
- [ ] `src/services/lifeCycleModels/api.ts` – 89.30% lines / 75.98% branches
- [ ] `src/services/lifeCycleModels/util_allocate_supply_demand.ts` – 98.76% lines / 77.22% branches
- [ ] 继续按报告顺序清理剩余 service 文件，直到 service bucket 接近 100%。

### P4 – 测试工程质量提升

- [ ] 新增测试统一复用共享 helper（`tests/helpers/mockBuilders.ts`、`testUtils.tsx`、`testData.ts`）。
- [ ] 将“仅 console 输出验证”的噪音测试尽量重构为行为断言。
- [ ] 如果页面 wrapper 存在于已测试子组件之上，至少补一条 wrapper 层测试，让覆盖率反映真实页面编排，而不是仅靠子组件抬数。
- [ ] 每完成一批，及时更新本文件及 `_CN` 镜像；若基线发生变化，重新跑全量 coverage，并同步 `docs/agents/ai-testing-guide.md` 与 `docs/agents/test_improvement_plan.md`。
- [ ] 保持默认报告简洁。只有当额外默认明细会改变执行顺序时，才增加默认输出；否则深度明细继续放在 `--full`。

## 单项执行流程（每个任务）

1. 一次只做一个模块，并按上面的热点顺序推进。
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
npm run test:coverage
```

5. 看默认热点报告：

```bash
npm run test:coverage:report
```

6. 只有当 backlog 顺序需要变化时，才展开到全量明细：

```bash
node scripts/test-coverage-report.js --full
```

7. 更新复选框状态并记录可量化增量。
8. 若工作流、基线或 backlog 预期变化，同步更新 `docs/agents/ai-testing-guide.md`；若长期背景变化，再同步更新 `docs/agents/test_improvement_plan.md`。

## 备注

- 现在还不建议提高覆盖率阈值；先持续缩短当前热点列表。
- 优先做“确定性高”的分支测试，不要先扩展大范围快照。
- 待办必须可执行，避免“多写点测试”这类泛化项。
