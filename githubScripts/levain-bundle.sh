#!/bin/bash

scriptPath="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd && cd - >/dev/null 2>&1 )"

# FIXME: Check parameters
levainDir=$1
myDeno=$2

# bundle dependencies
# export DENO_DIR=${distRoot}/deno
export DENO_DIR=${levainDir}/bin
mkdir -p ${DENO_DIR}
${myDeno} info
${myDeno} cache --unstable --reload ${levainDir}/levain.ts
#${myDeno} bundle --unstable --reload ${levainDir}/levain.ts ${levainDir}/levain.bundle.js
# bundle problems - https://github.com/jmoalves/levain/issues/13

