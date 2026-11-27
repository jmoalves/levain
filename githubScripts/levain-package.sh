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

# Copy runtime artifact SHA256 files (compiled levain.exe or bundled deno.exe + levain.bundle.js)
copiedSha=0
for shaFile in levain.exe.sha256 deno.exe.sha256 levain.bundle.js.sha256; do
    if [ -f "${levainDir}/build/${shaFile}" ]; then
        cp -v "${levainDir}/build/${shaFile}" "${zipParentDir}/"
        copiedSha=$((copiedSha + 1))
    fi
done
if [ "$copiedSha" -eq 0 ]; then
    echo "ERROR: No build SHA256 checksum file found in '${levainDir}/build'" >&2
    exit 1
fi

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
