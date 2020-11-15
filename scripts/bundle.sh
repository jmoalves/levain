#!/bin/bash

mkdir -p dist
deno bundle \
    --unstable \
    src/levain.ts dist/levain.bundle.js
