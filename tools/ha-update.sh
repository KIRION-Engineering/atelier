#!/bin/bash
# Install or update KIRION Atelier inside Home Assistant, straight from GitHub.
# Runs in the HA core container (shell_command) — needs only bash, curl and tar.
#
#   ATELIER_REF     branch, tag or commit to install      (default: main)
#   ATELIER_TOKEN   GitHub token with read access          (default: contents of $CONFIG/atelier.token)
#   ATELIER_SOURCE  local .tar.gz to install instead of downloading
#   CONFIG          Home Assistant config directory        (default: /config)
set -euo pipefail

CONFIG="${CONFIG:-/config}"
REPO="KIRION-Engineering/atelier"
REF="${ATELIER_REF:-main}"
TOKEN="${ATELIER_TOKEN:-$(cat "$CONFIG/atelier.token" 2>/dev/null || true)}"
TOKEN="$(printf '%s' "$TOKEN" | tr -d '[:space:]')"

WWW="$CONFIG/www/kirion-atelier"
THEMES="$CONFIG/themes"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

if [ -n "${ATELIER_SOURCE:-}" ]; then
  tar -xzf "$ATELIER_SOURCE" -C "$TMP"
else
  headers=(-H "Accept: application/vnd.github+json")
  [ -n "$TOKEN" ] && headers+=(-H "Authorization: Bearer $TOKEN")
  if ! curl -fsSL "${headers[@]}" "https://api.github.com/repos/$REPO/tarball/$REF" -o "$TMP/src.tar.gz"; then
    echo "KIRION Atelier: download failed (ref '$REF'). Private repo? Check $CONFIG/atelier.token." >&2
    exit 1
  fi
  tar -xzf "$TMP/src.tar.gz" -C "$TMP"
  rm "$TMP/src.tar.gz"
fi

# GitHub tarballs unpack to a single "<owner>-<repo>-<sha>" directory.
SRC="$(find "$TMP" -mindepth 1 -maxdepth 1 -type d | head -n 1)"
[ -f "$SRC/ha/kirion-atelier.js" ] || { echo "KIRION Atelier: unexpected archive layout" >&2; exit 1; }
VERSION="${SRC##*-}"

mkdir -p "$WWW" "$THEMES"
cp "$SRC/ha/kirion-atelier.js" \
   "$SRC/kirion-atelier-glass/dist/kirion-atelier-glass.js" \
   "$SRC/kirion-atelier-cards/dist/kirion-atelier-cards.js" \
   "$WWW/"
cp "$SRC/kirion-atelier-theme/themes/kirion-atelier.yaml" "$THEMES/kirion-atelier.yaml"
cp "$SRC/tools/ha-update.sh" "$CONFIG/kirion-atelier-update.sh"
printf '%s\n' "$VERSION" > "$WWW/VERSION"

echo "KIRION Atelier ${VERSION} zainstalowane. Odśwież przeglądarkę."
