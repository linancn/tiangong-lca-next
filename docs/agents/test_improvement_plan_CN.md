# 测试改进计划（中文镜像）

> 快照日期：2026年3月12日。本文件用于记录测试工程的长期背景与策略；日常可执行 backlog 以 `docs/agents/test_todo_list.md` 为准。镜像约束：每次变更需同步英文版 `docs/agents/test_improvement_plan.md`。

## 当前基线

- 最新已验证全量运行命令：`NODE_OPTIONS=--max-old-space-size=8192 npm run test:coverage`
- 当前 Jest 全量覆盖率：
  - Statements: 62.21%
  - Branches: 47.19%
  - Functions: 51.82%
  - Lines: 62.42%
- `jest.config.cjs` 当前全局门槛：50%（branches/functions/lines/statements）。
- 眼下主要问题：**branch 覆盖已低于强制门槛，因此全量 coverage 运行当前会卡在全局门禁**。

## 原则

- 优先补纯逻辑里分支密集的模块，再做大范围 UI 补测。
- 复用 `tests/helpers/**` 与 `tests/mocks/**`，避免临时造 mock。
- 测试改动保持小范围、可重复、可确定。
- 每次修改后必须执行 `npm run lint`。

## 优先级待办

- [x] 忘记/重置密码流程已补 unit 覆盖。
- [x] graph/context/request/supabase bootstrap 等核心能力已覆盖。
- [ ] 先把 branch 覆盖恢复到全局门槛以上，再拉出安全余量（短期目标：先恢复 >50%，再稳定在 51% 以上）。
- [ ] 为 `src/pages/Utils/index.tsx` 的 helper 分支补直接测试。
- [ ] 扩展 `src/pages/Utils/review.tsx` 的分支覆盖。
- [ ] 扩展 `src/pages/Utils/updateReference.tsx` 的分支覆盖。
- [ ] 为剩余低覆盖页面分支补聚焦测试（如 admin/边界状态渲染路径）。
- [ ] 继续提高分支覆盖率（中期目标：>= 70%）。

## 执行循环

1. 选择一个 branch 覆盖低的模块。
2. 仅为未覆盖分支补测试。
3. 用 `npm run test:ci -- <pattern> --runInBand --testTimeout=... --no-coverage` 跑聚焦套件。
4. 运行 `npm run lint`。
5. 再跑全量覆盖率（当前本地已验证命令：`NODE_OPTIONS=--max-old-space-size=8192 npm run test:coverage`），在 `docs/agents/test_todo_list.md` 记录增量；若战略优先级变化，再同步更新本文件。

## 单项完成定义

- 测试稳定、可重复通过。
- 无无说明 `skip`。
- `npm run lint` 通过。
- 覆盖率增量可度量，并记录在 `docs/agents/test_todo_list.md`；若长期计划变化，再更新本文件。
