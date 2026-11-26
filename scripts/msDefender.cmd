@echo off

SETLOCAL

set "myPath=%~dp0"
set "myPath=%myPath:~0,-1%"
set "levainRoot=%myPath%\.."

if "%~1"=="" (
    for %%I in ("%levainRoot%") do set "scanPath=%%~fI"
) else (
    set "scanPath=%~f1"
)

echo.
echo MS Defender - Scanning "%scanPath%"
"%ProgramFiles%\Windows Defender\MpCmdRun.exe" -Scan -ScanType 3 -File "%scanPath%"
exit /b %ERRORLEVEL%
