#!/usr/bin/env pwsh
# Inspired by https://deno.land/x/install@v0.1.4/install.ps1
# TODO(everyone): Keep this script simple and easily auditable.

# Examples:
# iwr https://github.com/jmoalves/levain/releases/latest/download/install.ps1 | iex
# $levainVersion="0.80.7";iwr https://github.com/jmoalves/levain/releases/latest/download/install.ps1 | iex
# $levainHome="C:\dev-env";iwr https://github.com/jmoalves/levain/releases/latest/download/install.ps1 | iex

$ErrorActionPreference = 'Stop'

### Parameters
# $levainHome - Optional
# $levainVersion - Optional
#

if (! $levainHome) {
  $levainHome = "$HOME\levain"
}

#
###

# GitHub requires TLS 1.2
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$TempLevain = Join-Path $Env:Temp "levain-install-$(New-Guid)"

$LevainUri = if ($levainVersion) {
  "https://github.com/jmoalves/levain/releases/download/v${levainVersion}/levain-windows-x86_64.zip"
} else {
  "https://github.com/jmoalves/levain/releases/latest/download/levain-windows-x86_64.zip"
}

$TempLevainZip = "$TempLevain\levain-windows-x86_64.zip"
$TempLevainDir = "$TempLevain\levain"

if (!(Test-Path $TempLevain)) {
  New-Item $TempLevain -ItemType Directory | Out-Null
}

if (Test-Path $TempLevainZip) {
  Remove-Item $TempLevainZip -Force
}

Clear-Host

if ($levainVersion) {
  Write-Output "=== Installing Levain $levainVersion at $levainHome"
} else {
  Write-Output "=== Installing latest Levain release at $levainHome"
}

Write-Output ""
Write-Output ""
Write-Output ""
Write-Output ""
Write-Output ""
Write-Output "Downloading Levain from $LevainUri"
Invoke-WebRequest $LevainUri -OutFile $TempLevainZip -UseBasicParsing

if (Test-Path $TempLevainDir) {
  Remove-Item $TempLevainDir -Recurse -Force
}

Write-Output "Extrating Levain from $TempLevainZip to $TempLevainDir"
if (Get-Command Expand-Archive -ErrorAction SilentlyContinue) {
  Expand-Archive $TempLevainZip -Destination $TempLevainDir -Force
} else {
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  [IO.Compression.ZipFile]::ExtractToDirectory($TempLevainZip, $TempLevainDir)
}

Write-Output ""
Write-Output ""
& $TempLevainDir\levain.cmd --addRepo https://github.com/jmoalves/levain-pkgs.git --levainHome "$levainHome" install levain

if (Test-Path $TempLevain) {
  Write-Output ""
  Write-Output ""
  Write-Output "Removing $TempLevain"
  Remove-Item $TempLevainDir -Recurse -Force
}
