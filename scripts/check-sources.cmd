@echo off

SETLOCAL EnableDelayedExpansion

set "myPath=%~dp0"
set "myPath=%myPath:~0,-1%"
set "levainRoot=%myPath%\.."

set "myDeno="
set "cleanCache="

:parseArgs
if "%~1"=="" goto doneArgs
if /I "%~1"=="--clean" (
    set "cleanCache=1"
    shift
    goto parseArgs
)
if not defined myDeno (
    set "myDeno=%~1"
    shift
    goto parseArgs
)
echo Unknown argument: %~1
exit /b 1
:doneArgs

if not defined myDeno (
    set "myDeno=%myPath%\..\bin"
    echo WARN - Using deno default at !myDeno!
)

if not exist "%myDeno%" (
    echo We can't find %myDeno%
    exit /b 1
)

set "myDenoExe=%myDeno%\deno.exe"
if not exist "%myDenoExe%" (
    echo We can't find %myDenoExe%
    exit /b 1
)

echo Deno at %myDenoExe%
"%myDenoExe%" --version
if errorlevel 1 exit /b 1

set "tempPath="
if defined cleanCache (
    set "tempPath=%TEMP%\denoTemp-%RANDOM%%RANDOM%"
    if exist "!tempPath!" rmdir /q /s "!tempPath!"
    mkdir "!tempPath!"
    set "DENO_DIR=!tempPath!"
) else if not defined DENO_DIR (
    set "DENO_DIR=%myDeno%"
)

pushd "%levainRoot%"

echo.
echo Levain sources
"%myDenoExe%" check --frozen levain.ts
if errorlevel 1 (
    echo Levain sources - ERROR
    if defined tempPath rmdir /q /s "!tempPath!"
    popd
    exit /b 1
)
echo Levain sources - OK

echo.
echo Levain TEST sources
"%myDenoExe%" test --frozen --no-run
if errorlevel 1 (
    echo Levain TEST sources - ERROR
    if defined tempPath rmdir /q /s "!tempPath!"
    popd
    exit /b 1
)
echo Levain TEST sources - OK

if defined tempPath rmdir /q /s "!tempPath!"

popd

echo.
echo === CHECK - OK

ENDLOCAL
