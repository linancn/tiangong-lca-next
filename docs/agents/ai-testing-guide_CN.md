# AI Testing Guide（中文镜像）

> 说明：英文版 `docs/agents/ai-testing-guide.md` 为唯一权威，AI 只读取英文。本文件提供中文摘要，便于人类同事理解并在英文更新时核对差异。

## 适用范围与关键规则

- 本指南涵盖 Tiangong LCA Next 的全部测试需求（单元、组件、集成）。
- 写测试时仅参考英文指南及现有示例，不需查阅外部文档。
- 每次新增/修改测试后必须执行 `npm run lint`，并确保 0 报错。
- 缺省情况下以 Jest + React Testing Library 运行，禁止无限循环：提前 mock 服务、使用 `mockResolvedValue`、不要在渲染后再设置 mock。

## AI 快速流程（与英文版 STEP 1~6 对应）

1. **理解需求**：识别实体、测试类型、完整工作流（创建/编辑/审核等）。
2. **定位代码**：`ls src/pages/<Feature>/`、`rg "export.*function" src/services/<feature>/`、查看 `tests/integration/<feature>/`。
3. **确认已有覆盖**：`rg "describe.*" tests/integration`，复用 `tests/helpers/testData.ts` 中的 mock。
4. **按模板书写**：集成测试遵循“渲染页面→mock 服务→模拟交互→断言 API 调用”；单元测试聚焦纯函数或 Hook。
5. **执行质量门**：
   - 推荐命令：
     ```bash
     npm test -- tests/integration/<feature>/ --no-coverage
     npm run lint
     ```
   - 提供 Python timeout wrapper（英文版附示例）以防 Jest 卡死（超时时退出码 124）。
6. **回报结果**：说明文件路径、用例数量、覆盖工作流、lint/test 结果。

## 目录速查

```
tests/
  unit/
    services/  # Supabase 调用、业务函数
    components/
    utils/
  integration/
    manageSystem/
    reviews/
    ...
  mocks/
    services/
    data/
  helpers/
    mockBuilders.ts
    testData.ts
    mockSetup.ts
    testUtils.tsx
```

- `setupTests.jsx`：Jest 全局初始化。
- 参考场景：`tests/integration/manageSystem/ManageSystemWorkflow.integration.test.tsx`、`tests/integration/reviews/ReviewWorkflow.integration.test.tsx`。

## 核心原则（对应英文“CORE TESTING PRINCIPLES”）

- 单测：纯函数/Hook 需覆盖边界条件、错误分支、格式化逻辑。
- 集测：模拟真实用户路径，验证 Supabase 调用次数、参数、UI 反馈。
- 组件测：聚焦交互组件（表单、抽屉、列表），通过 RTL 查询语义化节点。
- Mock 策略：在 `beforeEach` 中统一清理并重建 mock；必要时使用 `jest.resetModules()`。

## 测试类型取舍（对应“TEST TYPE SELECTION”）

- 纯计算 → 单测。
- 带状态的 Hook/组件 → 组件测试。
- 涉及多服务/权限/路由 → 集测。
- 当功能跨多层时，优先写集测，再补关键纯函数单测。

## 单元测试模板摘要

- 使用 `describe` 组织场景，`it` 描述行为；安排 `beforeEach` 重置 mock。
- 输入输出断言示例：`expect(formatClassification(raw)).toEqual(expected)`。
- 异常流用 `await expect(fn()).rejects.toThrow()`。
- 依赖时间/随机数时，使用 `jest.useFakeTimers()`、`jest.spyOn(Date, "now")` 或注入依赖。

## 集成测试模板摘要

- 依赖 `tests/helpers/mockSetup.ts` 初始化 Supabase/Auth mock。
- 渲染方式：`render(<Processes />, { wrapper: TestWrapper })`。
- 交互常用 `userEvent.click/type/selectOptions`，并配合 `await waitFor(...)`。
- 断言：UI（`getByRole`, `findByText`）、API 调用次数、路由跳转、副作用（如 message 提示）。
- 提供多场景示例：创建流程、编辑流程、导入/导出、审核通过/拒绝。

## 组件测试模板摘要

- 针对独立组件（如表单步骤、筛选器、Drawer 子组件）。
- 使用 RTL 自定义渲染器注入必要 context（UnitsContext、IntlProvider 等）。
- 验证受控属性、回调触发、校验规则（`fireEvent.submit` + 断言 `onFinish` 参数）。

## 公共工具（对应“SHARED UTILITIES REFERENCE”）

- `tests/helpers/mockBuilders.ts`：构造 Supabase 响应。
- `tests/helpers/testUtils.tsx`：包装 RTL render，内置 Intl、Router。
- `tests/helpers/testData.ts`：常用 Process/Flow/Team 数据。
- `tests/mocks/services/**`：分层 mock，实现一致的接口。

## 命令参考

- 单文件测试：`npm test -- tests/unit/services/processes/`。
- 更新快照：`npm run test:update`。
- 生成覆盖率报告：`npm run test:coverage:report`。
- 若需限制耗时，使用指南中的 Python wrapper（复制即可）。

## 常见问题（Troubleshooting 摘要）

- **无限循环/超时**：检查是否在渲染后 mock、是否缺少 `await`, 或是否忘记重置计时器。
- **找不到元素**：确认使用语义化查询并等待 `findBy*`。
- **Supabase mock 未命中**：确保 `jest.mock` 路径与被测文件一致，且在文件顶部执行。
- **Intl 相关报错**：使用测试工具提供的 `TestWrapper`，不要自行创建不完整的 Provider。

## 更新要求

- 任何测试规范调整都需先修改英文版，再在本文件写明对应变化（可列要点或日期）。
- PR 中如改动测试流程，请在描述里引用这两份文档以方便审核。
