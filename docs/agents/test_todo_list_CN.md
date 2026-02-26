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
- Tests：1377 passed
- 覆盖率：
  - Statements: 61.27% (10453/17059)
  - Branches: 46.86% (4520/9645)
  - Functions: 50.92% (1902/3735)
  - Lines: 61.40% (9980/16253)
- 当前全局 branch 门槛：50%
- 距离门槛仍差：**303 个分支命中**

## 缺口评估

1. 主要阻塞不是“测试是否通过”，而是 branch 覆盖率不足。
2. 多个高分支文件 branch 覆盖极低甚至为 0。
3. `src/pages/Review/**` 存在大量 zero-line 文件，回归风险高。
4. service 层高分支权重模块覆盖不足（`reviews/api`、`lciaMethods/util`、`general/api`）。

## 优先级待办

### P0 – 先恢复覆盖率门禁（必须先做）

- [ ] 为 `src/services/reviews/api.ts` 增加分支导向测试（当前 branch 约 17%）。
  - 目标：覆盖 session/no-session、error、empty-data、状态映射分支。
- [ ] 为 `src/services/lciaMethods/util.ts` 增加分支导向测试（当前 branch 约 25%）。
  - 目标：覆盖 IndexedDB 不可用、cache miss/hit、缓存损坏、refresh/fallback 分支。
- [ ] 为 `src/services/general/api.ts` 增加分支导向测试（当前 branch 约 53%，分支总量大）。
  - 目标：补齐当前遗漏的错误路径与可选参数分支。
- [ ] 为以下高分支但零 branch 的页面模块补聚焦测试：
  - `src/pages/Contacts/Components/select/form.tsx` (BRF 84)
  - `src/pages/Flows/Components/edit.tsx` (BRF 85)
  - `src/pages/Flows/Components/select/form.tsx` (BRF 62)

P0 完成定义：

- global branches >= 50%
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
