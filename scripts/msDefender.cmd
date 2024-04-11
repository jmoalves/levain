@echo off

set myPath=%~dp0
set myPath=%mypath:~0,-1%
set levainRoot=%myPath%\..

set scanPath=%1
if "a%scanPath%" == "a" set scanPath=%levainRoot%

echo.
echo MS Defender - Scanning %scanPath%
"%ProgramFiles%\Windows Defender\MpCmdRun.exe" -Scan -ScanType 3 -File %scanPath%
