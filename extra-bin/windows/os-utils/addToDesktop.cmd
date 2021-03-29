@echo off

set currentFileDir=%~dp0

set TARGET_FILE=%1
set SHORTCUT_DIR=%USERPROFILE%\Desktop
set PWS=powershell.exe -ExecutionPolicy Bypass -NoLogo -NonInteractive -NoProfile
%PWS% -File %currentFileDir%createShortcut.ps1 "%TARGET_FILE%" "%SHORTCUT_DIR%"
exit