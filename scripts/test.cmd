@echo off

SETLOCAL EnableDelayedExpansion

set myPath=%~dp0
set myPath=%mypath:~0,-1%
set levainRoot=%myPath%\..

:getOpts
if "a%1" == "a" goto endGetOpts
if "%1" == "--" goto endGetOpts

if /I "%1" == "--denoDir" (
    if "a%2" == "a" (
        echo You must inform the denoDir
        exit 1
    )

    set myDenoDir=%2& shift & shift & goto getOpts
)

:: Invalid option?
set checkOption=%1
if /i "%checkOption:~0,1%"=="-" (
    echo Unknown option %1
    exit /b 1
)

:endGetOpts

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

echo.

:: Test!
@REM echo Removing previous coverage reports
@REM if exist coverage\ rmdir /q/s coverage\

set coverOps=--coverage
:: If we got a specific test to run, skip coverage
if not "a%1" == "a" set coverOps=

echo Running tests
@echo on
%myDenoExe% test --allow-all %coverOps% %*
@echo off

if "a%coverOps%" == "a" goto skipCoverage

echo.
echo Coverage report - TEXT
%myDenoExe% coverage

echo Coverage report - LCOV
%myDenoExe% coverage --lcov --output=coverage/levain.lcov

echo Coverage report - HTML
%myDenoExe% coverage --html

:skipCoverage

popd
ENDLOCAL
