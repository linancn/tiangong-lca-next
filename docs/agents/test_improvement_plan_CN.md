# 测试改进计划（中文镜像）

> 快照日期：2026年3月12日。本文件用于记录测试工程的长期背景与策略；日常可执行 backlog 以 `docs/agents/test_todo_list.md` 为准。镜像约束：每次变更需同步英文版 `docs/agents/test_improvement_plan.md`。

## 当前基线

- 最新已验证全量运行命令：`NODE_OPTIONS=--max-old-space-size=8192 npm run test:coverage`
- 当前 Jest 全量覆盖率：
  - Statements: 72.79%
  - Branches: 58.11%
  - Functions: 63.29%
  - Lines: 73.02%
- `jest.config.cjs` 当前全局门槛：50%（branches/functions/lines/statements）。
- 眼下主要问题：**全局门禁已经恢复，当前战略重点已经从“救回阈值”切换为压缩页面层工作流热点，以及继续清理 lifecycle calculation 剩余分支缺口**。

## 原则

- 优先补纯逻辑里分支密集的模块，再做大范围 UI 补测。
- 复用 `tests/helpers/**` 与 `tests/mocks/**`，避免临时造 mock。
- 测试改动保持小范围、可重复、可确定。
- 每次修改后必须执行 `npm run lint`。
- 在当前 58% branch 基线稳定前，不要再上调覆盖率阈值。

## 优先级待办

- [x] 忘记/重置密码流程已补 unit 覆盖。
- [x] graph/context/request/supabase bootstrap 等核心能力已覆盖。
- [x] 已将 branch 覆盖恢复到全局门槛以上，并建立可量化安全余量（当前 58.11%）。
- [x] 为 `src/pages/Utils/index.tsx` 的 helper 分支补直接测试。
- [ ] 扩展 `src/pages/Utils/review.tsx` 的分支覆盖。
- [x] 扩展 `src/pages/Utils/updateReference.tsx` 的分支覆盖。
- [x] 已覆盖 contact/source select form+drawer 工作流，以及 lifecycle model view toolbar。
- [ ] 下一轮优先推进页面层 edit/workflow 热点：`toolbar/editIndex.tsx`、`reviewProcess/tabsDetail.tsx`、`Processes/edit.tsx`、`ReviewProgress.tsx`、unitgroup selectors。
- [ ] 扩展 `src/services/lifeCycleModels/util_calculate.ts` 的分支覆盖，它是当前最大的 service 层热点。
- [ ] 继续提高分支覆盖率（下一阶段先稳定到 >= 60%，再向 65-70% 推进）。

## 执行循环

1. 从 `docs/agents/test_todo_list.md` 当前最高 branch-miss 列表里选一个模块。
2. 仅为未覆盖分支补测试。
3. 用 `npm run test:ci -- <pattern> --runInBand --testTimeout=... --no-coverage` 跑聚焦套件。
4. 运行 `npm run lint`。
5. 再跑全量覆盖率（当前本地已验证命令：`NODE_OPTIONS=--max-old-space-size=8192 npm run test:coverage`），在 `docs/agents/test_todo_list.md` 记录增量；若战略优先级变化，再同步更新本文件。

## 单项完成定义

- 测试稳定、可重复通过。
- 无无说明 `skip`。
- `npm run lint` 通过。
- 覆盖率增量可度量，并记录在 `docs/agents/test_todo_list.md`；若长期计划或热点顺序变化，再更新本文件。
