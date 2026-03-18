# 测试待办清单（Test Todo List）

> 这是**可执行**测试待办的事实来源。本文件用于执行排期；长期背景信息保留在 `docs/agents/test_improvement_plan.md`。镜像约束：修改本文件时，同步更新英文版 `docs/agents/test_todo_list.md`。

## 范围（依据 AGENTS 测试要求）

本清单对齐 `AGENTS.md` 的交付约束：

- 变更必须补对应测试，
- 运行聚焦 Jest 套件，
- `npm run lint` 必须通过，
- 流程预期变化时同步更新文档。
- 当测试工作流、覆盖率基线或 backlog 状态变化时，必须同步 `docs/agents/ai-testing-guide.md` 和本文件；若长期策略背景也变化，还要在同一 diff 中同步 `docs/agents/test_improvement_plan.md` 及 `_CN` 镜像。

## 基线快照（2026年3月18日）

最新已验证全量覆盖率运行（`npm run test:coverage`）：

- Test suites：286 passed
- Tests：2842 passed
- 覆盖率：
  - Statements: 94.97% (19080/20090)
  - Branches: 87.97% (10285/11691)
  - Functions: 94.01% (4116/4378)
  - Lines: 95.15% (18278/19208)
- 相比上一版已记录基线的增量：
  - Test suites：+7
  - Tests：+101
  - Statements：-1.07
  - Branches：-1.38
  - Functions：+0.15
  - Lines：-1.17
- 当前全局 branch 门槛：50%
- 门禁状态：**已通过**（高于门槛 37.97 个百分点）

## 最近收口增量

- 追踪的源码文件：`303 -> 312`（`+9`）
- 已全满文件：`177 -> 197`（`+20`）
- 仍有缺口的文件：`126 -> 115`（`-11`）
- `<50% branch` 桶：`0 -> 1`
- `50%-70% branch` 桶：`0 -> 8`
- `70%-90% branch` 桶：`91 -> 68`
- `90%-<100% branch` 桶：`24 -> 27`
- `line=100 但 branch<100` 桶：`30 -> 27`
- 最近清到 `100/100/100/100` 的队头文件包括 `services/contacts/api`、`services/lca/taskCenter`、`services/lifeCycleModels/util_allocate_supply_demand`、以及 `Sources/Components/{select/drawer,select/form,view}`。
- 新开启的低 branch 桶主要来自 lifecycle-model persistence bundle 同步，队头是 `src/services/lifeCycleModels/api.ts` 和新增的 `src/services/lifeCycleModels/persistencePlan.ts`。

## 全文件库存

同一轮运行得到的全仓逐文件状态：

- 追踪的源码文件：312
- 已全满文件（`100/100/100/100`）：197
- 仍有缺口的文件：115
- Branch 分桶：
  - `<50`：1 个文件
  - `50-70`：8 个文件
  - `70-90`：68 个文件
  - `90-<100`：27 个文件
- `line=100` 但 `branch<100`：27 个文件
- 分类平均值：
  - components：`97.92%` lines / `94.56%` branches / `96.00%` functions
  - services：`95.36%` lines / `91.65%` branches / `96.80%` functions
  - pages：`97.41%` lines / `93.35%` branches / `94.31%` functions
  - others：`99.89%` lines / `99.64%` branches / `99.83%` functions

## 报告工作流

- 共享 `npm test` runner 会把 unit/src 阶段限制为 `--maxWorkers=50%`，用于规避 macOS 全量本地运行和 pre-push 中出现的 Jest worker 偶发 `SIGSEGV` 崩溃。
- `npm run test:coverage` 和 `npm run test:coverage:report` 都已内置所需堆内存，全量覆盖率直接用脚本即可。
- `npm run test:coverage:report` 是默认 review 产物，默认输出：
  - 全局摘要，
  - 分类摘要，
  - 清零队列摘要，
  - 共享夹具批次，
  - 下一个 25 个有序未完成文件。
- `node scripts/test-coverage-report.js --full` 会输出所有剩余文件的完整有序未完成队列。
- 队列排序是确定性的：`branches 升序 -> lines 升序 -> statements 升序 -> functions 升序 -> path`。

