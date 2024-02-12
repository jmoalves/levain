@echo off

SETLOCAL
set myPath=%~dp0
set myPath=%mypath:~0,-1%
set levainRoot=%myPath%\..

set proxyCfg=
if not "a%HTTP_PROXY%"=="a" set proxyCfg=-ProxyUseDefaultCredentials -Proxy %HTTP_PROXY% 
if not "a%HTTPS_PROXY%"=="a" set proxyCfg=-ProxyUseDefaultCredentials -Proxy %HTTPS_PROXY% 

echo.
set DENO_DIR=%levainRoot%\bin
%levainRoot%\bin\deno.exe -V info

echo === Deno cache - sources
%levainRoot%\bin\deno.exe cache --reload --check %levainRoot%\levain.ts
if errorlevel 1 exit /b %ERRORLEVEL%

echo === Deno cache - tests
%levainRoot%\bin\deno.exe test --reload --no-run
if errorlevel 1 exit /b %ERRORLEVEL%

ENDLOCAL
