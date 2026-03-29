# AI 测试指南 – Tiangong LCA Next（中文镜像）

> 任意测试任务先读本文件。先从 `AGENTS.md` 进入，再用本文件作为短流程清单。镜像约束：英文版 `docs/agents/ai-testing-guide.md` 更新时，本文件必须同步更新。

## 环境

- Node.js **>= 24**（`nvm use 24`）。
- Jest + Testing Library 已预配置。
- 复用 `tests/helpers/**` 与 `tests/mocks/**`。
- 未经批准不得新增测试依赖。

## 快速流程（必做）

1. 明确范围：功能、用户流程、测试类型（unit/integration/component）。
2. 先看现有代码和测试（`src/pages/**`、`src/services/**`、`tests/**`），并检查 `docs/agents/test_todo_list.md` 里的当前 backlog。
3. 复用 `testing-patterns.md` 的项目模式。
4. 先 mock 服务，再 render。
5. 用语义化断言（`getByRole`、`findByText`、`waitFor`）。
6. 跑聚焦测试 + lint，并回报实际命令。

## 关键护栏

- 所有网络/服务调用（`supabase`、`@/services/**`）必须在 `render` 前 mock。
- 优先 `mockResolvedValue` / `mockRejectedValue`，保证异步稳定。
- 每个用例间清理 mocks。
- 禁止“先渲染后 mock”。
- 禁止遗漏 `await` / `waitFor` 造成悬挂异步。
- 避免在 `mockImplementation` 中每次返回新对象导致引用不稳定。

## 可执行命令

```bash
# 全量本地门禁（与 CI 风格一致）
npm test

# 全量覆盖率
npm run test:coverage
npm run test:coverage:assert-full
npm run test:coverage:report
npm run prepush:gate

# 共享 runner 实际使用的全量 unit/src 阶段命令
npx jest tests/unit src --maxWorkers=50% --testTimeout=20000

# 聚焦集成测试
npm run test:ci -- tests/integration/<feature>/ --runInBand --testTimeout=20000 --no-coverage

# 聚焦单测/组件测
npm run test:ci -- tests/unit/<scope>/ --runInBand --testTimeout=10000 --no-coverage

# 单文件句柄排查
npm run test:ci -- tests/integration/processes/ProcessesWorkflow.integration.test.tsx \
  --runInBand --testTimeout=20000 --detectOpenHandles

# 开发期 watch（直接调用 Jest）
npx jest tests/unit/services/processes/ --watch

# 代码门禁
npm run lint
```

## 覆盖率预期

- 方向目标：把 `src/**` 持续推进到 100% 的有效覆盖。
- 硬约束：任何代码修改都必须让全仓 Statements / Branches / Functions / Lines 保持 `100%`。
- 当前强制门禁：以 `jest.config.cjs` 里的全局阈值为准。
- 工作流稳定性说明：共享 `npm test` runner 会把 unit/src 阶段限制为 `--maxWorkers=50%`，用于规避在 macOS 全量本地运行和 pre-push 中观察到的 Jest worker 偶发崩溃。
- 截至 2026 年 3 月 24 日，最新已验证全量运行（`npm run test:coverage:report`，随后执行 `npm run test:coverage:assert-full`）是 `309 suites / 3689 tests`，全局覆盖率为：
  - Statements: `100.00%` (21875/21875)
  - Branches: `100.00%` (12565/12565)
  - Functions: `100.00%` (4750/4750)
  - Lines: `100.00%` (20967/20967)
- 同一轮运行得到的逐文件库存摘要：
  - 追踪的源码文件：`334`
  - 已全满文件（`100/100/100/100`）：`334`
  - 仍有缺口的文件：`0`
  - Branch 分桶：`<50 = 0`、`50-70 = 0`、`70-90 = 0`、`90-<100 = 0`
  - `line=100` 但 `branch<100` 的文件：`0`
- 当前有序清零队列已经清空。仓库现在处于维护态：所有触达或新增的 `src/**` 文件都要保持 `100/100/100/100`，只有覆盖率报告重新出现缺口时，才恢复队列执行。
- Push 门禁：`.husky/pre-push` 现在执行 `npm run prepush:gate`，也就是 `lint + npm run test:coverage + npm run test:coverage:assert-full`。只要覆盖率不是全仓 100%，本地 push 就会被直接拦下。
- 当前执行 backlog 以 `docs/agents/test_todo_list.md` 为准；`docs/agents/test_improvement_plan.md` 提供长期策略背景。
- `npm run test:coverage` 和 `npm run test:coverage:report` 已经内置所需堆内存；只有在脱离 package scripts 排查时，才手动加 `NODE_OPTIONS=...`。
- 报告粒度规则：
  - `npm run test:coverage:report`：默认 review 输出。看全局摘要、分类摘要、清零队列摘要、共享夹具批次，以及下一个 25 个有序未完成文件；文件和批次标签使用完整的项目相对路径，不再用 `...` 截断。
  - `npm run test:coverage:assert-full`：对最新 coverage 产物做严格断言。只要任一 tracked source file 不是 `100/100/100/100`，就直接失败。
  - `node scripts/test-coverage-report.js --full`：看完整的有序未完成文件队列，用于查看全量逐文件状态或刷新 backlog 快照。
  - 当仓库已经全满覆盖时，这两个命令都会明确输出 `No files with remaining coverage gaps.`；后续有意义的测试工程变更后，仍要用它们确认仓库是否继续保持维护态。
  - 队列排序是确定性的：`branches 升序 -> lines 升序 -> statements 升序 -> functions 升序 -> path`。
