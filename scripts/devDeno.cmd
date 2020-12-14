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

set DENO_DIR=%levainRoot%\bin
%levainRoot%\bin\deno.exe -V info
%levainRoot%\bin\deno.exe cache --unstable --reload %levainRoot%\src\levain.ts
if exist %levainRoot%\dist rmdir /q/s %levainRoot%\dist

echo.
echo.

ENDLOCAL
