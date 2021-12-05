#!bin/bash

scriptPath="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd && cd - >/dev/null 2>&1 )"

# FIXME: Check parameters
levainVersion=$1
assetFile=$2
contentType=$3

if [ ! -r ${assetFile} ]; then
  echo ERROR Unable to read ${assetFile}
  exit 1
fi

levainRelease=$( bash $scriptPath/github-release.sh -o jmoalves -r levain $levainVersion )
if [ -z "$levainRelease" ]; then
  echo ERROR getting levain release ${levainVersion}
  exit 1
fi

levainAssetsUploadUrl=$(echo $levainRelease | jq -rc '.upload_url' | sed 's/{.*}//')

echo
echo Uploading asset ${assetFile} to $levainAssetsUploadUrl
if ! curl -ks -X POST -u username:$GITHUB_TOKEN \
    -H "Content-Type: ${contentType}" \
    -T ${assetFile} \
    ${levainAssetsUploadUrl}?name=${assetFile}; then
  echo ERROR uploading $assetFile to $levainAssetsUploadUrl
  exit 1
fi
