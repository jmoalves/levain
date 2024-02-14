@echo off

SETLOCAL EnableDelayedExpansion

set myPath=%~dp0
set myPath=%mypath:~0,-1%
set levainRoot=%myPath%\..

:getOpts
if "a%1" == "a" goto endGetOpts
if "%1" == "--" shift & goto endGetOpts

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
    echo.
    echo TIP: if you want to pass options to deno test, use -- as separator
    echo Examples: 
    echo test.cmd -- --fail-fast
    echo test.cmd -- %checkOption%
    exit 1
)

:endGetOpts

set allParameters=
:allParm
if "a%1" == "a" goto endParm

set allParameters=%allParameters% %1
shift

goto allParm
:endParm

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

echo.

:: Test!
if exist coverage (
    echo Removing previous coverage info
    rmdir /q/s coverage
)

set coverOps=--coverage
:: If we got a specific test to run, skip coverage
if not "a%allParameters%" == "a" set coverOps=

echo Running tests
@echo on
%myDenoExe% test --allow-all %coverOps% %allParameters%
@echo off

if not "a%coverOps%" == "a" (
    echo.
    echo Coverage report - TEXT
    %myDenoExe% coverage

    echo Coverage report - LCOV
    %myDenoExe% coverage --lcov --output=coverage/levain.lcov

    @REM echo Coverage report - HTML
    @REM %myDenoExe% coverage --html
)

popd

ENDLOCAL
