# 测试改进计划（中文镜像）

> 快照日期：2026年3月14日。本文件用于记录测试工程的长期背景与策略；日常可执行 backlog 以 `docs/agents/test_todo_list.md` 为准。镜像约束：每次变更需同步英文版 `docs/agents/test_improvement_plan.md`。

## 当前基线

- 最新已验证全量运行命令：`npm run test:coverage`
- 当前全量运行规模：276 suites / 2481 tests
- 当前 Jest 全量覆盖率：
  - Statements: 93.93%
  - Branches: 82.32%
  - Functions: 91.09%
  - Lines: 94.26%
- 当前逐文件库存：追踪 300 个源码文件，已全满 140 个，仍有缺口 160 个。
- 当前 branch 分桶：`<50 = 0`、`50-70 = 24`、`70-90 = 101`、`90-<100 = 24`。
- `jest.config.cjs` 当前全局门槛：50%（branches/functions/lines/statements）。
- 眼下主要问题：**测试工程已经远超过“救门禁”阶段，而且 `<50% branch` 桶已经清空；当前战略重点变成了按有序文件队列持续清理 `50%-70%` 桶，以及页面层簇里剩余的 branch-only 缺口**。

## 原则

- 长期目标：把 `src/**` 推进到 100% 的有效覆盖。
- 覆盖率报告里的队列是执行顺序的事实来源；不要再按主观“哪个收益更高”改顺序。
- 一次处理一个队列文件，尽量把它推进到 `100/100/100/100` 后再移动。
- 允许的策略例外很少：相邻文件共享同一套 mock/fixture/test harness 时可成批推进；当前文件或紧邻文件被共享测试基础设施问题卡住时，可先修 blocker。
- 如果当前队列分支被证明不可达或业务上无效，优先在不改变行为的前提下删掉死分支，而不是为了抬覆盖率去编造测试。
- 复用 `tests/helpers/**` 与 `tests/mocks/**`，避免临时造 mock。
- 测试改动保持小范围、可重复、可确定。
- 每次修改后必须执行 `npm run lint`。
- 在当前有序队列明显缩短前，不要再上调覆盖率阈值。

## 优先级待办

- [x] 忘记/重置密码流程已补 unit 覆盖。
- [x] graph/context/request/supabase bootstrap 等核心能力已覆盖。
- [x] 已将 branch 覆盖恢复到全局门槛以上，并建立更高的安全余量（当前 82.32%）。
- [x] 已扩展 `src/pages/Utils/index.tsx`、`src/pages/Utils/review.tsx` 和 `src/pages/Utils/updateReference.tsx` 的测试。
- [x] 已覆盖 contact/source/flow/flowproperty selector + drawer 工作流、lifecycle-model view/edit toolbar，以及上一轮 process/review 工作流热点。
- [x] 已直接补上 `Flows/Components/Property/*`、登录页 top actions、lifecycle toolbar utility helpers、required-fields 映射和 add-member modal。
- [x] 已把旧的全量长列表覆盖率工作流替换成“默认队列摘要 + `--full` 全量队列”的双层报告方式。
- [x] 已按严格队列顺序关掉最后两个 `<50% branch` 文件（`src/components/TableFilter/index.tsx` 和 `src/pages/Unitgroups/Components/edit.tsx`）。
- [ ] 再按严格队列顺序清理当前 `50%-70%` 桶，从 `src/pages/Unitgroups/Components/Unit/reference.tsx`、`src/components/LocationTextItem/form.tsx`、`src/pages/Flows/index.tsx` 开始。
- [ ] 继续按队列顺序消化 `line=100` 但 `branch<100` 的簇，行为安全时可用死分支清理替代硬造测试。
- [ ] 继续推进最大的页面簇收口：`src/pages/Review/Components`、`src/pages/LifeCycleModels/Components`、`src/pages/Processes/Components`、`src/pages/Unitgroups/Components`。
- [ ] 继续按队列顺序推进 service 收口，优先 `src/services/lifeCycleModels/util.ts`、`src/services/general/api.ts`、`src/services/lifeCycleModels/api.ts`、`src/services/lifeCycleModels/util_allocate_supply_demand.ts`。
- [ ] 从当前 82.32% branch 基线继续往 100% 收口，方式是持续缩短有序队列，而不是临时改优先级。

## 执行循环

1. 从 `docs/agents/test_todo_list.md` 当前有序清零队列里拿第一个文件。
2. 如果紧邻文件共享同一套 mock/fixture/test harness，就在同一套 setup 下顺手一起收口；否则坚持单文件推进。
3. 为未覆盖分支和缺失的编排路径补测试；如果剩余分支被证明是死分支，就在不改变行为的前提下删掉它，然后继续队列。
4. 用 `npm run test:ci -- <pattern> --runInBand --testTimeout=... --no-coverage` 跑聚焦套件。
5. 运行 `npm run lint`。
6. 再跑全量覆盖率（`npm run test:coverage`）。
7. 查看 `npm run test:coverage:report`；只有在需要查看完整剩余文件状态或刷新队列快照时，才展开 `node scripts/test-coverage-report.js --full`。
8. 在 `docs/agents/test_todo_list.md` 记录增量；只有当战略执行规则、库存摘要或队列例外策略变化时，再同步更新本文件。

## 单项完成定义

- 测试稳定、可重复通过。
- 无无说明 `skip`。
- `npm run lint` 通过。
- 覆盖率增量可度量，并记录在 `docs/agents/test_todo_list.md`。
- 当前队列文件已完成收口；若仍有未覆盖分支，必须有明确记录说明它不可达或业务上无效。
- 只有当长期执行规则、库存摘要或队列例外策略变化时，再更新本文件。
