# Supabase Branching

此仓库已按单一 Supabase Branching 真相源配置：

- Git `main` -> 生产项目
- Git `dev` -> 持久化 Supabase 分支
- pull request / feature 分支 -> 由 Supabase GitHub integration 自动创建的临时 preview 分支

这份文档有意把分支拓扑、配置归属和日常工作流放在同一处，避免“分支模型”和“实际操作规则”分开后逐渐漂移。

本仓库采用以下 Git 与 Supabase 分支约定：

- GitHub default branch 继续保持 `main`，这是平台层例外。
- 日常 trunk 是 Git `dev`。
- routine feature / fix 分支从 `dev` 拉出，并向 `dev` 发起 PR。
- `dev` -> `main` 是正式晋升路径。

不要只根据 GitHub default-branch 界面推断实际工作 trunk。

## 仓库约定

- 在 Git 中只维护一个共享的 `supabase/` 目录。
- 把提交到 Git 的 `supabase/migrations/` 文件视为 production、`dev` 和 preview 分支共同遵循的 schema 真相源。
- 以本地开发加已提交 migration 文件作为默认 schema 工作流。
- `supabase/config.toml` 根部配置是生产基线，也会被 preview 分支继承。
- 持久化 dev 专属覆盖放在 `[remotes.dev]`。
- 如果 dashboard 显示 `dev` 不是 persistent branch，就先修正分支状态，再依赖 `[remotes.dev]`。
- 不要为不同 Git 分支再复制一套 `supabase/` 目录。
- 当 Supabase GitHub integration 负责分支同步时，不要再额外加一个会执行 `supabase db push` 的 GitHub Actions 流程。

## 需要维护的文件

- `supabase/config.toml`：共享基线加 `[remotes.dev]`
- `supabase/migrations/*.sql`：已提交的 migration 历史，包括锚定 `main` 的初始 baseline
- `supabase/seed.sql`：共享 seed 数据
- `supabase/seeds/dev.sql`：可选的持久化 dev 专属 seed 数据
- `.env`：显式指向 `main` 的前端 Supabase URL + publishable key
- `.env.development`：日常前端开发默认使用的环境，当前指向共享远端 `dev` 分支
- `.env.supabase.dev.local`：仅供 CLI 一次性访问远端 `dev` 的本地连接信息；前端不会读取它
- `.env.supabase.main.local`：仅供 CLI 一次性访问远端 `main` 的本地连接信息；前端不会读取它

## 仍需填写的值

1. 在生产 Supabase 项目的 dashboard 中确认 Branching 仍然启用，且这个 GitHub 仓库保持连接。
2. 确认 persistent `dev` branch 仍然对应 `[remotes.dev]` 下配置的 `project_id`。
3. 如果后续增加独立的 dev 前端域名，把 `[remotes.dev.auth].site_url = "http://localhost:8000"` 改成那个托管域名。
4. 如果后续增加按 PR 部署的前端 preview 环境，把根部 `additional_redirect_urls` 扩展为真实的 preview 域名通配模式。
5. 共享 seed 数据放在 `supabase/seed.sql`。dev 专属测试数据放在 `supabase/seeds/dev.sql`；如果不需要分支专属 seed，就关闭 `[remotes.dev.db.seed]`。
6. 如果 reviewer 流程需要执行数据库触发的 Edge Function webhook，要先决定 preview branch 如何拿到 Vault secret `project_url` 和 `project_secret_key`。如果某个 branch 仍会走旧的 `generate_flow_embedding()` -> `flow_embedding` 路径，还要额外提供 `project_x_key`。持久化 `main` 和持久化 `dev` 必须先具备各自所需的 secret。

## Auth 说明

- Preview 分支会继承根部 auth 配置。当前 allow-list 已覆盖生产站点和本地 `8000` 端口开发环境。
- `[remotes.dev.auth]` 只服务于持久化 `dev` 分支。由于仓库里还没发现独立的托管 dev 前端域名，它目前指向本地开发地址 `http://localhost:8000`。
- 之后如果要加 provider 或 SMTP secrets，优先在 `supabase/config.toml` 里使用 `env(...)` 引用，而不是把 secret 硬编码进仓库。

## 数据库 webhook secret 说明

