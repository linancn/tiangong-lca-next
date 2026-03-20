# 测试待办清单（Test Todo List）

> 本文件是当前测试执行状态的事实来源。当仓库保持全量收口时，本文件处于维护态，而不是活跃 backlog。长期背景信息保留在 `docs/agents/test_improvement_plan.md`。镜像约束：修改本文件时，同步更新英文版 `docs/agents/test_todo_list.md`。

## 范围（依据 AGENTS 测试要求）

本清单对齐 `AGENTS.md` 的交付约束：

- 变更必须补对应测试，
- 运行聚焦 Jest 套件，
- `npm run lint` 必须通过，
- 流程预期变化时同步更新文档。
- 当测试工作流、覆盖率基线或 backlog 状态变化时，必须同步 `docs/agents/ai-testing-guide.md` 和本文件；若长期策略背景也变化，还要在同一 diff 中同步 `docs/agents/test_improvement_plan.md` 及 `_CN` 镜像。

## 基线快照（2026年3月20日）

最新已验证全量覆盖率运行（`npm run test:coverage:report`，它会先重新执行 `npm run test:coverage`）：

- Test suites：288 passed
- Tests：3476 passed
- 覆盖率：
  - Statements: 100.00% (20013/20013)
  - Branches: 100.00% (11419/11419)
  - Functions: 100.00% (4379/4379)
  - Lines: 100.00% (19143/19143)
- 相比上一版已记录基线的增量：
  - Test suites：+2
  - Tests：+634
  - Statements：+5.03
  - Branches：+12.03
  - Functions：+5.99
  - Lines：+4.85
- 当前全局 branch 门槛：50%
- 门禁状态：**已通过**（高于门槛 50.00 个百分点）

## 当前状态

- 当前有序清零队列已经清空。
- 仓库现在处于维护态。
- 任何代码修改都必须作为硬约束维持全仓 `100%` statements / branches / functions / lines。
- 本地 push 会被 `.husky/pre-push` 强制门禁；当前门禁命令是 `npm run prepush:gate`。

## 全文件库存

同一轮运行得到的全仓逐文件状态：

- 追踪的源码文件：313
- 已全满文件（`100/100/100/100`）：313
- 仍有缺口的文件：0
- Branch 分桶：
  - `<50`：0 个文件
  - `50-70`：0 个文件
  - `70-90`：0 个文件
  - `90-<100`：0 个文件
- `line=100` 但 `branch<100`：0 个文件
- 分类平均值：
  - components：`100.00%` lines / `100.00%` branches / `100.00%` functions
  - services：`100.00%` lines / `100.00%` branches / `100.00%` functions
  - pages：`100.00%` lines / `100.00%` branches / `100.00%` functions
  - others：`100.00%` lines / `100.00%` branches / `100.00%` functions

## 报告工作流

- 共享 `npm test` runner 会把 unit/src 阶段限制为 `--maxWorkers=50%`，用于规避 macOS 全量本地运行和 pre-push 中出现的 Jest worker 偶发 `SIGSEGV` 崩溃。
- `npm run test:coverage` 和 `npm run test:coverage:report` 都已内置所需堆内存，全量覆盖率直接用脚本即可。
- `npm run test:coverage:assert-full` 会对最新 coverage 产物做严格断言，只要任一 tracked source file 不是 `100/100/100/100` 就失败。
- `npm run prepush:gate` 是精确等同于 push 前门禁的本地命令：`lint + 全量 coverage + 严格全仓 100% 断言`。
- `npm run test:coverage:report` 是默认 review 产物，默认输出：
  - 全局摘要，
  - 分类摘要，
  - 清零队列摘要，
  - 共享夹具批次，
  - 下一个 25 个有序未完成文件。
