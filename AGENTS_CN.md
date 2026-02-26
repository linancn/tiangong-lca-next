# AGENTS – Tiangong LCA Next（中文）

本文件是 coding agent 的唯一入口文档。

> 语言约定：agent 执行时只加载英文文档（无 `_CN` 后缀）。只要改了英文文档，必须在同一改动里同步对应 `_CN` 镜像。

## 目标

- 降低上下文/token 消耗：先读本文件，再按任务按需打开其他文档。
- 统一开发、测试、交付要求，避免规范冲突。

## 运行基线

- Node.js **>= 24**（执行 `nvm use 24`，`.nvmrc` 已固定为 `24`）。
- 技术栈：React 18 + `@umijs/max` 4 + Ant Design Pro 5 + TypeScript。
- Supabase 环境变量已由仓库 fallback `.env` 预置；禁止在 `src/services/**` 之外创建临时 Supabase client。
- 未经人工明确批准，不得新增 npm 依赖。

## 核心命令

```bash
npm install
npm start
npm run lint
npm test
npm run test:ci -- tests/integration/<feature>/ --runInBand --testTimeout=20000 --no-coverage
npm run build
```

说明：

- `npm test` 走 CI 风格 runner（`scripts/test-runner.cjs`）：先 unit，再 integration。
- 需要带筛选条件或额外 flag 时，优先使用 `npm run test:ci -- <jest-args>`，不要把多层 flag 嵌在 `npm test` 后面。

## 按需文档路由（省 token）

只打开与你当前任务相关的文档：

1. 功能/页面开发
   - `docs/agents/ai-dev-guide.md`
2. 任意测试编写/排错
   - `docs/agents/ai-testing-guide.md`（先读）
   - `docs/agents/testing-patterns.md`（模板）
   - `docs/agents/testing-troubleshooting.md`（超时/句柄/失败排查）
3. 生命周期模型计算逻辑
   - `docs/agents/util_calculate.md`
4. 覆盖率缺口与测试补全计划
   - `docs/agents/test_todo_list.md`（可执行待办）
   - `docs/agents/test_improvement_plan.md`（长期背景）
5. 团队管理/数据审核流程
   - `docs/agents/team_management.md`
   - `docs/agents/data_audit_instruction.md`

## 仓库关键位置

- `config/routes.ts`：`/tgdata`、`/codata`、`/mydata`、`/tedata` 路由镜像。
- `src/services/**`：唯一允许访问 Supabase 的边界层。
- `src/pages/<Feature>/`：页面入口与 `Components/` 抽屉/弹窗。
- `src/components/**`、`src/contexts/**`、`types/**`：共享 UI/上下文/类型。
- `tests/{unit,integration}/**`：Jest 测试，通用能力在 `tests/helpers/**`。

## 交付约束

- 先调研（`rg`、最近似功能、现有测试）。
- 业务逻辑放在 services/utilities，React 组件主要做编排。
- 变更必须配套测试。
- `npm run lint` 必须通过。
- 运行与变更相关的聚焦 Jest 套件。
- 控制 diff 范围；行为或流程变化时同步更新文档。

## 文档维护规则

当你修改任一英文文档（无 `_CN` 后缀）时：

1. 同步修改对应 `_CN` 镜像。
2. 命令示例必须能在当前脚本下直接执行。
3. 避免跨文档复制长段说明，优先引用来源文档。
4. 若工作流变化，优先更新本入口文档（保证入口准确）。
