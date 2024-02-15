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
    --output %levainRoot%\levain.exe ^
    %levainRoot%\levain.ts ^
    --is_compiled_binary
    
    @REM --is_compiled_binary - Workaround for Levain compile vs uncompiled
    @REM https://stackoverflow.com/questions/76647896/determine-if-running-uncompiled-ts-script-or-compiled-deno-executable
    @REM SEE ALSO: levain.ts - get levainRootFile()

    @REM --include recipes ^

ENDLOCAL
