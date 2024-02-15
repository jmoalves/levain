@echo off

SETLOCAL
set myPath=%~dp0
set myPath=%mypath:~0,-1%
set levainRoot=%myPath%\..

echo.
set DENO_DIR=%levainRoot%\bin
%levainRoot%\bin\deno.exe -V info

%levainRoot%\bin\deno.exe compile ^
    --reload ^
    --allow-read --allow-write --allow-env --allow-net --allow-run ^
    --target x86_64-pc-windows-msvc ^
    --output %levainRoot%\bin\levain.exe ^
    %levainRoot%\levain.ts

    @REM --include recipes ^

ENDLOCAL
