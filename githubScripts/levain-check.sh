#!/bin/bash

scriptPath="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd && cd - >/dev/null 2>&1 )"

# FIXME: Check parameters
myDeno=$1

export DENO_DIR=$( mktemp -d )
mkdir -p ${DENO_DIR}
${myDeno} info

if ! ${myDeno} cache --unstable --reload levain.ts; then
    echo ERROR compiling levain
    rm -rf ${DENO_DIR}
    exit 1
fi

#FIXME: Run Tests!

rm -rf ${DENO_DIR}
