@echo off

SETLOCAL EnableDelayedExpansion

set myPath=%~dp0
set myPath=%mypath:~0,-1%
set levainRoot=%myPath%\..

set myDenoDir=%1
if "a%myDenoDir%" == "a" (
    set myDenoDir=%levainRoot%\bin
    echo WARN - Using deno default at !myDenoDir!
)

if not exist %myDenoDir% (
    echo Can\'t find dir %myDenoDir%
    exit 1
)

set myDenoExe=%myDenoDir%\deno.exe
if not exist %myDenoExe% (
    echo We can\'t find %myDenoExe%
    exit 1
)

set DENO_DIR=%myDenoDir%
echo Deno at %myDenoExe%
%myDenoExe% -V info

pushd %levainRoot%

:: Check syntax
echo === Syntax check - sources
%myDenoExe% check levain.ts
if errorlevel 1 goto:eof

echo === Syntax check - tests
%myDenoExe% test --no-run
if errorlevel 1 goto:eof

:: Test!
echo.
echo Running tests
@echo on
%myDenoExe% test --allow-all
@echo off

popd
ENDLOCAL
