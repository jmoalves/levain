#!/bin/bash
set -euo pipefail

levainDir=${1:-}
levainZipFile=${2:-}
strip=${3:-}

if [ -z "$levainDir" ] || [ -z "$levainZipFile" ]; then
    echo "Usage: $0 <levain-dir> <output-zip-file> [STRIP]" >&2
    exit 1
fi

mkdir -p "$(dirname "${levainZipFile}")"
zipParentDir="$(cd "$(dirname "${levainZipFile}")" && pwd)"
zipBaseName="$(basename "${levainZipFile}")"
absZipFile="${zipParentDir}/${zipBaseName}"

# Copy levain.exe SHA256
cp -v "${levainDir}/build/levain.exe.sha256" "${zipParentDir}/"

# Create Levain zip
rm -f "${absZipFile}"
if [ -z "$strip" ]; then
    (
        cd "$(dirname "${levainDir}")"
        zip -9r "${absZipFile}" "$(basename "${levainDir}")" >/dev/null
    )
else
    (
        cd "${levainDir}"
        zip -9r "${absZipFile}" . >/dev/null
    )
fi

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
