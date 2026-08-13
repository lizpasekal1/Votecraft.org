#!/usr/bin/env bash
# Deploys Savecraft to Firebase Hosting, merging the shared branch's latest pushed
# commits first — a concurrent second agent/session works on this same repo, and a
# plain `firebase deploy` has no concept of git branches (firebase.json's "public": "."
# uploads whatever's on disk as a full snapshot, silently overwriting the other side's
# already-deployed work if it isn't also present locally). This doesn't help for
# changes that are still uncommitted/unpushed at deploy time on either side — only for
# the failure mode actually hit: a *pushed* fix getting dropped by the other side's
# next deploy.
set -euo pipefail
cd "$(dirname "$0")/.."   # repo-relative: Chrome Extensions/Savecraft

echo "Fetching latest..."
git fetch origin

echo "Merging origin/savecraft-vc-coin-sponsored-page into $(git branch --show-current)..."
git merge origin/savecraft-vc-coin-sponsored-page --no-edit

echo "Deploying..."
firebase deploy --only hosting --project votecraft-789
