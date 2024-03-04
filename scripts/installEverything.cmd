@echo off

SETLOCAL EnableDelayedExpansion

set pkgList=
for /f "usebackq tokens=*" %%a in (`powershell "levain list | Select-String -Pattern '^   [a-zA-Z0-9]' | foreach{ $_.ToString().Trim() }"`) do (
    REM Remove packages known to be problematic in headless installation
    REM However, beware they can be installed as dependencies
    set ignore=false
    :: prompt for name, email, etc
    if "%%a" == "git-config" set ignore=true
    :: bug in some eclipse recipes - perhaps they have been removed from mirror
    if "%%a" == "eclipse-2019-12" set ignore=true
    if "%%a" == "eclipse-2020-09" set ignore=true
    if "%%a" == "eclipse-2021-03" set ignore=true
    if "%%a" == "eclipse-2021-06" set ignore=true
    :: access denied
    if "%%a" == "postman" set ignore=true
    :: corrupted file
    if "%%a" == "tomcat-9" set ignore=true

    if not "!ignore!" == "true" set pkgList=!pkgList!%%a 
)

call levain install %pkgList%
set pkgList=

ENDLOCAL
