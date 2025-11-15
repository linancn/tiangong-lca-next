# Testing Troubleshooting（中文镜像）

> 说明：请先阅读 `docs/agents/ai-testing-guide.md`。本文件收录命令矩阵与常见问题排查，英文详解见 `docs/agents/testing-troubleshooting.md`。

## 命令参考

### 核心 Jest 命令

```bash
# 集成测试（串行 + 超时控制）
npm test -- tests/integration/<feature>/ --runInBand --testTimeout=20000 --no-coverage

# 单元 / 工具测试
npm test -- tests/unit/<scope>/ --runInBand --testTimeout=10000 --no-coverage

# 单文件 + 句柄排查
detect_open_handles="--detectOpenHandles"
npm test -- tests/integration/processes/ProcessesWorkflow.integration.test.tsx \
  --runInBand --testTimeout=20000 $detect_open_handles

# watch 模式（开发阶段，无超时）
npm test -- tests/unit/services/processes/ --watch
```

### 覆盖率与报告

```bash
npm run test:coverage
npm run test:coverage:report
npx jest --coverage --collectCoverageFrom="src/services/teams/api.ts"
open coverage/lcov-report/index.html
```

### Lint / 格式化

```bash
npm run lint                # ESLint + Prettier check + tsc
npm run lint -- --fix       # 自动修复
npm run prettier            # 全量格式检查
```

### 排查辅助

```bash
rg "from '@/services/contacts'" -n src/pages
rg "describe\(.*Processes" -n tests/
ls tests/integration/<feature>/
rg "mockTeam" tests/unit/
```

### 快速流程

```bash
npm test -- tests/integration/<feature>/ --runInBand --testTimeout=20000 --no-coverage
npm run lint

detect_open_handles="--detectOpenHandles"
npm test -- tests/unit/services/<module>/ --runInBand --testTimeout=15000 $detect_open_handles
```

## 常见问题（Troubleshooting）

### 无限循环或超时

- 渲染组件前务必在 `beforeEach` mock 完所有 Supabase/服务调用。
- 使用 `mockResolvedValue` / `mockRejectedValue` 代替自建 `mockImplementation` 无限循环。
- 异步断言包裹 `await waitFor(...)`，必要时提升 `--testTimeout` 或在文件内 `jest.setTimeout(...)`。
- 仍然卡住时，追加 `--detectOpenHandles` 查找未关闭的定时器/句柄。

### 鉴权 / 会话失败

- 对依赖鉴权的组件 mock `supabase.auth.getSession()` 或 `useModel('@@initialState')`，确保返回稳定的 session。
- 复用 `tests/helpers/mockSetup.ts` 提供的默认 session / team 数据。

### 找不到元素

- 优先使用语义化查询（`getByRole`、`getByLabelText`、`findByText`）。
- 异步渲染改用 `findBy*` 并 `await`。
- 确认文案 key 已存在于 `src/locales/**`，缺失会导致断言失败。

### Supabase mock 未执行

- `jest.mock('@/services/...')` 路径需与组件真实 import 完全一致。
- 在 `beforeEach` 调用 `jest.clearAllMocks()` 或 `jest.resetModules()` 清理旧实现。

### 国际化 / 路由上下文报错

- 使用 `tests/helpers/testUtils.tsx` 中的 `TestWrapper` 渲染，自动包含 IntlProvider、Router、model。
- 如需自定义渲染，手动提供 `<IntlProvider locale='en-US' messages={messages}>` 与 `<MemoryRouter>`。

### 覆盖率缺口

- 纯函数/工具逻辑补写单测；集测覆盖不到的分支用组件测或参数化手段触发。
- 对受特性开关/props 控制的 UI，创建专门的组件测试切换状态。

### 调试技巧

- 临时使用 `screen.debug()`、`console.log` 查看 DOM/mocks（提交前移除）。
- 借助 `jest.spyOn` 观测 helper 调用而非重写逻辑。
- 当 `npm test` 结束后 Node 仍未退出，使用 `--detectOpenHandles` 再运行定位残留句柄。
