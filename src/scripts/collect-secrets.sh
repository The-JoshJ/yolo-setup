#!/bin/bash
# PIT secrets collector — reads a JSON manifest written by the agent,
# collects values from the human, writes to a temp env file, then resumes the session.
# The agent never sees the values. Values never touch dotfiles.
set -euo pipefail

SESSION_NAME="$1"
PIT_DIR="$HOME/.pit"
MANIFEST="$PIT_DIR/secrets-manifest-${SESSION_NAME}.json"
ENV_FILE="$PIT_DIR/secrets-${SESSION_NAME}.env"

if [ ! -f "$MANIFEST" ]; then
  echo "No secrets manifest found at $MANIFEST"
  exit 1
fi

COUNT=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$MANIFEST','utf8')).secrets.length)")

echo ""
echo "=== Secrets required before setup can continue ==="
echo ""

for i in $(seq 0 $((COUNT - 1))); do
  NAME=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$MANIFEST','utf8')).secrets[$i].name)")
  INST=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$MANIFEST','utf8')).secrets[$i].instructions)")

  echo "$INST"
  echo ""
  IFS= read -r -s -p "Paste $NAME: " VALUE
  echo ""
  printf '%s=%s\n' "$NAME" "$VALUE" >> "$ENV_FILE"
  echo ""
done

rm -f "$MANIFEST"

echo "Got it! Looping the agent back in..."
echo ""
