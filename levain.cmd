@echo off

cls 

bin\deno.exe run ^
    --allow-read --allow-env --allow-net ^
    src/levain.ts ^
    %*
