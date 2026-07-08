#!/usr/bin/env bash

# ensure required commands are installed
command -v curl &> /dev/null || { echo "Error: curl is required." >&2; exit 1; }
command -v jq &> /dev/null || { echo "Error: jq is required." >&2; exit 1; }

# ensure folder path is provided
[[ "$#" -ge 2 ]] || { echo "Usage: $0 apiUrl folderPath"; exit 1; }

API_URL=$1
FOLDER=$(realpath "$2")
JSON_PATH="$FOLDER/cell_textures.json"

if [[ ! -f "$JSON_PATH" ]]; then
  echo "Error: json file not found at $JSON_PATH" >&2
  exit 1
fi

jq -r '.[] | "\(.key)\t\(.displayName)\t\(.fileName)"' "$JSON_PATH" | while IFS=$'\t' read -r KEY DISPLAY_NAME FILE; do
  FULL_FILE_PATH="$FOLDER/$FILE"

  curl -X POST \
  -F key="$KEY" \
  -F displayName="$DISPLAY_NAME" \
  -F file=@"$FOLDER/$FILE" \
  $API_URL/api/cell-textures \
  || { echo "Error: failed to create cell texture."; exit 1; }
done
