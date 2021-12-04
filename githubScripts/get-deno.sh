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

dir=$1
if [ -z "$dir" ]; then
  echo You must inform the destination dir
  exit 1
fi

denoOS=$2
if [ -z "$denoOS" ]; then
  echo No DENO OS informed... Using $RUNNER_OS
  denoOS=$RUNNER_OS
fi

echo === BEG = Deno for $denoOS at $dir 

############

myPath="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
cd $myPath/..

## Deno Release
denoRelease=$(getRelease -o denoland -r deno)
if [ -z "$denoRelease" ]; then
  echo ERROR getting Deno release
  exit 1
fi

denoVersion=$(echo $denoRelease | jq -rc '.tag_name' | sed 's/v//g')

case "${denoOS}" in
Windows)
  denoUrl=$(echo $denoRelease | jq -rc '.assets|.[] | select( .name == "deno-x86_64-pc-windows-msvc.zip" ) | .browser_download_url')
  ;;

Linux|macOS)
  denoUrl=$(echo $denoRelease | jq -rc '.assets|.[] | select( .name == "deno-x86_64-unknown-linux-gnu.zip" ) | .browser_download_url')
  ;;

*)
  echo Invalid deno OS $denoOS
  exit 1
  ;;
esac

# Deno
echo Downloading Deno $denoVersion for $denoOS from $denoUrl

mkdir -p ${dir} &&
tempFile=$( mktemp ) &&
curl -ks -o ${tempFile} -L $denoUrl &&
unzip ${tempFile} -d ${dir} >/dev/null &&
rm -rf ${tempFile} &&
echo === END = Deno for $denoOS at $dir 
