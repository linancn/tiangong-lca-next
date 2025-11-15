# AI Testing Guide（中文镜像）

> 说明：英文版 `docs/agents/ai-testing-guide.md` 才是 AI 执行时读取的内容；本文件仅供人类同事查看，需与英文版保持同步。

## 环境与工具

- Node.js **>= 22**（先 `nvm use 22` 再 `npm install`）。Jest、Testing Library 已在 `package.json` 配好。
- 仓库自带的 `.env` 已包含可用的 `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY`，本地测试开箱即用；仅在切换 Supabase 实例时覆盖，并继续通过 `src/services/supabase` 加载。
- 不得为测试额外安装依赖；优先复用 `tests/helpers/**` 与 `tests/mocks/**`。

## AI 快速流程

1. **读需求**：明确实体、流程、测试类型（单测 / 集测 / 组件测）。
2. **定位代码与 mock**：`ls src/pages/<Feature>/`、`rg "export.*function" src/services/<feature>/`、查看 `tests/integration/<feature>/` 与 `tests/unit/**`。
3. **确认覆盖**：搜索 `describe`，了解已有测试；熟悉 `tests/helpers/testData.ts`、`mockSetup.ts` 中的预置 mock。
4. **选择模板**：按 `docs/agents/testing-patterns.md`（及 `_CN` 镜像）中的单测/集测/组件测模式实现。
5. **编写测试**：渲染前先 mock 服务/鉴权，复用 `TestWrapper`，通过语义化查询断言。
6. **校验与回报**：运行针对性 Jest 命令 + `npm run lint`，在交付说明里写明文件、用例数与执行命令。

## 护栏与防死循环

- ✅ 在 `beforeEach` 中 mock 所有网络/服务调用；再执行 `render`。
- ✅ `mockResolvedValue` / `mockRejectedValue` 产出稳定 Promise；用 `toHaveBeenCalledTimes` 校验调用次数。
- ✅ `afterEach` 重置定时器/Mock；异步断言配合 `await waitFor(...)`。
- ❌ 不得在准备 mock 之前渲染组件。
- ❌ 不得遗忘 `await` 或留存悬挂 Promise。
- ❌ 禁止在 `mockImplementation` 内重复 new 对象导致无限循环。

## 稳定运行命令

```bash
# 集成测试（串行 + 20s 超时）
npm test -- tests/integration/<feature>/ --runInBand --testTimeout=20000 --no-coverage

# 单元/工具测试（10s 超时）
npm test -- tests/unit/<scope>/ --runInBand --testTimeout=10000 --no-coverage

# 单文件调试 + 句柄排查
detect_open_handles="--detectOpenHandles"
npm test -- tests/integration/processes/ProcessesWorkflow.integration.test.tsx \
  --runInBand --testTimeout=20000 $detect_open_handles

# watch 模式（开发阶段关闭超时）
npm test -- tests/unit/services/processes/ --watch

# Lint 门禁（ESLint + Prettier check + tsc）
npm run lint
```

- 如需更长时间，可在测试文件里调用 `jest.setTimeout(20000)`。
- Node 无法退出时，使用 `--detectOpenHandles` 或检查 `jest.useFakeTimers()`、`jest.runAllTimers()` 的使用。

## 深入参考

- `docs/agents/testing-patterns.md` / `_CN`：完整模式库（项目概览、原则、测试类型决策、单测/集测/组件测模板、共享工具）。
- `docs/agents/testing-troubleshooting.md` / `_CN`：命令矩阵 + 常见问题排查（超时、鉴权 mock、RTL 查询等）。

## 交付清单

- 新增/修改功能必须有对应测试（纯函数写单测，流程/界面写集测或组件测）。
- `npm run lint` 通过，无 ESLint / Prettier / `tsc` 报错。
- 相关 Jest 命令以 `--runInBand --testTimeout=...` 运行并通过。
- Supabase/Auth mock 在 `afterEach` 清理，不留句柄（可用 `--detectOpenHandles` 自检）。
- 若更新测试约定或流程，记得同步 `docs/agents/**`。
