# AGENTS – Tiangong LCA Next（中文）

本文件是 coding agent 的唯一入口文档。

> 语言约定：agent 执行时只加载英文文档（无 `_CN` 后缀）。只要改了英文文档，必须在同一改动里同步对应 `_CN` 镜像。

## 目标

- 降低上下文/token 消耗：先读本文件，再按任务按需打开其他文档。
- 统一开发、测试、交付要求，避免规范冲突。

## 运行基线

- Node.js **>= 24**（执行 `nvm use 24`，`.nvmrc` 已固定为 `24`）。
- 技术栈：React 18 + `@umijs/max` 4 + Ant Design Pro 5 + TypeScript。
- Supabase 环境变量已由仓库预置：日常开发连接持久化 Supabase `dev` 分支时使用 `npm run start:dev`，只有任务明确需要 `main` 数据库时才使用 `npm start` 或 `npm run start:main`；禁止在 `src/services/**` 之外创建临时 Supabase client。
- 数据库侧的 Edge Function SQL 必须通过分支级 Vault secret 读取配置：标准 webhook 鉴权使用 `project_url` 和 `project_secret_key`，兼容旧 `generate_flow_embedding()` 路径时还需要 `project_x_key`；不要把 branch URL 或 service key 硬编码进 SQL、migration 或 baseline dump。
- Supabase Branching 只使用一套共享的 `supabase/` 目录：根部配置是 production / preview 的基线，`[remotes.dev]` 保存持久化 `dev` 分支的覆盖配置；不要按 Git 分支复制多套 `supabase/` 目录，也不要再叠加额外的 `supabase db push` GitHub Actions 流程。
- 未经人工明确批准，不得新增 npm 依赖。

## 开发流程摘要

- 默认分支推进路径为 `feature/* -> dev -> main`。
- 日常开发先同步最新 Git `dev`，再从 `dev` 创建 feature 分支。
- 常规功能和修复 PR 统一提交到 Git `dev`，不要直接提交到 Git `main`。
- 日常前端开发统一使用 `npm run start:dev`，连接共享且持久化的 Supabase `dev` 分支。
- Schema 变更必须先在本地通过 Supabase CLI 和已提交的 migration 文件完成，不要把共享远端 `dev` 当成第一次编写 schema 变更的地方。
- PR 合并到 Git `dev` 后，应在共享 Supabase `dev` 分支再次验证集成结果。
- 验证通过后，再从 Git `dev` 向 Git `main` 发起发布 PR。
- 只有在任务明确需要连接生产环境时，才使用 `npm start` 或 `npm run start:main` 访问 `main`，例如生产排查、行为比对或 hotfix。
- 只有当工作必须从生产分支开始时才从 Git `main` 拉分支，例如 hotfix；此类改动合并回 `main` 后，还必须把 `main` 回合到 `dev`。
- `docs/agents/supabase-branching.md` 是分支与数据库工作流的唯一详细规范。

## 核心命令

```bash
npm install
npm start
npm run start:main
npm run lint
npm test
npm run test:coverage
npm run test:coverage:assert-full
npm run test:coverage:report
npm run prepush:gate
npm run test:ci -- tests/integration/<feature>/ --runInBand --testTimeout=20000 --no-coverage
npm run build
```

说明：

- `npm test` 走 CI 风格 runner（`scripts/test-runner.cjs`）：先 unit，再 integration。
- 共享 runner 中，unit/src 阶段固定限制为 `--maxWorkers=50%`，用于规避全量本地门禁和 pre-push 中偶发的 Jest worker `SIGSEGV` 崩溃。
- `npm run test:coverage` 和 `npm run test:coverage:report` 已内置 `NODE_OPTIONS=--max-old-space-size=8192`，全量覆盖率直接用脚本即可。
- `npm run test:coverage:assert-full` 会读取最新 coverage 产物，只要全仓不是 `100%` statements / branches / functions / lines，或者队列不为空，就直接失败。
- `npm run prepush:gate` 是本地 push 门禁：`lint + 全量 coverage + 严格 100% 断言`。
- `npm run test:coverage:report` 是默认的覆盖率 review 产物。它会输出全局摘要、分类摘要、清零队列摘要、共享夹具批次，以及下一个 25 个未完成文件，并使用完整的项目相对路径（文件/批次标签不再用 `...` 截断）。
- `node scripts/test-coverage-report.js --full` 会输出完整的有序未完成文件队列。它用于查看完整逐文件状态或刷新队列快照，而不是主观按“收益”重新排序。
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
   - `docs/agents/test_todo_list.md`（可执行事实来源）
   - `docs/agents/test_improvement_plan.md`（长期背景与策略）
5. 团队管理/数据审核流程
   - `docs/agents/team_management.md`
   - `docs/agents/data_audit_instruction.md`
