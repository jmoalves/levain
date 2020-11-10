#!/bin/bash

myPath="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
deno run \
    --allow-read --allow-write --allow-env --allow-net --allow-run \
    --unstable \
    $myPath/src/levain.ts \
    $@
