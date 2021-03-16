@echo off

set PWS=powershell.exe -ExecutionPolicy Bypass -NoLogo -NonInteractive -NoProfile
%PWS% %*
