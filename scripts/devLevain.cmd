@echo off

SETLOCAL

set "myPath=%~dp0"
set "myPath=%myPath:~0,-1%"
set "levainRoot=%myPath%\.."

set "denoVersion=%~1"

if not exist "%levainRoot%\bin" (
    mkdir "%levainRoot%\bin"
)

call "%levainRoot%\githubScripts\get-deno.cmd" "%levainRoot%\bin" "%denoVersion%"
if errorlevel 1 exit /b %ERRORLEVEL%

call "%levainRoot%\githubScripts\get-extraBin.cmd"
if errorlevel 1 exit /b %ERRORLEVEL%

echo.
echo ==================
call "%myPath%\levainCache.cmd"
if errorlevel 1 exit /b %ERRORLEVEL%
echo ==================

echo.
echo === Dev Levain - OK
echo.

ENDLOCAL
