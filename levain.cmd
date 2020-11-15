@echo off

set myPath=%~dp0

set denoPath=%myPath%bin\
if "a%myPath" == "a" set denoPath=

set NO_COLOR=true
%denoPath%deno.exe run ^
    --allow-read --allow-write --allow-env --allow-net --allow-run ^
    --unstable ^
    %myPath%src\levain.ts ^
    %*
