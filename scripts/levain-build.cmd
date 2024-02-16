@echo off

SETLOCAL EnableDelayedExpansion

set myPath=%~dp0
set myPath=%mypath:~0,-1%
set levainRoot=%myPath%\..

set coverOps=
set checkSources=

:getOpts
if "a%1" == "a" goto endGetOpts
if "%1" == "--" shift & goto endGetOpts

if /I "%1" == "--denoDir" (
    if "a%2" == "a" (
        echo You must inform the denoDir
        exit /b 1
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
    exit /b 1
)

set myDenoExe=%myDenoDir%\deno.exe
if not exist %myDenoExe% (
    echo We can\'t find %myDenoExe%
    exit /b 1
)

set DENO_DIR=%myDenoDir%
echo Deno at %myDenoExe%
%myDenoExe% -V info

:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

set levainOutputDir=%1
if "a%levainOutputDir%" == "a" (
    set levainOutputDir=%levainRoot%\target
)

echo.
echo Building Levain at %levainOutputDir%

if exist %levainOutputDir% rmdir /q/s %levainOutputDir%
if exist %levainRoot%\deno.lock del /q %levainRoot%\deno.lock

:: COMPILE Levain
%levainRoot%\bin\deno.exe compile ^
    --reload ^
    --allow-read --allow-write --allow-env --allow-net --allow-run ^
    --target x86_64-pc-windows-msvc ^
    --output %levainOutputDir%\build\levain.exe ^
    %levainRoot%\levain.ts ^
    --is_compiled_binary
    
    @REM --is_compiled_binary - Workaround for Levain compile vs uncompiled
    @REM https://stackoverflow.com/questions/76647896/determine-if-running-uncompiled-ts-script-or-compiled-deno-executable
    @REM SEE ALSO: levain-build.cmd
    @REM SEE ALSO: levain-build.sh
    @REM SEE ALSO: levain.ts - get levainRootFile()

:: Copy auxiliary files
xcopy /q/s %levainRoot%\levain.cmd %levainOutputDir%\
xcopy /q/s %levainRoot%\LICENSE %levainOutputDir%\
xcopy /q/s %levainRoot%\recipes\ %levainOutputDir%\build\recipes\
xcopy /q/s %levainRoot%\extra-bin\ %levainOutputDir%\build\extra-bin\

ENDLOCAL
