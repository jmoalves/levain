@echo off

set denoDST=%1

SETLOCAL
set myPath=%~dp0
set myPath=%mypath:~0,-1%

set PWS=powershell.exe -ExecutionPolicy Bypass -NoLogo -NonInteractive -NoProfile

set proxyCfg=
if not "a%HTTP_PROXY%"=="a" set proxyCfg=-ProxyUseDefaultCredentials -Proxy %HTTP_PROXY% 
if not "a%HTTPS_PROXY%"=="a" set proxyCfg=-ProxyUseDefaultCredentials -Proxy %HTTPS_PROXY% 

echo.
echo === Deno for Windows - downloading...
set tempPath=%TEMP%\deno
if exist %tempPath% rmdir /q /s %tempPath%
mkdir %tempPath%

%PWS% Invoke-WebRequest %proxyCfg% https://github.com/denoland/deno/releases/latest/download/deno-x86_64-pc-windows-msvc.zip -OutFile %tempPath%\deno-x86_64-pc-windows-msvc.zip
%PWS% Expand-Archive %tempPath%\deno-x86_64-pc-windows-msvc.zip -DestinationPath %denoDST% -Force
rmdir /q /s %tempPath%

echo === Deno for Windows at %denoDST%\deno
%denoDST%\deno -V info

ENDLOCAL
