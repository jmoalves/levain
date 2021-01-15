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
rm -rf ${distDir}/githubScripts
rm -rf ${distDir}/ci
rm ${distDir}/levain.zip
rm -rf ${distDir}/jmoalves-levain-*
# rm -rf ${distDir}/src
rm -rf ${distDir}/testdata
find ${distDir} -name '*.test.ts' -exec rm {} \;

## Create Levain zip
levainZipFile=levain-v$levainVersion-windows-x86_64.zip
cd ${distRoot}
zip -r ${levainZipFile} $(basename $distDir) >/dev/null
sha256sum ${levainZipFile} > ${levainZipFile}.sha256
cd - >/dev/null

echo
echo ${levainZipFile} created
echo
unzip -l ${distRoot}/${levainZipFile}

bootstrapZipFile=levainBootstrap-windows-x86_64.zip
cd ${distDir}
rm -rf extra-bin/windows/git #bootstrap does not need this
cp ${distRoot}/levainBootstrap.cmd .
zip -r ${distRoot}/${bootstrapZipFile} levainBootstrap.cmd extra-bin >/dev/null
cd - >/dev/null
cd ${distRoot}
sha256sum ${bootstrapZipFile} > ${bootstrapZipFile}.sha256
cd - >/dev/null

echo
echo ${bootstrapZipFile} created
echo
unzip -l ${distRoot}/${bootstrapZipFile}

rm -rf ${distDir}
ls -l ${distRoot}

echo
echo SHA256
cat ${distRoot}/${levainZipFile}.sha256
cat ${distRoot}/${bootstrapZipFile}.sha256

## Upload assets to GitHub
levainAssetsUploadUrl=$(echo $levainRelease | jq -rc '.upload_url' | sed 's/{.*}//')

echo
echo Uploading asset ${levainZipFile} to $levainAssetsUploadUrl
curl -ks -X POST -u username:$GITHUB_TOKEN \
  -H 'Content-Type: application/zip' \
  -T ${distRoot}/${levainZipFile} \
  ${levainAssetsUploadUrl}?name=${levainZipFile}

echo
echo Uploading asset ${levainZipFile}.sha256 to $levainAssetsUploadUrl
curl -ks -X POST -u username:$GITHUB_TOKEN \
  -H 'Content-Type: text/plain' \
  -T ${distRoot}/${levainZipFile}.sha256 \
  ${levainAssetsUploadUrl}?name=${levainZipFile}.sha256

echo
echo Uploading asset ${bootstrapZipFile} to $levainAssetsUploadUrl
curl -ks -X POST -u username:$GITHUB_TOKEN \
  -H 'Content-Type: application/zip' \
  -T ${distRoot}/${bootstrapZipFile} \
  ${levainAssetsUploadUrl}?name=${bootstrapZipFile}

echo
echo Uploading asset ${bootstrapZipFile}.sha256 to $levainAssetsUploadUrl
curl -ks -X POST -u username:$GITHUB_TOKEN \
  -H 'Content-Type: text/plain' \
  -T ${distRoot}/${bootstrapZipFile}.sha256 \
  ${levainAssetsUploadUrl}?name=${bootstrapZipFile}.sha256


echo
echo Cleanup
rm -rf ${distRoot}

echo
echo Upload completed
