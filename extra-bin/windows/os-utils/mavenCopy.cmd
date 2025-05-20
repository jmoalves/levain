@echo off
if [%2] == [] (
	echo Uso: 
	echo mavenCopy.cmd origem destino
	echo por exemplo:
	echo mavenCopy.cmd br.gov.bndes.iew.iew-for-liberty:iew-userregistry-liberty-feature:1.7.1:esa c:\temp
	exit /b 1
)

@echo on

mvn dependency:copy -Dartifact=%1  -DremoteRepositories=http://nexus.bndes.net:8180/nexus/repository/releases -DoutputDirectory=%2