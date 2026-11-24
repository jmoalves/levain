#!/bin/bash
set -euo pipefail

version=${1:-}

if [ -z "$version" ]; then
  echo "You must inform the version number. Aborting..." >&2
  exit 1
fi

if [[ ! "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Invalid version '${version}'. Expected major.minor.patch. Aborting..." >&2
  exit 1
fi

tag="v${version}"
releaseBranch="release/${tag}"

echo "Check ${tag} on ${releaseBranch}"

# Verify local tag and release branch BEFORE pushing anything
if ! git rev-parse -q --verify "refs/tags/${tag}" >/dev/null; then
  echo "Git tag ${tag} does not exist locally. Aborting..." >&2
  exit 1
fi

if ! git rev-parse -q --verify "refs/heads/${releaseBranch}" >/dev/null; then
  echo "Release branch ${releaseBranch} does not exist locally. Aborting..." >&2
  exit 1
fi

git push --atomic origin "refs/tags/${tag}" "refs/heads/${releaseBranch}"

echo "Tag ${tag} and branch ${releaseBranch} pushed"
echo
