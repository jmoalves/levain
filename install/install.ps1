#!/usr/bin/env pwsh
# Inspired by https://deno.land/x/install@v0.1.4/install.ps1
# TODO(everyone): Keep this script simple and easily auditable.

# Examples:
# iwr https://github.com/jmoalves/levain/releases/latest/download/install.ps1 -useb | iex
# $v="0.80.7";iwr https://github.com/jmoalves/levain/releases/latest/download/install.ps1 -useb | iex
# $levainHome="C:\dev-env";iwr https://github.com/jmoalves/levain/releases/latest/download/install.ps1 -useb | iex
# $repoUrl="https://github.com/jmoalves/levain-pkgs.git";$levainHome="C:\dev-env";iwr https://github.com/jmoalves/levain/releases/latest/download/install.ps1 -useb | iex

$ErrorActionPreference = 'Stop'

if ($v) {
  $Version = "${v}"
}

# GitHub requires TLS 1.2
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

if (!$levainRootUrl) {
  $levainRootUrl="https://github.com/jmoalves/levain/releases"
}
$LevainUri = if (!$Version) {
  "${levainRootUrl}/latest/download/levain-windows-x86_64.zip"
} else {
  "${levainRootUrl}/download/v${Version}/levain-windows-x86_64.zip"
}

$TempLevain = "$env:TEMP\levain"
$TempLevainZip = "$TempLevain\levain-v${Version}-windows-x86_64.zip"
$TempLevainDir = "$TempLevain\levain-${Version}"
if (!(Test-Path $TempLevain)) {
  New-Item $TempLevain -ItemType Directory | Out-Null
}

if (!(Test-Path $TempLevainZip)) {
  Write-Output "Downloading Levain from $LevainUri"
  Invoke-WebRequest $LevainUri -OutFile $TempLevainZip -UseBasicParsing
}

if (!(Test-Path $TempLevainDir)) {
  if (Get-Command Expand-Archive -ErrorAction SilentlyContinue) {
    Expand-Archive $TempLevainZip -Destination $TempLevain -Force
  } else {
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [IO.Compression.ZipFile]::ExtractToDirectory($TempLevainZip, $TempLevain)
  }
}

$opts=
if ($levainHome) {
  $opts="$opts --levainHome $levainHome"
}

if (!$repoUrl) {
  $repoUrl="https://github.com/jmoalves/levain-pkgs.git"
}
$opts="$opts --addRepo $repoUrl"

& $TempLevainDir\levain.cmd $opts install levain
