@echo off
set scriptDir=%~dp0
set levainRoot=%scriptDir%..

pushd %levainRoot%

%levainRoot%\bin\deno -V

:: Check syntax
echo === Syntax check - sources
%levainRoot%\bin\deno check %levainRoot%\levain.ts
if errorlevel 1 goto:eof

echo === Syntax check - tests
%levainRoot%\bin\deno test --no-run
if errorlevel 1 goto:eof

:: Test!
echo.
echo Running tests
@echo on
%levainRoot%\bin\deno test --allow-all %*
@echo off

popd
