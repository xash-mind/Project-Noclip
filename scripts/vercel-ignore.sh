#!/usr/bin/env bash

base="${VERCEL_GIT_PREVIOUS_SHA:-HEAD^}"

# Vercel's clone may not contain the last successful deployment commit.
# Fetch it when possible; if history is still unavailable, fail open by
# returning 1 so Vercel builds rather than skipping or erroring the release.
git fetch --depth=1 origin "$base" >/dev/null 2>&1 || true

if git diff --quiet "$base" HEAD -- \
  src \
  package.json \
  package-lock.json \
  VERSION \
  vite.config.ts \
  index.html \
  vercel.json \
  scripts/build.mjs \
  scripts/preview.mjs \
  scripts/vercel-ignore.sh; then
  exit 0
fi

exit 1
