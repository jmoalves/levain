#!/bin/bash

#################################
# FIXME: This script should evolve as levain.cmd did
#################################

myPath="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

export DENO_BIN=/usr/local/bin/deno

$DENO_BIN run \
    --allow-read --allow-write --allow-env --allow-net --allow-run \
    --unstable \
    $myPath/src/levain.ts \
    $@
