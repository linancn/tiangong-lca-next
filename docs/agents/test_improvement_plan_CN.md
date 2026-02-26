# 测试改进计划（中文镜像）

> 快照日期：2026年2月26日。本计划用于记录核心测试基建完成后的可执行覆盖率提升事项。镜像约束：每次变更需同步英文版 `docs/agents/test_improvement_plan.md`。

## 当前基线

- 当前 Jest 全量覆盖率：
  - Statements: 61.27%
  - Branches: 46.86%
  - Functions: 50.92%
  - Lines: 61.40%
- `jest.config.cjs` 当前全局门槛：50%（branches/functions/lines/statements）。
- 眼下主要问题：**branch 覆盖低于门槛**。

## 原则

- 优先补纯逻辑里分支密集的模块，再做大范围 UI 补测。
- 复用 `tests/helpers/**` 与 `tests/mocks/**`，避免临时造 mock。
- 测试改动保持小范围、可重复、可确定。
- 每次修改后必须执行 `npm run lint`。

## 优先级待办

- [x] 忘记/重置密码流程已补 unit 覆盖。
- [x] graph/context/request/supabase bootstrap 等核心能力已覆盖。
- [ ] 先把 branch 覆盖拉回门槛以上（第一目标：>= 50%）。
- [ ] 扩展 `src/pages/Utils/review.tsx` 的分支覆盖。
- [ ] 扩展 `src/pages/Utils/updateReference.tsx` 的分支覆盖。
- [ ] 为剩余低覆盖页面分支补聚焦测试（如 admin/边界状态渲染路径）。
- [ ] 继续提高分支覆盖率（中期目标：>= 70%）。

## 执行循环

1. 选择一个 branch 覆盖低的模块。
2. 仅为未覆盖分支补测试。
3. 用 `npm run test:ci -- <pattern> --runInBand --testTimeout=... --no-coverage` 跑聚焦套件。
4. 运行 `npm run lint`。
5. 再跑 `npm run test:coverage` 并记录增量。

## 单项完成定义

- 测试稳定、可重复通过。
- 无无说明 `skip`。
- `npm run lint` 通过。
- 覆盖率增量可度量，并在本文件记录。
