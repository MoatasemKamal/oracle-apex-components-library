#!/usr/bin/env bash
# Installs this repo's agent skills (and optionally Oracle's apexlang skill) for Claude Code.
#
#   ./install-skills.sh                 # personal: ~/.claude/skills (every project)
#   ./install-skills.sh /path/to/app    # one project: /path/to/app/.claude/skills
#   WITH_APEXLANG=1 ./install-skills.sh # also fetch oracle/skills apex/apexlang
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
if [ $# -gt 0 ]; then
  dest="$1/.claude/skills"
else
  dest="$HOME/.claude/skills"
fi
mkdir -p "$dest"

for skill in apex-modern-components apex-pwa; do
  rm -rf "${dest:?}/$skill"
  cp -R "$here/skills/$skill" "$dest/$skill"
  echo "installed $skill -> $dest/$skill"
done

if [ "${WITH_APEXLANG:-0}" = "1" ]; then
  tmp="$(mktemp -d)"
  git clone --depth 1 --filter=blob:none --sparse https://github.com/oracle/skills.git "$tmp/skills"
  git -C "$tmp/skills" sparse-checkout set apex/apexlang
  rm -rf "${dest:?}/apexlang"
  cp -R "$tmp/skills/apex/apexlang" "$dest/apexlang"
  rm -rf "$tmp"
  echo "installed apexlang -> $dest/apexlang"
fi

echo "Done. Restart Claude Code; the skills load automatically when relevant."
