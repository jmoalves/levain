#!/bin/bash

version=$1

if [ -z "$version" ]; then
  echo You must inform the version number. Aborting...
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
    >recipes/levain.levain.yaml

# Commit version
git add src/levain_cli.ts recipes/levain.levain.yaml
git commit -m "$tag"
git tag $tag

# Restore file
cp -f recipes/levain.levain.yaml.bkp recipes/levain.levain.yaml
git add recipes/levain.levain.yaml
git commit -m "vHEAD"
rm recipes/levain.levain.yaml.bkp

# PUSH
git push
git push --tags

# Check tag
tagExists=$(git tag -l $tag)
if [ -z "${tagExists}" ]; then
  echo Git tag $tag does not exist. ERROR...
  exit 1
fi

# Done
echo Tag $tag created
echo
