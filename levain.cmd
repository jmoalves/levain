@echo off

set myPath=%~dp0
%myPath%bin\deno.exe -V 
%myPath%bin\deno.exe run ^
    --allow-read --allow-write --allow-env --allow-net --allow-run ^
    --unstable ^
    %myPath%src/levain.ts ^
    %*
