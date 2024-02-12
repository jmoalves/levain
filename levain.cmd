@echo off

SETLOCAL

set myPath=%~dp0
:: removing the trailing backslash
set myPath=%myPath:~0,-1%

call:fnRun %*
if "a%ERRORLEVEL%" == "a42" (
    call:fnUpgrade %*
    echo.
    echo After Levain upgrade, please re-execute your previous command.
    echo %0 %*
    echo.
)

exit /b 0


:fnRun

set DENO_NO_UPDATE_CHECK=true
set NO_COLOR=true
%myPath%\bin\levain.exe %*
if errorlevel 1 exit /b %ERRORLEVEL%

goto:eof



:fnUpgrade
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
exit /b 0
