#!/usr/bin/env bash

set -euo pipefail

readonly DEFAULT_SOURCE_REPOSITORY='https://github.com/linancn/tiangong-lca-edge-functions.git'

usage() {
  cat <<'EOF'
Usage:
  ./docker/pull-edge-functions.sh --ref <40-character-commit-sha> [--repo <git-url-or-path>]

Options:
  --ref <commit-sha>       Required reviewed 40-character Edge commit SHA.
  --repo <git-url-or-path> Edge repository. Defaults to the canonical GitHub repository.
  -h, --help               Show this help without changing files.

The helper resolves the requested ref to one commit, mirrors
supabase/functions/ with stale-file deletion, and writes the exact source
receipt to docker/volumes/functions/.source-revision.json.
EOF
}

source_repository=${DEFAULT_SOURCE_REPOSITORY}
source_ref=

while (($# > 0)); do
  case "$1" in
    --ref)
      if (($# < 2)) || [[ -z "$2" ]]; then
        echo 'Error: --ref requires a non-empty value.' >&2
        exit 2
      fi
      source_ref=$2
      shift 2
      ;;
    --repo)
      if (($# < 2)) || [[ -z "$2" ]]; then
        echo 'Error: --repo requires a non-empty value.' >&2
        exit 2
      fi
      source_repository=$2
      shift 2
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      echo "Error: unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if [[ -z "${source_ref}" ]]; then
  echo 'Error: --ref is required so the mirror cannot drift with a moving default branch.' >&2
  usage >&2
  exit 2
fi
if [[ ! "${source_ref}" =~ ^[0-9a-fA-F]{40}$ ]]; then
  echo 'Error: --ref must be a full 40-character commit SHA.' >&2
  exit 2
fi

if [[ "${source_ref}" == *$'\n'* || "${source_repository}" == *$'\n'* ]]; then
  echo 'Error: repository and ref values must be single-line strings.' >&2
  exit 2
fi

readonly script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
readonly repo_root="$(cd -- "${script_dir}/.." && pwd -P)"
readonly target_dir="${repo_root}/docker/volumes/functions"
readonly expected_target="${script_dir}/volumes/functions"

if [[ "${target_dir}" != "${expected_target}" ]]; then
  echo "Error: resolved mirror target is unexpected: ${target_dir}" >&2
  exit 1
fi
if [[ -L "${target_dir}" ]]; then
  echo "Error: refusing to replace symlinked mirror target: ${target_dir}" >&2
  exit 1
fi
if [[ -d "${target_dir}" ]]; then
  readonly target_symlink="$(find "${target_dir}" -type l -print -quit)"
  if [[ -n "${target_symlink}" ]]; then
    echo "Error: refusing mirror target with a nested symlink: ${target_symlink}" >&2
    exit 1
  fi
fi

readonly temporary_root="$(mktemp -d "${TMPDIR:-/tmp}/tiangong-edge-functions.XXXXXX")"
cleanup() {
  rm -rf -- "${temporary_root}"
}
trap cleanup EXIT INT TERM

readonly checkout_dir="${temporary_root}/source"
readonly staged_dir="${temporary_root}/functions"

git init --quiet "${checkout_dir}"
git -C "${checkout_dir}" remote add origin "${source_repository}"
git -C "${checkout_dir}" fetch --quiet --depth 1 origin "${source_ref}"
readonly resolved_commit="$(
  git -C "${checkout_dir}" rev-parse --verify 'FETCH_HEAD^{commit}'
)"
git -C "${checkout_dir}" checkout --quiet --detach "${resolved_commit}"

readonly source_dir="${checkout_dir}/supabase/functions"
if [[ ! -d "${source_dir}" || -L "${source_dir}" ]]; then
  echo "Error: exact Edge ref has no safe supabase/functions directory: ${resolved_commit}" >&2
  exit 1
fi
readonly source_symlink="$(find "${source_dir}" -type l -print -quit)"
if [[ -n "${source_symlink}" ]]; then
  echo "Error: exact Edge ref contains an unsupported symlink: ${source_symlink}" >&2
  exit 1
fi

mkdir -p "${staged_dir}"
rsync -a --delete -- "${source_dir}/" "${staged_dir}/"

json_repository=${source_repository//\\/\\\\}
json_repository=${json_repository//\"/\\\"}
cat >"${staged_dir}/.source-revision.json" <<EOF
{
  "repository": "${json_repository}",
  "commit": "${resolved_commit}",
  "sourcePath": "supabase/functions"
}
EOF

mkdir -p "${target_dir}"
rsync -a --delete -- "${staged_dir}/" "${target_dir}/"

echo "Edge Functions mirror synchronized."
echo "Source repository: ${source_repository}"
echo "Resolved commit: ${resolved_commit}"
echo "Target: ${target_dir}"
