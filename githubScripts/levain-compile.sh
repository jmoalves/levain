#!/bin/bash

scriptPath="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd && cd - >/dev/null 2>&1 )"

# FIXME: Check parameters
levainDir=$1
myDeno=$2

# Create levain executable
export DENO_DIR=${levainDir}/bin
mkdir -p ${DENO_DIR}
${myDeno} info
${myDeno} compile \
    --unstable \
    --allow-read --allow-write --allow-env --allow-net --allow-run \
    ${levainDir}/levain.ts
