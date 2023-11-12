#!/bin/bash

version=$1

if [ -z "$version" ]; then
  echo You must inform the version number. Aborting...
  exit 1
fi

## TODO: Check if version matches regexp [0-9]+\.[0-9]+\.[0-9]+

echo Check "$@"

git fetch --prune
git pull
git push
git push --tags

# Check tag
tag=v${version}
tagExists=$(git tag -l $tag)
if [ -z "${tagExists}" ]; then
  echo Git tag $tag does not exist. ERROR...
  exit 1
fi

# Done
echo Tag $tag pushed
echo
