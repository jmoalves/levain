#!/bin/bash

scriptPath="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd && cd - >/dev/null 2>&1 )"

# FIXME: Check parameters
levainVersion=$1
levainDir=$2

## levain
levainRelease=$( bash $scriptPath/github-get-release.sh -o jmoalves -r levain $levainVersion )
if [ -z "$levainRelease" ]; then
  echo ERROR getting levain release ${levainVersion}
  exit 1
fi
levainVersion=$( echo $levainRelease | jq -rc '.tag_name' | sed 's/v//g' )
levainUrl=$( echo $levainRelease | jq -rc '.zipball_url' )

rm -rf ${levainDir}
mkdir -p ${levainDir}

echo Levain ZIP for ${levainVersion} at ${levainUrl}

tempDir=$( mktemp -d )
mkdir -p $tempDir/levain
curl -ks -o ${tempDir}/levain.zip -L $levainUrl
unzip ${tempDir}/levain.zip -d $tempDir/levain >/dev/null
mv $tempDir/levain/jmoalves-levain-*/* ${levainDir}
rm -rf ${tempDir}

echo Levain ${levainVersion} at ${levainDir}