这个仓库里从数据库函数或 trigger 直接调用 Edge Function 的逻辑，不会读取前端 `.env` 文件。它们读取的是当前 Supabase branch 的 Vault secret。

当前标准 webhook 路径必须存在的 Vault secret 名称：

- `project_url`：当前 Supabase branch / project 的基础 URL，用来拼接 `/functions/v1/<name>` 请求。
- `project_secret_key`：当前 branch 的 Edge Functions 用于 `SERVICE_API_KEY` 鉴权的 service-to-service API key。

额外的旧兼容 secret：

- `project_x_key`：已废弃 `/functions/v1/flow_embedding` endpoint 仍要求的旧 `X_KEY` 值，只有 `public.generate_flow_embedding()` 这条兼容路径还会使用它。

操作规则：

- 不要把这些值硬编码进 SQL、migration 或导出的 baseline 文件。
- 它们是 branch-specific 的。生产 `main`、持久化 `dev`，以及任何需要执行这些 webhook 流程的 preview 方案，都要各自提供自己的值。
- 只有仍然走旧 `flow_embedding` 路径的 branch 才需要配置 `project_x_key`。
- 如果 branch 被重建、重新关联或复制，开始测试 webhook 驱动流程前，要重新确认相关 Vault entry。
- 缺少 webhook secret 说明环境 / 配置不完整，不应该因此回退到 dashboard 手改 SQL 或把字面量重新提交进 Git。

推荐配置路径：

- 如果要把这件事纳入 config-as-code，就在 `supabase/config.toml` 里通过 `[db.vault]` 和 `env(...)` 引用接入，再在 Git 之外提供真实的 env / branch secrets。
- 如果暂时人工维护，也要在保留旧路径时把 Vault secret 名称固定为 `project_url`、`project_secret_key` 和 `project_x_key`，这样已提交 SQL 才能在不同 branch 上持续复用。

## 默认开发流程一览

这是本仓库的默认工作流。只有在任务明确要求走生产 hotfix 路径时，才偏离这条流程。

1. 先同步本地 Git `dev`。
2. 基于 Git `dev` 创建 feature 分支。
3. 根据任务类型选择工作模式：
   - 只改应用：运行 `npm start`，连接共享且持久化的 Supabase `dev` 分支进行开发；`npm run start:dev` 仍保留为等价的显式 dev 别名。
   - 修改 schema：运行 `npx supabase start`，先在本地完成变更、生成 migration，并完成本地验证。
4. 将 feature 分支的 PR 提交到 Git `dev`。
5. 利用该 PR 自动创建的 Supabase preview branch，在合并前验证 migration 和 config 行为。
6. PR 合并到 Git `dev` 后，再到共享且持久化的 Supabase `dev` 分支验证一次集成结果。
7. 当变更准备发布时，再从 Git `dev` 向 Git `main` 发起晋升 PR。
8. 只有在任务明确要求访问 `main` 时，才走显式的 main 连接流程，例如生产排查、行为比对或 hotfix。

默认约束：

- 正常功能开发时，不要手工向共享 Supabase `dev` 分支执行 `db push`。
- 不要先在远端 `dev` 分支手工编写 schema 变更，再回头尝试在 Git 中补 migration。
- 不要把常规功能开发直接提交到 Git `main`。

## 本地开发时该连哪个数据库？

| 场景 | 前端应连接到 | schema 应在哪儿修改 | 默认操作 |
| --- | --- | --- | --- |
| 日常页面、组件、service 开发，且不改 schema | 通过 `.env.development` 连接共享远端 `dev` | 不修改数据库 | 直接运行 `npm start`（与 `npm run start:dev` 等价） |
| 开发表结构、policy、SQL function 或 seed 数据 | `npx supabase start` 启动的本地 Supabase | 只在本地修改 | 先在本地生成并验证 migration |
| 功能合并进 Git `dev` 之后做 QA | 共享远端 `dev` | 不要手工修改 | 在共享 `dev` 环境验证集成结果 |
| 需要连 `main` 做特定验证的任务 | `main`，通过显式的 `npm run start:main` 工作流访问 | 不能把它当成第一落点来编写 schema 变更 | 运行 `npm run start:main`，任务完成后再切回 `npm start` |

重要规则：

