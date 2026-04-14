# Supabase 环境与数据库工作流

`tiangong-lca-next` 是 Supabase 消费者仓库，不再是数据库真相源仓库。

数据库真相源已迁到 `tiangong-lca/database-engine`，由该仓负责：

- `supabase/config.toml`
- `supabase/migrations/*.sql`
- `supabase/seed.sql`
- `supabase/seeds/*`
- `supabase/tests/*.sql`
- `.github/workflows/supabase-dev.yml`
- Supabase branching 的权威流程文档

本仓负责：

- 通过 `.env`、`.env.development` 完成前端运行时环境选择
- `src/services/**` 下的应用侧 Supabase client
- 针对 local、preview、`dev`、`main` 的前端联调验证

本仓**不**负责：

- 编写 schema migration
- 修改 Supabase branch 配置
- 增删权威的 `supabase db push` 自动化流程
- 维护 `.env.supabase.*.local(.example)` 这组分支绑定文件

迁移窗口内，本仓可能仍暂时保留一份旧的本地 `supabase/` 副本。该目录应视为只读，直到 cutover 完成。

## 环境契约

- `npm start` -> 共享且持久化的 Supabase `dev`
- `npm run start:dev` -> 共享且持久化的 Supabase `dev` 显式别名
- `npm run start:main` -> 任务型 `main` 连接入口

规则：

- GitHub default branch 继续保持 `main`，但日常 trunk 是 Git `dev`。
- routine feature / fix 分支从 `dev` 拉出，并向 `dev` 发起 PR。
- 不要只根据 GitHub default-branch UI 推断实际工作 trunk。
- 不要在 `src/services/**` 之外创建临时 Supabase client。

## 哪个仓负责什么？

- `tiangong-lca/database-engine`
  - schema、policy、SQL function、trigger、seed、config、preview branch 数据库行为，以及 `.env.supabase.*.local(.example)` 维护文件
- `tiangong-lca-next`
  - `.env`、`.env.development` 等前端运行时 env 文件、应用侧 Supabase client、前端验证
- `linancn/tiangong-lca-edge-functions`
  - Edge Function 运行时代码

如果一个需求同时改 schema 和前端行为，数据库部分仍然从 `database-engine` 开始。

## 日常使用方式

### 只改应用

1. 同步本地 Git `dev`。
2. 从 `dev` 创建 feature 分支。
3. 运行 `npm start`。
4. 连到共享且持久化的 Supabase `dev` 分支开发。
5. 向 `dev` 发起 PR。
6. 合并后，在共享 `dev` 再验证一次。

### 涉及 schema 的功能

1. 到 `tiangong-lca/database-engine` 完成数据库变更。
2. 向 `database-engine` 的 `dev` 发起数据库 PR。
3. 验证该数据库 PR 触发的 Supabase preview branch。
4. 让本前端仓连接到相应环境，验证应用行为。
5. 只有数据库依赖已经就绪或被明确分阶段处理后，才合并前端 PR。

### `main` 验证

只有在任务明确需要 `main` 数据库时才使用 `npm run start:main`，例如：

- 生产排查
- 行为比对
- hotfix 验证

连接 `main` 时默认按只读预期处理。

## 数据库侧 webhook secrets

数据库触发的 Edge Function 调用不会读取本仓前端 env 文件。

它们依赖当前 Supabase branch 上的 Vault secrets：

- `project_url`
- `project_secret_key`
- `project_x_key` 仅用于兼容旧的 `generate_flow_embedding()` 路径

不要把 branch URL 或 service key 硬编码进应用代码、SQL 或 baseline dump。

## 相关文档

- 数据库真相源工作流：`tiangong-lca/database-engine/docs/agents/supabase-branching.md`
- Workspace 运维手册：`lca-workspace/docs/runbooks/supabase-dev-branch-operations.md`
