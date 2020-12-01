@echo off

SETLOCAL
set myPath=%~dp0
set levainRoot=%myPath%..

if not exist %levainRoot%\bin (
    mkdir %levainRoot%\bin
)

if not exist %levainRoot%\bin\deno.exe (
    echo Please copy a deno.exe into %levainRoot%\bin
    goto:eof
)

set DENO_DIR=%levainRoot%\bin
%levainRoot%\bin\deno.exe -V info
%levainRoot%\bin\deno.exe cache --unstable --reload %levainRoot%\src\levain.ts
rmdir /q/s %levainRoot%\dist

echo.
echo.

ENDLOCAL
