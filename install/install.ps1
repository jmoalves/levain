#!/usr/bin/env pwsh
# Inspired by https://deno.land/x/install@v0.1.4/install.ps1
# TODO(everyone): Keep this script simple and easily auditable.

# Example:
# $v="0.80.7";iwr https://raw.githubusercontent.com/jmoalves/levain/master/install/install.ps1 -useb | iex

$ErrorActionPreference = 'Stop'

if ($v) {
  $Version = "${v}"
}
if ($args.Length -eq 1) {
  $Version = $args.Get(0)
}

$LevainHome = if ($env:LEVAIN_HOME) {
  "$env:LEVAIN_HOME"
} else {
  "$HOME\levain"
}

# GitHub requires TLS 1.2
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$LevainUri = if (!$Version) {
  "https://github.com/jmoalves/levain/releases/latest/download/levain-windows-x86_64.zip"
} else {
  "https://github.com/jmoalves/levain/releases/download/v${Version}/levain-windows-x86_64.zip"
}

$TempLevain = "$env:TEMP\levain"
$TempLevainZip = "$TempLevain\levain-v${Version}-windows-x86_64.zip"
$TempLevainDir = "$TempLevain\levain-${Version}"
if (!(Test-Path $TempLevain)) {
  New-Item $TempLevain -ItemType Directory | Out-Null
}

if (!(Test-Path $TempLevainZip)) {
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

& $TempLevainDir\levain.cmd --addRepo https://github.com/jmoalves/levain-pkgs.git install levain
