# AI 开发规范 – Tiangong LCA Next（中文镜像）

> 开发任务执行规范。先从 `AGENTS.md` 进入，再按需打开本文件。镜像约束：英文版 `docs/agents/ai-dev-guide.md` 变更时，本文件必须同步更新。

## 环境与硬约束

- Node.js **>= 24**（先 `nvm use 24`）。
- Supabase key 由 fallback `.env` 预置，必须通过 `src/services/supabase` 读取。
- 未经人工批准，不得新增 npm 依赖。
- 先 service 后 UI：先改 `src/services/<feature>/{data,api,util}.ts`，再接页面。

## 最小开发命令

```bash
npm install
npm run start:dev
npm run lint
npm run test:ci -- tests/integration/<feature>/ --runInBand --testTimeout=20000 --no-coverage
npm run build
```

## 按需阅读路径

1. 路由/菜单改动
   - `config/routes.ts`
2. 表格/抽屉页面模式参考
   - `src/pages/Processes/**`
3. 生命周期模型复杂计算
   - `docs/agents/util_calculate.md`
4. 测试与验收细节
   - `docs/agents/ai-testing-guide.md`

## 架构契约

- 运行时：React 18 + `@umijs/max` 4 + Ant Design Pro + TypeScript。
- 入口：
  - `src/app.tsx`：运行时与布局配置。
  - `config/routes.ts`：路由与菜单。
- 数据边界：
  - Supabase 访问只能出现在 `src/services/**`。
  - 页面/组件只消费带类型的 service API。

## 功能实现流程

1. 先调研（`rg`、相似功能、现有测试）。
2. 在 `data.ts` 补类型。
3. 在 `api.ts` 补查询与编排逻辑。
4. 在 `util.ts` 放纯转换/计算。
5. 在 `src/pages/<Feature>/index.tsx` 与 `Components/` 接 UI。
6. 优先复用 `src/components/**`。
7. 补测试并执行质量门禁。

## UI 与 i18n 规则

- 仅使用 React 函数组件。
- 维持既有交互链路：table -> toolbar -> drawer/modal form。
- 所有用户可见文案必须走 i18n（`FormattedMessage`、`intl.formatMessage`）。
- 文案 key 需同时补在 `src/locales/en-US.ts` 与 `src/locales/zh-CN.ts`。

## 数据源分支行为（重点）

列表 API 常见分支：

- `tg`：默认公开/发布数据路径。
- `co`：贡献/共享路径。
- `my`：当前用户数据路径（依赖 session）。
- `te`：团队数据路径（先解析 team 上下文）。

行为需与现有实现保持一致。

## 质量门禁

- 变更必须配套测试。
- `npm run lint` 必须通过。
- 运行与改动相关的聚焦 Jest 套件。
- 涉及 Supabase edge function payload 形态变更时，必须在 `tests/unit/services/**` 增加单测。

## 交付要求

- diff 仅覆盖目标功能。
- 行为/流程/命令变更时同步更新文档。
- 若影响协作方，英文与 `_CN` 文档必须同一提交同步更新。
