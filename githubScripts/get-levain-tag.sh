#!/bin/bash

scriptPath="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd && cd - >/dev/null 2>&1 )"

# FIXME: Check parameters
levainVersion=$1
levainDir=$2

## levain
rm -rf ${levainDir}
mkdir -p ${levainDir}
git archive v${levainVersion} | tar x -C ${levainDir}

echo Levain ${levainVersion} at ${levainDir}
