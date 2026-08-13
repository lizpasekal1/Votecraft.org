#!/usr/bin/env bash
# Deploys Savecraft to Firebase Hosting, merging the shared branch's latest pushed
# commits first — a concurrent second agent/session works on this same repo, and a
# plain `firebase deploy` has no concept of git branches (firebase.json's "public": "."
# uploads whatever's on disk as a full snapshot, silently overwriting the other side's
# already-deployed work if it isn't also present locally). This doesn't help for
# changes that are still uncommitted/unpushed at deploy time on either side — only for
# the failure mode actually hit: a *pushed* fix getting dropped by the other side's
# next deploy.
#
# The merge step alone only updated *this* branch locally — nothing was pushed back,
# so the other side had no way to know this branch's state without manually pulling it
# (caught live: a v1 of this script claimed "already merged, should be in what you'd
# pull" when it hadn't actually reached the shared branch at all). Now pushes the
# merged result back to the shared branch too, so both sides converge automatically
# instead of requiring a manual cross-branch merge on the other end. Deliberately no
# --force: if the shared branch moved again since the fetch above (a real race), this
# push fails loudly rather than clobbering whatever the other side just pushed — rerun
# the script to pick up the new state and try again.
set -euo pipefail
cd "$(dirname "$0")/.."   # repo-relative: Chrome Extensions/Savecraft

echo "Fetching latest..."
git fetch origin

echo "Merging origin/savecraft-vc-coin-sponsored-page into $(git branch --show-current)..."
git merge origin/savecraft-vc-coin-sponsored-page --no-edit

echo "Pushing merged state back to the shared branch..."
git push origin HEAD:savecraft-vc-coin-sponsored-page

echo "Pushing this branch..."
git push

echo "Deploying..."
firebase deploy --only hosting --project votecraft-789
