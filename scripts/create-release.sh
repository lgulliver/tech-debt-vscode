#!/bin/bash

# Script to update package version and create a new release tag
# Usage: ./create-release.sh <version>
# Example: ./create-release.sh 0.3.2

set -e

if [ $# -ne 1 ]; then
  echo "Usage: $0 <version>"
  echo "Example: $0 0.3.2"
  exit 1
fi

VERSION=$1
TAG_VERSION="v$VERSION"

echo "Preparing release $TAG_VERSION..."

# Check if we're on the main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ] && [ "$CURRENT_BRANCH" != "master" ]; then
  read -p "You're not on main/master branch. Continue anyway? (y/N): " CONFIRM
  if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
    echo "Aborting."
    exit 1
  fi
fi

# Make sure we have latest changes
echo "Fetching latest changes..."
git fetch

# Check if tag already exists
if git tag | grep -q "^$TAG_VERSION$"; then
  echo "Error: Tag $TAG_VERSION already exists."
  exit 1
fi

# Update version in package.json
echo "Updating version in package.json to $VERSION..."
node -e "
  const fs = require('fs');
  const package = JSON.parse(fs.readFileSync('./package.json'));
  package.version = '$VERSION';
  fs.writeFileSync('./package.json', JSON.stringify(package, null, 2) + '\n');
"

# Check CHANGELOG.md for entry
if ! grep -q "## \[$VERSION\]" CHANGELOG.md; then
  echo "Warning: No entry found for version $VERSION in CHANGELOG.md."
  read -p "Do you want to add an empty changelog entry? (y/N): " ADD_CHANGELOG
  if [ "$ADD_CHANGELOG" = "y" ] || [ "$ADD_CHANGELOG" = "Y" ]; then
    DATE=$(date +"%Y-%m-%d")
    awk -v ver="$VERSION" -v date="$DATE" '
      /^# Change Log/ {print; print ""; print "## [" ver "] - " date; print ""; print "### Added"; print ""; print "- "; print ""; print "### Fixed"; print ""; print "- "; print ""; next}
      {print}
    ' CHANGELOG.md > CHANGELOG.md.new
    mv CHANGELOG.md.new CHANGELOG.md
    echo "Added empty changelog entry for $VERSION. Please edit CHANGELOG.md now."
    exit 0
  else
    read -p "Continue without changelog entry? (y/N): " CONTINUE
    if [ "$CONTINUE" != "y" ] && [ "$CONTINUE" != "Y" ]; then
      echo "Aborting. Please add a changelog entry for version $VERSION."
      # Revert changes to package.json
      git checkout -- package.json
      exit 1
    fi
  fi
fi

# Commit the changes
echo "Committing version change..."
git add package.json
git commit -m "chore: bump version to $VERSION"

# Create and push the tag
echo "Creating tag $TAG_VERSION..."
git tag -a "$TAG_VERSION" -m "Release $TAG_VERSION"

echo ""
echo "Version updated to $VERSION and tag $TAG_VERSION created."
echo ""
echo "Next steps:"
echo "1. Push the commit: git push"
echo "2. Push the tag: git push origin $TAG_VERSION"
echo "3. The GitHub Actions workflow will create a draft release."
