#!/bin/bash

debug=false
echoErr() { printf "ERR: %s\n" "$*" >&2; }
echoDebug() { $debug && printf "DEBUG: %s\n" "$*" >&2; }

while getopts "o:r:dt:" o; do
case "${o}" in
o)
    owner="${OPTARG}"
    ;;

r)
    repo="${OPTARG}"
    ;;

d)
    debug=true
    ;;

t)
    timeout="${OPTARG}"
    ;;

*)
    echoerr Invalid options
    exit 1
    ;;
esac
done
shift $((OPTIND - 1))

version=$1

echoDebug getRelease - owner...: $owner
echoDebug getRelease - repo....: $repo
echoDebug getRelease - timeout.: $timeout
echoDebug getRelease - version.: $version

# FIXME: Check parameters

# Release url
if [ -n "$version" -a "$version" != "latest" ]; then
    url="https://api.github.com/repos/$owner/$repo/releases/tags/v$version"
    echoDebug getRelease - version $version
else
    url="https://api.github.com/repos/$owner/$repo/releases/latest"
    echoDebug getRelease - version $version
fi

echoDebug getRelease - URL: ${url}

# Release
release=$(curl -ks -X GET ${url} )

if echo $release | grep -qi "Not Found"; then
    echoErr Release $version NOT FOUND at $url
    exit 1
fi

echo $release
