@echo off
for /f "usebackq tokens=2,*" %%A in (`reg query HKCU\Environment /v PATH`) do set levainUserPath=%%B

:handleParameter
if "a%1" == "a" goto finished
set levainUserPath=%1;%levainUserPath%
shift
goto handleParameter

:finished
setx PATH "%levainUserPath%"
