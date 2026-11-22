#!/bin/bash
set -euo pipefail

version=${1:-}
nextVersion=${2:-}

if [ -z "$version" ]; then
  echo "You must inform the version number. Aborting..." >&2
  exit 1
fi

if [ -z "$nextVersion" ]; then
  echo "You must inform the NEXT version number. Aborting..." >&2
  exit 1
fi

echo "Release $*"

git fetch --prune
git pull

# Check tag
tag="v${version}"
tagExists=$(git tag -l "$tag")
if [ -n "$tagExists" ]; then
  echo "Git tag $tag already exists. Aborting..." >&2
  exit 1
fi

repoSlug="${GITHUB_REPOSITORY:-jmoalves/levain}"

# Check release
if [ -n "${GITHUB_TOKEN:-}" ]; then
  releases=$(curl -fsSL -H "Authorization: Bearer ${GITHUB_TOKEN}" -H "Accept: application/vnd.github+json" \
    "https://api.github.com/repos/${repoSlug}/releases" |
    jq -r '.[].tag_name' |
    sed 's/ //g')
else
  releases=$(curl -fsSL -H "Accept: application/vnd.github+json" \
    "https://api.github.com/repos/${repoSlug}/releases" |
    jq -r '.[].tag_name' |
    sed 's/ //g')
fi

for r in $releases; do
  if [ "$tag" = "$r" ]; then
    echo "Git release $r exists. Aborting..." >&2
    exit 1
  fi
done

# Change version at yaml file
cp -f recipes/levain.levain.yaml recipes/levain.levain.yaml.bkp
sed "s/version: .*/version: ${version}/g" recipes/levain.levain.yaml.bkp > recipes/levain.levain.yaml
rm -f recipes/levain.levain.yaml.bkp

# Commit version
git add recipes/levain.levain.yaml
git commit -m "skip: $tag"
git tag "$tag"

# Next version at yaml file
cp -f recipes/levain.levain.yaml recipes/levain.levain.yaml.bkp
sed "s/version: .*/version: ${nextVersion}/g" recipes/levain.levain.yaml.bkp > recipes/levain.levain.yaml
rm -f recipes/levain.levain.yaml.bkp

git add recipes/levain.levain.yaml
git commit -m "skip: ${nextVersion}"

# Done
echo "Tag $tag created"
echo
