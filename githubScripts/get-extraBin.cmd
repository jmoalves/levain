@echo off

SETLOCAL

set "myPath=%~dp0"
set "myPath=%myPath:~0,-1%"
set "levainRoot=%myPath%\.."

if not exist "%levainRoot%\bin" (
    mkdir "%levainRoot%\bin"
)

set "REPO_SLUG=%LEVAIN_REPOSITORY%"
if not defined REPO_SLUG set "REPO_SLUG=%GITHUB_REPOSITORY%"
if not defined REPO_SLUG set "REPO_SLUG=jmoalves/levain"

echo.
echo === EXTRA-BIN latest
set "binPath=%TEMP%\levain\extra-bin-%RANDOM%%RANDOM%"
if exist "%binPath%" rmdir /q /s "%binPath%"
mkdir "%binPath%"

set "EXTRA_BIN_ZIP=%binPath%\levain-extra-bin-windows-x86_64.zip"
set "EXTRA_BIN_SHA=%binPath%\levain-extra-bin-windows-x86_64.zip.sha256"

powershell.exe -ExecutionPolicy Bypass -NoLogo -NonInteractive -NoProfile -Command ^
  "$ErrorActionPreference = 'Stop'; $ProgressPreference = 'SilentlyContinue'; " ^
  "[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12; " ^
  "$slug = $env:REPO_SLUG; " ^
  "if ($slug -notmatch '^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$') { throw ('Invalid repository slug: ' + $slug) } " ^
  "$url = 'https://github.com/' + $slug + '/releases/latest/download/levain-extra-bin-windows-x86_64.zip'; " ^
  "$proxyParams = @{}; " ^
  "if ($env:HTTPS_PROXY) { $proxyParams = @{ Proxy = $env:HTTPS_PROXY; ProxyUseDefaultCredentials = $true } } " ^
  "elseif ($env:HTTP_PROXY) { $proxyParams = @{ Proxy = $env:HTTP_PROXY; ProxyUseDefaultCredentials = $true } } " ^
  "Write-Output ('Downloading extra-bin from ' + $url); " ^
  "Invoke-WebRequest @proxyParams -Uri $url -OutFile $env:EXTRA_BIN_ZIP -UseBasicParsing; " ^
  "Invoke-WebRequest @proxyParams -Uri ($url + '.sha256') -OutFile $env:EXTRA_BIN_SHA -UseBasicParsing; " ^
  "$expected = ((Get-Content -Path $env:EXTRA_BIN_SHA -TotalCount 1).Trim() -split '\s+')[0].ToUpper(); " ^
  "if ($expected -notmatch '^[0-9A-F]{64}$') { throw ('Invalid extra-bin SHA-256 file contents: ' + $expected) } " ^
  "$actual = (Get-FileHash -Path $env:EXTRA_BIN_ZIP -Algorithm SHA256).Hash.ToUpper(); " ^
  "if ($actual -ne $expected) { throw ('extra-bin SHA-256 mismatch: expected ' + $expected + ', got ' + $actual) } " ^
  "Write-Output ('Verified extra-bin SHA-256: ' + $expected)"
if errorlevel 1 (
    if exist "%binPath%" rmdir /q /s "%binPath%"
    exit /b 1
)

if exist "%levainRoot%\extra-bin\windows\7-zip" rmdir /q /s "%levainRoot%\extra-bin\windows\7-zip"
if exist "%levainRoot%\extra-bin\windows\git" rmdir /q /s "%levainRoot%\extra-bin\windows\git"

set "LEVAIN_ROOT=%levainRoot%"
powershell.exe -ExecutionPolicy Bypass -NoLogo -NonInteractive -NoProfile -Command ^
  "$ErrorActionPreference = 'Stop'; $ProgressPreference = 'SilentlyContinue'; " ^
  "Expand-Archive -Path $env:EXTRA_BIN_ZIP -DestinationPath $env:LEVAIN_ROOT -Force"
if errorlevel 1 (
    if exist "%binPath%" rmdir /q /s "%binPath%"
    exit /b 1
)

rmdir /q /s "%binPath%"

ENDLOCAL
