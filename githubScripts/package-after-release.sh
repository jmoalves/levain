#!/bin/bash

getRelease() {
  debug=false

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
      echo Invalid options
      exit 1
      ;;
    esac
  done
  shift $((OPTIND - 1))

  version=$1
  if $debug; then
    echo getRelease - owner...: $owner
    echo getRelease - repo....: $repo
    echo getRelease - timeout.: $timeout
    echo getRelease - version.: $version
  fi
  # TODO: Check parameters

  # Release url
  url="https://api.github.com/repos/$owner/$repo/releases/latest"
  if [ -n "$version" ]; then
    url="https://api.github.com/repos/$owner/$repo/releases/tags/v$version"
  fi

  if $debug; then
    echo getRelease - URL: ${url}
  fi

  # Release
  echo $(curl -ks -X GET ${url})
}

echo Packaging "$@"

levainVersion=$1
denoVersion=$2

if [ -z "$levainVersion" ]; then
  # We don't have a latest release yet...
  echo You must inform the levain version
  exit 1
fi

echo Levain version ${levainVersion}

myPath="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
cd $myPath/..

tag=v${levainVersion}

# Windows dist
distRoot=/tmp/levain/windows
rm -rf ${distRoot}
mkdir -p ${distRoot}

## levain
levainRelease=$(getRelease -o jmoalves -r levain $levainVersion)
if [ -z "$levainRelease" ]; then
  echo ERROR getting levain release ${levainVersion}
  exit 1
fi
levainVersion=$(echo $levainRelease | jq -rc '.tag_name' | sed 's/v//g')
levainUrl=$(echo $levainRelease | jq -rc '.zipball_url')

distDir=${distRoot}/levain-${levainVersion}
mkdir -p ${distDir}

echo Levain ${levainVersion} at ${levainUrl}
curl -ks -o ${distDir}/levain.zip -L $levainUrl
unzip ${distDir}/levain.zip -d ${distDir} >/dev/null
mv ${distDir}/jmoalves-levain-*/* ${distDir}

## Deno bin
denoRelease=$(getRelease -o denoland -r deno $denoVersion)
if [ -z "$denoRelease" ]; then
  echo ERROR getting deno release
  exit 1
fi
denoVersion=$(echo $denoRelease | jq -rc '.tag_name' | sed 's/v//g')
denoWindowsUrl=$(echo $denoRelease | jq -rc '.assets|.[] | select( .name == "deno-x86_64-pc-windows-msvc.zip" ) | .browser_download_url')
denoLinuxUrl=$(echo $denoRelease | jq -rc '.assets|.[] | select( .name == "deno-x86_64-unknown-linux-gnu.zip" ) | .browser_download_url')

utilWin=${distRoot}/windows
utilLinux=${distRoot}/linux

# Deno for Windows
echo Deno $denoVersion for Windows at $denoWindowsUrl
mkdir -p ${utilWin}
curl -ks -o ${utilWin}/deno-windows.zip -L $denoWindowsUrl
unzip ${utilWin}/deno-windows.zip -d ${utilWin} >/dev/null

# Deno for Linux
echo Deno $denoVersion for Linux at $denoLinuxUrl
mkdir -p ${utilLinux}
curl -ks -o ${utilLinux}/deno-macos.zip -L $denoLinuxUrl
unzip ${utilLinux}/deno-macos.zip -d ${utilLinux} >/dev/null

# Deno embedded
echo Deno embedded
rm -rf ${distDir}/bin
mkdir -p ${distDir}/bin
unzip ${utilWin}/deno-windows.zip -d ${distDir}/bin >/dev/null

myDeno=${utilLinux}/deno

# bundle dependencies
# export DENO_DIR=${distRoot}/deno
export DENO_DIR=${distDir}/bin
mkdir -p ${DENO_DIR}
${myDeno} info
${myDeno} cache --unstable --reload ${distDir}/src/levain.ts
#${myDeno} bundle --unstable --reload ${distDir}/src/levain.ts ${distDir}/levain.bundle.js
# Bundle issue - https://github.com/denoland/deno/issues/8486

### levain cleanup
cp ${distDir}/bootstrap/levainBootstrap.cmd ${distRoot}
rm -rf ${distDir}/bootstrap
rm -rf ${distDir}/scripts
rm -rf ${distDir}/ci
rm ${distDir}/levain.zip
rm -rf ${distDir}/jmoalves-levain-*
# rm -rf ${distDir}/src
rm -rf ${distDir}/testdata
find ${distDir} -name '*.test.ts' -exec rm {} \;

## Create Levain zip
zipFile=levain-v$levainVersion-windows-x86_64.zip
cd ${distRoot}
zip -r ${zipFile} $(basename $distDir) >/dev/null
sha256sum ${zipFile} > ${zipFile}.sha256
cd - >/dev/null

rm -rf ${distDir}

echo
echo ${zipFile} created
ls -l ${distRoot}

echo
echo SHA256
cat ${distRoot}/${zipFile}.sha256

## Upload asset to GitHub
levainAssetsUploadUrl=$(echo $levainRelease | jq -rc '.upload_url' | sed 's/{.*}//')
echo
echo Uploading asset ${zipFile} to $levainAssetsUploadUrl
curl -ks -X POST -u username:$GITHUB_TOKEN \
  -H 'Content-Type: application/zip' \
  -T ${distRoot}/${zipFile} \
  ${levainAssetsUploadUrl}?name=${zipFile}

echo
echo Uploading asset ${zipFile}.sha256 to $levainAssetsUploadUrl
curl -ks -X POST -u username:$GITHUB_TOKEN \
  -H 'Content-Type: text/plain' \
  -T ${distRoot}/${zipFile}.sha256 \
  ${levainAssetsUploadUrl}?name=${zipFile}.sha256

echo
echo Uploading asset ${distRoot}/levainBootstrap.cmd to $levainAssetsUploadUrl
curl -ks -X POST -u username:$GITHUB_TOKEN \
  -H 'Content-Type: text/plain' \
  -T ${distRoot}/levainBootstrap.cmd \
  ${levainAssetsUploadUrl}?name=levainBootstrap.cmd

echo
echo Cleanup
rm -rf ${distRoot}

echo
echo Upload completed
