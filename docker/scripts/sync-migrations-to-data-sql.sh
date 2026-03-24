#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  sync-migrations-to-data-sql.sh [--check]

Description:
  Sync docker/volumes/db/init/data.sql from remote Supabase Postgres by pulling
  a schema-only dump and filtering it down to TianGong app-required objects.

Modes:
  (default)  overwrite data.sql with the filtered schema snapshot.
  --check    exit non-zero when local data.sql differs from the filtered remote snapshot.

Environment variables:
  REMOTE_DB_URL                   Remote Postgres connection string.
                                  Example:
                                  postgresql://postgres:<password>@db.<project>.supabase.co:5432/postgres?sslmode=require
                                  Fallback lookup order when not passed:
                                  1) <repo>/docker/.env
                                  2) <repo>/.env
                                  3) <repo>/../tiangong-lca-calculator/.env
                                  Keys: REMOTE_DB_URL, SUPABASE_REMOTE_DB_URL, SUPABASE_DB_URL, CONN
  DATA_SQL                        Target SQL file path.
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

if [[ -z "${REMOTE_DB_URL}" ]]; then
  echo "[sync-db] REMOTE_DB_URL is required" >&2
  usage >&2
  exit 1
fi

TMP_DIR="$(mktemp -d /tmp/db-schema-sync.XXXXXX)"
REMOTE_DUMP_FILE="${TMP_DIR}/remote-schema.sql"
FILTERED_DUMP_FILE="${TMP_DIR}/filtered-data.sql"

echo "[sync-db] pull full schema from remote database"
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

if cmp -s "${DATA_SQL}" "${FILTERED_DUMP_FILE}"; then
  echo "[sync-db] data.sql already up to date"
  exit 0
fi

if [[ "${MODE}" == "check" ]]; then
  echo "[sync-db] data.sql is out of date"
  exit 1
fi

cp "${FILTERED_DUMP_FILE}" "${DATA_SQL}"
echo "[sync-db] data.sql updated from remote filtered schema snapshot"
