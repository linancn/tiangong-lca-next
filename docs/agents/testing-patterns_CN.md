# 测试模式参考 – Tiangong LCA Next（中文镜像）

> 仅在编写/重构测试时按需阅读本文件。阅读顺序：`AGENTS.md` -> `ai-testing-guide.md` -> 本文件。镜像约束：英文版 `docs/agents/testing-patterns.md` 变更时必须同步本文件。

## 目的

本文件提供精简且项目化的测试模式：

- 如何选择测试类型，
- 如何稳定 mock，
- 如何复用共享 helper，
- 交付前必须通过哪些门禁。

开始新的覆盖率补全前，先查看 `docs/agents/test_todo_list.md`；它是可执行 backlog 的事实来源。

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
- 如果 backlog 状态有变化，需在同一 diff 中更新 `docs/agents/test_todo_list.md`；若测试策略背景也变化，再同步 `docs/agents/test_improvement_plan.md`。

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

## 6A）仓库级集成测试矩阵模式

- 大规模推进时，优先写“矩阵驱动”的集成测试，而不是为每个变体复制一份几乎相同的测试文件。
- 每个功能保留一个主锚点 workflow 文件，只变动真正会改变行为的轴：
  - `pathname`：`/mydata`、`/tgdata`、`/codata`、`/tedata`
  - `role`：owner/admin/member/restricted
  - `search`：空 query、有效深链、无效或过期 query
- 每一行都断言稳定不变的公共契约，再补充该行真正不同的差异断言。

```ts
import ProcessesPage from '@/pages/Processes';
import { renderWithProviders, screen, waitFor } from '@/tests/helpers/testUtils';

const setLocation = (pathname: string, search = '') => {
  const umi = require('@/tests/mocks/umi');
  umi.setUmiLocation({ pathname, search });
};

const routeCases = [
  { label: 'mydata', pathname: '/mydata/processes' },
  { label: 'tgdata', pathname: '/tgdata/processes' },
];

describe.each(routeCases)('$label processes workflow', ({ pathname }) => {
  beforeEach(() => {
    jest.clearAllMocks();
    setLocation(pathname, '');
    getProcessTableAll.mockResolvedValue({ data: [], success: true, total: 0 });
  });

  it('loads the shared table contract', async () => {
    renderWithProviders(<ProcessesPage />);

    await waitFor(() => expect(getProcessTableAll).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('contribute')).toBeInTheDocument();
  });
});
```

## 6B）权限与 URL 状态模式

- 对 `Teams`、`ManageSystem`、`Review` 这类页面，统一用角色矩阵，并同时断言：
  - 用户能看到和点击什么，
  - 哪些 `@/services/**` 调用被允许或被阻止。
- 对深链和 query 驱动流程，保持最小矩阵：
  - 空 query，
  - 有效 query 自动打开目标状态，
  - 无效或过期 query 安全回退。
- 优先在同一份 suite 里用 `describe.each(...)` 管理矩阵，不要拆成多个高度重复的文件。

## 6C）升级到 E2E 的规则

- 保持 E2E 很薄。这个仓库默认先扩展 integration 层。
- 只有在风险确实属于“真实浏览器行为”时，才把工作流升级到 E2E：
  - 重定向链和整页导航，
  - 文件上传/预览，
  - `window.location` 变更，
  - 依赖 reload 的状态重建。
- 不要用 E2E 去追那些在 integration 层更便宜、更稳定就能覆盖的分支。

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
- 集成测试深度要和代码覆盖率分开衡量。大规模推进 integration 时，统一用 `docs/agents/ai-testing-guide.md` 里的 100 分完成度量表，而不是要求 `tests/integration` 单独打满 `100%` 代码覆盖率。

## 11）交付前清单

- 相关测试已更新。
- `npm run lint` 通过。
- 聚焦 Jest 套件通过。
- 必要时用 `--detectOpenHandles` 检查异步泄漏。
- 若测试工作流变化，同步更新英文与 `_CN` 文档。
