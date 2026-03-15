# 测试待办清单（Test Todo List）

> 这是**可执行**测试待办的事实来源。本文件用于执行排期；长期背景信息保留在 `docs/agents/test_improvement_plan.md`。镜像约束：修改本文件时，同步更新英文版 `docs/agents/test_todo_list.md`。

## 范围（依据 AGENTS 测试要求）

本清单对齐 `AGENTS.md` 的交付约束：

- 变更必须补对应测试，
- 运行聚焦 Jest 套件，
- `npm run lint` 必须通过，
- 流程预期变化时同步更新文档。
- 当测试工作流、覆盖率基线或 backlog 状态变化时，必须同步 `docs/agents/ai-testing-guide.md` 和本文件；若长期策略背景也变化，还要在同一 diff 中同步 `docs/agents/test_improvement_plan.md` 及 `_CN` 镜像。

## 基线快照（2026年3月15日）

最新已验证全量覆盖率运行（`npm run test:coverage`）：

- Test suites：279 passed
- Tests：2741 passed
- 覆盖率：
  - Statements: 96.04% (17944/18682)
  - Branches: 89.35% (9597/10740)
  - Functions: 93.86% (3735/3979)
  - Lines: 96.32% (17186/17842)
- 相比上一版已记录基线的增量：
  - Test suites：+3
  - Tests：+260
  - Statements：+2.11
  - Branches：+7.03
  - Functions：+2.77
  - Lines：+2.06
- 当前全局 branch 门槛：50%
- 门禁状态：**已通过**（高于门槛 39.35 个百分点）

## 最近收口增量

- 已全满文件：`140 -> 177`（`+37`）
- 仍有缺口的文件：`160 -> 126`（`-34`）
- `50%-70% branch` 桶：`24 -> 0`
- `line=100 但 branch<100` 桶：`43 -> 30`
- 最近清到 `100/100/100/100` 的队头文件包括 `Flows index`、`LifeCycleModels index`、`Processes form/view`、`Contacts delete`、`Processes delete`、`Processes Exchange delete`、`services/auth/{cognito,password}`、`Review/SelectReviewer`、`Flowproperties select form`、`services/flowproperties/api`。

## 全文件库存

同一轮运行得到的全仓逐文件状态：

- 追踪的源码文件：303
- 已全满文件（`100/100/100/100`）：177
- 仍有缺口的文件：126
- Branch 分桶：
  - `<50`：0 个文件
  - `50-70`：0 个文件
  - `70-90`：91 个文件
  - `90-<100`：24 个文件
- `line=100` 但 `branch<100`：30 个文件
- 分类平均值：
  - components：`97.18%` lines / `92.52%` branches / `95.42%` functions
  - services：`96.44%` lines / `90.38%` branches / `97.42%` functions
  - pages：`97.34%` lines / `92.92%` branches / `93.02%` functions
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

