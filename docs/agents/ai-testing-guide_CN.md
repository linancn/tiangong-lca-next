# AI 测试指南 – Tiangong LCA Next（中文镜像）

> 任意测试任务先读本文件。先从 `AGENTS.md` 进入，再用本文件作为短流程清单。镜像约束：英文版 `docs/agents/ai-testing-guide.md` 更新时，本文件必须同步更新。

## 环境

- Node.js **>= 24**（`nvm use 24`）。
- Jest + Testing Library 已预配置。
- 复用 `tests/helpers/**` 与 `tests/mocks/**`。
- 未经批准不得新增测试依赖。

## 快速流程（必做）

1. 明确范围：功能、用户流程、测试类型（unit/integration/component）。
2. 先看现有代码和测试（`src/pages/**`、`src/services/**`、`tests/**`）。
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

- 方向目标：逐步接近 100% 的有效覆盖。
- 当前强制门禁：以 `jest.config.cjs` 里的全局阈值为准。
- 覆盖率排查命令：

```bash
npm run test:coverage
npm run test:coverage:report
```

## 相关文档

- `docs/agents/testing-patterns.md`：模板与可复用模式。
- `docs/agents/testing-troubleshooting.md`：失败排障矩阵。
- `docs/agents/test_improvement_plan.md`：剩余覆盖缺口优先级。

## 交付清单

- 所有变更行为都有对应测试。
- `npm run lint` 通过。
- 聚焦 Jest 命令通过。
- 顽固套件可用 `--detectOpenHandles` 验证无句柄泄漏。
- 若流程有变化，同步更新英文与 `_CN` 文档。
