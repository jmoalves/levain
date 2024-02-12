@echo off

SETLOCAL EnableDelayedExpansion

set myPath=%~dp0
set myPath=%mypath:~0,-1%

set myDeno=%1

if "a%myDeno%" == "a" (
    set myDeno=%myPath%\..\bin
    echo WARN - Using deno default at !myDeno!
)

if not exist %myDeno% (
    echo We can\'t find %myDeno%
    exit 1
)

set myDenoExe=%myDeno%\deno.exe
if not exist %myDenoExe% (
    echo We can\'t find %myDenoExe%
    exit 1
)

echo Deno at %myDenoExe%

set tempPath=%TEMP%\denoTemp
if exist %tempPath% rmdir /q /s %tempPath%
mkdir %tempPath%

set DENO_DIR=%tempPath%

echo.
echo Levain sources
%myDenoExe% check --reload -q levain.ts
if errorlevel 1 (
    echo Levain sources - ERROR
    rmdir /q/s %tempPath%
    exit 1
)
echo Levain sources - OK

echo.
echo Levain TEST sources
%myDenoExe% test --reload --no-run -q
if errorlevel 1 (
    echo Levain TEST sources - ERROR
    rmdir /q/s %tempPath%
    exit 1
)
echo Levain TEST sources - OK

::FIXME: Run Tests!

rmdir /q/s %tempPath%

echo.
echo === CHECK - OK

ENDLOCAL
