#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
NEW_SCRIPT="${SCRIPT_DIR}/sync-migrations-to-data-sql.sh"

echo "[sync-db] warning: sync-lca-migrations-to-data-sql.sh is deprecated, use sync-migrations-to-data-sql.sh" >&2
exec "${NEW_SCRIPT}" "$@"
