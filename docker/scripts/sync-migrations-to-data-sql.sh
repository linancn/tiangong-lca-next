#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  sync-migrations-to-data-sql.sh [--check]

Description:
  Sync docker/volumes/db/init/data.sql from remote Supabase Postgres by pulling
  the full database schema (schema-only dump).

Modes:
  (default)  overwrite data.sql with pulled schema.
  --check    exit non-zero when local data.sql differs from remote schema dump.

Environment variables:
  REMOTE_DB_URL                   REQUIRED. Remote Postgres connection string.
                                  Example:
                                  postgresql://postgres:<password>@db.<project>.supabase.co:5432/postgres?sslmode=require
                                  Fallback lookup order when not passed:
                                  1) <repo>/.env
                                  2) <repo>/docker/.env
                                  3) <repo>/../tiangong-lca-calculator/.env
                                  Keys: REMOTE_DB_URL, SUPABASE_REMOTE_DB_URL, SUPABASE_DB_URL, CONN
  DATA_SQL                        Target SQL file path.
  PG_IMAGE                        Docker image providing pg_dump (default: postgres:17).
  DESENSITIZE_SCRIPT              Desensitize helper script path
                                  (default: <repo>/docker/desensitize_data.sql.sh).
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
REMOTE_DB_URL="${REMOTE_DB_URL:-${SUPABASE_REMOTE_DB_URL:-${SUPABASE_DB_URL:-}}}"
PG_IMAGE="${PG_IMAGE:-postgres:17}"
DESENSITIZE_SCRIPT="${DESENSITIZE_SCRIPT:-${REPO_ROOT}/docker/desensitize_data.sql.sh}"
ROOT_ENV_FILE="${REPO_ROOT}/.env"
DOCKER_ENV_FILE="${REPO_ROOT}/docker/.env"
CALCULATOR_ENV_FILE="$(cd -- "${REPO_ROOT}/.." && pwd)/tiangong-lca-calculator/.env"

TMP_DIR=""
REMOTE_DUMP_FILE=""

cleanup() {
  set +e
  if [[ -n "${TMP_DIR}" && -d "${TMP_DIR}" ]]; then
    rm -rf "${TMP_DIR}" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

lookup_env_key_from_file() {
  local env_file="$1"
  local key="$2"
  awk -v key="${key}" -F= '
    /^[[:space:]]*#/ { next }
    $1 == key {
      print substr($0, index($0, "=") + 1)
      exit
    }
  ' "${env_file}" 2>/dev/null || true
}

trim_wrapping_quotes() {
  local val="$1"
  val="${val%$'\r'}"
  if [[ "${val}" == \"*\" && "${val}" == *\" ]]; then
    val="${val#\"}"
    val="${val%\"}"
  elif [[ "${val}" == \'*\' && "${val}" == *\' ]]; then
    val="${val#\'}"
    val="${val%\'}"
  fi
  printf '%s' "${val}"
}

if [[ ! -f "${DATA_SQL}" ]]; then
  echo "[sync-db] data.sql not found: ${DATA_SQL}" >&2
  exit 1
fi

if [[ ! -f "${DESENSITIZE_SCRIPT}" ]]; then
  echo "[sync-db] desensitize script not found: ${DESENSITIZE_SCRIPT}" >&2
  exit 1
fi

if [[ -z "${REMOTE_DB_URL}" ]]; then
  for env_file in "${ROOT_ENV_FILE}" "${DOCKER_ENV_FILE}" "${CALCULATOR_ENV_FILE}"; do
    [[ -f "${env_file}" ]] || continue
    for key in REMOTE_DB_URL SUPABASE_REMOTE_DB_URL SUPABASE_DB_URL CONN; do
      candidate="$(lookup_env_key_from_file "${env_file}" "${key}")"
      candidate="$(trim_wrapping_quotes "${candidate}")"
      if [[ -n "${candidate}" ]]; then
        REMOTE_DB_URL="${candidate}"
        break 2
      fi
    done
  done
fi

if [[ -z "${REMOTE_DB_URL}" ]]; then
  echo "[sync-db] REMOTE_DB_URL is required" >&2
  usage >&2
  exit 1
fi

TMP_DIR="$(mktemp -d /tmp/db-schema-sync.XXXXXX)"
REMOTE_DUMP_FILE="${TMP_DIR}/remote-schema.sql"

echo "[sync-db] pull full schema from remote database"
docker run --rm "${PG_IMAGE}" pg_dump \
  --schema-only \
  --dbname="${REMOTE_DB_URL}" > "${REMOTE_DUMP_FILE}"

# pg_dump 17+ injects random \restrict/\unrestrict tokens, remove for stable diffs.
sed -i '/^\\restrict /d; /^\\unrestrict /d' "${REMOTE_DUMP_FILE}"

# Remove sensitive credentials before compare/write.
bash "${DESENSITIZE_SCRIPT}" \
  --input "${REMOTE_DUMP_FILE}" \
  --in-place \
  --no-backup \
  --strict \
  --quiet

# Ensure file ends with newline.
printf '\n' >> "${REMOTE_DUMP_FILE}"

if cmp -s "${DATA_SQL}" "${REMOTE_DUMP_FILE}"; then
  echo "[sync-db] data.sql already up to date"
  exit 0
fi

if [[ "${MODE}" == "check" ]]; then
  echo "[sync-db] data.sql is out of date"
  exit 1
fi

cp "${REMOTE_DUMP_FILE}" "${DATA_SQL}"
echo "[sync-db] data.sql updated from remote full schema dump"
