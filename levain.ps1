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


if ($Args.Count -eq 0) {
    & $levainExe
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
        $script = & $levainExe _activate-machine cmd --shell powershell @activateArgs
        Invoke-Expression ($script -join [Environment]::NewLine)
    }

    default {
        & $levainExe @Args
    }
}