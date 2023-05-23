#!/usr/bin/env bash

set -eo pipefail

if [ -z "$GITHUB_AUTH_TOKEN" ]; then
  echo >&2 "missing GITHUB_AUTH_TOKEN environment variable"
  exit 1
fi

if [ -z "$NPM_TOKEN" ]; then
  echo >&2 "missing NPM_TOKEN environment variable"
  exit 1
fi

GIT_BASE_REVISION=${1-}
if [ -z "$GIT_BASE_REVISION" ]; then
  echo >&2 "usage: $0 git_base_revision"
  exit 1
fi

CURRENT_VERSION="$(jq -j .version package.json)"
PREV_VERSION="$(git show ${GIT_BASE_REVISION}:package.json | jq -j .version)"

if [ "$CURRENT_VERSION" == "$PREV_VERSION" ]; then
  echo "version was not changed, nothing to do"
  exit 0
fi

VERSION_TAG="v${CURRENT_VERSION}"

push_new_git_tag() {
  echo "tagging and pushing new git tag: ${VERSION_TAG}"
  git tag $VERSION_TAG

  # prevent SSH fingerprint prompt on git push
  ssh -o StrictHostKeyChecking=no git@github.com || true
  git push origin $VERSION_TAG
}

publish_packages_to_npm() {
  echo "publishing to npm"
  # set token at npmrc - without making the git local copy dirty
  echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" >> .npmrc
  echo ".npmrc" >> .git/info/exclude
  git update-index --assume-unchanged .npmrc

  npm publish --access public
}

push_new_git_tag
publish_packages_to_npm
