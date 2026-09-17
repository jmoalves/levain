@echo off


set myPath=%~dp0
:: removing the trailing backslash
set myPath=%myPath:~0,-1%

set "levainExe="
set "levainCall="

:: 1. Use LEVAIN_EXE if it is defined and exists
if defined LEVAIN_EXE if exist "%LEVAIN_EXE%" (
    set "levainExe=%LEVAIN_EXE%"
)

:: 2. Otherwise use the bundled executable if it exists
if not defined levainExe if exist "%myPath%\build\levain.exe" (
    set "levainExe=%myPath%\build\levain.exe"
)

:: 3. Otherwise fall back to the Deno launcher
if not defined levainExe (
    set "levainExe=%myPath%\scripts\levain-deno.cmd"
    set "levainCall=call "
)

if /I "%~1"=="activate" (
    call :fnActivate %*
    exit /b %ERRORLEVEL%
)

call :fnRun %*
SETLOCAL
set rc=%ERRORLEVEL%
if "%rc%"=="42" (
    call :fnUpgrade %*
    echo.
    echo After Levain upgrade, please re-execute your previous command.
    echo %0 %*
    echo.
    exit /b 0
)
ENDLOCAL
exit /b %rc%



:fnRun
SETLOCAL
set DENO_NO_UPDATE_CHECK=true
set NO_COLOR=true
set DENO_DIR=%myPath%\build
%levainCall%"%levainExe%" %*
if errorlevel 1 exit /b %ERRORLEVEL%
ENDLOCAL
goto:eof



:fnUpgrade
SETLOCAL
echo.
echo LEVAIN UPGRADE!
echo.
for /d %%l in ( %TEMP%\levain\levain-* ) do (
    set levainDir=%%l
)

if "a%levainDir%" == "a" (
    echo.
    echo No new version found
    exit /b 1
)

START /max "Levain Upgrade" CMD /c %levainDir%\levain.cmd --levainHome=%myPath%\.. --levain-upgrade %*
ENDLOCAL
exit /b 0



:fnActivate
for /d %%l in ( %TEMP%\levain\levain-* ) do (
    set levainDir=%%l
)
set "_LEV_TMP=%TEMP%\levain-%RANDOM%%RANDOM%.cmd"

set DENO_NO_UPDATE_CHECK=true
set NO_COLOR=true
set DENO_DIR=%myPath%\build

set "SKIP_PRE="
for %%A in (%*) do (
    if /I "%%~A"=="--skip-pre" set "SKIP_PRE=1"
)

if not defined SKIP_PRE (
    %levainCall%"%levainExe%" _activate-machine pre %2 %3 %4 %5 %6 %7 %8 %9
)
%levainCall%"%levainExe%" _activate-machine cmd --shell cmd %2 %3 %4 %5 %6 %7 %8 %9 > "%_LEV_TMP%"
if errorlevel 1 (
    del "%_LEV_TMP%" >nul 2>&1
    exit /b %ERRORLEVEL%
)

call "%_LEV_TMP%"
set rc=%ERRORLEVEL%

del "%_LEV_TMP%" >nul 2>&1

exit /b %rc%
