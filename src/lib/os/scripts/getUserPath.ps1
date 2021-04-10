$path = Get-ItemProperty -Path HKCU:Environment -Name "PATH"
return $path.Path
