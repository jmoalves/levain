#!/bin/bash
set -euo pipefail

version=${1:-}
nextVersion=${2:-}

if [ -z "$version" ]; then
  echo "You must inform the version number. Aborting..." >&2
  exit 1
fi

if [[ ! "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Invalid version '${version}'. Expected major.minor.patch. Aborting..." >&2
  exit 1
fi

if [ -z "$nextVersion" ]; then
  echo "You must inform the NEXT version number. Aborting..." >&2
  exit 1
fi

if [[ ! "$nextVersion" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?$ ]]; then
  echo "Invalid nextVersion '${nextVersion}'. Aborting..." >&2
  exit 1
fi

echo "Release ${version} -> ${nextVersion}"

git fetch --prune --tags

tag="v${version}"
releaseBranch="release/${tag}"

# Check tag and remote release branch before building
if git rev-parse -q --verify "refs/tags/${tag}" >/dev/null; then
  echo "Git tag ${tag} already exists. Aborting..." >&2
  exit 1
fi

if git rev-parse -q --verify "refs/remotes/origin/${releaseBranch}" >/dev/null; then
  echo "Remote release branch origin/${releaseBranch} already exists. Aborting..." >&2
  exit 1
fi

repoSlug="${GITHUB_REPOSITORY:-jmoalves/levain}"
releaseCheckUrl="https://api.github.com/repos/${repoSlug}/releases/tags/${tag}"

# Check directly whether the GitHub release already exists (avoids 30-item pagination limit)
declare -a authArgs=()
if [ -n "${GITHUB_TOKEN:-}" ]; then
  authArgs=(-H "Authorization: Bearer ${GITHUB_TOKEN}")
fi
httpStatus=$(curl -sS -o /dev/null -w "%{http_code}" ${authArgs[@]+"${authArgs[@]}"} -H "Accept: application/vnd.github+json" "$releaseCheckUrl")
if [ "$httpStatus" = "200" ]; then
  echo "Git release ${tag} already exists. Aborting..." >&2
  exit 1
elif [ "$httpStatus" != "404" ]; then
  echo "Unexpected HTTP ${httpStatus} checking existing release ${tag} at ${releaseCheckUrl}. Aborting..." >&2
  exit 1
fi

# Commit release and next SNAPSHOT on a dedicated release branch (master stays PR-only)
git checkout -B "${releaseBranch}"

# Change version in recipes/levain.levain.yaml
cp -f recipes/levain.levain.yaml recipes/levain.levain.yaml.bkp
sed "s/^version: .*/version: ${version}/" recipes/levain.levain.yaml.bkp > recipes/levain.levain.yaml
rm -f recipes/levain.levain.yaml.bkp

git add recipes/levain.levain.yaml
git commit -m "chore(release): prepare ${tag}"
git tag "${tag}"

# Next SNAPSHOT version in recipes/levain.levain.yaml
cp -f recipes/levain.levain.yaml recipes/levain.levain.yaml.bkp
sed "s/^version: .*/version: ${nextVersion}/" recipes/levain.levain.yaml.bkp > recipes/levain.levain.yaml
rm -f recipes/levain.levain.yaml.bkp

git add recipes/levain.levain.yaml
git commit -m "chore(release): bump version to ${nextVersion}"

echo "Tag ${tag} created on branch ${releaseBranch}"
echo
