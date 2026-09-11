#!/usr/bin/env bash
# Appends a timestamped entry to docs/devlog.md, linked to the current commit.
#
# Usage: ./scripts/log.sh "Fixed Expo Go crash on Android"

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEVLOG="$REPO_ROOT/docs/devlog.md"

if [ $# -eq 0 ]; then
  echo "Usage: $0 \"message\"" >&2
  exit 1
fi

MESSAGE="$1"

if ! git -C "$REPO_ROOT" rev-parse --short HEAD >/dev/null 2>&1; then
  echo "No commits yet. Make an initial commit before logging." >&2
  exit 1
fi

SHA="$(git -C "$REPO_ROOT" rev-parse --short HEAD)"
TIMESTAMP="$(date '+%Y-%m-%d %H:%M %Z')"

REMOTE_URL="$(git -C "$REPO_ROOT" remote get-url origin 2>/dev/null || true)"
if [[ "$REMOTE_URL" == git@github.com:* ]]; then
  REPO_PATH="${REMOTE_URL#git@github.com:}"
elif [[ "$REMOTE_URL" == https://github.com/* ]]; then
  REPO_PATH="${REMOTE_URL#https://github.com/}"
else
  REPO_PATH=""
fi
REPO_PATH="${REPO_PATH%.git}"

if [ -n "$REPO_PATH" ]; then
  COMMIT_LINK="[\`$SHA\`](https://github.com/$REPO_PATH/commit/$SHA)"
else
  COMMIT_LINK="\`$SHA\`"
fi

if [ ! -f "$DEVLOG" ]; then
  echo "# Dev log" > "$DEVLOG"
  echo "" >> "$DEVLOG"
fi

{
  echo ""
  echo "### $TIMESTAMP"
  echo "Commit: $COMMIT_LINK"
  echo ""
  echo "$MESSAGE"
} >> "$DEVLOG"

echo "Logged to docs/devlog.md"
