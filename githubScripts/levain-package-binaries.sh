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

# Create Levain extra-bin zip
(
    cd "${levainDir}"
    rm -f "${absZipFile}"
    zip -9r "${absZipFile}" extra-bin -x "extra-bin/windows/os-utils**" >/dev/null
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
