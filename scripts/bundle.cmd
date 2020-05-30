@echo off
set version=0.0.1
deno bundle src/levain.ts dist/levain.v%version%.js
