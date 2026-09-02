#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  sync-migrations-to-data-sql.sh [--check]

Description:
  Generate docker/volumes/db/init/data.sql from a disposable migration-only
  local Database rebuild. Preserve schema, constrained executor roles and the
  allowlisted migration-owned bootstrap catalogs; never export user data.

Modes:
  (default)  overwrite data.sql with the filtered schema snapshot.
  --check    exit non-zero when data.sql differs from the reviewed local snapshot.

Environment variables:
  REMOTE_DB_URL                   Local rebuilt Postgres connection string.
                                  Example:
                                  postgresql://postgres:<local-password>@host.docker.internal:54322/postgres
                                  Fallback lookup order when not passed:
                                  1) <repo>/docker/.env
                                  2) <repo>/.env
                                  3) <repo>/../tiangong-lca-worker/.env
                                  4) <repo>/../tiangong-lca-calculator/.env (legacy fallback)
                                  Keys: REMOTE_DB_URL, SUPABASE_REMOTE_DB_URL, SUPABASE_DB_URL, CONN
  DATA_SQL                        Target SQL file path.
  DATABASE_SOURCE_ROOT            Clean owning database-engine checkout.
  DATABASE_SOURCE_COMMIT          Reviewed full 40-character Database commit.
  PG_IMAGE                        Docker image providing pg_dump (default: postgres:17).
  DESENSITIZE_SCRIPT              Desensitize helper script path
                                  (default: <repo>/docker/desensitize_data.sql.sh).
  FILTER_SCRIPT                   Filter helper script path
                                  (default: <repo>/docker/scripts/filter-data-sql.sh).
EOF
}

MODE="write"
if [[ "${1:-}" == "--check" ]]; then
  MODE="check"
elif [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
elif [[ "${1:-}" != "" ]]; then
  usage >&2
  exit 1
fi

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "${SCRIPT_DIR}/../.." && pwd)"

DATA_SQL="${DATA_SQL:-${REPO_ROOT}/docker/volumes/db/init/data.sql}"
REMOTE_DB_URL="${REMOTE_DB_URL:-}"
PG_IMAGE="${PG_IMAGE:-postgres:17}"
DESENSITIZE_SCRIPT="${DESENSITIZE_SCRIPT:-${REPO_ROOT}/docker/desensitize_data.sql.sh}"
FILTER_SCRIPT="${FILTER_SCRIPT:-${REPO_ROOT}/docker/scripts/filter-data-sql.sh}"
BOOTSTRAP_SCRIPT="${SCRIPT_DIR}/export-snapshot-bootstrap.sql"
SOURCE_ROOT="${DATABASE_SOURCE_ROOT:-}"
SOURCE_COMMIT="${DATABASE_SOURCE_COMMIT:-}"

TMP_DIR=""
REMOTE_DUMP_FILE=""
FILTERED_DUMP_FILE=""

