# Supabase Branching

此仓库已按单一 Supabase Branching 真相源配置：

- Git `main` -> 生产项目
- Git `dev` -> 持久化 Supabase 分支
- pull request / feature 分支 -> 由 Supabase GitHub integration 自动创建的临时 preview 分支

## 仓库约定

- 在 Git 中只维护一个共享的 `supabase/` 目录。
- `supabase/config.toml` 根部配置是生产基线，也会被 preview 分支继承。
- 持久化 dev 专属覆盖放在 `[remotes.dev]`。
- 不要为不同 Git 分支再复制一套 `supabase/` 目录。
- 当 Supabase GitHub integration 负责分支同步时，不要再额外加一个会执行 `supabase db push` 的 GitHub Actions 流程。

## 需要维护的文件

- `supabase/config.toml`：共享基线加 `[remotes.dev]`
- `supabase/seed.sql`：共享 seed 数据
- `supabase/seeds/dev.sql`：可选的持久化 dev 专属 seed 数据
- `.env`：生产环境兜底的前端 Supabase URL + publishable key
- `.env.development`：本地开发默认使用的持久化 `dev` 分支前端 Supabase URL + publishable key

## 仍需填写的值

1. 在生产 Supabase 项目的 dashboard 中确认 Branching 仍然启用，且这个 GitHub 仓库保持连接。
2. 确认 persistent `dev` branch 仍然对应 project ref `lquuatmjxzjomctajxns`。
3. 如果后续增加独立的 dev 前端域名，把 `[remotes.dev.auth].site_url = "http://localhost:8000"` 改成那个托管域名。
4. 如果后续增加按 PR 部署的前端 preview 环境，把根部 `additional_redirect_urls` 扩展为真实的 preview 域名通配模式。
5. 共享 seed 数据放在 `supabase/seed.sql`。dev 专属测试数据放在 `supabase/seeds/dev.sql`；如果不需要分支专属 seed，就关闭 `[remotes.dev.db.seed]`。

## Auth 说明

- Preview 分支会继承根部 auth 配置。当前 allow-list 已覆盖生产站点和本地 `8000` 端口开发环境。
- `[remotes.dev.auth]` 只服务于持久化 `dev` 分支。由于仓库里还没发现独立的托管 dev 前端域名，它目前指向本地开发地址 `http://localhost:8000`。
- 之后如果要加 provider 或 SMTP secrets，优先在 `supabase/config.toml` 里使用 `env(...)` 引用，而不是把 secret 硬编码进仓库。

## 本地操作

- 这个仓库里的 Supabase CLI 是项目依赖，所以在仓库内统一使用 `npx supabase ...`。
- `npm start` 现在会读取 `.env.development`，因此本地前端开发默认连接到持久化 Supabase `dev` 分支。
- `supabase link --project-ref <ref>` 只在你需要手动对某个远端项目或分支执行一次性操作时使用。
- 开一个 PR，确认 Supabase 会自动创建 preview branch。
