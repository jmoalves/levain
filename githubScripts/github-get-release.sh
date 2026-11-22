#!/bin/bash
set -euo pipefail

debug=false
echoErr() { printf "ERR: %s\n" "$*" >&2; }
echoDebug() {
    if $debug; then
        printf "DEBUG: %s\n" "$*" >&2
    fi
}

owner=""
repo=""
timeout=""

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
    echoErr "Invalid options"
    exit 1
    ;;
esac
done
shift $((OPTIND - 1))

version=${1:-}

if [ -z "$owner" ] || [ -z "$repo" ]; then
    echoErr "Both -o <owner> and -r <repo> are required"
    exit 1
fi

echoDebug "getRelease - owner...: $owner"
echoDebug "getRelease - repo....: $repo"
echoDebug "getRelease - timeout.: $timeout"
echoDebug "getRelease - version.: $version"

# Release url
if [ -n "$version" ] && [ "$version" != "latest" ]; then
    url="https://api.github.com/repos/$owner/$repo/releases/tags/v$version"
else
    url="https://api.github.com/repos/$owner/$repo/releases/latest"
fi

echoDebug "getRelease - URL: ${url}"

# Release
if [ -n "${GITHUB_TOKEN:-}" ]; then
    release=$(curl -fsSL -H "Authorization: Bearer ${GITHUB_TOKEN}" -H "Accept: application/vnd.github+json" "${url}") || {
        echoErr "Release ${version:-latest} NOT FOUND or API error at $url"
        exit 1
    }
else
    release=$(curl -fsSL -H "Accept: application/vnd.github+json" "${url}") || {
        echoErr "Release ${version:-latest} NOT FOUND or API error at $url"
        exit 1
    }
fi

printf '%s\n' "$release"
