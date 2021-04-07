@echo off

set DIR=%1
set FOLDER_NAME=%2


echo "%*"
echo "%DIR%"
echo "%FOLDER_NAME%"

cd %DIR%
mkdir %FOLDER_NAME%