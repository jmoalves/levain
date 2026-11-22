#!/bin/bash
set -euo pipefail

getLatestRelease() {
  local owner="$1"
  local repo="$2"
  local url="https://api.github.com/repos/${owner}/${repo}/releases/latest"
  local -a authArgs=()
  if [ -n "${GITHUB_TOKEN:-}" ]; then
    authArgs=(-H "Authorization: Bearer ${GITHUB_TOKEN}")
  fi
  curl -fsSL "${authArgs[@]}" "$url"
}

dir=${1:-}
if [ -z "$dir" ]; then
  echo "You must inform the destination dir" >&2
  exit 1
fi

denoOS=${2:-}
if [ -z "$denoOS" ]; then
  echo "No DENO OS informed... Using ${RUNNER_OS:-Linux}"
  denoOS=${RUNNER_OS:-Linux}
fi

denoVersion=${3:-}

echo "=== BEG = Deno for $denoOS at $dir"

case "${denoOS}" in
  Windows)
    assetName="deno-x86_64-pc-windows-msvc.zip"
    ;;
  Linux)
    assetName="deno-x86_64-unknown-linux-gnu.zip"
    ;;
  macOS)
    assetName="deno-x86_64-apple-darwin.zip"
    ;;
  *)
    echo "Invalid deno OS $denoOS" >&2
    exit 1
    ;;
esac

if [ -n "$denoVersion" ]; then
  denoUrl="https://github.com/denoland/deno/releases/download/v${denoVersion}/${assetName}"
else
  denoRelease=$(getLatestRelease denoland deno)
  denoVersion=$(printf '%s' "$denoRelease" | jq -rc '.tag_name // empty' | sed 's/^v//')
  denoUrl=$(printf '%s' "$denoRelease" | jq -rc --arg name "$assetName" '.assets[]? | select(.name == $name) | .browser_download_url' | head -n 1)
fi

if [ -z "$denoUrl" ]; then
  echo "ERROR: Could not resolve Deno download URL for OS=${denoOS} version=${denoVersion:-latest}" >&2
  exit 1
fi

echo "Downloading Deno ${denoVersion} for ${denoOS} from ${denoUrl}"

mkdir -p "${dir}"
tempFile=$(mktemp)
trap 'rm -f "$tempFile"' EXIT

curl -fsSL -o "${tempFile}" "${denoUrl}"
unzip -oq "${tempFile}" -d "${dir}"

echo "=== END = Deno for $denoOS at $dir/deno"
