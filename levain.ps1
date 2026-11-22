param(
    [Parameter(ValueFromRemainingArguments = $true)]
    $Args
)

$scriptDir = Split-Path -Parent $PSCommandPath

if ($env:LEVAIN_EXE -and (Test-Path $env:LEVAIN_EXE -PathType Leaf)) {
    $levainExe = $env:LEVAIN_EXE
}
elseif (Test-Path (Join-Path $scriptDir "build\levain.exe") -PathType Leaf) {
    $levainExe = Join-Path $scriptDir "build\levain.exe"
}
else {
    $levainExe = Join-Path $scriptDir "scripts\levain-deno.cmd"
}


$isDotSourced = ($MyInvocation.InvocationName -eq '.')

if ($Args.Count -eq 0) {
    & $levainExe
    $rc = if ($null -ne $LASTEXITCODE) { [int]$LASTEXITCODE } else { 0 }
    if (-not $isDotSourced) { exit $rc }
    return
}

switch ($Args[0]) {
    "activate" {
        $activateArgs = if ($Args.Count -gt 1) {
            $Args[1..($Args.Count - 1)]
        } else {
            @()
        }
        & $levainExe _activate-machine pre @activateArgs
        if ($LASTEXITCODE -ne 0) {
            $rc = [int]$LASTEXITCODE
            if (-not $isDotSourced) { exit $rc }
            return
        }
        $script = & $levainExe _activate-machine cmd --shell powershell @activateArgs
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
        & $levainExe @Args
    }
}

$rc = if ($null -ne $LASTEXITCODE) { [int]$LASTEXITCODE } else { 0 }
if (-not $isDotSourced) { exit $rc }
return