- [ ] `src/components/LCIACacheMonitor/index.tsx` — stmt `86.36%`，line `87.30%`，branch `72.22%`，func `80.00%`
- [ ] `src/pages/LifeCycleModels/Components/toolbar/Exchange/ioPortSelect.tsx` — stmt `98.41%`，line `98.33%`，branch `72.41%`，func `95.65%`
- [ ] `src/components/AllTeams/index.tsx` — stmt `98.75%`，line `98.71%`，branch `72.50%`，func `100.00%`
- [ ] `src/pages/Review/Components/reviewProcess/index.tsx` — stmt `90.12%`，line `90.56%`，branch `72.60%`，func `62.50%`
- [ ] `src/pages/Sources/Components/delete.tsx` — stmt `100.00%`，line `100.00%`，branch `72.72%`，func `100.00%`
- [ ] `src/services/unitgroups/util.ts` — stmt `100.00%`，line `100.00%`，branch `73.17%`，func `100.00%`
- [ ] `src/components/AISuggestion/index.tsx` — stmt `84.58%`，line `84.22%`，branch `73.60%`，func `97.05%`
- [ ] `src/pages/LifeCycleModels/Components/toolbar/add.tsx` — stmt `87.39%`，line `87.17%`，branch `74.19%`，func `71.87%`
- [ ] `src/services/teams/api.ts` — stmt `100.00%`，line `100.00%`，branch `74.28%`，func `100.00%`
- [ ] `src/pages/Sources/Components/form.tsx` — stmt `94.87%`，line `94.73%`，branch `74.41%`，func `80.00%`
- [ ] `src/pages/Contacts/Components/form.tsx` — stmt `100.00%`，line `100.00%`，branch `74.57%`，func `100.00%`
- [ ] `src/services/processes/classification/api.ts` — stmt `71.42%`，line `70.00%`，branch `75.00%`，func `80.00%`
- [ ] `src/pages/Review/index.tsx` — stmt `87.27%`，line `87.03%`，branch `75.00%`，func `100.00%`
- [ ] `src/pages/User/Login/password_forgot.tsx` — stmt `90.90%`，line `90.69%`，branch `75.00%`，func `77.77%`
- [ ] `src/pages/Review/Components/reviewLifeCycleModels/Components/toolbar/viewTargetAmount.tsx` — stmt `96.96%`，line `96.77%`，branch `75.00%`，func `87.50%`
- [ ] `src/services/auth/profile.ts` — stmt `100.00%`，line `100.00%`，branch `75.00%`，func `100.00%`
- [ ] `src/pages/Sources/Components/create.tsx` — stmt `83.94%`，line `85.60%`，branch `75.86%`，func `65.51%`
- [ ] `src/services/lifeCycleModels/api.ts` — stmt `89.35%`，line `89.30%`，branch `75.98%`，func `84.90%`
- [ ] `src/pages/Sources/Components/select/drawer.tsx` — stmt `87.87%`，line `87.75%`，branch `76.92%`，func `80.00%`
- [ ] `src/services/lca/taskCenter.ts` — stmt `88.38%`，line `88.03%`，branch `76.97%`，func `100.00%`
- [ ] `src/services/contacts/api.ts` — stmt `98.34%`，line `98.33%`，branch `77.10%`，func `100.00%`
- [ ] `src/services/lifeCycleModels/util_allocate_supply_demand.ts` — stmt `97.31%`，line `98.76%`，branch `77.22%`，func `100.00%`
- [ ] `src/pages/Sources/Components/view.tsx` — stmt `91.66%`，line `91.42%`，branch `77.27%`，func `62.50%`
- [ ] `src/pages/Sources/Components/select/form.tsx` — stmt `86.11%`，line `87.50%`，branch `77.31%`，func `78.26%`
- [ ] `src/pages/Flows/Components/create.tsx` — stmt `91.59%`，line `93.10%`，branch `77.35%`，func `70.83%`

查看全部 126 个未完成文件，请运行 `node scripts/test-coverage-report.js --full`。

## 共享夹具批次候选

只有这些簇，才构成成批推进队列的正当理由：

- `src/pages/Review/Components` — 14 个未完成文件，最低 branch `72.60%`，平均 branch `86.82%`
- `src/pages/LifeCycleModels/Components` — 10 个未完成文件，最低 branch `72.41%`，平均 branch `87.14%`
- `src/pages/Flows/Components` — 8 个未完成文件，最低 branch `77.35%`，平均 branch `86.12%`
- `src/pages/Sources/Components` — 7 个未完成文件，最低 branch `72.72%`，平均 branch `77.67%`
- `src/pages/Contacts/Components` — 7 个未完成文件，最低 branch `74.57%`，平均 branch `83.26%`
- `src/pages/Unitgroups/Components` — 7 个未完成文件，最低 branch `78.26%`，平均 branch `87.89%`
- `src/pages/Processes/Components` — 6 个未完成文件，最低 branch `77.77%`，平均 branch `82.92%`
- `src/pages/Flowproperties/Components` — 6 个未完成文件，最低 branch `83.33%`，平均 branch `87.90%`
- `src/components/AllTeams` — 4 个未完成文件，最低 branch `72.50%`，平均 branch `82.26%`
- `src/pages/User/Login` — 3 个未完成文件，最低 branch `75.00%`，平均 branch `89.81%`
- `src/services/processes` — 3 个未完成文件，最低 branch `75.00%`，平均 branch `83.64%`
- `src/services/lifeCycleModels` — 3 个未完成文件，最低 branch `75.98%`，平均 branch `79.12%`

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
