@echo off

SETLOCAL

set myPath=%~dp0

set denoPath=%myPath%bin\
if "a%myPath%" == "a" set denoPath=
if not "a%denoPath%" == "a" (
    if not exist %denoPath%deno.exe set denoPath=
)

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
:::::::::::::::::::::::::::::
:: FIXME: Use levain bundle
:::::::::::::::::::::::::::::

echo.
echo Running %myPath%src\levain.ts
set NO_COLOR=true
set DENO_DIR=%denoPath%
%denoPath%deno.exe run ^
    --no-check ^
    --allow-read --allow-write --allow-env --allow-net --allow-run ^
    --unstable ^
    %myPath%src\levain.ts ^
    %*
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

START /max "Levain Upgrade" CMD /c %levainDir%\levain.cmd --levainHome=%myPath%.. --levain-upgrade %*
exit /b 0
