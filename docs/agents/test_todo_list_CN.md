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
- Tests：2481 passed
- 覆盖率：
  - Statements: 93.93% (17286/18402)
  - Branches: 82.32% (8819/10712)
  - Functions: 91.09% (3569/3918)
  - Lines: 94.26% (16559/17567)
- 相比上一版已记录基线的增量：
  - Test suites：+0
  - Tests：+131
  - Statements：+2.45
  - Branches：+4.15
  - Functions：+3.73
  - Lines：+2.48
- 当前全局 branch 门槛：50%
- 门禁状态：**已通过**（高于门槛 32.32 个百分点）

## 最近收口增量

- 已全满文件：`115 -> 140`（`+25`）
- 仍有缺口的文件：`185 -> 160`（`-25`）
- `<50% branch` 桶：`2 -> 0`
- `50%-70% branch` 桶：`46 -> 24`
- 最近清到 `100/100/100/100` 的队头文件包括 `TableFilter`、`FileViewer/upload`、`Unitgroups edit`、`Processes edit`、`Processes Exchange create/edit/select`、`Flows Property create/edit`、`ReviewForm/view`、`Processes Compliance/view`。

## 全文件库存

同一轮运行得到的全仓逐文件状态：

- 追踪的源码文件：300
- 已全满文件（`100/100/100/100`）：140
- 仍有缺口的文件：160
- Branch 分桶：
  - `<50`：0 个文件
  - `50-70`：24 个文件
  - `70-90`：101 个文件
  - `90-<100`：24 个文件
- `line=100` 但 `branch<100`：43 个文件
- 分类平均值：
  - components：`96.81%` lines / `89.64%` branches / `95.08%` functions
  - services：`95.90%` lines / `86.72%` branches / `97.17%` functions
  - pages：`96.15%` lines / `87.70%` branches / `90.81%` functions
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
6. 如果剩余分支被证明不可达或业务上无效，优先在不改变行为的前提下删除死分支，而不是为了抬覆盖率去编造测试。
7. 需要保留 wrapper/page 层编排测试，不能只靠子组件覆盖抬数。

## 当前有序清零队列（队头快照）

- [ ] `src/pages/Unitgroups/Components/Unit/reference.tsx` — stmt `100.00%`，line `100.00%`，branch `62.50%`，func `100.00%`
- [ ] `src/components/LocationTextItem/form.tsx` — stmt `100.00%`，line `100.00%`，branch `63.63%`，func `100.00%`
- [ ] `src/pages/Flows/index.tsx` — stmt `79.72%`，line `80.28%`，branch `64.51%`，func `61.29%`
- [ ] `src/pages/LifeCycleModels/index.tsx` — stmt `87.35%`，line `87.20%`，branch `64.70%`，func `89.47%`
- [ ] `src/pages/Processes/Components/form.tsx` — stmt `84.73%`，line `85.27%`，branch `64.86%`，func `70.73%`
- [ ] `src/pages/LifeCycleModels/Components/toolbar/viewIndex.tsx` — stmt `92.46%`，line `91.72%`，branch `65.00%`，func `86.48%`
- [ ] `src/pages/Sources/Components/select/description.tsx` — stmt `100.00%`，line `100.00%`，branch `65.00%`，func `100.00%`
- [ ] `src/pages/Flowproperties/Components/form.tsx` — stmt `100.00%`，line `100.00%`，branch `65.21%`，func `100.00%`
- [ ] `src/pages/Processes/Components/create.tsx` — stmt `83.45%`，line `84.61%`，branch `65.27%`，func `56.66%`
- [ ] `src/components/LevelTextItem/form.tsx` — stmt `77.90%`，line `77.64%`，branch `65.57%`，func `77.77%`
- [ ] `src/pages/Unitgroups/Components/select/formMini.tsx` — stmt `94.73%`，line `94.59%`，branch `65.71%`，func `83.33%`
- [ ] `src/pages/LifeCycleModels/Components/toolbar/editIndex.tsx` — stmt `98.81%`，line `99.15%`，branch `65.85%`，func `96.19%`
- [ ] `src/pages/Processes/Components/view.tsx` — stmt `84.55%`，line `84.91%`，branch `66.51%`，func `80.00%`
- [ ] `src/pages/Contacts/Components/delete.tsx` — stmt `100.00%`，line `100.00%`，branch `66.66%`，func `100.00%`
- [ ] `src/pages/Processes/Components/delete.tsx` — stmt `100.00%`，line `100.00%`，branch `66.66%`，func `100.00%`
- [ ] `src/pages/Processes/Components/Exchange/delete.tsx` — stmt `100.00%`，line `100.00%`，branch `66.66%`，func `100.00%`
- [ ] `src/services/auth/cognito.ts` — stmt `100.00%`，line `100.00%`，branch `66.66%`，func `100.00%`
- [ ] `src/services/auth/password.ts` — stmt `100.00%`，line `100.00%`，branch `66.66%`，func `100.00%`
- [ ] `src/pages/Review/Components/SelectReviewer.tsx` — stmt `89.14%`，line `88.88%`，branch `67.44%`，func `76.00%`
- [ ] `src/pages/LifeCycleModels/Components/toolbar/viewTargetAmount.tsx` — stmt `97.05%`，line `96.87%`，branch `67.64%`，func `87.50%`

查看全部 160 个未完成文件，请运行 `node scripts/test-coverage-report.js --full`。

## 共享夹具批次候选

只有这些簇，才构成成批推进队列的正当理由：

- `src/pages/Review/Components` — 16 个未完成文件，最低 branch `67.44%`，平均 branch `84.65%`
- `src/pages/LifeCycleModels/Components` — 15 个未完成文件，最低 branch `65.00%`，平均 branch `80.70%`
- `src/pages/Processes/Components` — 12 个未完成文件，最低 branch `64.86%`，平均 branch `75.90%`
- `src/pages/Unitgroups/Components` — 10 个未完成文件，最低 branch `62.50%`，平均 branch `81.18%`
- `src/pages/Flows/Components` — 8 个未完成文件，最低 branch `77.35%`，平均 branch `86.12%`
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
