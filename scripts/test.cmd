@set scriptDir=%~dp0
@set levainRoot=%scriptDir%..
@pushd %levainRoot%
@%levainRoot%\bin\deno -V 
%levainRoot%\bin\deno test --allow-all --unstable %*
@popd
