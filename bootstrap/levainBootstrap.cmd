@echo off

:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
:: Levain - bootstrap
:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

SETLOCAL

set currentFileDir=%~dp0
:: removing the trailing backslash
set currentFileDir=%currentFileDir:~0,-1%

set levainVersion=%1
if "a%levainVersion%" == "a" (
    echo.
    echo Inform the levain version
    exit /b 1
)
shift

set levainUrl=
if /I "a%1" == "a--levainUrl" (
    if not "a%2" == "a" set levainUrl=%2& shift & shift
)


:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
set tempDir=%TEMP%\levain
set levainDir=%tempDir%\levain-%levainVersion%
set levainCMD=%levainDir%\levain.cmd
set levainZipFile=levain-v%levainVersion%-windows-x86_64.zip

if not exist %tempDir% mkdir %tempDir%

call:fnGetLevainZip
if errorlevel 1 exit /b %ERRORLEVEL%

call:fnExpandLevainZip
if errorlevel 1 exit /b %ERRORLEVEL%

set args=
:getArgs
if not "a%1" == "a" set args=%args% %1& shift & goto getArgs

pushd %levainDir%
call %levainCMD% %args%
popd
goto:eof


:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
:: Get Levain
::
:fnGetLevainZip

:: Is Levain already available?
if exist %levainCMD% goto:eof

:: tempDir should appear last
for %%d in (%currentFileDir% %tempDir%) do (
    set levainZipPath=%%d
    :: Is Levain zip already available?
    echo CHECK - %%d\%levainZipFile%
    if exist %%d\%levainZipFile% exit /b 0
)

if "a%levainUrl%" == "a" (
    echo.
    echo.
    echo ========================================
    echo.
    echo ERROR: You must inform the url if you want we download the Levain zip file
    echo.
    echo ========================================
    exit /b 1

)

:: Download Levain Zip
set url=%levainUrl%/download/v%levainVersion%/%levainZipFile%
echo Downloading Levain zip from %url%
%currentFileDir%\extra-bin\windows\curl\bin\curl.exe -L -f %url% -o%levainZipPath%\%levainZipFile%
if errorlevel 1 (
    echo.
    echo.
    echo ========================================
    echo.
    echo ERROR: No Levain Zip found at %url%
    echo.
    echo ========================================
    exit /b 1
)

goto:eof


:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
:: Expand Levain
::
:fnExpandLevainZip

:: Is Levain already available?
if exist %levainCMD% goto:eof

:: Do we have the Levain Zip?
if not exist %levainZipPath%\%levainZipFile% (
    echo.
    echo.
    echo ========================================
    echo.
    echo ERROR: No levain zip found for %levainVersion% in %levainZipPath%\%levainZipFile%
    echo.
    echo ========================================
    echo.
    exit /b 1
)

:: Expand Levain Zip
REM powershell.exe -nologo -noprofile -command "& { Expand-Archive -Force -LiteralPath %levainZipPath%\%levainZipFile% -DestinationPath %tempDir% }"
echo Extracting Levain zip %levainZipPath%\%levainZipFile% to %tempDir%
%currentFileDir%\extra-bin\windows\7-Zip\7z.exe x %levainZipPath%\%levainZipFile% -o%tempDir%
if errorlevel 1 (
    echo.
    echo.
    echo ========================================
    echo.
    echo ERROR: Could not extract Levain zip %levainZipPath%\%levainZipFile% to %tempDir%
    echo.
    echo ========================================
    exit /b 1
)

goto:eof
