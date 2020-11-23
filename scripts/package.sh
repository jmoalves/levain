#!/bin/bash

getRelease() {
  while getopts "o:r:t:" o; do
    case "${o}" in
    o)
      owner="${OPTARG}"
      ;;
    r)
      repo="${OPTARG}"
      ;;
    t)
      token="${OPTARG}"
      ;;

    *)
      echo Invalid options
      exit 1
      ;;
    esac
  done
  shift $((OPTIND - 1))

  version=$1
  # TODO: Check parameters

  # Token
  tokenOpt=
  if [ -n "$token" ]; then
    tokenOpt="-u username:$token"
  fi

  # Release url
  url="https://api.github.com/repos/$owner/$repo/releases/latest"
  if [ -n "$version" ]; then
    url=$(
      curl -ks $tokenOpt -X GET "https://api.github.com/repos/$owner/$repo/releases" |
        $jqBin -rc ".[] | select( .tag_name == \"v${version}\" ) | .url"
    )
  fi

  # Release
  echo $(curl -ks $tokenOpt -X GET ${url})
}

clear

levainVersion=$1
denoVersion=$2

if [ -z "$levainVersion" ]; then
  # We don't have a latest release yet...
  echo You must inform the levain version
  exit 1
fi

tokenFile=$HOME/.githubToken
githubToken=$(cat $tokenFile)

if [ -z "$githubToken" ]; then
  echo You must inform the github token
  exit 1
fi

echo Packaging "$@"

# Check JQ
if $(jq --help >/dev/null); then
  jqBin='jq'
elif $(jq-win64 --help >/dev/null); then
  jqBin='jq-win64'
else
  echo jq-win64 and jq NOT FOUND
  exit 1
fi
echo using $jqBin

# Check Zip
if $(zip -h >/dev/null); then
  zipBin='zip'
else
  zipBin="${myRoot}/extra-bin/windows/7z.exe"
fi
echo using $zipBin

myPath="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
cd $myPath/..
myRoot=$(pwd)

tag=v${levainVersion}

# Windows dist
distRoot=dist/windows
rm -rf ${distRoot}
mkdir -p ${distRoot}

## levain
levainRelease=$(getRelease -o jmoalves -r levain -t $githubToken $levainVersion)
levainVersion=$(echo $levainRelease | $jqBin -rc '.tag_name' | sed 's/v//g')
levainUrl=$(echo $levainRelease | $jqBin -rc '.zipball_url')

distDir=${distRoot}/levain-${levainVersion}
mkdir -p ${distDir}

echo Levain ${levainVersion} at ${levainUrl}
curl -ks -u username:$githubToken -o ${distDir}/levain.zip -L $levainUrl
unzip ${distDir}/levain.zip -d ${distDir} >/dev/null
mv ${distDir}/jmoalves-levain-*/* ${distDir}

### levain cleanup
rm -rf ${distDir}/scripts
rm ${distDir}/levain.zip
rm -rf ${distDir}/jmoalves-levain-*

## Deno bin
denoRelease=$(getRelease -o denoland -r deno $denoVersion)
denoVersion=$(echo $denoRelease | $jqBin -rc '.tag_name' | sed 's/v//g')
denoWindowsUrl=$(echo $denoRelease | $jqBin -rc '.assets|.[] | select( .name == "deno-x86_64-pc-windows-msvc.zip" ) | .browser_download_url')
denoMacosUrl=$(echo $denoRelease | $jqBin -rc '.assets|.[] | select( .name == "deno-x86_64-apple-darwin.zip" ) | .browser_download_url')
echo Deno $denoVersion at $denoWindowsUrl, $denoMacosUrl

mkdir -p ${distDir}/bin

# Deno for Windows
curl -ks -o ${distDir}/bin/deno-windows.zip -L $denoWindowsUrl
unzip ${distDir}/bin/deno-windows.zip -d ${distDir}/bin >/dev/null
rm ${distDir}/bin/deno-windows.zip
# Deno for macos
curl -ks -o ${distDir}/bin/deno-macos.zip -L $denoMacosUrl
unzip ${distDir}/bin/deno-macos.zip -d ${distDir}/bin >/dev/null
rm ${distDir}/bin/deno-macos.zip

export DENO_DIR=${distDir}/bin

${distDir}/bin/deno info
${distDir}/bin/deno cache --unstable --reload ${distDir}/src/levain.ts

## Create zip
zipFile=levain-v$levainVersion-with-deno-v$denoVersion-windows-x86_64.zip
cd ${distRoot}
if [ "$zipBin" == "zip" ]; then
  $zipBin -r ${zipFile} $(basename $distDir) >/dev/null
else
  $zipBin a ${zipFile} $(basename $distDir) >/dev/null
fi

cd - >/dev/null
rm -rf ${distDir}

echo
echo $zipFile created

## Asset
levainAssetsUploadUrl=$(echo $levainRelease | $jqBin -rc '.upload_url' | sed 's/{.*}//')
echo Uploading asset $zipFile to $levainAssetsUploadUrl
curl -ks -X POST -u username:$githubToken \
  -H 'Content-Type: application/zip' \
  -T ${distRoot}/$zipFile \
  $levainAssetsUploadUrl?name=$zipFile
