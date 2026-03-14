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

- Test suites：276 passed
- Tests：2350 passed
- 覆盖率：
  - Statements: 91.48% (16840/18408)
  - Branches: 78.17% (8394/10738)
  - Functions: 87.36% (3424/3919)
  - Lines: 91.78% (16130/17573)
- 相比上一版已记录基线的增量：
  - Test suites：+1
  - Tests：+102
  - Statements：+6.65
  - Branches：+6.57
  - Functions：+7.29
  - Lines：+6.63
- 当前全局 branch 门槛：50%
- 门禁状态：**已通过**（高于门槛 28.17 个百分点）

## 全文件库存

同一轮运行得到的全仓逐文件状态：

- 追踪的源码文件：300
- 已全满文件（`100/100/100/100`）：115
- 仍有缺口的文件：185
- Branch 分桶：
  - `<50`：2 个文件
  - `50-70`：46 个文件
  - `70-90`：101 个文件
  - `90-<100`：25 个文件
- `line=100` 但 `branch<100`：49 个文件
- 分类平均值：
  - components：`96.81%` lines / `85.69%` branches / `95.08%` functions
  - services：`95.90%` lines / `86.72%` branches / `97.17%` functions
  - pages：`94.27%` lines / `81.47%` branches / `87.48%` functions
  - others：`99.53%` lines / `98.96%` branches / `99.45%` functions

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
6. 需要保留 wrapper/page 层编排测试，不能只靠子组件覆盖抬数。

## 当前有序清零队列（队头快照）

- [ ] `src/components/TableFilter/index.tsx` — stmt `100.00%`，line `100.00%`，branch `0.00%`，func `100.00%`
- [ ] `src/pages/Unitgroups/Components/edit.tsx` — stmt `70.27%`，line `71.50%`，branch `46.91%`，func `56.75%`
- [ ] `src/pages/LifeCycleModels/Components/toolbar/Exchange/index.tsx` — stmt `92.85%`，line `92.85%`，branch `50.00%`，func `75.00%`
- [ ] `src/components/FileViewer/upload.tsx` — stmt `100.00%`，line `100.00%`，branch `50.00%`，func `100.00%`
- [ ] `src/pages/Review/Components/ReviewProgress.tsx` — stmt `74.13%`，line `75.29%`，branch `50.43%`，func `82.92%`
- [ ] `src/pages/Processes/index.tsx` — stmt `75.51%`，line `75.52%`，branch `51.51%`，func `80.00%`
- [ ] `src/pages/LifeCycleModels/Components/toolbar/viewInfo.tsx` — stmt `94.28%`，line `93.75%`，branch `52.63%`，func `81.81%`
- [ ] `src/pages/LifeCycleModels/Components/toolbar/Exchange/ioPortView.tsx` — stmt `97.72%`，line `97.56%`，branch `52.94%`，func `94.44%`
- [ ] `src/pages/Review/Components/reviewLifeCycleModels/Components/toolbar/Exchange/ioPortSelect.tsx` — stmt `98.00%`，line `97.87%`，branch `54.54%`，func `95.00%`
- [ ] `src/pages/Review/Components/reviewLifeCycleModels/Components/toolbar/viewIndex.tsx` — stmt `87.12%`，line `86.77%`，branch `54.83%`，func `83.78%`
- [ ] `src/pages/LifeCycleModels/Components/toolbar/eidtInfo.tsx` — stmt `72.30%`，line `72.42%`，branch `54.96%`，func `56.81%`
- [ ] `src/pages/Processes/Components/edit.tsx` — stmt `71.26%`，line `71.60%`，branch `56.14%`，func `58.92%`
- [ ] `src/pages/Unitgroups/Components/select/drawer.tsx` — stmt `81.15%`，line `80.59%`，branch `56.25%`，func `57.89%`
- [ ] `src/pages/Review/Components/reviewLifeCycleModels/Components/toolbar/Exchange/ioPortView.tsx` — stmt `97.61%`，line `97.43%`，branch `57.14%`，func `94.11%`
- [ ] `src/pages/Processes/Components/Exchange/edit.tsx` — stmt `79.48%`，line `78.66%`，branch `58.53%`，func `51.85%`
- [ ] `src/pages/Processes/Components/Exchange/create.tsx` — stmt `77.14%`，line `76.47%`，branch `58.82%`，func `45.83%`
- [ ] `src/pages/Processes/Components/Exchange/select.tsx` — stmt `91.54%`，line `91.30%`，branch `60.00%`，func `72.72%`
- [ ] `src/pages/Flows/Components/Property/edit.tsx` — stmt `91.83%`，line `91.30%`，branch `60.00%`，func `75.00%`
- [ ] `src/pages/Flows/Components/Property/create.tsx` — stmt `97.43%`，line `97.29%`，branch `60.00%`，func `92.30%`
- [ ] `src/pages/Review/Components/ReviewForm/view.tsx` — stmt `100.00%`，line `100.00%`，branch `60.00%`，func `100.00%`

查看全部 185 个未完成文件，请运行 `node scripts/test-coverage-report.js --full`。

## 共享夹具批次候选

只有这些簇，才构成成批推进队列的正当理由：

- `src/pages/Review/Components` — 21 个未完成文件，最低 branch `50.43%`，平均 branch `77.68%`
- `src/pages/LifeCycleModels/Components` — 20 个未完成文件，最低 branch `50.00%`，平均 branch `75.67%`
- `src/pages/Processes/Components` — 17 个未完成文件，最低 branch `56.14%`，平均 branch `70.99%`
- `src/pages/Unitgroups/Components` — 14 个未完成文件，最低 branch `46.91%`，平均 branch `74.11%`
- `src/pages/Flows/Components` — 11 个未完成文件，最低 branch `60.00%`，平均 branch `79.14%`
- `src/pages/Sources/Components` — 8 个未完成文件，最低 branch `65.00%`，平均 branch `76.08%`
- `src/pages/Flowproperties/Components` — 8 个未完成文件，最低 branch `65.21%`，平均 branch `82.95%`
- `src/pages/Contacts/Components` — 8 个未完成文件，最低 branch `66.66%`，平均 branch `81.19%`
- `src/services/auth` — 4 个未完成文件，最低 branch `66.66%`，平均 branch `76.08%`
- `src/services/lifeCycleModels` — 4 个未完成文件，最低 branch `69.60%`，平均 branch `76.74%`
- `src/pages/User` — 4 个未完成文件，最低 branch `71.42%`，平均 branch `85.22%`
- `src/components/AllTeams` — 4 个未完成文件，最低 branch `72.50%`，平均 branch `82.26%`

## 测试工程质量规则

- 新增测试在适用时统一复用共享 helper（`tests/helpers/mockBuilders.ts`、`testUtils.tsx`、`testData.ts`）。
- 尽量把“只验证 console 输出”的测试重构成行为断言。
- 如果页面 wrapper 存在于已测试子组件之上，至少补一条 wrapper 层测试，让覆盖率反映真实页面编排，而不是只靠子组件抬数。
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
