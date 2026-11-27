@echo off

SETLOCAL EnableDelayedExpansion

set "myPath=%~dp0"
set "myPath=%myPath:~0,-1%"
set "levainRoot=%myPath%\.."

set "myDenoDir="
set "buildMode=compile"

:getOpts
if "%~1"=="" goto endGetOpts
if "%~1"=="--" shift & goto endGetOpts

if /I "%~1"=="--denoDir" (
    if "%~2"=="" (
        echo You must inform the denoDir
        exit /b 1
    )

    set "myDenoDir=%~2"
    shift
    shift
    goto getOpts
)

if /I "%~1"=="--bundle" (
    set "buildMode=bundle"
    shift
    goto getOpts
)

:: Invalid option?
set "checkOption=%~1"
if /i "%checkOption:~0,1%"=="-" (
    echo Unknown option %~1
    exit /b 1
)

:endGetOpts

if not defined myDenoDir (
    set "myDenoDir=%levainRoot%\bin"
    echo WARN - Using deno default at !myDenoDir!
)

if not exist "%myDenoDir%" (
    echo Can't find dir %myDenoDir%
    exit /b 1
)

set "myDenoExe=%myDenoDir%\deno.exe"
if not exist "%myDenoExe%" (
    echo We can't find %myDenoExe%
    exit /b 1
)

if not defined DENO_DIR set "DENO_DIR=%myDenoDir%"
echo Deno at %myDenoExe%
"%myDenoExe%" --version
if errorlevel 1 exit /b 1

:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

set "levainOutputDir=%~1"
if not defined levainOutputDir (
    set "levainOutputDir=%levainRoot%\target"
)
for %%I in ("%levainOutputDir%") do set "levainOutputDir=%%~fI"

echo.
echo Building Levain (%buildMode%) at %levainOutputDir%

if exist "%levainOutputDir%" rmdir /q /s "%levainOutputDir%"
mkdir "%levainOutputDir%\build" || exit /b 1

if /I "%buildMode%"=="bundle" (
    :: BUNDLE Levain with official deno.exe (no levain.exe)
    pushd "%levainRoot%"
    "%myDenoExe%" bundle ^
        --platform deno ^
        --packages bundle ^
        --output "%levainOutputDir%\build\levain.bundle.js" ^
        "%levainRoot%\levain.ts"
    set "bundleRc=!ERRORLEVEL!"
    popd
    if !bundleRc! neq 0 exit /b !bundleRc!
    copy /y "%myDenoExe%" "%levainOutputDir%\build\deno.exe" >nul || exit /b 1
) else (
    :: COMPILE Levain
    "%myDenoExe%" compile ^
        --frozen ^
        --allow-all ^
        --target x86_64-pc-windows-msvc ^
        --output "%levainOutputDir%\build\levain.exe" ^
        "%levainRoot%\levain.ts"
    if errorlevel 1 exit /b 1
)

:: Copy auxiliary files
echo.
echo Copying auxiliary files to %levainOutputDir%
xcopy /q   "%levainRoot%\levain.cmd" "%levainOutputDir%\" >nul || exit /b 1
xcopy /q   "%levainRoot%\levain.ps1" "%levainOutputDir%\" >nul || exit /b 1
xcopy /q   "%levainRoot%\levain.sh" "%levainOutputDir%\" >nul || exit /b 1
xcopy /q   "%levainRoot%\LICENSE" "%levainOutputDir%\" >nul || exit /b 1
xcopy /q/s "%levainRoot%\recipes\" "%levainOutputDir%\build\recipes\" >nul || exit /b 1
if exist "%levainRoot%\extra-bin" (
    xcopy /q/s "%levainRoot%\extra-bin\" "%levainOutputDir%\build\extra-bin\" >nul || exit /b 1
)

call "%myPath%\msDefender.cmd" "%levainOutputDir%"
if errorlevel 1 exit /b 1

ENDLOCAL
