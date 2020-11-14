@echo off

set myPath=%~dp0
PATH %myPath%;%myPath%bin;%PATH%

set NO_COLOR=true

deno.exe run ^
    --allow-read --allow-write --allow-env --allow-net --allow-run ^
    --unstable ^
    %myPath%src/levain.ts ^
    %*
