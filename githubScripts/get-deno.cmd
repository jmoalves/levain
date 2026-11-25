@echo off

SETLOCAL

set "denoDST=%~1"
set "denoVersion=%~2"

if not defined denoDST (
    echo Usage: %~nx0 ^<destination-dir^> [deno-version]
    exit /b 1
)

echo.
echo === Deno for Windows - downloading...
set "tempPath=%TEMP%\deno-%RANDOM%%RANDOM%"
if exist "%tempPath%" rmdir /q /s "%tempPath%"
mkdir "%tempPath%"

set "DENO_VERSION=%denoVersion%"
set "DENO_DST=%denoDST%"
set "DENO_ZIP=%tempPath%\deno-x86_64-pc-windows-msvc.zip"

powershell.exe -ExecutionPolicy Bypass -NoLogo -NonInteractive -NoProfile -Command ^
  "$ErrorActionPreference = 'Stop'; $ProgressPreference = 'SilentlyContinue'; " ^
  "[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12; " ^
  "$asset = 'deno-x86_64-pc-windows-msvc.zip'; " ^
  "$ver = $env:DENO_VERSION; " ^
  "if ($ver -and ($ver -notmatch '^[0-9]+\.[0-9]+\.[0-9]+$')) { throw ('Invalid DENO_VERSION: ' + $ver) } " ^
  "$proxyParams = @{}; " ^
  "if ($env:HTTPS_PROXY) { $proxyParams = @{ Proxy = $env:HTTPS_PROXY; ProxyUseDefaultCredentials = $true } } " ^
  "elseif ($env:HTTP_PROXY) { $proxyParams = @{ Proxy = $env:HTTP_PROXY; ProxyUseDefaultCredentials = $true } } " ^
  "$headers = @{ Accept = 'application/vnd.github+json' }; " ^
  "if ($env:GITHUB_TOKEN) { $headers['Authorization'] = 'Bearer ' + $env:GITHUB_TOKEN } " ^
  "$apiUrl = if ($ver) { 'https://api.github.com/repos/denoland/deno/releases/tags/v' + $ver } else { 'https://api.github.com/repos/denoland/deno/releases/latest' }; " ^
  "$digest = $null; $url = $null; " ^
  "try { " ^
  "  $rel = Invoke-RestMethod @proxyParams -Uri $apiUrl -Headers $headers; " ^
  "  $entry = $rel.assets | Where-Object { $_.name -eq $asset } | Select-Object -First 1; " ^
  "  if ($entry) { " ^
  "    if ($entry.browser_download_url) { $url = [string]$entry.browser_download_url } " ^
  "    if ($entry.digest) { $digest = [string]$entry.digest } " ^
  "  } " ^
  "} catch { " ^
  "  if ($env:LEVAIN_ALLOW_UNVERIFIED_DENO -eq '1' -and $ver) { " ^
  "    [Console]::Error.WriteLine('WARN: Could not fetch Deno release metadata; proceeding unverified because LEVAIN_ALLOW_UNVERIFIED_DENO=1'); " ^
  "  } else { throw } " ^
  "} " ^
  "if (-not $url) { " ^
  "  if ($ver) { $url = 'https://github.com/denoland/deno/releases/download/v' + $ver + '/' + $asset } " ^
  "  else { throw 'Could not resolve latest Deno download URL' } " ^
  "} " ^
  "Write-Output ('Downloading Deno from ' + $url); " ^
  "Invoke-WebRequest @proxyParams -Uri $url -OutFile $env:DENO_ZIP -UseBasicParsing; " ^
  "if ($digest) { " ^
  "  if ($digest -notmatch '^sha256:([0-9a-fA-F]{64})$') { throw ('Invalid Deno digest: ' + $digest) } " ^
  "  $expected = $Matches[1].ToUpper(); " ^
  "  $actual = (Get-FileHash -Path $env:DENO_ZIP -Algorithm SHA256).Hash.ToUpper(); " ^
  "  if ($actual -ne $expected) { throw ('Deno SHA-256 mismatch: expected ' + $expected + ', got ' + $actual) } " ^
  "  Write-Output ('Verified Deno SHA-256: ' + $expected); " ^
  "} elseif ($env:LEVAIN_ALLOW_UNVERIFIED_DENO -eq '1') { " ^
  "  [Console]::Error.WriteLine('WARN: Skipping SHA-256 verification because LEVAIN_ALLOW_UNVERIFIED_DENO=1'); " ^
  "} else { " ^
  "  throw ('Missing SHA-256 digest for ' + $asset + ' (set LEVAIN_ALLOW_UNVERIFIED_DENO=1 to bypass locally)'); " ^
  "} " ^
  "Expand-Archive -Path $env:DENO_ZIP -DestinationPath $env:DENO_DST -Force"
if errorlevel 1 (
    if exist "%tempPath%" rmdir /q /s "%tempPath%"
    exit /b 1
)

rmdir /q /s "%tempPath%"

echo === Deno for Windows at %denoDST%
"%denoDST%\deno.exe" --version
if errorlevel 1 exit /b 1

ENDLOCAL
