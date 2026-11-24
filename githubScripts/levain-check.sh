#!/bin/bash
set -euo pipefail

myDeno=${1:-}

if [ -z "$myDeno" ]; then
    echo "You must inform the deno executable full path" >&2
    exit 1
fi

if [ ! -x "$myDeno" ]; then
    echo "We can't run $myDeno" >&2
    exit 1
fi

if [ -z "${DENO_DIR:-}" ]; then
    DENO_DIR=$(mktemp -d)
    export DENO_DIR
    trap 'rm -rf "$DENO_DIR"' EXIT
fi

if ! "${myDeno}" check --frozen levain.ts; then
    echo "ERROR type-checking levain.ts" >&2
    exit 1
fi

if ! "${myDeno}" lint; then
    echo "ERROR linting sources" >&2
    exit 1
fi

if ! "${myDeno}" run --frozen --allow-all scripts/integrate.ts --check-i18n; then
    echo "ERROR validating i18n catalogs" >&2
    exit 1
fi

echo
echo "CHECK - Levain sources, lint & i18n - OK"