## 执行策略

1. 不再按主观“哪个收益更高”重新排工作优先级。
2. 直接拿有序清零队列的第一个文件，尽量把该文件推进到 `100/100/100/100` 后再移动。
3. `node scripts/test-coverage-report.js --full` 里的完整队列是所有剩余文件的事实来源；下方列表只是一份当前队头快照。
4. 允许的成批例外：当前文件和紧邻文件共享同一套 mock/fixture/test harness 时，可围绕最早的那个文件一起收口。
5. 允许的基础设施例外：如果共享测试 blocker 卡住当前文件或紧邻文件，可先修 blocker，再恢复队列顺序。
6. 如果剩余分支被证明不可达或业务上无效，优先在不改变行为的前提下删除死分支，而不是为了抬覆盖率去编造测试。
7. 需要保留 wrapper/page 层编排测试，不能只靠子组件覆盖抬数。

## 当前有序清零队列（队头快照）

- [ ] `src/services/lifeCycleModels/api.ts` — stmt `36.39%`，line `35.73%`，branch `23.07%`，func `48.48%`
- [ ] `src/pages/Processes/Components/lcaGroupedResults.ts` — stmt `81.81%`，line `81.13%`，branch `51.21%`，func `100.00%`
- [ ] `src/services/lifeCycleModels/persistencePlan.ts` — stmt `73.71%`，line `73.20%`，branch `51.85%`，func `96.66%`
- [ ] `src/pages/Processes/Components/lcaImpactCompareToolbar.tsx` — stmt `77.93%`，line `77.37%`，branch `52.38%`，func `80.95%`
- [ ] `src/pages/Processes/Analysis/index.tsx` — stmt `72.78%`，line `72.64%`，branch `58.00%`，func `78.49%`
- [ ] `src/pages/Processes/Components/lcaAnalysisShared.ts` — stmt `83.33%`，line `84.88%`，branch `58.02%`，func `83.33%`
- [ ] `src/pages/Processes/Components/lcaImpactHotspotToolbar.tsx` — stmt `88.81%`，line `88.46%`，branch `61.36%`，func `95.23%`
- [ ] `src/pages/Processes/Components/lcaContributionPath.ts` — stmt `90.62%`，line `91.08%`，branch `62.50%`，func `94.87%`
- [ ] `src/pages/Processes/Components/lcaProcessSelectionTable.tsx` — stmt `92.30%`，line `94.28%`，branch `69.23%`，func `87.50%`
- [ ] `src/services/lca/api.ts` — stmt `84.04%`，line `83.87%`，branch `70.31%`，func `88.23%`
- [ ] `src/services/processes/api.ts` — stmt `86.60%`，line `86.37%`，branch `73.21%`，func `95.45%`
- [ ] `src/pages/Flows/Components/create.tsx` — stmt `91.59%`，line `93.10%`，branch `77.35%`，func `70.83%`
- [ ] `src/app.tsx` — stmt `92.64%`，line `94.02%`，branch `77.77%`，func `88.88%`
- [ ] `src/pages/Processes/Components/Review/DataQualityIndicator/view.tsx` — stmt `100.00%`，line `100.00%`，branch `77.77%`，func `100.00%`
- [ ] `src/pages/Contacts/Components/select/form.tsx` — stmt `87.20%`，line `86.90%`，branch `78.26%`，func `75.00%`
- [ ] `src/pages/Unitgroups/Components/select/form.tsx` — stmt `87.91%`，line `87.64%`，branch `78.26%`，func `75.00%`
- [ ] `src/pages/Unitgroups/Components/form.tsx` — stmt `97.22%`，line `97.14%`，branch `78.37%`，func `72.72%`
- [ ] `src/pages/LifeCycleModels/Components/edit.tsx` — stmt `96.42%`，line `96.00%`，branch `78.57%`，func `85.71%`
- [ ] `src/services/flows/api.ts` — stmt `90.93%`，line `90.65%`，branch `78.90%`，func `100.00%`
- [ ] `src/pages/LifeCycleModels/Components/toolbar/addThroughFlow.tsx` — stmt `90.00%`，line `89.70%`，branch `80.00%`，func `75.00%`
- [ ] `src/components/AllTeams/select.tsx` — stmt `96.00%`，line `95.83%`，branch `80.00%`，func `90.00%`
- [ ] `src/services/unitgroups/api.ts` — stmt `98.01%`，line `98.96%`，branch `80.00%`，func `93.75%`
- [ ] `src/components/Notification/index.tsx` — stmt `100.00%`，line `100.00%`，branch `80.00%`，func `100.00%`
- [ ] `src/components/RequiredMark/index.tsx` — stmt `100.00%`，line `100.00%`，branch `80.00%`，func `100.00%`
- [ ] `src/pages/Processes/Components/Review/Scope/view.tsx` — stmt `100.00%`，line `100.00%`，branch `80.00%`，func `100.00%`

