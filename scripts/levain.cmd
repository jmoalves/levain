@echo off
cls 
deno run ^
    --allow-read --allow-env --allow-net ^
    dist/levain.v0.0.1.js ^
    %*
