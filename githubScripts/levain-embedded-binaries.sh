#!/bin/bash

scriptPath="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd && cd - >/dev/null 2>&1 )"

# FIXME: Check parameters
levainDir=$1
denoWindowsDir=$2

tempDir=$( mktemp -d )

# Deno embedded
echo Deno embedded
rm -rf ${levainDir}/bin
mkdir -p ${levainDir}/bin
cp $denoWindowsDir/deno.exe ${levainDir}/bin

### Get extra-bin binaries
curlUrl=https://curl.se/windows/dl-7.80.0/curl-7.80.0-win64-mingw.zip

echo curl at ${curlUrl}
curl -ks -o ${tempDir}/curl.zip -L ${curlUrl}

curlDir=${levainDir}/extra-bin/windows/curl
rm -rf ${curlDir}

unzip ${tempDir}/curl.zip -d ${curlDir}
for dir in ${curlDir}/*; do
  cd $dir
  mv -v * ${curlDir}
  cd -
  rmdir $dir
done

rm -rf $tempDir
