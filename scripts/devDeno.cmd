@echo off

set denoPath=%1
if "a%denoPath%" == "a" (
    echo.
    echo Where should I find deno.exe?
    exit /b 1
)

SETLOCAL
set myPath=%~dp0
set levainRoot=%myPath%..

if not exist %levainRoot%\bin (
    mkdir %levainRoot%\bin
)

REM if not exist %levainRoot%\bin\deno.exe (
    copy %denoPath%\deno.exe %levainRoot%\bin
REM )

if exist %levainRoot%\dist rmdir /q/s %levainRoot%\dist

set DENO_DIR=%levainRoot%\bin
%levainRoot%\bin\deno.exe -V info
%levainRoot%\bin\deno.exe cache --unstable --reload %levainRoot%\src\levain.ts
if errorlevel 1 exit /b %ERRORLEVEL%

echo.
echo Deno cache ok
echo.

ENDLOCAL
