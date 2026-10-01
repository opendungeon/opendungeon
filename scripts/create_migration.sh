#!/usr/bin/env bash
set -euo pipefail

# ensure required commands are installed
command -v date &> /dev/null || { echo "Error: date is required." >&2; exit 1; }

# ensure migration name is provided
[[ "$#" -ge 1 ]] || { echo "Usage: $0 snake_case_migration_name"; exit 1; }

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
MIGRATION_NAME="$(date +%s)_$1.sql"
echo "migration name $MIGRATION_NAME"
MIGRATION_FILEPATH="$(dirname $SCRIPT_DIR)/migrations/$MIGRATION_NAME"

touch $MIGRATION_FILEPATH
echo "Created $MIGRATION_FILEPATH"