- 让日常本地开发目标保持明确：`npm start` 与 `npm run start:dev` 都表示共享 `dev`。如果任务需要连接 `main`，应通过 `npm run start:main` 显式切换。
- 不要把共享远端 `dev` 当成你“第一次发明 schema 变更”的地方。
- 不要在日常开发中手工修改 production schema。

## 推荐工作流

### 默认晋升路径

- 由于这个仓库同时保留 Git `dev` 和 Git `main`，默认晋升路径应为：
- `feature/*` -> `dev` -> `main`
- 换句话说，正常的 schema 变更不应该先在远端 Supabase `dev` 数据库里手工改出来。正确顺序是先在本地完成、提交到 Git、合并到 Git `dev`，然后再让共享 Supabase `dev` 分支跟随更新。

### 1. 让 `main` 保持稳定，并以 migration 为中心

- `supabase/migrations/` 中已提交的历史，是 production、`dev` 和 preview 分支都应收敛到的契约。
- baseline 建好后要保留在 Git 中，不要随意删除或重新生成。
- baseline 之后的每一次 schema 变更，都应以新增 migration 文件进入仓库，而不是先手改生产库。
- 生产环境只应接收那些已经通过 Git 审查和合并流程的 migration。

### 2. 正常 schema 变更流程

1. 从最新的 Git `dev` 开始。
2. 基于 `dev` 创建 feature 分支。
3. 用 `npx supabase start` 启动本地环境。
4. 在本地完成 schema 变更。
5. 用 `npx supabase migration new <name>` 或 `npx supabase db diff -f <name>` 生成 migration。
6. 用 `npx supabase db reset` 和相关应用测试验证结果。
7. 把应用代码、测试和 migration 文件一起提交。
8. 从 feature 分支向 Git `dev` 发起 PR。
9. 让 Supabase GitHub integration 为该 PR 自动创建或更新 preview branch。
10. PR 合并到 Git `dev` 后，再使用共享的持久化 Supabase `dev` 分支做 QA 和集成验证。
11. 准备发布时，再从 Git `dev` 向 Git `main` 发起 PR。
12. `dev` -> `main` 合并后，由生产环境应用同一批已提交的 migration。

### 2a. 只改应用的流程

当修改的是页面、组件、客户端逻辑或 service 代码，且数据库 schema 不需要变化时，走这条流程。

1. 切到最新的 Git `dev`。
2. 从 `dev` 创建 feature 分支。
3. 运行 `npm start`。
4. 默认情况下，应用会读取 `.env.development`，连接到共享远端 `dev` 分支；`npm run start:dev` 仍是等价的显式别名。
5. 完成开发、补测试，然后向 Git `dev` 发起 PR。
6. 合并后，再到共享 `dev` 环境验证一次结果。

### 2b. Schema 变更流程

当新增或修改表、字段、policy、SQL function、trigger 或 seed 数据时，走这条流程。

1. 切到最新的 Git `dev`。
2. 从 `dev` 创建 feature 分支。
3. 运行 `npx supabase start`。
4. 在本地完成 schema 变更。
5. 用 `npx supabase migration new <name>` 或 `npx supabase db diff -f <name>` 生成 migration。
6. 重复运行 `npx supabase db reset`，直到 migration 能稳定重建本地数据库。
7. 如果你需要让前端直接连到本地 Supabase，运行：

```bash
eval "$(npx supabase status -o env --override-name api.url=SUPABASE_URL --override-name auth.anon_key=SUPABASE_PUBLISHABLE_KEY | rg '^(SUPABASE_URL|SUPABASE_PUBLISHABLE_KEY)=' | sed 's/^/export /')"
npm start
```

8. 这个 shell 会话不再需要后，执行 `unset SUPABASE_URL SUPABASE_PUBLISHABLE_KEY`，恢复到 `.env.development` 的默认行为。
9. 把 migration、代码和测试一起提交。
10. 向 Git `dev` 发起 PR。
11. 合并后，在共享远端 `dev` 分支再次验证集成结果。
12. QA 完成后，再把 `dev` 晋升到 `main`。

### 2c. 连接 `main` 的流程

当任务要求前端或 CLI 连接到 `main` 时，走这条流程，包括 production 排查、行为比对或 hotfix 准备。

