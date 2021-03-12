#!/bin/bash

mkdir -p dist
deno --version
deno bundle --reload --unstable levain.ts dist/levain.bundle.js
