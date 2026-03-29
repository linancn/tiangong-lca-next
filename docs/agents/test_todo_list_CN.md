# 测试待办清单（Test Todo List）

> 本文件是当前测试执行状态的事实来源。当仓库保持全量收口时，本文件处于维护态，而不是活跃 backlog。长期背景信息保留在 `docs/agents/test_improvement_plan.md`。镜像约束：修改本文件时，同步更新英文版 `docs/agents/test_todo_list.md`。

## 范围（依据 AGENTS 测试要求）

本清单对齐 `AGENTS.md` 的交付约束：

- 变更必须补对应测试，
- 运行聚焦 Jest 套件，
- `npm run lint` 必须通过，
- 流程预期变化时同步更新文档。
- 当测试工作流、覆盖率基线或 backlog 状态变化时，必须同步 `docs/agents/ai-testing-guide.md` 和本文件；若长期策略背景也变化，还要在同一 diff 中同步 `docs/agents/test_improvement_plan.md` 及 `_CN` 镜像。

## 基线快照（2026年3月24日）

最新已验证全量覆盖率运行（`npm run test:coverage:report`，随后执行 `npm run test:coverage:assert-full`）：

- Test suites：309 passed
- Tests：3689 passed
- 覆盖率：
  - Statements: 100.00% (21875/21875)
  - Branches: 100.00% (12565/12565)
  - Functions: 100.00% (4750/4750)
  - Lines: 100.00% (20967/20967)
- 相比上一版已记录基线的增量：
  - Test suites：+1
  - Tests：+2
  - Statements：+6
  - Branches：+5
  - Functions：+2
  - Lines：+6
- 当前全局 branch 门槛：50%
- 门禁状态：**已通过**（高于门槛 50.00 个百分点）

## 当前状态

- 当前有序清零队列已经清空。
- 仓库现在处于维护态。
- 任何代码修改都必须作为硬约束维持全仓 `100%` statements / branches / functions / lines。
- 本地 push 会被 `.husky/pre-push` 强制门禁；当前门禁命令是 `npm run prepush:gate`。

## 集成测试扩展计划（独立于覆盖率清零队列）

- 这套计划用于在覆盖率已经收口之后，继续提高工作流层面的测试置信度；它不替代上面的覆盖率维护规则。
- 进度衡量统一使用 `docs/agents/ai-testing-guide.md` 里的 100 分集成测试量表，而不是要求 `tests/integration` 自己打到 `100%` 代码覆盖率。
- 目标状态：
  - 新增或发生重大重构的高风险工作流，在被称为“集成测试完备”之前应达到 `>=85/100`。
  - 现有 legacy 工作流允许按阶段逐步抬升，而不是一次性重写所有测试。

## 集成测试分阶段推进顺序

1. Phase 1 – 路由/数据源矩阵
   - [x] 已扩展 `tests/integration/lifeCycleModels/LifeCycleModelsWorkflow.integration.test.tsx` 和 `tests/integration/processes/ProcessesWorkflow.integration.test.tsx`，这两个 suite 现在都覆盖 `/mydata` 和 `/tgdata`。
   - [x] 已扩展 `tests/integration/flows/FlowsWorkflow.integration.test.tsx` 和 `tests/integration/flowproperties/FlowpropertiesWorkflow.integration.test.tsx`，这两个 suite 现在都覆盖 `/mydata` 和 `/tgdata`。
   - [x] 已扩展 `tests/integration/unitgroups/UnitgroupsWorkflow.integration.test.tsx`、`tests/integration/sources/SourcesWorkflow.integration.test.tsx`、`tests/integration/contacts/ContactsWorkflow.integration.test.tsx`，这三个 suite 现在都覆盖 `/mydata` 和 `/tgdata`。
   - [ ] 一旦某功能在不同数据源类型下确实存在 UI 或服务行为差异，就把它升级为完整的 `/mydata` + `/tgdata` + `/codata` + `/tedata` 四路矩阵，而不是停在一个辅助前缀上。
2. Phase 2 – 权限和角色矩阵
   - [x] 已扩展 `tests/integration/teams/TeamsWorkflow.integration.test.tsx`、`tests/integration/manageSystem/ManageSystemWorkflow.integration.test.tsx`、`tests/integration/reviews/ReviewWorkflow.integration.test.tsx`，这三个 suite 现在都覆盖 allow、restricted、failure 三类状态。
   - [x] 同时断言用户可见控件，以及 `@/services/**` 调用是被允许还是被阻止。
3. Phase 3 – URL/query 与导航流程
   - [x] 让 `tests/integration/user/LoginWorkflow.integration.test.tsx` 负责 `redirect` query 的跳转处理。
   - [x] 让 `tests/integration/processes/ProcessesWorkflow.integration.test.tsx` 负责 `id/version` 深链自动打开行为。
   - [x] 扩展 `tests/integration/welcome/WelcomeWorkflow.integration.test.tsx`、`tests/integration/account/AccountProfileWorkflow.integration.test.tsx`，以及从 Processes 页跳转到 `/mydata/processes/analysis` 的导航断言。
4. Phase 4 – 失败与回退行为
   - [x] `tests/integration/welcome/WelcomeWorkflow.integration.test.tsx` 已覆盖当 `getTeams()` 返回空结果时，Data Ecosystem modal 仍保持可交互。
   - [x] `tests/integration/welcome/WelcomeWorkflow.integration.test.tsx` 现已覆盖缩略图查询失败时，team card 仍然保持可见。
   - [x] `tests/integration/processes/ProcessesWorkflow.integration.test.tsx` 现已覆盖首轮列表为空时的可见空态，以及用户点击 reload 后的恢复。
   - [x] `tests/integration/processes/ProcessesWorkflow.integration.test.tsx` 现已覆盖列表请求抛错时的可见 toast，以及 reload 后的恢复。
   - [x] `tests/integration/user/LoginWorkflow.integration.test.tsx` 现已覆盖重复注册回退，以及验证邮件发送失败时的内联反馈。
   - [x] `tests/integration/account/AccountProfileWorkflow.integration.test.tsx` 现已覆盖当前密码错误，以及生成 API key 时凭证无效的回退路径。
   - [x] `tests/integration/account/AccountProfileWorkflow.integration.test.tsx` 现已覆盖首次资料加载失败，以及邮箱变更失败时的提示信息。
   - [ ] 对上述每个工作流锚点，补齐列表加载失败、create/update 失败、delete 失败或取消、以及有意义时的空状态渲染。
   - [ ] 优先断言用户可见恢复行为，不要停留在 console-only 断言。
5. Phase 5 – 可选的浏览器真实冒烟
   - [ ] 只有当人明确决定将来要引入 E2E 时，才升级极少量冒烟链路：登录重定向、欢迎页入口跳转、一条代表性 CRUD、以及一条上传/预览流程。

## 全文件库存

同一轮运行得到的全仓逐文件状态：

- 追踪的源码文件：334
- 已全满文件（`100/100/100/100`）：334
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
8. 如果人明确要求扩展工作流层面的测试信心，就按上面的阶段顺序推进集成测试，而不是零散追加一次性场景。

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
- 对集成测试扩展工作，优先使用矩阵驱动 suite（`describe.each(...)`），避免一份变体一个文件的重复结构。
- 未来如果补 E2E，范围必须保持很薄，只覆盖浏览器真实行为。

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
