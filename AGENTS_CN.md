# AGENTS – Tiangong LCA Next（中文镜像）

> 说明：英文版 `AGENTS.md` 是唯一权威来源，AI 代理只读取英文。若英文内容有调整，须同步更新本 `_CN` 文件以方便人类同事查阅。

## 快速导航

- 技术栈：React 18 + @umijs/max 4 + Ant Design Pro 5 + TypeScript，对应入口 `src/app.tsx`、`config/routes.ts`。
- Service-first：先在 `src/services/<feature>/{data,api,util}.ts` 增补类型/接口/纯函数，再由页面消费。
- UI 仅使用函数式组件，并优先复用 `src/components/**` 现有能力。
- 所有前端文案通过 Umi i18n (`FormattedMessage` / `intl.formatMessage`) 输出，禁止硬编码文本。
- Supabase（鉴权、Postgres、存储、Edge Functions）已集中初始化，页面层绝不直接 new client。
- 未获人类维护者许可，不可新增 npm 依赖。

## 常用命令

```
npm install
npm start
npm run lint
npm test
npm test -- tests/integration/<feature>/
npm run build
```

## 代理参考文档

- `docs/agents/ai-dev-guide.md` / `_CN` 镜像：AI 开发规范（路由、服务分层、组件模式）。
- `docs/agents/ai-testing-guide.md` / `_CN` 镜像：测试规范（流程、模板、mock、超时防护）。
- `docs/agents/util_calculate.md` / `_CN` 镜像：`genLifeCycleModelProcesses` 深入说明。
- `README*.md`、`DEV*.md`：面向人类的上手文档，可互相引用但不要复制粘贴。

## 仓库地标

- `config/routes.ts`：/tgdata、/codata、/mydata、/tedata 四套路由，新增共享页面时需全部同步。
- `src/services/**`：唯一允许直接访问 Supabase 的层，提供类型化 helper。
- `src/pages/<Feature>/`：页面入口 `index.tsx` 与子组件 `Components/`。
- `src/components/**`、`src/contexts/**`、`types/**`：复用型 UI、Context 与类型定义。
- `tests/{unit,integration}/**`：Jest 套件，严格遵循 Testing Guide。
- `docs/agents/**`：面向 AI 的知识库（已取代旧的 `.github/prompts` 目录）。

## 工作流护栏

- 编码前先调研：`rg` 检索符号、阅读相似功能、理解 service API。
- 先扩展 service/type，再补 UI；业务逻辑不要塞进 React 组件。
- 列表/Drawer/Modal 交互遵循既有流程（表格→工具栏→弹窗）。
- 遵守 `src/access.ts` 的权限约束，并保持中英文文案同步。
- 调整生命周期模型工具前，务必对照 util_calculate 英/中文档。

## 交付清单

- 变更范围内必须补相应单元或集成测试，复用 `tests/helpers/**` 工具。
- `npm run lint` 必须通过（ESLint、Prettier、`tsc`）。
- 运行针对性 Jest（如 `npm test -- tests/integration/<feature>/`）及新增用例。
- Diff 仅限关联目录，若修改规范/流程需同步更新 `docs/agents/**` 或本文件。
