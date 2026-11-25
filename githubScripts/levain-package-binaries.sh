#!/bin/bash
set -euo pipefail

levainDir=${1:-}
binZipFile=${2:-}

if [ -z "$levainDir" ] || [ -z "$binZipFile" ]; then
    echo "Usage: $0 <levain-build-dir> <output-zip-file>" >&2
    exit 1
fi

mkdir -p "$(dirname "${binZipFile}")"
zipParentDir="$(cd "$(dirname "${binZipFile}")" && pwd)"
zipBaseName="$(basename "${binZipFile}")"
absZipFile="${zipParentDir}/${zipBaseName}"

if [ ! -d "${levainDir}/extra-bin/windows/7-zip" ] || [ -z "$(ls -A "${levainDir}/extra-bin/windows/7-zip")" ]; then
    echo "Missing or empty extra-bin/windows/7-zip in '${levainDir}'" >&2
    exit 1
fi
if [ ! -d "${levainDir}/extra-bin/windows/git" ] || [ -z "$(ls -A "${levainDir}/extra-bin/windows/git")" ]; then
    echo "Missing or empty extra-bin/windows/git in '${levainDir}'" >&2
    exit 1
fi

# Create Levain extra-bin zip
(
    cd "${levainDir}"
    rm -f "${absZipFile}"
    zip -9r "${absZipFile}" extra-bin >/dev/null
)

(
    cd "${zipParentDir}"
    sha256sum "${zipBaseName}" > "${absZipFile}.sha256"
)

echo
echo "${absZipFile} created"

echo
unzip -l "${absZipFile}"

echo
echo "${absZipFile}.sha256"
cat "${absZipFile}.sha256"
