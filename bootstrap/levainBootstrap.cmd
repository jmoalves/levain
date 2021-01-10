@echo off
set currentFileDir=%~dp0

set levainVersion=%1
if "a%levainVersion%" == "a" (
    echo.
    echo Inform the levain version
    exit /b 1
)
shift


REM FIXME: Allways expand?
if not exist %TEMP%\levain-%levainVersion%\levain.cmd (
    call:fnExpandLevain %levainVersion%
)

if not exist %TEMP%\levain-%levainVersion%\levain.cmd (
    echo.
    echo No levain %levainVersion% found 
    exit /b 1
)

set args=
:getArgs
if not "a%1" == "a" set args=%args% %1& shift & goto getArgs

pushd %TEMP%\levain-%levainVersion%
call %TEMP%\levain-%levainVersion%\levain.cmd %args%
popd
goto:eof



:fnExpandLevain
set levainVersion=%1

set levainPath=%currentFileDir%

set file=
for %%i in (%levainPath%\levain-v%levainVersion%-*windows-x86_64.zip) do set file=%%i

if "a%file%" == "a" (
    echo.
    echo No levain zip found for %levainVersion% in %levainPath%
    exit /b 1
)

rem powershell.exe -nologo -noprofile -command "& { Expand-Archive -Force -LiteralPath %file% -DestinationPath %TEMP% }"
echo Unzipping Levain %currentFileDir%\extra-bin\windows\7z.exe x %file% -o%TEMP%
%currentFileDir%\extra-bin\windows\7z.exe x %file% -o%TEMP%

goto:eof
