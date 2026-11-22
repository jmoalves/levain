@echo off
if [%2] == [] (
	echo Uso: 
	echo mavenCopy.cmd origem destino
	echo por exemplo:
	echo mavenCopy.cmd com.example:sample-artifact:1.0.0:jar c:\temp
	exit /b 1
)

@echo on

mvn dependency:copy -Dartifact=%1 -DoutputDirectory=%2
