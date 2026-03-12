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

- Test suites：196 passed
- Tests：1718 passed
- 覆盖率：
  - Statements: 72.79% (13069/17954)
  - Branches: 58.11% (6104/10504)
  - Functions: 63.29% (2457/3882)
  - Lines: 73.02% (12511/17133)
- 相比上一版已记录基线的增量：
  - Test suites：+35
  - Tests：+202
  - Statements：+9.91
  - Branches：+10.32
  - Functions：+11.00
  - Lines：+9.97
- 当前全局 branch 门槛：50%
- 门禁状态：**已通过**（高于门槛 8.11 个百分点）

## 缺口评估

1. branch 门禁恢复已经完成；当前主要问题不再是阈值拦截，而是页面层工作流分支缺口集中。
2. 当前最大的分支缺口主要集中在 `src/pages/LifeCycleModels/Components/toolbar/editIndex.tsx`、`src/pages/Review/Components/reviewProcess/tabsDetail.tsx`、`src/pages/Processes/Components/edit.tsx`、`src/pages/Utils/review.tsx`、`src/pages/Review/Components/ReviewProgress.tsx`。
3. `src/pages/Review/**`、lifecycle model 编辑流、process 编辑/查看流仍是最高回归风险的 UI 区域。
4. service 层整体已经比较健康；剩余最值得专门推进的 service 热点是 `src/services/lifeCycleModels/util_calculate.ts`。
5. Contacts/Sources 引用选择器的 form+drawer 工作流，以及 lifecycle model 的 view toolbar 已具备足够覆盖，可以从“立即阻塞项”列表中移出。

## 优先级待办

### P0 – 恢复 Branch Coverage 门禁（已完成）

- [x] 为 `src/services/reviews/api.ts` 增加分支导向测试（最新 branch 67.45%）。
  - 已完成：在 `tests/unit/services/reviews/api.test.ts` 覆盖 review member/admin 列表分支、reject/process 过滤、notify count 过滤与 lifecycle subtable batch 分支。
- [x] 为 `src/services/lciaMethods/util.ts` 增加分支导向测试（最新 branch 94.91%）。
  - 已完成：在 `tests/unit/services/lciaMethods/util.test.ts` 覆盖 IndexedDB 游标成功/失败、cache miss/hit、旧缓存刷新与 fallback 分支。
- [x] 为 `src/services/general/api.ts` 增加分支导向测试（最新 branch 72.95%）。
  - 已完成：在 `tests/unit/services/general/api.test.ts` 补齐更多数据查询、版本列表映射、edge-function 失败与 fallback 分支。
- [x] 为 `src/services/processes/api.ts` 增加分支导向测试（最新 branch 87.64%）。
  - 已完成：在 `tests/unit/services/processes/api.test.ts` 覆盖校验失败路径、dataSource 过滤分支、connectable 过滤分支、hybrid/pgroonga 错误路径与可选字段 fallback 分支。
- [x] 为 `src/services/unitgroups/api.ts` 增加分支导向测试（最新 branch 82.96%）。
  - 已完成：在 `tests/unit/services/unitgroups/api.test.ts` 覆盖 dataSource 过滤、rpc/edge 错误分支、中英文映射 fallback/catch 分支与 reference 查找 fallback 分支。
- [x] 为 `src/services/auth/api.ts` 增加分支导向测试（最新 branch 96.00%）。
  - 已完成：在 `tests/unit/services/auth/api.test.ts` 覆盖空凭证 fallback、reauthenticate guest fallback 与 fresh metadata 获取分支。
- [x] 为 `src/pages/Utils/index.tsx` 补聚焦测试（小型 helper 分支文件，低成本提高安全余量）。
  - 已完成：新增 `tests/unit/pages/Utils/index.test.tsx`；该文件现为 100% statements / 100% branches / 100% functions / 100% lines。
- [x] 将 `src/pages/Utils/updateReference.tsx` 作为相邻的低风险 utility 分支目标一并补测。
  - 已完成：新增 `tests/unit/pages/Utils/updateReference.test.ts`；该文件现为 99.18% statements / 83.33% branches / 100% functions / 100% lines。
- [x] 为 `src/pages/Contacts/Components/select/form.tsx` 补聚焦测试 (BRF 84)。
  - 已完成：新增 `tests/unit/pages/Contacts/Components/select/form.test.tsx`；已覆盖嵌套 clear/update/ref-check 分支。
