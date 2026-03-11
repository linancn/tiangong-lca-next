#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "${SCRIPT_DIR}/.." && pwd)"

DEFAULT_INPUT_FILE="${REPO_ROOT}/docker/volumes/db/init/data.sql"
DEFAULT_OUTPUT_FILE="${REPO_ROOT}/docker/volumes/db/init/data_desensitized.sql"

INPUT_FILE="${DEFAULT_INPUT_FILE}"
OUTPUT_FILE="${DEFAULT_OUTPUT_FILE}"
IN_PLACE=0
CREATE_BACKUP=1
STRICT=0
QUIET=0

show_help() {
  cat <<'EOF'
Data.sql Desensitization Script

Usage:
  desensitize_data.sql.sh [options]

Options:
  -i, --input FILE      Input SQL file. Default: docker/volumes/db/init/data.sql
  -o, --output FILE     Output SQL file. Default: docker/volumes/db/init/data_desensitized.sql
      --in-place        Overwrite input file directly.
      --no-backup       Do not create backup file.
      --strict          Exit non-zero if sensitive patterns remain after replacement.
  -q, --quiet           Reduce log output.
  -h, --help            Show this help.

Examples:
  ./docker/desensitize_data.sql.sh
  ./docker/desensitize_data.sql.sh --in-place --no-backup --strict
  ./docker/desensitize_data.sql.sh -i /tmp/raw.sql -o /tmp/safe.sql
EOF
}

log() {
  if [[ "${QUIET}" != "1" ]]; then
    echo "$@"
  fi
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -i|--input)
      if [[ $# -lt 2 || -z "${2:-}" ]]; then
        echo "[desensitize] --input requires a file path" >&2
        exit 1
      fi
      INPUT_FILE="${2}"
      shift 2
      ;;
    -o|--output)
      if [[ $# -lt 2 || -z "${2:-}" ]]; then
        echo "[desensitize] --output requires a file path" >&2
        exit 1
      fi
      OUTPUT_FILE="${2}"
      shift 2
      ;;
    --in-place)
      IN_PLACE=1
      shift
      ;;
    --no-backup)
      CREATE_BACKUP=0
      shift
      ;;
    --strict)
      STRICT=1
      shift
      ;;
    -q|--quiet)
      QUIET=1
      shift
      ;;
    -h|--help)
      show_help
      exit 0
      ;;
    *)
      echo "[desensitize] unknown option: $1" >&2
      show_help >&2
      exit 1
      ;;
  esac
done

if [[ -z "${INPUT_FILE}" ]]; then
  echo "[desensitize] input file is required" >&2
  exit 1
fi

if [[ "${IN_PLACE}" == "1" ]]; then
  OUTPUT_FILE="${INPUT_FILE}"
fi

if [[ ! -f "${INPUT_FILE}" ]]; then
  echo "[desensitize] input file does not exist: ${INPUT_FILE}" >&2
  exit 1
fi

OUTPUT_DIR="$(dirname -- "${OUTPUT_FILE}")"
mkdir -p "${OUTPUT_DIR}"

if [[ "${CREATE_BACKUP}" == "1" ]]; then
  BACKUP_FILE="${INPUT_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
  cp -- "${INPUT_FILE}" "${BACKUP_FILE}"
  log "[desensitize] backup created: ${BACKUP_FILE}"
fi

TMP_FILE="$(mktemp /tmp/desensitize_data_sql.XXXXXX)"
trap 'rm -f "${TMP_FILE}"' EXIT

log "[desensitize] replacing sensitive patterns..."

# 1) x_key values in embedded JSON payloads.
# 2) apikey values that start with sb_secret_ in embedded JSON payloads.
# 3) any remaining sb_secret_* tokens in plain SQL text.
sed -E \
  -e 's/"x_key"[[:space:]]*:[[:space:]]*"[^"]*"/"x_key":"edge-functions-key"/g' \
  -e 's/"apikey"[[:space:]]*:[[:space:]]*"sb_secret_[^"]*"/"apikey":"edge-functions-key"/g' \
  -e 's/sb_secret_[A-Za-z0-9._-]+/sb_secret_REDACTED/g' \
  "${INPUT_FILE}" > "${TMP_FILE}"

cp -- "${TMP_FILE}" "${OUTPUT_FILE}"

leftover_sb_secret="$(grep -nE 'sb_secret_[A-Za-z0-9._-]+' "${OUTPUT_FILE}" | grep -v 'sb_secret_REDACTED' || true)"
leftover_x_key="$(grep -nE '"x_key"[[:space:]]*:[[:space:]]*"[^"]*"' "${OUTPUT_FILE}" | grep -v '"x_key":"edge-functions-key"' || true)"

if [[ -n "${leftover_sb_secret}" || -n "${leftover_x_key}" ]]; then
  echo "[desensitize] warning: possible sensitive patterns remain" >&2
  if [[ -n "${leftover_sb_secret}" ]]; then
    echo "[desensitize] remaining sb_secret-like tokens:" >&2
    echo "${leftover_sb_secret}" >&2
  fi
  if [[ -n "${leftover_x_key}" ]]; then
    echo "[desensitize] remaining x_key tokens:" >&2
    echo "${leftover_x_key}" >&2
  fi
  if [[ "${STRICT}" == "1" ]]; then
    exit 2
  fi
fi

log "[desensitize] done: ${OUTPUT_FILE}"
