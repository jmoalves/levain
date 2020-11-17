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
    shift $((OPTIND-1))

    version=$1
    # TODO: Check parameters

    # Token
    tokenOpt=
    if [ -n "$token" ]; then
        tokenOpt="-u username:$token"
    fi

    # Release url
    url=https://api.github.com/repos/$owner/$repo/releases/latest
    if [ -n "$version" ]; then
        url=$( \
            curl -ks $tokenOpt -X GET https://api.github.com/repos/$owner/$repo/releases \
            | jq-win64 -rc ".[] | select( .tag_name == \"v${version}\" ) | .url"
        )
    fi

    # Release
    echo $( curl -ks $tokenOpt -X GET ${url} )
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
$githubToken=$( cat $tokenFile )

if [ -z "$githubToken" ]; then
    echo You must inform the github token
    exit 1
fi

myPath="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd $myPath/..
myRoot=$( pwd )

tag=v${levainVersion}

# Windows dist
distRoot=dist/windows
mkdir -p ${distRoot}

## levain
levainRelease=$( getRelease -o jmoalves -r levain -t $githubToken $levainVersion )
levainVersion=$( echo $levainRelease | jq-win64 -rc '.tag_name' | sed 's/v//g' )
levainUrl=$( echo $levainRelease | jq-win64 -rc '.zipball_url' )

distDir=${distRoot}/levain-${levainVersion}
mkdir -p ${distDir}

echo Levain ${levainVersion} at ${levainUrl}
curl -ks -u username:$githubToken -o ${distDir}/levain.zip -L $levainUrl
unzip ${distDir}/levain.zip -d ${distDir} > /dev/null
mv ${distDir}/jmoalves-levain-*/* ${distDir}
### levain cleanup
rm -rf ${distDir}/scripts
rm ${distDir}/levain.zip
rm -rf  ${distDir}/jmoalves-levain-*

## Deno bin
denoRelease=$( getRelease -o denoland -r deno $denoVersion )
denoVersion=$( echo $denoRelease | jq-win64 -rc '.tag_name' | sed 's/v//g' )
denoUrl=$( echo $denoRelease | jq-win64 -rc '.assets|.[] | select( .name == "deno-x86_64-pc-windows-msvc.zip" ) | .browser_download_url' )
echo Deno  $denoVersion at $denoUrl

mkdir -p ${distDir}/bin
curl -ks -o ${distDir}/bin/deno.zip -L $denoUrl
unzip ${distDir}/bin/deno.zip -d ${distDir}/bin > /dev/null
### deno cleanup
rm ${distDir}/bin/deno.zip

export DENO_DIR=${distDir}/bin
${distDir}/bin/deno info
${distDir}/bin/deno cache --unstable --reload ${distDir}/src/levain.ts

## Create zip
zipFile=levain-v$levainVersion-with-deno-v$denoVersion-windows-x86_64.zip
cd ${distRoot}
${myRoot}/extra-bin/windows/7z.exe a ${zipFile} $( basename $distDir ) > /dev/null
cd - > /dev/null
rm -rf ${distDir}

echo
echo $zipFile created

## Asset
levainAssetsUploadUrl=$( echo $levainRelease | jq-win64 -rc '.upload_url' | sed 's/{.*}//' )
echo Uploading asset $zipFile to $levainAssetsUploadUrl
curl -ks -X POST -u username:$githubToken \
    -H 'Content-Type: application/zip' \
    -T ${distRoot}/$zipFile \
    $levainAssetsUploadUrl?name=$zipFile
