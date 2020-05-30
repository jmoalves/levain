@echo off
cls 
deno run ^
    --allow-read --allow-env --allow-net ^
    src/levain.ts ^
    %*
