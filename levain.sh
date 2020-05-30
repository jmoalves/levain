#!/bin/bash

clear

bin/deno run \
    --allow-read --allow-env --allow-net \
    src/levain.ts \
    $@
