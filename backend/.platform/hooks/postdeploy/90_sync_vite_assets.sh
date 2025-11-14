#!/usr/bin/env bash
# ---------------------------------------------------------------------------------
# IMPORTANT FOR DEPLOY:
# This script MUST be executable (chmod +x).
# If it's not executable, Elastic Beanstalk will NOT sync the frontend build
# assets to staticfiles/, so the site will 500 / white screen in production.
#
# To fix (run locally before git commit/push):
#   chmod +x .platform/hooks/postdeploy/90_sync_vite_assets.sh
#
# After changing permissions, commit the mode change:
#   git add .platform/hooks/postdeploy/90_sync_vite_assets.sh
#   git commit -m "fix: make vite assets sync hook executable"
#
# ---------------------------------------------------------------------------------

set -euo pipefail

APP_DIR="/var/app/current"
BUILD_DIR="$APP_DIR/frontend_build"
STATIC_ROOT="$APP_DIR/staticfiles"

#
echo "[postdeploy] Sync Vite build assets -> $STATIC_ROOT"
mkdir -p "$STATIC_ROOT"

# Copy index.html
if [ -f "$BUILD_DIR/index.html" ]; then
  cp -f "$BUILD_DIR/index.html" "$STATIC_ROOT/index.html"
else
  echo "[postdeploy][WARN] $BUILD_DIR/index.html not found"
fi

# copy assets dir
if [ -d "$BUILD_DIR/assets" ]; then
  rsync -a --delete "$BUILD_DIR/assets/" "$STATIC_ROOT/assets/"
else
  echo "[postdeploy][WARN] $BUILD_DIR/assets not found"
fi

# Favicon / app icons / manifest
for f in \
  favicon.ico \
  favicon-16x16.png favicon-32x32.png favicon-48x48.png favicon-64x64.png \
  favicon-128x128.png favicon-256x256.png \
  apple-touch-icon.png \
  android-chrome-192x192.png android-chrome-512x512.png \
  manifest.webmanifest
do
  if [ -f "$BUILD_DIR/$f" ]; then
    cp -f "$BUILD_DIR/$f" "$STATIC_ROOT/$f"
  else
    echo "[postdeploy][WARN] $BUILD_DIR/$f not found"
  fi
done

echo "[postdeploy] Done."