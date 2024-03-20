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
echo === EXTRA-BIN latest
set binPath=%TEMP%\levain\extra-bin
if exist %binPath% rmdir /q /s %binPath%
mkdir %binPath%

%PWS% Invoke-WebRequest %proxyCfg% https://github.com/jmoalves/levain/releases/latest/download/levain-extra-bin-windows-x86_64.zip -OutFile %binPath%\levain-extra-bin-windows-x86_64.zip

if exist %levainRoot%\extra-bin\windows\7-zip rmdir /q /s %levainRoot%\extra-bin\windows\7-zip
if exist %levainRoot%\extra-bin\windows\git rmdir /q /s %levainRoot%\extra-bin\windows\git
%PWS% Expand-Archive %binPath%\levain-extra-bin-windows-x86_64.zip -DestinationPath %levainRoot%
rmdir /q /s %binPath%

ENDLOCAL
