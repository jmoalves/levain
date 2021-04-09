$newPath=$args[0]
Set-ItemProperty -Path 'HKCU:\Environment' -Name 'Path' -value $newPath