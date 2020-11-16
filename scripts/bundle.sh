#!/bin/bash

mkdir -p dist
deno --version
deno bundle --reload src/levain.ts dist/levain.bundle.js
