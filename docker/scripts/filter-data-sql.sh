#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  filter-data-sql.sh --input <input.sql> --output <output.sql>

Description:
  Filter a full pg_dump schema dump down to TianGong app-required objects.
EOF
}

INPUT=""
OUTPUT=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --input)
      if [[ $# -lt 2 || -z "${2:-}" ]]; then
        echo "[filter-sql] missing value for --input" >&2
        usage >&2
        exit 1
      fi
      INPUT="$2"
      shift 2
      ;;
    --output)
      if [[ $# -lt 2 || -z "${2:-}" ]]; then
        echo "[filter-sql] missing value for --output" >&2
        usage >&2
        exit 1
      fi
      OUTPUT="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      usage >&2
      exit 1
      ;;
  esac
done

if [[ -z "${INPUT}" || -z "${OUTPUT}" ]]; then
  usage >&2
  exit 1
fi

mkdir -p "$(dirname "${OUTPUT}")"

awk '
function should_drop_line(line) {
  return line ~ /^\\restrict / \
    || line ~ /^\\unrestrict / \
    || line == "SET transaction_timeout = 0;" \
    || line == "-- TianGong LCA filtered schema snapshot" \
    || line == "-- Generated from a remote Supabase schema dump." \
    || line == "-- Base Supabase-managed schemas/objects are intentionally excluded."
}

function in_csv_set(val, csv,   arr, n, i) {
  n = split(csv, arr, ",")
  for (i = 1; i <= n; i++) {
    if (val == arr[i]) return 1
  }
  return 0
}

function normalize_extension_name(name) {
  gsub(/^"/, "", name)
  gsub(/"$/, "", name)
  return name
}

function keep_block(name, obj_type, schema, ext_name) {
  if (schema == "auth" || schema == "cron" || schema == "extensions" || schema == "graphql" || schema == "graphql_public" || schema == "net" || schema == "pgbouncer" || schema == "pgsodium" || schema == "pgsodium_masks" || schema == "realtime" || schema == "storage" || schema == "supabase_functions" || schema == "supabase_migrations" || schema == "vault") {
    return 0
  }

  if (schema == "public" || schema == "pgmq" || schema == "util") {
    return 1
  }

  if (schema == "-") {
    if (obj_type == "SCHEMA") {
      return (name == "pgmq" || name == "util")
    }

    if (obj_type == "EXTENSION" || obj_type == "COMMENT") {
      ext_name = name
      sub(/^EXTENSION /, "", ext_name)
      ext_name = normalize_extension_name(ext_name)
      return in_csv_set(ext_name, "pgmq,vector,pgroonga,hstore,http,pgcrypto,uuid-ossp")
    }

    if (obj_type == "ACL" && (name == "public" || name == "SCHEMA public")) {
      return 1
    }

    return 0
  }

  return 0
}

function parse_meta(header_line,   tmp, parts, n) {
  # format: -- Name: <name>; Type: <type>; Schema: <schema>; Owner: <owner>
  tmp = header_line
  sub(/^-- Name: /, "", tmp)
  n = split(tmp, parts, "; ")
  if (n < 4) {
    meta_ok = 0
    return
  }

  meta_name = parts[1]
  meta_type = parts[2]
  sub(/^Type: /, "", meta_type)
  meta_schema = parts[3]
  sub(/^Schema: /, "", meta_schema)
  meta_ok = 1
}

{
  line = $0
  sub(/\r$/, "", line)

  if (!should_drop_line(line)) {
    line_count++
    lines[line_count] = line
  }
}

END {
  in_blocks = 0
  block_count = 0
  pre_count = 0

  i = 1
  while (i <= line_count) {
    if (i < line_count && lines[i] == "--" && index(lines[i+1], "-- Name: ") == 1) {
      in_blocks = 1
      block_count++
      block_line = lines[i] "\n" lines[i+1] "\n"

      parse_meta(lines[i+1])
      if (meta_ok) {
        block_keep[block_count] = keep_block(meta_name, meta_type, meta_schema)
      } else {
        block_keep[block_count] = 1
      }

      i += 2
      while (i <= line_count) {
        if (i < line_count && lines[i] == "--" && index(lines[i+1], "-- Name: ") == 1) {
          break
        }
        block_line = block_line lines[i] "\n"
        i++
      }
      block_text[block_count] = block_line
      continue
    }

    if (!in_blocks) {
      pre_count++
      preamble[pre_count] = lines[i]
    }
    i++
  }

  marker = 0
  for (i = 1; i <= pre_count; i++) {
    if (preamble[i] == "-- PostgreSQL database dump") {
      marker = i
      break
    }
  }

  start_idx = 1
  if (marker > 0) {
    start_idx = marker - 1
    if (start_idx < 1) start_idx = 1
  }

  print "--"
  print "-- TianGong LCA filtered schema snapshot"
  print "-- Generated from a remote Supabase schema dump."
  print "-- Base Supabase-managed schemas/objects are intentionally excluded."
  print "--"
  print ""

  for (i = start_idx; i <= pre_count; i++) {
    print preamble[i]
  }

  for (i = 1; i <= block_count; i++) {
    if (block_keep[i]) {
      printf "%s", block_text[i]
    }
  }
}
' "${INPUT}" > "${OUTPUT}"
