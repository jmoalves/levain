@echo off
set currentFileDir=%~dp0
pushd %currentFileDir%..
for /R . %%f in (*.test.ts) do (
    cls
    echo.
    echo === %%f 
    deno test --allow-all --unstable %%f
    if errorlevel 1 pause
)
popd
