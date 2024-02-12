@echo off

SETLOCAL
set myPath=%~dp0
set myPath=%mypath:~0,-1%

set myDeno=%1

if "a%myDeno%" == "a" (
    echo You must inform the deno executable full path
    exit 1
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
%myDenoExe% check --reload levain.ts
if errorlevel 1 (
    echo ERROR compiling levain
    rmdir /q/s %tempPath%
    exit 1
)

::FIXME: Run Tests!

rmdir /q/s %tempPath%

echo.
echo CHECK - Levain sources - OK

ENDLOCAL