- 队列执行规则：
  - 不再按主观“哪个收益更高”重新排优先级。
  - 当队列为空时，所有触达或新增的 `src/**` 文件都要继续保持 `100/100/100/100`。
  - 如果未来队列重新出现，就直接拿有序队列的第一个文件，尽量把该文件推进到 `100/100/100/100` 后再移动。
  - 允许的例外很少：相邻文件共享同一套 mock/fixture/test harness 时可成批推进；当前文件或紧邻文件被共享测试基础设施问题卡住时，可先修 blocker。
  - 如果当前队列分支被证明不可达或业务上无效，优先删除死分支且不改变行为，而不是为了抬覆盖率去硬造测试。
- 现在还不要上调覆盖率阈值；下一阶段的质量提升应来自把全仓满覆盖稳定保持住，而不是把门槛继续抬高。
- 需要在正式 push 前本地预演时，直接运行 `npm run prepush:gate`。

## 集成测试完成度标准

- 不要把集成测试当成“代码覆盖率竞赛”。全仓 `100/100/100/100` 仍然是硬门禁，但集成测试深度应按“工作流置信度”衡量，而不是强行要求 `tests/integration` 自己打到 `100%` 代码覆盖率。
- 大规模推进集成测试时，统一使用这套 100 分量表：
  - 功能工作流覆盖：`40` 分。
    - 页面能加载、主用户动作能完成、可见 UI 有刷新，且相关 `@/services/**` 边界被断言。
  - 变体矩阵覆盖：`25` 分。
    - 覆盖路由/数据源前缀、角色/权限状态、URL/query 初始化状态。
  - 异常与回退覆盖：`15` 分。
    - 覆盖列表加载失败、create/update 失败、delete 失败或取消、空状态，以及用户可见的恢复行为。
  - 导航与副作用覆盖：`10` 分。
    - 覆盖 `history.push`、`history.replace`、`window.location.href`、`window.location.reload` 等浏览器拥有的跳转与副作用。
  - 工程质量：`10` 分。
    - 保持 mock 可确定、断言语义化、单文件范围可维护，且所有 skipped tests 都有明确理由。
- 建议完成度阈值：
  - `85-100`：该工作流达到可发布的集成测试完备度。
  - `70-84`：基础较扎实，但矩阵或回退路径仍有缺口。
  - `50-69`：以 happy path 为主，重构风险偏高。
  - `<50`：只有冒烟级信心。
- 这个仓库新增集成测试的默认优先级：
  1. 先做 pathname 驱动页面的路由/数据源矩阵（`LifeCycleModels`、`Processes`、`Flows`、`Flowproperties`、`Unitgroups`、`Sources`、`Contacts`）。
  2. 再做权限和角色矩阵（`Teams`、`ManageSystem`、`Review`）。
  3. 再做 URL/query 驱动与跨页流程（`Login`、`Welcome`、`Processes/Analysis`、深链抽屉）。
  4. 再补同一批工作流的失败/回退路径。
  5. 只有当集成测试确实无法可信模拟时，才补一层很薄的浏览器真实冒烟。
- 当前检查点（2026 年 3 月 21 日）：默认推进顺序的 Phase 1-3 已在这个仓库落地完成，Phase 4 也已经启动。当前仓库已经覆盖欢迎页 modal 空结果与缩略图失败降级、登录注册回退状态、Processes 空结果与请求异常后的恢复，以及 Account 凭证/加载/邮箱变更失败路径；默认下一步是继续补齐同一批工作流上剩余的 create/update/delete 与 cancel 锚点。
- E2E 规则：默认先做 integration。只有遇到重定向链、文件上传/预览、reload、窗口级导航这类浏览器真实行为时，才把极少数场景升级为未来的 E2E 冒烟层。

## 相关文档

- `docs/agents/testing-patterns.md`：模板与可复用模式。
- `docs/agents/testing-troubleshooting.md`：失败排障矩阵。
- `docs/agents/test_todo_list.md`：可执行 backlog 与当前执行状态。
- `docs/agents/test_improvement_plan.md`：长期背景与优先级方向。

## 交付清单

- 所有变更行为都有对应测试。
- `npm run lint` 通过。
- 聚焦 Jest 命令通过。
- 顽固套件可用 `--detectOpenHandles` 验证无句柄泄漏。
- 若测试流程、backlog 或基线有变化，先同步 `test_todo_list.md`；若长期计划或基线摘要也变化，再同步 `test_improvement_plan.md`，并保持英文与 `_CN` 镜像一致。