1. 让 main 连接流程保持显式，这样始终能看清当前 app 或 CLI 是否在访问 `main`。
2. 对于 migration 检查之类的一次性 CLI 操作，使用 `.env.supabase.main.local`。
3. 如果前端必须连接 `main`，运行 `npm run start:main`，不要复用默认的 `npm start` / `npm run start:dev` dev 入口。
4. 除非正在执行已批准的 hotfix 或恢复步骤，否则默认把 `main` 访问视为只读。
5. 如果确实要修代码，就从 Git `main` 拉分支，修完先合并回 `main`，再把 `main` 回合到 `dev`。

### 3. `dev` 的职责

- 把 Git `dev` 和 Supabase `dev` 分支都视为长期存在的共享集成环境，用于 QA 和团队联调。
- `.env.development` 可以让前端默认连到共享 `dev`，但 schema 编写仍应在本地完成，再通过 migration 推进。
- 让 `[remotes.dev].project_id` 与 `npx supabase --experimental branches list --project-ref qgzvkongdjqiiamzbbts` 返回的实际 persistent `dev` 分支保持一致。
- 不要手动改共享 Supabase `dev` 的 schema，然后再指望 Git 之后自动补齐；一旦发生这种情况，就应把它当成 drift，按恢复流程处理。

### 4. Preview branch 的职责

- 从 feature 分支发起 PR，让 Supabase GitHub integration 自动创建或更新 preview branch。
- Preview branch 主要用于在变更进入共享 `dev` 之前，验证 migration、config、seed 行为和 reviewer 流程。
- 不要把 preview branch 当成主要的 schema 编写入口。
- 如果 PR 存在期间 `dev` 新增了 migration，就及时 rebase 或 merge `dev`，并保证 migration 时间戳顺序仍然符合执行顺序。

### 5. 生产发布与 hotfix

- 只有在本地验证、preview 检查和共享 `dev` 验证都通过后，才合并到 `main`。
- 让生产环境应用 Git 中已经提交的 migration，而不是依赖手动 dashboard 改 schema。
- 如果出现只针对生产的紧急修复，就从 `main` 拉 hotfix 分支，修完先合并回 `main`，再把 `main` 反向合并回 `dev`，确保 migration 历史保持一致。
- 如果团队存在需要让前端连接 `main` 的常规任务，应通过 `npm run start:main` 保持 main 入口显式，并与默认的 `npm start` / `npm run start:dev` dev 命令分离。
- 远端 dashboard 改动只应用于应急修复或一次性排查，之后要立刻回写到 Git。

## 什么时候使用 `db pull`

- `db pull` 只用于两类场景：
- 为一个尚未进入 `supabase/migrations/` 的既有远端 schema 建立 baseline。
- 当有人绕开正常 migration 工作流直接改了远端数据库时，把这类远端漂移拉回 Git。
- 发生恢复型 `db pull` 后，要用 `npx supabase migration list` 确认本地和远端历史重新对齐，必要时再修 migration history。
- 正常功能开发时，不要把 `db pull` 当成生成新 migration 的常规方式。

## 恢复检查清单

- 如果本地和远端 migration history 不一致，先用 `npx supabase migration list` 看清楚差异，再做下一步。
- 如果远端 history 记录错了，再有意识地执行 `npx supabase migration repair`，执行后重新核对结果。
- 如果 `dev` 或 preview branch 进入 `MIGRATIONS_FAILED`，先看 branch logs，在 Git 中修正 migration，然后优先重建失败分支，而不是手工硬改 branch 状态。
- 如果重建了 `dev`，记得刷新本地 branch 凭据文件，并再次确认 `[remotes.dev].project_id`。

## 本地操作

- 这个仓库里的 Supabase CLI 是项目依赖，所以在仓库内统一使用 `npx supabase ...`。
- `npm start` 是默认连接共享 `dev` 的前端命令。
- `npm run start:dev` 是等价的显式共享 `dev` 别名。
- `npm run start:main` 是显式连接 `main` 的前端命令。
- 当你要验证 schema 或 seed 变更时，优先使用本地 Supabase 环境，而不是共享远端 `dev` 分支。
- `supabase link --project-ref <ref>` 只在你需要手动对某个远端项目或分支执行一次性操作时使用。
- 开一个 PR，确认 Supabase 会自动创建 preview branch。
