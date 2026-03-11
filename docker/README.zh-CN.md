# 使用 Docker 自托管 Supabase（中文）

这是 `docker` 目录的中文说明。官方自托管基础说明请参考英文文档：

- [README.md](./README.md)
- [Self-Hosting with Docker](https://supabase.com/docs/guides/self-hosting/docker)

## 项目同步流程

本项目常用两类同步：

- 同步 Edge Functions 代码
- 同步数据库结构快照 `docker/volumes/db/init/data.sql`

## 1) 同步 Edge Functions

脚本：`docker/pull-edge-functions.sh`

默认行为：

- 从 `https://github.com/linancn/tiangong-lca-edge-functions.git` 拉取最新函数代码
- 覆盖更新 `docker/volumes/functions/`
- 备份旧目录到 `docker/volumes/functions.backup.<timestamp>`

执行命令：

```bash
cd /path/to/tiangong-lca-next
./docker/pull-edge-functions.sh
```

可选：同时同步到本地 `../supabase/functions`

```bash
SYNC_LOCAL_SUPABASE_FUNCTIONS=true ./docker/pull-edge-functions.sh
```

## 2) 同步 data.sql（远程 Supabase）

脚本：`docker/scripts/sync-migrations-to-data-sql.sh`

要求：

- 执行前在环境变量中提供 `REMOTE_DB_URL`
- 连接串示例：
  - `postgresql://postgres:<password>@db.<project>.supabase.co:5432/postgres?sslmode=require`

执行命令：

```bash
cd /path/to/tiangong-lca-next
REMOTE_DB_URL='postgresql://postgres:***@db.xxx.supabase.co:5432/postgres?sslmode=require' \
  ./docker/scripts/sync-migrations-to-data-sql.sh
```

仅检查（不写文件）：

```bash
./docker/scripts/sync-migrations-to-data-sql.sh --check
```

脚本行为：

- 使用 `pg_dump --schema-only` 拉取远程全量 schema dump
- 自动执行 `docker/desensitize_data.sql.sh` 脱敏
- 再过滤成 TianGong 业务真正需要的对象（例如 `public`、`pgmq`、`util` 和必要业务扩展）
- 去掉由 Supabase 底座负责的 schema/object（例如 `auth`、`extensions`、`graphql*`、`storage`、`supabase_functions`）以及明显的 PG17 dump 噪音（如 `\restrict`、`\unrestrict`、`SET transaction_timeout = 0;`）
- 写入 `docker/volumes/db/init/data.sql`

默认脱敏规则：

- `"x_key":"<任意值>"` -> `"x_key":"edge-functions-key"`
- `"apikey":"sb_secret_..."` -> `"apikey":"edge-functions-key"`
- 其他 `sb_secret_*` -> `sb_secret_REDACTED`

兼容入口（已废弃）：

- `docker/scripts/sync-lca-migrations-to-data-sql.sh` 会转发到新脚本
