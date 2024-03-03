#!/usr/bin/env pwsh
# Inspired by https://deno.land/x/install@v0.1.4/install.ps1
# TODO(everyone): Keep this script simple and easily auditable.

# Examples:
# iwr https://github.com/jmoalves/levain/releases/latest/download/install.ps1 | iex
# $levainVersion="0.80.7";iwr https://github.com/jmoalves/levain/releases/latest/download/install.ps1 | iex
# $levainHome="C:\dev-env";iwr https://github.com/jmoalves/levain/releases/latest/download/install.ps1 | iex
# $levainUrlBase="http://nexus.local.net/nexus/repository/github-proxy/jmoalves/levain";iwr http://nexus.local.net/nexus/repository/github-proxy/jmoalves/levain/releases/latest/download/install.ps1 | iex
# $levainRepo="https://gitlab.local.net/grp-dev/levain-pkgs.git";iwr https://github.com/jmoalves/levain/releases/latest/download/install.ps1 | iex

$ErrorActionPreference = 'Stop'

### Parameters
# $levainHome - Optional
# $levainVersion - Optional
# $levainHeadless - Optional
# $levainUrlBase - Optional
# $levainRepo - Optional
#

if (! $levainHome) {
  $levainHome = "$HOME\levain"
}

if (! $levainUrlBase) {
  $levainUrlBase = "https://github.com/jmoalves/levain"
}

if (! $levainRepo) {
  $levainRepo = "https://github.com/jmoalves/levain-pkgs.git"
}

#
###

# GitHub requires TLS 1.2
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$TempLevain = Join-Path $Env:Temp "levain-install-$(New-Guid)"

#######################################################
# Preparation
#

$LevainUri = if ($levainVersion) {
  "${levainUrlBase}/releases/download/v${levainVersion}/levain-windows-x86_64.zip"
} else {
  "${levainUrlBase}/releases/latest/download/levain-windows-x86_64.zip"
}
$LevainUriSHA256 = "$LevainUri.sha256"

$TempLevainZip = "$TempLevain\levain-windows-x86_64.zip"
$TempLevainSHA256= "$TempLevain\levain-windows-x86_64.zip.sha256"
$TempLevainDir = "$TempLevain\levain"

if (!(Test-Path $TempLevain)) {
  New-Item $TempLevain -ItemType Directory | Out-Null
}

if (Test-Path $TempLevainZip) {
  Remove-Item $TempLevainZip -Force
}

if (! $levainHeadless) {
  Clear-Host
}

if ($levainVersion) {
  Write-Output "=== Installing Levain $levainVersion at $levainHome"
} else {
  Write-Output "=== Installing latest Levain release at $levainHome"
}

#######################################################
# Download
#

Write-Output ""
Write-Output ""
Write-Output ""
Write-Output ""
Write-Output ""
Write-Output "Downloading Levain from $LevainUri"
Invoke-WebRequest $LevainUri -OutFile $TempLevainZip -UseBasicParsing

Write-Output "Downloading Levain SHA256 from $LevainUriSHA256"
Invoke-WebRequest $LevainUriSHA256 -OutFile $TempLevainSHA256 -UseBasicParsing

$expectedHash=(Get-Content $TempLevainSHA256 -Delimiter ' ' -TotalCount 1).ToUpper().Trim()
$actualHash=(Get-FileHash $TempLevainZip).Hash.ToUpper().Trim()

if ($actualHash -ne $expectedHash) {
  Write-Output ""
  throw 'DOWNLOAD FAILED - Wrong checksum'
}

#######################################################
# Extract
#

if (Test-Path $TempLevainDir) {
  Remove-Item $TempLevainDir -Recurse -Force
}

Write-Output "Extracting Levain from $TempLevainZip to $TempLevainDir"
if (Get-Command Expand-Archive -ErrorAction SilentlyContinue) {
  Expand-Archive $TempLevainZip -Destination $TempLevainDir -Force
} else {
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  [IO.Compression.ZipFile]::ExtractToDirectory($TempLevainZip, $TempLevainDir)
}

#######################################################
# Levain install
#

Write-Output ""
Write-Output ""
& $TempLevainDir\levain.cmd --addRepo "$levainRepo" --levainHome "$levainHome" install levain

#######################################################
# Cleanup
#

if (Test-Path $TempLevain) {
  Write-Output ""
  Write-Output ""
  Write-Output "Removing $TempLevain"
  Remove-Item $TempLevainDir -Recurse -Force
}
