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
:::::::::::::::::::::::::::::
:: FIXME: Use levain bundle
:::::::::::::::::::::::::::::
echo Running %myPath%src\levain.ts
%denoPath%deno.exe run ^
    --no-check ^
    --allow-read --allow-write --allow-env --allow-net --allow-run ^
    --unstable ^
    %myPath%src\levain.ts ^
    %*
