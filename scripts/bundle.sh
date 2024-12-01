#!/bin/bash

mkdir -p dist
deno --version
deno bundle --reload levain.ts dist/levain.bundle.js
