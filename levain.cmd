@echo off

set myPath=%~dp0

set NO_COLOR=true
%myPath%bin\deno.exe run ^
    --allow-read --allow-write --allow-env --allow-net --allow-run ^
    --unstable ^
    %myPath%src/levain.ts ^
    %*