- 队列和批次区块会输出完整的项目相对路径；文件和批次标签不再用 `...` 截断。
- `node scripts/test-coverage-report.js --full` 会输出所有剩余文件的完整有序未完成队列。
- 当队列为空时，这两个报告命令都会明确输出 `No files with remaining coverage gaps.`；后续有意义的测试工程变更后，仍要用它们确认仓库是否保持维护态。
- 队列排序是确定性的：`branches 升序 -> lines 升序 -> statements 升序 -> functions 升序 -> path`。

## 执行策略

1. 不再按主观“哪个收益更高”重新排工作优先级。
2. 当队列为空时，进入维护态：所有触达或新增的 `src/**` 文件都必须保持 `100/100/100/100`。
3. 如果未来出现回归并重新打开队列，就恢复严格队列顺序，从第一个文件开始收口。
4. 允许的成批例外：当前文件和紧邻文件共享同一套 mock/fixture/test harness 时，可围绕最早的那个文件一起收口。
5. 允许的基础设施例外：如果共享测试 blocker 卡住当前文件或紧邻文件，可先修 blocker，再恢复队列顺序。
6. 如果剩余分支被证明不可达或业务上无效，优先在不改变行为的前提下删除死分支，而不是为了抬覆盖率去编造测试。
7. 需要保留 wrapper/page 层编排测试，不能只靠子组件覆盖抬数。

## 当前有序清零队列（队头快照）

- 当前没有任何剩余覆盖率缺口。
- 维护态规则：如果未来某次变更重新打开 coverage debt，就用 `npm run test:coverage:report` 重新生成队列，并从第一个文件开始恢复顺排收口。
- `node scripts/test-coverage-report.js --full` 仍然是队列重新出现时的完整事实来源。

## 共享夹具批次候选

当前没有活跃的 batching candidate，因为队列已经清空。

## 测试工程质量规则

- 新增测试在适用时统一复用共享 helper（`tests/helpers/mockBuilders.ts`、`testUtils.tsx`、`testData.ts`）。
- 尽量把“只验证 console 输出”的测试重构成行为断言。
- 如果页面 wrapper 存在于已测试子组件之上，至少补一条 wrapper 层测试，让覆盖率反映真实页面编排，而不是只靠子组件抬数。
- 当队列文件只剩死分支或业务无效分支时，优先做不改变行为的分支清理，而不是堆 synthetic test scaffolding。
- 保持默认报告简洁；只有当额外默认明细会改变执行顺序时，才增加默认输出。深度逐文件明细继续放在 `--full`。
- 在维护态下，任何新出现的未覆盖分支都应被视为需要立即消掉的回归，而不是新的长期 backlog。

## 单项执行流程（每个任务）

1. 先运行 `npm run test:coverage:report`。
2. 如果报告显示没有缺口，就保持维护态，确保所有触达或新增的 `src/**` 文件都维持 `100/100/100/100`。
3. 如果报告显示有缺口，就从有序清零队列的第一个文件开始推进。
4. 运行聚焦命令：

```bash
npm run test:ci -- <pattern> --runInBand --testTimeout=20000 --no-coverage
```

5. 运行 lint 门禁：

```bash
npm run lint
```

6. 每完成一批有意义的改动，或在同步文档前，运行全量覆盖率：

```bash
npm run test:coverage
```

7. 看默认清零报告：

```bash
npm run test:coverage:report
```

8. 只有在需要查看完整剩余文件状态或刷新队列快照时，才展开到全量明细：

```bash
node scripts/test-coverage-report.js --full
```

9. 当基线或维护态状态变化时，更新状态说明并记录可量化增量。
10. 若工作流、基线或 backlog 预期变化，同步更新 `docs/agents/ai-testing-guide.md`；若长期背景变化，再同步更新 `docs/agents/test_improvement_plan.md`。

## 备注

- 现在还不建议提高覆盖率阈值；先证明全仓满覆盖能够在维护态下稳定保持。
- 优先做“确定性高”的分支测试，不要先扩展大范围快照。
- 当队列为空时，本文件保持维护态即可，不要为了“看起来有 backlog”而人为制造泛化待办。
