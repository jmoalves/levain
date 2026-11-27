@echo off


set "myPath=%~dp0"
:: removing the trailing backslash
set "myPath=%myPath:~0,-1%"

set "levainExe="
set "levainCall="
set "levainBundle="

:: 1. Use LEVAIN_EXE if it is defined and exists
if defined LEVAIN_EXE if exist "%LEVAIN_EXE%" (
    set "levainExe=%LEVAIN_EXE%"
)

:: 2. Otherwise use the bundled executable if it exists
if not defined levainExe if exist "%myPath%\build\levain.exe" (
    set "levainExe=%myPath%\build\levain.exe"
)

:: 3. Otherwise use the official Deno runtime with the bundled JS release if it exists
if not defined levainExe if exist "%myPath%\build\deno.exe" if exist "%myPath%\build\levain.bundle.js" (
    set "levainExe=%myPath%\build\deno.exe"
    set "levainBundle=%myPath%\build\levain.bundle.js"
)

:: 4. Otherwise fall back to the Deno launcher
if not defined levainExe (
    set "levainExe=%myPath%\scripts\levain-deno.cmd"
    set "levainCall=call "
)

if /I "%~1"=="activate" goto :fnActivate

call :fnRun %*
SETLOCAL
set "rc=%ERRORLEVEL%"
if "%rc%"=="42" (
    call :fnUpgrade
    if errorlevel 1 (
        ENDLOCAL & exit /b 1
    )
    echo.
    echo After Levain upgrade, please re-execute your previous command.
    echo %0 %*
    echo.
    ENDLOCAL & exit /b 0
)
ENDLOCAL & exit /b %rc%



:fnRun
SETLOCAL
set "DENO_NO_UPDATE_CHECK=true"
set "NO_COLOR=true"
if defined levainBundle (
    "%levainExe%" run --no-check --cached-only --allow-all "%levainBundle%" --is_bundled_js %*
) else (
    set "DENO_DIR=%myPath%\build"
    %levainCall%"%levainExe%" %*
)
set "runRc=%ERRORLEVEL%"
ENDLOCAL & exit /b %runRc%



:fnUpgrade
SETLOCAL
echo.
echo LEVAIN UPGRADE!
echo.
set "levainDir="
set "upgradeTargetFile=%TEMP%\levain\upgrade-target.txt"
if exist "%upgradeTargetFile%" (
    for /f "usebackq delims=" %%v in (`findstr /R /X "levain-[0-9][0-9]*\.[0-9][0-9]*\.[0-9][0-9]*" "%upgradeTargetFile%" 2^>nul`) do (
        if not defined levainDir if exist "%TEMP%\levain\%%v\levain.cmd" (
            set "levainDir=%TEMP%\levain\%%v"
        )
    )
    del "%upgradeTargetFile%" >nul 2>&1
)

if not defined levainDir (
    echo.
    echo No new version found
    ENDLOCAL & exit /b 1
)

set "LEVAIN_UPGRADE_CMD=%levainDir%\levain.cmd"
set "LEVAIN_UPGRADE_HOME=%myPath%\.."
START /max "Levain Upgrade" CMD /c ""%%LEVAIN_UPGRADE_CMD%%" "--levainHome=%%LEVAIN_UPGRADE_HOME%%" --levain-upgrade"
ENDLOCAL & exit /b 0



:fnActivate
set "_LEV_TMP=%TEMP%\levain-%RANDOM%%RANDOM%.cmd"
set "SKIP_PRE="
set "_LEV_ARGS="
set "_LEV_HELP="
shift
:fnActivateArgs
if "%~1"=="" goto :fnActivateRun
if /I "%~1"=="--help" set "_LEV_HELP=1"
if /I "%~1"=="-h" set "_LEV_HELP=1"
if /I "%~1"=="--skip-pre" (
    set "SKIP_PRE=1"
    shift
    goto :fnActivateArgs
)
set _LEV_ARGS=%_LEV_ARGS% "%~1"
shift
goto :fnActivateArgs

:fnActivateRun
if defined _LEV_HELP (
    call :fnRun activate%_LEV_ARGS%
    goto :fnActivateDone
)
if defined SKIP_PRE goto :fnActivateCmd
call :fnRun _activate-machine pre%_LEV_ARGS%
if errorlevel 1 goto :fnActivateDone

:fnActivateCmd
call :fnRun _activate-machine cmd --shell cmd%_LEV_ARGS% > "%_LEV_TMP%"
if errorlevel 1 goto :fnActivateDone

call "%_LEV_TMP%"

:fnActivateDone
call :fnActivateCleanup %ERRORLEVEL%
exit /b %ERRORLEVEL%

:fnActivateCleanup
if exist "%_LEV_TMP%" del "%_LEV_TMP%" >nul 2>&1
set "SKIP_PRE="
set "_LEV_ARGS="
set "_LEV_HELP="
set "_LEV_TMP="
exit /b %~1
