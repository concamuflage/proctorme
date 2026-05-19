#!/usr/bin/env bash

set -euo pipefail

feature_path="${1:-src/test/resources/features/**/*.feature}"
shift || true

scenario_name=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --name)
      scenario_name="${2:-}"
      shift 2
      ;;
    *)
      shift
      ;;
  esac
done

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
test_root="$(cd "${script_dir}/.." && pwd)"

cmd=(mvn test "-Dcucumber.features=${feature_path}")

if [[ -n "${scenario_name}" ]]; then
  cmd+=("-Dcucumber.filter.name=${scenario_name}")
fi

cd "${test_root}"
exec "${cmd[@]}"