查看全部 115 个未完成文件，请运行 `node scripts/test-coverage-report.js --full`。

## 共享夹具批次候选

只有这些簇，才构成成批推进队列的正当理由：

- `src/pages/Processes/Components` — 14 个未完成文件，最低 branch `51.21%`，平均 branch `74.09%`
- `src/pages/Review/Components` — 13 个未完成文件，最低 branch `81.57%`，平均 branch `89.32%`
- `src/pages/Flows/Components` — 8 个未完成文件，最低 branch `77.35%`，平均 branch `86.12%`
- `src/pages/LifeCycleModels/Components` — 8 个未完成文件，最低 branch `78.57%`，平均 branch `90.36%`
- `src/pages/Unitgroups/Components` — 7 个未完成文件，最低 branch `78.26%`，平均 branch `87.89%`
- `src/pages/Contacts/Components` — 6 个未完成文件，最低 branch `78.26%`，平均 branch `84.71%`
- `src/pages/Flowproperties/Components` — 6 个未完成文件，最低 branch `83.33%`，平均 branch `87.90%`
- `src/services/lifeCycleModels` — 3 个未完成文件，最低 branch `23.07%`，平均 branch `53.03%`
- `src/services/flows` — 3 个未完成文件，最低 branch `78.90%`，平均 branch `90.58%`
- `src/components/AllTeams` — 3 个未完成文件，最低 branch `80.00%`，平均 branch `85.52%`
- `src/services/processes` — 2 个未完成文件，最低 branch `73.21%`，平均 branch `84.14%`
- `src/components/Notification` — 2 个未完成文件，最低 branch `80.00%`，平均 branch `83.75%`

## 测试工程质量规则

- 新增测试在适用时统一复用共享 helper（`tests/helpers/mockBuilders.ts`、`testUtils.tsx`、`testData.ts`）。
- 尽量把“只验证 console 输出”的测试重构成行为断言。
- 如果页面 wrapper 存在于已测试子组件之上，至少补一条 wrapper 层测试，让覆盖率反映真实页面编排，而不是只靠子组件抬数。
- 当队列文件只剩死分支或业务无效分支时，优先做不改变行为的分支清理，而不是堆 synthetic test scaffolding。
- 保持默认报告简洁；只有当额外默认明细会改变执行顺序时，才增加默认输出。深度逐文件明细继续放在 `--full`。

## 单项执行流程（每个任务）

1. 一次只做一个队列文件，并按上面的有序清零队列推进。
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

5. 看默认清零报告：

```bash
npm run test:coverage:report
```

6. 只有在需要查看完整剩余文件状态或刷新队列快照时，才展开到全量明细：

```bash
node scripts/test-coverage-report.js --full
```

7. 更新复选框状态并记录可量化增量。
8. 若工作流、基线或 backlog 预期变化，同步更新 `docs/agents/ai-testing-guide.md`；若长期背景变化，再同步更新 `docs/agents/test_improvement_plan.md`。

## 备注

- 现在还不建议提高覆盖率阈值；先持续缩短当前有序清零队列。
- 优先做“确定性高”的分支测试，不要先扩展大范围快照。
- 待办必须可执行，避免“多写点测试”这类泛化项。
