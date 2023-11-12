#!/bin/bash

version=$1
nextVersion=$2

if [ -z "$version" ]; then
  echo You must inform the version number. Aborting...
  exit 1
fi

if [ -z "$nextVersion" ]; then
  echo You must inform the NEXT version number. Aborting...
  exit 1
fi

## TODO: Check if version matches regexp [0-9]+\.[0-9]+\.[0-9]+

echo Release "$@"

git fetch --prune

git pull

# Check tag
tag=v${version}
tagExists=$(git tag -l $tag)
if [ -n "$tagExists" ]; then
  echo Git tag $tag already exists. Aborting...
  exit 1
fi

# Check release
releases=$(curl -ks -X GET \
  https://api.github.com/repos/jmoalves/levain/releases |
  jq -r .[].tag_name |
  sed 's/ //g')

for r in $releases; do
  if [ $tag = $r ]; then
    echo Git release $r exists. Aborting...
    exit 1
  fi
done

# Change version at yaml file
cp -f recipes/levain.levain.yaml recipes/levain.levain.yaml.bkp
cat recipes/levain.levain.yaml.bkp |
  sed "s/version: .*/version: ${version}/g" \
    > recipes/levain.levain.yaml
rm recipes/levain.levain.yaml.bkp

# Commit version
git add src/levain_cli.ts recipes/levain.levain.yaml
git commit -m "skip: $tag"
git tag $tag

# Next version at yaml file
cp -f recipes/levain.levain.yaml recipes/levain.levain.yaml.bkp
cat recipes/levain.levain.yaml.bkp |
  sed "s/version: .*/version: ${nextVersion}/g" \
    > recipes/levain.levain.yaml
rm recipes/levain.levain.yaml.bkp

git add recipes/levain.levain.yaml
git commit -m "skip: ${nextVersion}"

# Done
echo Tag $tag created
echo
