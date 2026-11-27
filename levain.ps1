param(
    [Parameter(ValueFromRemainingArguments = $true)]
    $Args
)

$scriptDir = Split-Path -Parent $PSCommandPath

$levainPreArgs = @()
if ($env:LEVAIN_EXE -and (Test-Path $env:LEVAIN_EXE -PathType Leaf)) {
    $levainExe = $env:LEVAIN_EXE
}
elseif (Test-Path (Join-Path $scriptDir "build\levain.exe") -PathType Leaf) {
    $levainExe = Join-Path $scriptDir "build\levain.exe"
}
elseif ((Test-Path (Join-Path $scriptDir "build\deno.exe") -PathType Leaf) -and (Test-Path (Join-Path $scriptDir "build\levain.bundle.js") -PathType Leaf)) {
    $levainExe = Join-Path $scriptDir "build\deno.exe"
    $levainPreArgs = @(
        "run",
        "--no-check",
        "--cached-only",
        "--allow-all",
        (Join-Path $scriptDir "build\levain.bundle.js"),
        "--is_bundled_js"
    )
}
else {
    $levainExe = Join-Path $scriptDir "scripts\levain-deno.cmd"
}

function Invoke-LevainRuntime {
    param([string[]]$RuntimeArgs = @())
    $prevUpdateCheck = $env:DENO_NO_UPDATE_CHECK
    $env:DENO_NO_UPDATE_CHECK = "true"
    try {
        & $levainExe @levainPreArgs @RuntimeArgs
    } finally {
        if ($null -eq $prevUpdateCheck) {
            Remove-Item Env:DENO_NO_UPDATE_CHECK -ErrorAction SilentlyContinue
        } else {
            $env:DENO_NO_UPDATE_CHECK = $prevUpdateCheck
        }
    }
}


$isDotSourced = ($MyInvocation.InvocationName -eq '.')

function Invoke-LevainUpgrade {
    param([string]$BaseDir)
    Write-Host ""
    Write-Host "LEVAIN UPGRADE!"
    Write-Host ""

    $levainDir = $null
    $upgradeTargetFile = Join-Path $env:TEMP "levain\upgrade-target.txt"
    if (Test-Path $upgradeTargetFile -PathType Leaf) {
        $lines = Get-Content $upgradeTargetFile -ErrorAction SilentlyContinue
        foreach ($line in $lines) {
            $trimmed = $line.Trim()
            if ($trimmed -match '^levain-[0-9]+\.[0-9]+\.[0-9]+$') {
                $candidate = Join-Path (Join-Path $env:TEMP "levain") $trimmed
                if (Test-Path (Join-Path $candidate "levain.cmd") -PathType Leaf) {
                    $levainDir = $candidate
                    break
                }
            }
        }
        Remove-Item $upgradeTargetFile -Force -ErrorAction SilentlyContinue
    }

    if (-not $levainDir) {
        Write-Host ""
        Write-Host "No new version found"
        return 1
    }

    $upgradeCmd = Join-Path $levainDir "levain.cmd"
    $upgradeHome = Split-Path -Parent $BaseDir
    Start-Process -FilePath "cmd.exe" -WindowStyle Maximized -ArgumentList @(
        "/c",
        "`"`"$upgradeCmd`" `"--levainHome=$upgradeHome`" --levain-upgrade`""
    )
    Write-Host ""
    Write-Host "After Levain upgrade, please re-execute your previous command."
    Write-Host ""
    return 0
}

if ($Args.Count -eq 0) {
    Invoke-LevainRuntime
    $rc = if ($null -ne $LASTEXITCODE) { [int]$LASTEXITCODE } else { 0 }
    if ($rc -eq 42) {
        $rc = Invoke-LevainUpgrade -BaseDir $scriptDir
    }
    if (-not $isDotSourced) { exit $rc }
    return
}

switch ($Args[0]) {
    "activate" {
        $rawActivateArgs = if ($Args.Count -gt 1) {
            $Args[1..($Args.Count - 1)]
        } else {
            @()
        }
        if ($rawActivateArgs -contains "--help" -or $rawActivateArgs -contains "-h") {
            Invoke-LevainRuntime -RuntimeArgs $Args
            break
        }
        $skipPre = $false
        $activateArgs = @()
        foreach ($arg in $rawActivateArgs) {
            if ($arg -ieq "--skip-pre") {
                $skipPre = $true
            } else {
                $activateArgs += $arg
            }
        }
        if (-not $skipPre) {
            Invoke-LevainRuntime -RuntimeArgs (@("_activate-machine", "pre") + $activateArgs)
            if ($LASTEXITCODE -eq 42) {
                $rc = Invoke-LevainUpgrade -BaseDir $scriptDir
                if (-not $isDotSourced) { exit $rc }
                return
            }
            if ($LASTEXITCODE -ne 0) {
                $rc = [int]$LASTEXITCODE
                if (-not $isDotSourced) { exit $rc }
                return
            }
        }
        $script = Invoke-LevainRuntime -RuntimeArgs (@("_activate-machine", "cmd", "--shell", "powershell") + $activateArgs)
        if ($LASTEXITCODE -ne 0) {
            $rc = [int]$LASTEXITCODE
            if (-not $isDotSourced) { exit $rc }
            return
        }
        if ($script) {
            Invoke-Expression ($script -join [Environment]::NewLine)
        }
    }

    default {
        Invoke-LevainRuntime -RuntimeArgs $Args
        if ($LASTEXITCODE -eq 42) {
            $rc = Invoke-LevainUpgrade -BaseDir $scriptDir
            if (-not $isDotSourced) { exit $rc }
            return
        }
    }
}

$rc = if ($null -ne $LASTEXITCODE) { [int]$LASTEXITCODE } else { 0 }
if (-not $isDotSourced) { exit $rc }
return