- [x] 为 `src/pages/Flows/Components/edit.tsx` 补聚焦测试 (BRF 85)。
  - 已完成：新增 `tests/unit/pages/Flows/Components/edit.test.tsx`；已覆盖 edit、refs 与 reject-state 路径。
- [x] 为 `src/pages/Flows/Components/select/form.tsx` 补聚焦测试 (BRF 62)。
  - 已完成：新增 `tests/unit/pages/Flows/Components/select/form.test.tsx`；已覆盖 select/reselect/update/clear 分支。
- [x] 为 `src/pages/Sources/Components/select/form.tsx` 与 `src/pages/Sources/Components/select/drawer.tsx` 补聚焦测试。
  - 已完成：新增 `tests/unit/pages/Sources/Components/select/form.test.tsx` 与 `tests/unit/pages/Sources/Components/select/drawer.test.tsx`；已覆盖 default source、reviewReport tab 限制、search、nested clear 等流程。
- [x] 扩展 lifecycle model 只读 toolbar 覆盖（`src/pages/LifeCycleModels/Components/toolbar/viewInfo.tsx`、`src/pages/LifeCycleModels/Components/toolbar/viewIndex.tsx`）。
  - 已完成：在 `tests/unit/pages/LifeCycleModels/Components/toolbar/viewInfo.test.tsx` 与 `tests/unit/pages/LifeCycleModels/Components/toolbar/viewIndex.test.tsx` 中覆盖 view-state fallback、tab 切换、close 流程与 selection handler。

P0 完成定义：

- 已达成：global branches 恢复到 50% 以上，并具备可量化安全余量（当前 58.11%）
- `npm run lint` 通过
- 改动模块的聚焦套件通过

### P1 – 当前页面/工作流热点

- [ ] 为 `src/pages/LifeCycleModels/Components/toolbar/editIndex.tsx` 补聚焦测试（当前仓库中最大的分支缺口；branch 14.36%）。
- [ ] 为 `src/pages/Review/Components/reviewProcess/tabsDetail.tsx` 补聚焦测试（当前 branch/line 均为 0%）。
- [ ] 扩展 `src/pages/Processes/Components/edit.tsx` 与 `src/pages/Processes/Components/view.tsx` 的测试。
- [ ] 扩展 `src/pages/Utils/review.tsx` 的递归/引用相关分支覆盖。
- [ ] 为 `src/pages/Review/Components/ReviewProgress.tsx` 补聚焦测试。
- [ ] 为 `src/pages/Unitgroups/Components/select/form.tsx`、`src/pages/Unitgroups/Components/select/formMini.tsx`、`src/pages/Unitgroups/Components/edit.tsx` 补聚焦测试。
- [ ] 为 `src/pages/Processes/Components/Exchange/view.tsx` 补聚焦测试。

P1 完成定义：

- 上述高风险工作流页面不再是 zero-line / near-zero-branch
- 页面层 top 5 branch-miss 文件在版本间持续下降

### P2 – Service / Utility 热点

- [ ] 扩展 `src/services/lifeCycleModels/util_calculate.ts` 的分支覆盖（当前 branch 64.01%；是剩余最大的 service 热点）。
- [ ] 在页面热点开始下降后，继续补 lifecycle/reference 递归 helper 的分支缺口。

### P3 – 测试工程质量提升

- [ ] 新增测试统一复用共享 helper（`tests/helpers/mockBuilders.ts`、`testUtils.tsx`、`testData.ts`）。
- [ ] 将“仅 console 输出验证”的噪音测试，重构为行为断言优先。
- [ ] 新功能 PR 最低要求：
  - service 分支逻辑对应 unit test，
  - UI 编排变更至少一条 integration workflow。
- [ ] 每完成一项，及时更新本文件及英文镜像状态；若测试策略背景变化，再同步 `docs/agents/test_improvement_plan.md` 与 `docs/agents/ai-testing-guide.md`。

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

- 刚恢复 50% 门禁后，不建议立刻提高阈值；应先把当前 58% branch 基线在页面热点上稳定下来。
- 优先做“确定性高”的分支测试，不要先扩展大范围快照。
- 待办必须可执行，避免“多写点测试”这类泛化项。
