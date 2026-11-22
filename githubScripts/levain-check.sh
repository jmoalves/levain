#!/bin/bash
set -euo pipefail

myDeno=${1:-}

if [ -z "$myDeno" ]; then
    echo "You must inform the deno executable full path"
    exit 1
fi

if [ ! -x "$myDeno" ]; then
    echo "We can't run $myDeno"
    exit 1
fi

DENO_DIR=$( mktemp -d )
export DENO_DIR
trap 'rm -rf "$DENO_DIR"' EXIT

if ! "${myDeno}" check --reload levain.ts; then
    echo "ERROR type-checking levain.ts"
    exit 1
fi

if ! "${myDeno}" lint; then
    echo "ERROR linting sources"
    exit 1
fi

if ! "${myDeno}" run --allow-all scripts/integrate.ts --check-i18n; then
    echo "ERROR validating i18n catalogs"
    exit 1
fi

echo
echo "CHECK - Levain sources, lint & i18n - OK"
