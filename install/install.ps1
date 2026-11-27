#!/usr/bin/env pwsh
# Inspired by https://deno.land/x/install@v0.1.4/install.ps1
# TODO(everyone): Keep this script simple and easily auditable.

# Examples:
# iwr https://github.com/jmoalves/levain/releases/latest/download/install.ps1 -UseBasicParsing | iex
# $levainVersion="0.80.7";iwr https://github.com/jmoalves/levain/releases/latest/download/install.ps1 -UseBasicParsing | iex
# $levainBundle="true";iwr https://github.com/jmoalves/levain/releases/latest/download/install.ps1 -UseBasicParsing | iex
# $levainHome="C:\dev-env";iwr https://github.com/jmoalves/levain/releases/latest/download/install.ps1 -UseBasicParsing | iex
# $levainUrlBase="http://nexus.local.net/nexus/repository/github-proxy/jmoalves/levain";iwr http://nexus.local.net/nexus/repository/github-proxy/jmoalves/levain/releases/latest/download/install.ps1 -UseBasicParsing | iex
# $levainRepo="https://gitlab.local.net/grp-dev/levain-pkgs.git";iwr https://github.com/jmoalves/levain/releases/latest/download/install.ps1 -UseBasicParsing | iex

$ErrorActionPreference = 'Stop'

### Parameters
# $levainHome - Optional
# $levainVersion - Optional
# $levainHeadless - Optional
# $levainBundle - Optional (when true, installs the bundled deno.exe + levain.bundle.js package instead of levain.exe)
# $levainUrlBase - Optional
# $levainRepo - Optional
#

if (! $levainHome) {
  $levainHome = "$HOME\levain"
}

if (! $levainRepository) {
  $levainRepository = if ($env:REPOSITORY) {
    $env:REPOSITORY
  } else {
    "jmoalves/levain"
  }
}


if (! $levainUrlBase) {
  $levainUrlBase = "https://github.com/$levainRepository"
}

if (! $levainRepo) {
  $levainRepo = "https://github.com/$levainRepository-pkgs.git"
}

#
###

# GitHub requires TLS 1.2
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$TempLevain = Join-Path $Env:Temp "levain-install-$(New-Guid)"

#######################################################
# Preparation
#

$isBundle = ($levainBundle -eq $true) -or ($levainBundle -is [string] -and $levainBundle -match '^(true|1|yes)$')
$LevainAssetName = if ($isBundle) {
  "levain-bundle-windows-x86_64.zip"
} else {
  "levain-windows-x86_64.zip"
}

$LevainUri = if ($levainVersion) {
  "${levainUrlBase}/releases/download/v${levainVersion}/${LevainAssetName}"
} else {
  "${levainUrlBase}/releases/latest/download/${LevainAssetName}"
}
$LevainUriSHA256 = "$LevainUri.sha256"

$TempLevainZip = "$TempLevain\$LevainAssetName"
$TempLevainSHA256= "$TempLevain\$LevainAssetName.sha256"
$TempLevainDir = "$TempLevain\levain"

if (!(Test-Path $TempLevain)) {
  New-Item $TempLevain -ItemType Directory | Out-Null
}

$installExitCode = 0
try {
  if (Test-Path $TempLevainZip) {
    Remove-Item $TempLevainZip -Force
  }

  $isHeadless = ($levainHeadless -eq $true) -or ($levainHeadless -is [string] -and $levainHeadless -match '^(true|1|yes)$')

  if (-not $isHeadless) {
    Clear-Host
  }

  $variantLabel = if ($isBundle) { " (bundle)" } else { "" }
  if ($levainVersion) {
    Write-Output "=== Installing Levain $levainVersion$variantLabel at $levainHome"
  } else {
    Write-Output "=== Installing latest Levain release$variantLabel at $levainHome"
  }

  #######################################################
  # Download
  #

  Write-Output ""
  Write-Output ""
  Write-Output ""
  Write-Output ""

  Write-Output "Downloading Levain SHA256 from $LevainUriSHA256"
  Invoke-WebRequest $LevainUriSHA256 -OutFile $TempLevainSHA256 -UseBasicParsing

  Write-Output "Downloading Levain from $LevainUri"
  Invoke-WebRequest $LevainUri -OutFile $TempLevainZip -UseBasicParsing

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

  Write-Output ""
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
  $levainInstallArgs = @("--addRepo", "$levainRepo", "--levainHome", "$levainHome")
  if ($isHeadless) {
    $levainInstallArgs += @("--skip-levain-updates", "--skip-auto-clean", "install", "--force", "levain")
  } else {
    $levainInstallArgs += @("install", "--force", "levain")
  }
  & $TempLevainDir\levain.cmd @levainInstallArgs
  $installExitCode = $LASTEXITCODE
} finally {
  #######################################################
  # Cleanup
  #

  if (Test-Path $TempLevain) {
    Write-Output ""
    Write-Output ""
    Write-Output "Removing $TempLevain"
    Remove-Item $TempLevain -Recurse -Force
  }
}

if ($installExitCode -ne 0) {
  throw "Levain installation failed with exit code $installExitCode"
}
