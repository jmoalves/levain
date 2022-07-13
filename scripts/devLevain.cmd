@echo off

SETLOCAL
set myPath=%~dp0
set myPath=%mypath:~0,-1%
set levainRoot=%myPath%\..

set PWS=powershell.exe -ExecutionPolicy Bypass -NoLogo -NonInteractive -NoProfile

set proxyCfg=
if not "a%HTTP_PROXY%"=="a" set proxyCfg=-ProxyUseDefaultCredentials -Proxy %HTTP_PROXY% 
if not "a%HTTPS_PROXY%"=="a" set proxyCfg=-ProxyUseDefaultCredentials -Proxy %HTTPS_PROXY% 

if not exist %levainRoot%\bin (
    mkdir %levainRoot%\bin
)

echo.
echo === Deno latest
set denoPath=%TEMP%\deno
if exist %denoPath% rmdir /q /s %denoPath%
mkdir %denoPath%

%PWS% Invoke-WebRequest %proxyCfg% https://github.com/denoland/deno/releases/latest/download/deno-x86_64-pc-windows-msvc.zip -OutFile %denoPath%\deno-x86_64-pc-windows-msvc.zip
%PWS% Expand-Archive %denoPath%\deno-x86_64-pc-windows-msvc.zip -DestinationPath %levainRoot%\bin -Force
rmdir /q /s %denoPath%

echo.
echo === EXTRA-BIN latest
set binPath=%TEMP%\levain\extra-bin
if exist %binPath% rmdir /q /s %binPath%
mkdir %binPath%

%PWS% Invoke-WebRequest %proxyCfg% https://github.com/jmoalves/levain/releases/latest/download/levain-extra-bin-windows-x86_64.zip -OutFile %binPath%\levain-extra-bin-windows-x86_64.zip

if exist %levainRoot%\extra-bin\windows\7-zip rmdir /q /s %levainRoot%\extra-bin\windows\7-zip
if exist %levainRoot%\extra-bin\windows\curl rmdir /q /s %levainRoot%\extra-bin\windows\curl
if exist %levainRoot%\extra-bin\windows\git rmdir /q /s %levainRoot%\extra-bin\windows\git
%PWS% Expand-Archive %binPath%\levain-extra-bin-windows-x86_64.zip -DestinationPath %levainRoot%
rmdir /q /s %binPath%

echo.
echo === Deno cache
set DENO_DIR=%levainRoot%\bin
%levainRoot%\bin\deno.exe -V info
%levainRoot%\bin\deno.exe cache --unstable --reload %levainRoot%\levain.ts
::%levainRoot%\bin\deno.exe bundle --unstable --reload %levainRoot%\levain.ts %levainRoot%\levain.bundle.js
if errorlevel 1 exit /b %ERRORLEVEL%

echo.
echo === Dev Levain - OK
echo.

ENDLOCAL
