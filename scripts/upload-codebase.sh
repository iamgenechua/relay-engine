#!/usr/bin/env bash
set -euo pipefail

# Upload source files to the relay-engine server so the agent's
# readSourceFile tool can access them on Railway.

SERVER="${FDE_URL:-https://relay-engine-production.up.railway.app}"
ENDPOINT="${SERVER}/api/codebase/upload"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

DIRS=(app components lib docs server)

echo "Collecting files from: ${DIRS[*]}"
echo "Uploading to: ${ENDPOINT}"

# Build the JSON files array using jq
FILES_JSON="[]"
count=0

for dir in "${DIRS[@]}"; do
  dir_path="${ROOT}/${dir}"
  [ -d "$dir_path" ] || continue

  while IFS= read -r -d '' file; do
    rel_path="${file#"${ROOT}/"}"
    content=$(<"$file")
    FILES_JSON=$(jq --arg path "$rel_path" --arg content "$content" \
      '. + [{"path": $path, "content": $content}]' <<< "$FILES_JSON")
    count=$((count + 1))
  done < <(find "$dir_path" -type f \
    \( -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.jsx' \
       -o -name '*.css' -o -name '*.json' -o -name '*.md' -o -name '*.mdx' \
       -o -name '*.py' -o -name '*.toml' -o -name '*.yaml' -o -name '*.yml' \) \
    -print0)
done

if [ "$count" -eq 0 ]; then
  echo "No files found — nothing to upload."
  exit 0
fi

PAYLOAD=$(jq -n --argjson files "$FILES_JSON" '{
  project: "relay-engine",
  frontend_dir: "frontend",
  backend_dir: "backend",
  backend_prefix: "server/",
  files: $files
}')

echo "Uploading ${count} files..."

HTTP_CODE=$(curl -s -o /tmp/upload-response.json -w '%{http_code}' \
  -X POST "$ENDPOINT" \
  -H 'Content-Type: application/json' \
  -d "$PAYLOAD")

if [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 300 ]; then
  echo "Success (HTTP ${HTTP_CODE})"
  cat /tmp/upload-response.json
  echo
else
  echo "Failed (HTTP ${HTTP_CODE})"
  cat /tmp/upload-response.json
  echo
  exit 1
fi