6. Supabase Branching / 环境配置
   - `docs/agents/supabase-branching.md`

## 仓库关键位置

- `config/routes.ts`：`/tgdata`、`/codata`、`/mydata`、`/tedata` 路由镜像。
- `supabase/config.toml`：Supabase 配置即代码的基线文件。根部配置用于 production 和 preview 分支，`[remotes.dev]` 保存持久化 `dev` 分支的覆盖项。
- `src/services/**`：唯一允许访问 Supabase 的边界层。
- `src/pages/<Feature>/`：页面入口与 `Components/` 抽屉/弹窗。
- `src/components/**`、`src/contexts/**`、`types/**`：共享 UI/上下文/类型。
- `tests/{unit,integration}/**`：Jest 测试，通用能力在 `tests/helpers/**`。
- `docker/volumes/functions/**`：自托管 edge-functions 的同步镜像，禁止在 `tiangong-lca-next` 中直接编辑。
- `docker/pull-edge-functions.sh`：本仓库刷新 `docker/volumes/functions/**` 的唯一正确方式。

## UI 一致性 / Ant Design 优先

对 `tiangong-lca-next` 而言，UI 风格一致性是硬性的产品要求。

在本仓库中实现或修改前端 UI 时，必须遵循以下规则：

1. 优先复用现有共享组件和已经建立的项目模式。
2. 如果没有合适的共享抽象，优先使用 Ant Design 原生组件、文档化 props、内置变体以及标准交互模式。
3. 只要是会影响产品视觉一致性的设计决策，优先使用 Ant Design theme tokens、component tokens 或项目既有的 token 抽象，而不是临时写死的颜色值、尺寸值等硬编码。
4. 避免不必要的自定义视觉样式。当 Ant Design 或既有共享抽象已经能满足需求时，自定义 CSS、内联样式和局部 CSS modules 都不应成为默认实现路径。
5. 只有在 Ant Design props、tokens 或既有共享抽象无法合理满足需求时，才允许使用自定义样式。此时必须保持 override 尽可能小，继续遵守既有产品视觉语言，并在理由不明显时于 PR 描述或代码注释中说明原因。
6. 如果某种自定义视觉模式开始重复出现，应将其提炼为共享组件或可复用抽象，而不是在局部重复复制。

说明：

- 本规则约束的是面向产品的视觉样式和交互一致性，并不是彻底禁止编写布局代码。
- 在合适场景下可以编写局部布局样式；但在只是做简单组合时，应优先使用既有项目模式和 Ant Design 的布局原语，而不是额外引入一次性视觉处理。

## 交付约束

- 先调研（`rg`、最近似功能、现有测试）。
- 业务逻辑放在 services/utilities，React 组件主要做编排。
- 变更必须配套测试。
- 任何代码修改都必须作为硬约束维持全仓 Statements / Branches / Functions / Lines 全部 `100%`。
- `npm run lint` 必须通过。
- 运行与变更相关的聚焦 Jest 套件。
- 需要只校验硬门禁时，运行 `npm run test:coverage:assert-full`。
- push 前必须通过 `npm run prepush:gate`；除非人工明确要求，否则不要绕过本地全仓 100% 覆盖率门禁。
- 如果 `npm run test:coverage:report` 重新出现缺口，就按 `docs/agents/test_todo_list.md` 的有序清零队列逐文件推进；如果没有缺口，就保持维护态，继续维持全仓满覆盖。
- 允许的队列例外只有两类：相邻文件共享同一套 mock/fixture/test harness 时可成批处理；当前文件或紧邻文件被测试基础设施问题卡住时，可先修 blocker。
- 如果当前队列文件里存在可证明不可达或业务上无效的分支，优先在不改变行为的前提下删除死分支，而不是为了抬覆盖率去编造测试，然后再继续队列顺序。
- 如果测试工程发生变化（命令、覆盖率基线、backlog 状态、工作流），必须同步 `docs/agents/ai-testing-guide.md`、`docs/agents/test_todo_list.md`；若长期策略也变化，还要同步 `docs/agents/test_improvement_plan.md` 及全部 `_CN` 镜像。
- 控制 diff 范围；行为或流程变化时同步更新文档。
- 严禁手改 `docker/volumes/functions/**`；需要同步时执行 `./docker/pull-edge-functions.sh`。

## 文档维护规则

当你修改任一英文文档（无 `_CN` 后缀）时：

1. 同步修改对应 `_CN` 镜像。
2. 命令示例必须能在当前脚本下直接执行。
3. 避免跨文档复制长段说明，优先引用来源文档。
4. 若工作流变化，优先更新本入口文档（保证入口准确）。
5. 涉及测试相关变化时，优先更新 `docs/agents/test_todo_list.md`；若长期计划或基线摘要变化，再同步更新 `docs/agents/test_improvement_plan.md`。
