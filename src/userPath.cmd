@echo off
@setlocal enableextensions enabledelayedexpansion

for /f "usebackq tokens=2,*" %%A in (`reg query HKCU\Environment /v PATH 2^>nul`) do set levainUserPath=%%B

:handleParameter
if "a%1" == "a" goto finished

REM IF path not present, add it
REM https://stackoverflow.com/questions/7005951/batch-file-find-if-substring-is-in-string-not-in-a-file
if "a%levainUserPath%" == "a" set levainUserPath=%1;
set newPath=%1;
CALL SET pathRemoved=%%levainUserPath:%newPath%=%%
if "a%pathRemoved%" == "a%levainUserPath%" set levainUserPath=%1;%levainUserPath%

shift
goto handleParameter

:finished
setx PATH "%levainUserPath%"
