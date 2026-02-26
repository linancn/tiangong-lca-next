# 测试模式参考 – Tiangong LCA Next（中文镜像）

> 仅在编写/重构测试时按需阅读本文件。阅读顺序：`AGENTS.md` -> `ai-testing-guide.md` -> 本文件。镜像约束：英文版 `docs/agents/testing-patterns.md` 变更时必须同步本文件。

## 目的

本文件提供精简且项目化的测试模式：

- 如何选择测试类型，
- 如何稳定 mock，
- 如何复用共享 helper，
- 交付前必须通过哪些门禁。

## 1）测试类型选择

以下场景用 **unit**：

- `src/services/**` 服务函数，
- 纯工具函数逻辑，
- edge function payload 组装逻辑。

以下场景用 **integration**：

- 页面级用户流程联测，
- 角色/权限行为验证，
- 表格/抽屉交互链路验证。

以下场景用 **component**：

- 单组件渲染行为，
- props/callback 契约，
- 条件渲染状态。

## 2）全局规则（关键）

- 所有服务/网络依赖必须先 mock 再 render。
- 优先 `mockResolvedValue` / `mockRejectedValue` 保证确定性。
- `beforeEach` 清理 mocks。
- 异步状态必须 `await`（`waitFor`、`findBy*`、`await userEvent`）。
- 优先语义化查询（`getByRole`、`getByLabelText`）。
- 复用 `tests/helpers/**` 与 `tests/mocks/**`。

禁止：

- 先渲染后 mock，
- 使用会产生不稳定引用的 `mockImplementation` 链，
- 提交失败测试，
- 无说明的 `skip/todo`。

## 3）项目测试目录

```text
tests/
  helpers/           # 共享 builder、wrapper、fixtures
  mocks/             # 可复用模块 mock
  unit/              # 服务/组件/页面单测
  integration/       # 流程级集成测试
  setupTests.jsx     # 全局 setup + polyfill + 警告保护
```

命名约定：

- 单测/组件测：`*.test.ts` / `*.test.tsx`
- 集成测试：`*Workflow.integration.test.tsx`

## 4）共享 Helper

### `tests/helpers/mockBuilders.ts`

Supabase 链式查询 mock 统一用 `createQueryBuilder(...)`。

```ts
import { createQueryBuilder } from '@/tests/helpers/mockBuilders';

const builder = createQueryBuilder({ data: [{ id: '1' }], error: null, count: 1 });
supabase.from.mockReturnValue(builder);
```

另外可用：

- `createMockSession`、`createMockNoSession`
- `createMockSuccessResponse`、`createMockErrorResponse`
- edge/RPC 返回构建器

### `tests/helpers/testData.ts`

优先使用共享 fixture（`mockTeam`、`mockSource`、`mockPaginationParams` 等），避免随手写内联对象。

### `tests/helpers/testUtils.tsx`

需要 provider 上下文时使用 `renderWithProviders`。

```ts
import { renderWithProviders, screen } from '@/tests/helpers/testUtils';

renderWithProviders(<MyPage />);
```

## 5）Unit 模板

```ts
import { myServiceFn } from '@/services/myFeature/api';
import { createQueryBuilder } from '@/tests/helpers/mockBuilders';

jest.mock('@/services/supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: { getSession: jest.fn() },
    functions: { invoke: jest.fn() },
    rpc: jest.fn(),
  },
}));

const { supabase } = jest.requireMock('@/services/supabase');

describe('myServiceFn', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns data on success', async () => {
    const builder = createQueryBuilder({ data: [{ id: '1' }], error: null });
    supabase.from.mockReturnValue(builder);

    const result = await myServiceFn();

    expect(supabase.from).toHaveBeenCalled();
    expect(result.error).toBeNull();
  });

  it('returns error on failure', async () => {
    const builder = createQueryBuilder({ data: null, error: { message: 'db fail' } });
    supabase.from.mockReturnValue(builder);

    const result = await myServiceFn();

    expect(result.error).toBeDefined();
  });
});
```

## 6）Integration 模板

```ts
import Page from '@/pages/MyFeature';
import { renderWithProviders, screen, waitFor } from '@/tests/helpers/testUtils';
import userEvent from '@testing-library/user-event';

jest.mock('@/services/myFeature/api', () => ({
  listData: jest.fn(),
  createData: jest.fn(),
}));

const { listData, createData } = jest.requireMock('@/services/myFeature/api');

describe('MyFeature workflow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    listData.mockResolvedValue({ data: [], error: null });
    createData.mockResolvedValue({ data: { id: '1' }, error: null });
  });

  it('creates a record and refreshes list', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Page />);

    await waitFor(() => expect(listData).toHaveBeenCalledTimes(1));

    await user.click(screen.getByRole('button', { name: /create/i }));
    await user.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => expect(createData).toHaveBeenCalledTimes(1));
  });
});
```

## 7）Component 模板

```ts
import { renderWithProviders, screen } from '@/tests/helpers/testUtils';
import userEvent from '@testing-library/user-event';
import MyComponent from '@/components/MyComponent';

describe('MyComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls callback on submit', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();

    renderWithProviders(<MyComponent onSubmit={onSubmit} />);
    await user.click(screen.getByRole('button', { name: /submit/i }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
```

## 8）命令模式（可执行）

```bash
# 全量门禁（unit + integration）
npm test

# 聚焦单测/组件测
npm run test:ci -- tests/unit/<scope>/ --runInBand --testTimeout=10000 --no-coverage

# 聚焦集成测试
npm run test:ci -- tests/integration/<feature>/ --runInBand --testTimeout=20000 --no-coverage

# 句柄排查
npm run test:ci -- tests/integration/<feature>/<file>.test.tsx \
  --runInBand --testTimeout=20000 --detectOpenHandles

# Lint 门禁
npm run lint
```

## 9）Skip/TODO 策略

若测试暴露了确认的业务缺陷：

1. 可临时 `it.skip(...)`；
2. 必须写清晰 `TODO`，包含：
   - 期望行为，
   - 实际行为，
   - 影响模块；
3. 跳过范围要最小化。

禁止无说明跳过。

## 10）覆盖率策略

- 方向目标：分支/行/函数覆盖持续提升，趋近有意义的高覆盖。
- 当前强制门禁：以 `jest.config.cjs` 全局阈值为准。
- 通过覆盖率命令定位缺口后再补精准测试。

## 11）交付前清单

- 相关测试已更新。
- `npm run lint` 通过。
- 聚焦 Jest 套件通过。
- 必要时用 `--detectOpenHandles` 检查异步泄漏。
- 若测试工作流变化，同步更新英文与 `_CN` 文档。
