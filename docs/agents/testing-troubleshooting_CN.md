# 测试排障指南 – Tiangong LCA Next（中文镜像）

> 当测试失败、超时、卡住时使用本文件。阅读顺序：`AGENTS.md` -> `ai-testing-guide.md` -> 本文件。镜像约束：英文版 `docs/agents/testing-troubleshooting.md` 更新时，本文件必须同步更新。

## 命令矩阵

```bash
# 全量门禁
npm test

# 聚焦集成测试
npm run test:ci -- tests/integration/<feature>/ --runInBand --testTimeout=20000 --no-coverage

# 聚焦单测/组件测
npm run test:ci -- tests/unit/<scope>/ --runInBand --testTimeout=10000 --no-coverage

# 句柄排查
npm run test:ci -- tests/integration/<feature>/<file>.test.tsx \
  --runInBand --testTimeout=20000 --detectOpenHandles

# 覆盖率
npm run test:coverage
npm run test:coverage:report

# Lint
npm run lint
```

## 故障定位

### 1）死循环 / 超时 / Maximum update depth exceeded

优先检查：

- 是否所有服务调用都在 render 前 mock？
- 是否使用了稳定返回（`mockResolvedValue`），而不是每次新建对象？
- 异步断言是否都 `await` 了？

修复模板：

```ts
beforeEach(() => {
  jest.clearAllMocks();
  mockApi.list.mockResolvedValue({ data: [], error: null });
  mockApi.create.mockResolvedValue({ data: { id: '1' }, error: null });
});
```

### 2）鉴权/session 相关失败

- 稳定 mock `supabase.auth.getSession()`。
- 若页面依赖 `@@initialState`，按页面真实路径 mock 对应模型。

### 3）找不到元素 / 查询不稳定

- 优先语义查询：`getByRole`、`getByLabelText`、`findByText`。
- 异步渲染场景改用 `findBy*`。
- 校验 locale 中确有目标文案/key。

### 4）Mock 未命中

- `jest.mock('@/services/...')` 路径必须与源码 import 完全一致。
- 在 `beforeEach` 清理旧 mock/module，防止污染。

### 5）上下文/provider 错误

- 需要 provider 时，优先用 `tests/helpers/testUtils.tsx` 的 `renderWithProviders`。
- 若必须自定义 render，只补最小 provider 集合。

## Open Handle 排查流程

当 Jest 无法退出时：

1. 使用 `--detectOpenHandles` 重跑。
2. 排查未 await 的异步与未清理定时器。
3. 确认恢复了真实定时器（`jest.useRealTimers()`）。
4. 检查全局副作用是否在 `afterEach` 清理。

## 覆盖率缺口修复

- 对 integration 覆盖不到的纯分支补 unit。
- 对 feature flag/props 控制的 UI 分支补 component 测试。
- 缩小 `collectCoverageFrom` 范围做针对性补洞。

## 最终校验

修复完成前请执行：

1. 重跑失败套件。
2. 若行为波及邻近模块，补跑相关套件。
3. 运行 `npm run lint`。
4. 若流程变更，同步更新英文与 `_CN` 文档。