cleanup() {
  set +e
  if [[ -n "${TMP_DIR}" && -d "${TMP_DIR}" ]]; then
    rm -rf "${TMP_DIR}" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

if [[ ! -f "${DATA_SQL}" ]]; then
  echo "[sync-db] data.sql not found: ${DATA_SQL}" >&2
  exit 1
fi

if [[ ! -f "${DESENSITIZE_SCRIPT}" ]]; then
  echo "[sync-db] desensitize script not found: ${DESENSITIZE_SCRIPT}" >&2
  exit 1
fi

if [[ ! -f "${FILTER_SCRIPT}" ]]; then
  echo "[sync-db] filter script not found: ${FILTER_SCRIPT}" >&2
  exit 1
fi

if [[ -z "${REMOTE_DB_URL}" ]]; then
  REMOTE_DB_URL="$(bash "${DESENSITIZE_SCRIPT}" --print-remote-db-url)"
fi

# An operator/production schema dump is not a safe source for seed catalogs.
REMOTE_DB_URL="${REMOTE_DB_URL}" node -e '
  try {
    const url = new URL(process.env.REMOTE_DB_URL);
    if (!["postgres:", "postgresql:"].includes(url.protocol) ||
        !["localhost", "127.0.0.1", "host.docker.internal"].includes(url.hostname)) {
      throw new Error("non-local source");
    }
  } catch {
    console.error("[sync-db] use an isolated local migration-only Database rebuild");
    process.exit(1);
  }
'
if [[ ! "${SOURCE_COMMIT}" =~ ^[0-9a-f]{40}$ || -z "${SOURCE_ROOT}" ]]; then
  echo "[sync-db] exact DATABASE_SOURCE_COMMIT and DATABASE_SOURCE_ROOT are required" >&2
  exit 1
fi
if [[ "$(git -C "${SOURCE_ROOT}" rev-parse HEAD)" != "${SOURCE_COMMIT}" ]]; then
  echo "[sync-db] Database checkout does not match the reviewed commit" >&2
  exit 1
fi
git -C "${SOURCE_ROOT}" diff --exit-code HEAD -- supabase/migrations >/dev/null
EXPECTED_HEAD="$(git -C "${SOURCE_ROOT}" ls-tree --name-only HEAD:supabase/migrations | sed -nE 's/^([0-9]{14})_.*\.sql$/\1/p' | sort | tail -n 1)"
ACTUAL_HEAD="$(docker run --rm "${PG_IMAGE}" psql --dbname="${REMOTE_DB_URL}" -X -A -t -v ON_ERROR_STOP=1 -c 'select max(version) from supabase_migrations.schema_migrations')"
if [[ -z "${EXPECTED_HEAD}" || "${ACTUAL_HEAD}" != "${EXPECTED_HEAD}" ]]; then
  echo "[sync-db] local migration head does not match the reviewed Database source" >&2
  exit 1
fi

if [[ -z "${REMOTE_DB_URL}" ]]; then
  echo "[sync-db] REMOTE_DB_URL is required" >&2
  usage >&2
  exit 1
fi

TMP_DIR="$(mktemp -d /tmp/db-schema-sync.XXXXXX)"
REMOTE_DUMP_FILE="${TMP_DIR}/remote-schema.sql"
FILTERED_DUMP_FILE="${TMP_DIR}/filtered-data.sql"
BOOTSTRAP_FILE="${TMP_DIR}/bootstrap.sql"
CATALOG_FILE="${TMP_DIR}/catalogs.sql"
COMBINED_FILE="${TMP_DIR}/snapshot.sql"

echo "[sync-db] verify empty rebuild and export constrained role/settings catalog"
docker run --rm -i "${PG_IMAGE}" psql \
  --dbname="${REMOTE_DB_URL}" -X -q -A -t -v ON_ERROR_STOP=1 \
  < "${BOOTSTRAP_SCRIPT}" > "${BOOTSTRAP_FILE}"

echo "[sync-db] pull full schema from the local migration rebuild"
docker run --rm "${PG_IMAGE}" pg_dump \
  --schema-only \
  --dbname="${REMOTE_DB_URL}" > "${REMOTE_DUMP_FILE}"

# Remove sensitive credentials before compare/write.
bash "${DESENSITIZE_SCRIPT}" \
  --input "${REMOTE_DUMP_FILE}" \
  --in-place \
  --no-backup \
  --strict \
  --quiet

echo "[sync-db] filter dump to app-required schemas/extensions"
bash "${FILTER_SCRIPT}" \
  --input "${REMOTE_DUMP_FILE}" \
  --output "${FILTERED_DUMP_FILE}"

# These are static migration catalogs, not users, OAuth registrations, jobs,
# publications, datasets or credentials. The empty-source guard runs first.
CATALOG_TABLES=(
  private.api_capability_grants
  private.lcia_scope_closure_config
  private.lcia_scope_closure_reviewed_lcia_methods
  private.oauth_relation_capability_grants
  private.portal_catalog_facet_contract_v1
  private.portal_catalog_projection_contract_v1
  private.worker_job_kinds
  util.app_runtime_config
  util.embedding_queue_policy
)
CATALOG_ARGS=()
for table in "${CATALOG_TABLES[@]}"; do
  CATALOG_ARGS+=(--table="${table}")
done
docker run --rm "${PG_IMAGE}" pg_dump --data-only --column-inserts \
  --dbname="${REMOTE_DB_URL}" "${CATALOG_ARGS[@]}" > "${CATALOG_FILE}"
bash "${DESENSITIZE_SCRIPT}" --input "${CATALOG_FILE}" --in-place --no-backup --strict --quiet
bash "${FILTER_SCRIPT}" --input "${CATALOG_FILE}" --output "${TMP_DIR}/filtered-catalogs.sql"
# pg_dump excludes this extension-owned table even with an explicit --table.
# Queue names/configuration belong to migrations; queue messages stay absent.
docker run --rm "${PG_IMAGE}" psql --dbname="${REMOTE_DB_URL}" -X -A -t -v ON_ERROR_STOP=1 \
  -c "select format('INSERT INTO pgmq.meta SELECT (json_populate_record(NULL::pgmq.meta, %L)).*;', row_to_json(meta)::text) from pgmq.meta meta order by queue_name" \
  > "${TMP_DIR}/queue-catalog.sql"

{
  printf '%s\n' "-- Database source: ${SOURCE_COMMIT}" "-- Migration head: ${EXPECTED_HEAD}"
  cat "${BOOTSTRAP_FILE}" "${FILTERED_DUMP_FILE}" "${TMP_DIR}/filtered-catalogs.sql" "${TMP_DIR}/queue-catalog.sql"
} > "${COMBINED_FILE}"

if cmp -s "${DATA_SQL}" "${COMBINED_FILE}"; then
  echo "[sync-db] data.sql already up to date"
  exit 0
fi

if [[ "${MODE}" == "check" ]]; then
  echo "[sync-db] data.sql is out of date"
  exit 1
fi

cp "${COMBINED_FILE}" "${DATA_SQL}"
echo "[sync-db] data.sql updated from reviewed migration-only local snapshot"
