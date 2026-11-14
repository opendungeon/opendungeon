#!/usr/bin/env bash
set -euo pipefail

# ensure required commands are installed
command -v rclone &> /dev/null || { echo "Error: rclone is required." >&2; exit 1; }

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
ASSETS_DIR="$(dirname $SCRIPT_DIR)/static/assets"
MANIFESTS_DIR="$(dirname $SCRIPT_DIR)/src/lib/assets/manifests"

echo "Downloading assets and manifests from $WEBDAV_URL"

export RCLONE_CONFIG_DAV_TYPE=webdav
export RCLONE_CONFIG_DAV_URL="$WEBDAV_URL"
export RCLONE_CONFIG_DAV_VENDOR=other
export RCLONE_CONFIG_DAV_USER="$WEBDAV_USER"
RCLONE_CONFIG_DAV_PASS="$(rclone obscure "$WEBDAV_PASSWORD")"
export RCLONE_CONFIG_DAV_PASS

rclone copy dav:assets $ASSETS_DIR
echo "Downloaded assets to $ASSETS_DIR"

rclone copy dav:manifests $MANIFESTS_DIR
echo "Downloaded manifests to $MANIFESTS_DIR"
