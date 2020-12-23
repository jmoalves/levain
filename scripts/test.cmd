@set currentFileDir=%~dp0
@pushd %currentFileDir%..
deno test --allow-all --unstable %*
@popd
