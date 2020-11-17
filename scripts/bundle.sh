#!/bin/bash

mkdir -p dist
deno --version
deno bundle --reload --unstable src/levain.ts dist/levain.bundle.js
