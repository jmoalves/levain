@echo off

set denoVersion=%1
if "a%denoVersion%" == "a" (
    echo.
    echo Which deno version should I use?
    exit /b 1
)

SETLOCAL
set myPath=%~dp0
set levainRoot=%myPath%..

if not exist %levainRoot%\bin (
    mkdir %levainRoot%\bin
)

set denoPath=%TEMP%\deno\v%denoVersion%
echo %denoPath%\deno.exe
if not exist %denoPath%\deno.exe (
    if exist %denoPath% rmdir /q /s %denoPath%
    mkdir %denoPath%
    pushd %denoPath%
    %levainRoot%\extra-bin\windows\curl\bin\curl -L -O https://github.com/denoland/deno/releases/download/v%denoVersion%/deno-x86_64-pc-windows-msvc.zip
    %levainRoot%\extra-bin\windows\7-zip\7z.exe x -bsp2 -aoa deno-x86_64-pc-windows-msvc.zip
    popd
)

REM if not exist %levainRoot%\bin\deno.exe (
    copy %denoPath%\deno.exe %levainRoot%\bin
REM )

if exist %levainRoot%\dist rmdir /q/s %levainRoot%\dist
if exist %levainRoot%\levain.bundle.js del %levainRoot%\levain.bundle.js

set DENO_DIR=%levainRoot%\bin
%levainRoot%\bin\deno.exe -V info
%levainRoot%\bin\deno.exe cache --unstable --reload %levainRoot%\levain.ts
::%levainRoot%\bin\deno.exe bundle --unstable --reload %levainRoot%\levain.ts %levainRoot%\levain.bundle.js
if errorlevel 1 exit /b %ERRORLEVEL%

::rmdir %levainRoot%\bin\deps /q /s
::rmdir %levainRoot%\bin\gen /q /s

echo.
echo Deno cache ok
echo.

ENDLOCAL
