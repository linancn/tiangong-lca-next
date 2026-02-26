# 测试待办清单（Test Todo List）

> 这是**可执行**测试待办的事实来源。本文件用于执行排期；长期背景信息保留在 `docs/agents/test_improvement_plan.md`。镜像约束：修改本文件时，同步更新英文版 `docs/agents/test_todo_list.md`。

## 范围（依据 AGENTS 测试要求）

本清单对齐 `AGENTS.md` 的交付约束：

- 变更必须补对应测试，
- 运行聚焦 Jest 套件，
- `npm run lint` 必须通过，
- 流程预期变化时同步更新文档。

## 基线快照（2026年2月26日）

最新全量覆盖率运行（`npm run test:coverage`）：

- Test suites：156 passed
- Tests：1469 passed
- 覆盖率：
  - Statements: 63.60% (~10850/17059)
  - Branches: 50.01% (4823/9645)
  - Functions: 52.63% (1966/3735)
  - Lines: 63.78% (10367/16253)
- 当前全局 branch 门槛：50%
- 门禁状态：**已通过**（余量很小，+0.01%）

## 缺口评估

1. branch 门禁已恢复，但余量非常小（50.01%），轻微回归就可能导致 CI 失败。
2. 多个高分支页面文件仍是低覆盖或零分支覆盖。
3. `src/pages/Review/**` 仍存在大量 zero-line 模块，回归风险依旧较高。
4. 本轮 service 热点已明显改善： `src/services/processes/api.ts` 87.64%（241/275）、`src/services/unitgroups/api.ts` 82.96%（112/135）、`src/services/auth/api.ts` 96.00%（24/25）。
5. `src/services/general/api.ts` branch 覆盖率已提升到 72.95%（143/196），不再是门禁阻塞项。
6. `src/services/lciaMethods/util.ts`（94.91%）与 `src/services/reviews/api.ts`（67.45%）保持稳定。

## 优先级待办

### P0 – 先恢复覆盖率门禁（必须先做）

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
- [ ] 为以下高分支但零 branch 的页面模块补聚焦测试（用于扩大 50% 以上安全余量）：
  - `src/pages/Contacts/Components/select/form.tsx` (BRF 84)
  - `src/pages/Flows/Components/edit.tsx` (BRF 85)
  - `src/pages/Flows/Components/select/form.tsx` (BRF 62)

P0 完成定义：

- global branches >= 50%（当前 50.01%）
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
- [ ] 每完成一项，及时更新本文件及英文镜像状态。

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
npm run test:coverage
```

5. 更新复选框状态并记录可量化增量。

## 备注

- 未清空 P0 之前，不建议提高覆盖率阈值。
- 优先做“确定性高”的分支测试，不要先扩展大范围快照。
- 待办必须可执行，避免“多写点测试”这类泛化项。
