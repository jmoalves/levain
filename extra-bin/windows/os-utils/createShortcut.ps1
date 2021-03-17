write-host "args", $args.count, $args

$powershellVersion = $PSVersionTable.PSVersion
$targetFile = $args[0]
$targetDir = Split-Path -Path $targetFile
$targetFileName = Split-Path -Leaf $targetFile
$shortcutDir = $args[1]
$shortcutFile = "$shortcutDir\$targetFileName.lnk"

write-host "Microsoft PowerShell $powershellVersion"
write-host "params:"
write-host "targetFile", $targetFile
write-host "targetDir", $targetDir
write-host "shortcutDir", $shortcutDir
write-host "shortcutFile", $shortcutFile

if ($powershellVersion -ge [Version]"5.0.0") {
#     $shortcut = $shortcutDir
    $shortcut = $shortcutFile
} else {
    $shortcut = $shortcutFile
}
write-host "shortcut", $shortcut

$ws = New-Object -ComObject WScript.Shell
$s = $ws.CreateShortcut($shortcut)
$s.WorkingDirectory = $targetDir
$s.TargetPath = $targetFile
$s.Save()
exit


