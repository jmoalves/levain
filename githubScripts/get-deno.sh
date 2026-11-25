#!/bin/bash
set -euo pipefail

fetchRelease() {
  local owner="$1"
  local repo="$2"
  local tag="${3:-}"
  local url="https://api.github.com/repos/${owner}/${repo}/releases/latest"
  if [ -n "$tag" ]; then
    url="https://api.github.com/repos/${owner}/${repo}/releases/tags/${tag}"
  fi
  local -a authArgs=()
  if [ -n "${GITHUB_TOKEN:-}" ]; then
    authArgs=(-H "Authorization: Bearer ${GITHUB_TOKEN}")
  fi
  curl -fsSL ${authArgs[@]+"${authArgs[@]}"} -H "Accept: application/vnd.github+json" "$url"
}

verifySha256() {
  local file="$1"
  local digest="$2"

  if [[ ! "$digest" =~ ^sha256:([0-9a-fA-F]{64})$ ]]; then
    echo "ERROR: Invalid SHA-256 digest for Deno archive: '${digest}'" >&2
    exit 1
  fi

  local expected="${BASH_REMATCH[1]}"
  echo "Verifying SHA-256 for Deno archive: ${expected}"
  if command -v sha256sum >/dev/null 2>&1; then
    printf '%s  %s\n' "$expected" "$file" | sha256sum --check --strict
  else
    printf '%s  %s\n' "$expected" "$file" | shasum -a 256 -c -
  fi
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
if [ -n "$denoVersion" ] && [[ ! "$denoVersion" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "ERROR: Invalid denoVersion '${denoVersion}'. Expected major.minor.patch." >&2
  exit 1
fi

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

denoUrl=""
denoDigest=""

if [ -n "$denoVersion" ]; then
  denoUrl="https://github.com/denoland/deno/releases/download/v${denoVersion}/${assetName}"
  if denoRelease=$(fetchRelease denoland deno "v${denoVersion}" 2>/dev/null); then
    denoDigest=$(printf '%s' "$denoRelease" | jq -rc --arg name "$assetName" '.assets[]? | select(.name == $name) | .digest // empty' | head -n 1)
  elif [ "${LEVAIN_ALLOW_UNVERIFIED_DENO:-}" = "1" ]; then
    echo "WARN: Could not fetch Deno v${denoVersion} metadata; proceeding unverified because LEVAIN_ALLOW_UNVERIFIED_DENO=1" >&2
  else
    echo "ERROR: Could not fetch Deno v${denoVersion} release metadata for SHA-256 verification (set LEVAIN_ALLOW_UNVERIFIED_DENO=1 to bypass locally)." >&2
    exit 1
  fi
else
  denoRelease=$(fetchRelease denoland deno)
  denoVersion=$(printf '%s' "$denoRelease" | jq -rc '.tag_name // empty' | sed 's/^v//')
  denoUrl=$(printf '%s' "$denoRelease" | jq -rc --arg name "$assetName" '.assets[]? | select(.name == $name) | .browser_download_url' | head -n 1)
  denoDigest=$(printf '%s' "$denoRelease" | jq -rc --arg name "$assetName" '.assets[]? | select(.name == $name) | .digest // empty' | head -n 1)
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
if [ -n "$denoDigest" ]; then
  verifySha256 "${tempFile}" "${denoDigest}"
elif [ "${LEVAIN_ALLOW_UNVERIFIED_DENO:-}" = "1" ]; then
  echo "WARN: Skipping SHA-256 verification for ${assetName} because LEVAIN_ALLOW_UNVERIFIED_DENO=1" >&2
else
  echo "ERROR: Missing SHA-256 digest for ${assetName} (set LEVAIN_ALLOW_UNVERIFIED_DENO=1 to bypass locally)." >&2
  exit 1
fi

unzip -oq "${tempFile}" -d "${dir}"

echo "=== END = Deno for $denoOS at $dir/deno"
