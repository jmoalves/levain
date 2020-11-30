@echo off

set myPath=%~dp0

set denoPath=%myPath%bin\
if "a%myPath%" == "a" set denoPath=
if not "a%denoPath%" == "a" (
    if not exist %denoPath%deno.exe set denoPath=
)

set cachedOption=
if not "a%denoPath%" == "a" (
    set cachedOption=--cached-only
)

set NO_COLOR=true
set DENO_DIR=%denoPath%
if exist %myPath%\levain.bundle.js (
    echo Running %myPath%\levain.bundle.js
    %denoPath%deno.exe run ^
        --cached-only ^
        --allow-read --allow-write --allow-env --allow-net --allow-run ^
        --unstable ^
        %myPath%\levain.bundle.js ^
        %*
) else (
    echo Running %myPath%src\levain.tss
    %denoPath%deno.exe run ^
        %cachedOption% ^
        --allow-read --allow-write --allow-env --allow-net --allow-run ^
        --unstable ^
        %myPath%src\levain.ts ^
        %*
)
