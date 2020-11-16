#!/bin/bash

myPath="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

set DENO_DIR=$myPath/bin
$myPath/bin/deno run \
    --cached-only \
    --allow-read --allow-write --allow-env --allow-net --allow-run \
    --unstable \
    $myPath/src/levain.ts \
    $@
