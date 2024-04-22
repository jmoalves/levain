@echo off

set myPath=%~dp0
:: removing the trailing backslash
set myPath=%myPath:~0,-1%

set DENO_NO_UPDATE_CHECK=true
set NO_COLOR=true
set DENO_DIR=%myPath%\..\bin
%DENO_DIR%\deno.exe run --allow-all %myPath%\..\levain.ts %*
