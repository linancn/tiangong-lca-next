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

- Test suites：161 passed
- Tests：1516 passed
- 覆盖率：
  - Statements: 62.88% (11287/17950)
  - Branches: 47.79% (5018/10500)
  - Functions: 52.29% (2030/3882)
  - Lines: 63.05% (10801/17129)
- 相比上一版已记录基线的增量：
  - Test suites：+2
  - Tests：+14
  - Statements：+0.67
  - Branches：+0.60
  - Functions：+0.47
  - Lines：+0.63
- 当前全局 branch 门槛：50%
- 门禁状态：**未通过**（低于门槛 2.21 个百分点）

## 缺口评估

1. branch 门禁仍未通过（47.79%，门槛为 50%），但最新这批 Utils 测试已经缩小缺口，说明这类低成本 helper 目标能有效推动全局数字。
2. 多个高分支页面文件仍是低覆盖或零分支覆盖。
3. `src/pages/Review/**` 仍存在大量 zero-line 模块，回归风险依旧较高。
4. service 层近期补测仍然有价值，但当前全局数字再次主要被页面层和 UI helper 的分支缺口拖低。
5. `src/services/general/api.ts` 已不再是首要门禁阻塞项；页面层和 utility 分支对恢复门禁更关键。
6. `src/services/lciaMethods/util.ts` 与 `src/services/reviews/api.ts` 相比当前页面热点模块，整体更健康。

## 优先级待办

### P0 – 恢复 Branch Coverage 门禁（必须先做）

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
- [ ] 为 `src/pages/Contacts/Components/select/form.tsx` 补聚焦测试 (BRF 84)。
- [ ] 为 `src/pages/Flows/Components/edit.tsx` 补聚焦测试 (BRF 85)。
- [ ] 为 `src/pages/Flows/Components/select/form.tsx` 补聚焦测试 (BRF 62)。

P0 完成定义：

- global branches 恢复到 50% 以上，并具备可量化安全余量（当前 47.79%）
- `npm run lint` 通过
- 改动模块的聚焦套件通过

### P1 – 高风险工作流加固

- [ ] 优先覆盖 `src/pages/Review/Components/**` 中 zero-line 模块：
  - `AddMemberModal.tsx`
  - `Compliance/view.tsx`
  - `Exchange/view.tsx`
  - `reviewLifeCycleModels/Components/toolbar/*`
- [ ] 补 lifecycle model 只读/查看工具条回归测试：
  - `src/pages/LifeCycleModels/Components/toolbar/viewIndex.tsx`
  - `src/pages/LifeCycleModels/Components/toolbar/viewInfo.tsx`
  - `src/pages/LifeCycleModels/Components/toolbar/viewTargetAmount.tsx`
- [ ] 为当前未覆盖但用户可见页面补最小烟雾测试：
  - `src/pages/Admin.tsx`
  - `src/pages/404.tsx`

P1 完成定义：

- 上述关键 review/lifecycle UI 模块不再是 zero-line
- branch 趋势在版本间持续上升

### P2 – 测试工程质量提升

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

4. 每完成一批 P0 任务后，运行全量覆盖率：

```bash
NODE_OPTIONS=--max-old-space-size=8192 npm run test:coverage
```

5. 更新复选框状态并记录可量化增量。
6. 若工作流、基线或 backlog 预期变化，同步更新 `docs/agents/ai-testing-guide.md`；若长期背景变化，再同步 `docs/agents/test_improvement_plan.md`。

## 备注

- 在 P0 branch 门禁恢复前，不建议提高覆盖率阈值。
- 优先做“确定性高”的分支测试，不要先扩展大范围快照。
- 待办必须可执行，避免“多写点测试”这类泛化项。
