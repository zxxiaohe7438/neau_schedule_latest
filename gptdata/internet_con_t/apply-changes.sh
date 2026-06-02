#!/bin/bash
# apply-changes.sh
# Moves generated files from gptdata/internet_con_t/ to their correct project locations.
# Run this from the project root: D:/coding_relative/neau-local-schedule

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SANDBOX="$SCRIPT_DIR"

echo "Project root: $PROJECT_ROOT"
echo "Sandbox: $SANDBOX"
echo ""

# Define files: "source|destination" (relative to sandbox/project root respectively)
FILES=(
    "src/security/credentialStore.ts|src/security/credentialStore.ts"
    "electron/services/schoolAuthService.ts|electron/services/schoolAuthService.ts"
    "electron/ipc/authIpc.ts|electron/ipc/authIpc.ts"
    "tests/fixtures/mock-callback-response.json|tests/fixtures/mock-callback-response.json"
    "tests/mockCallbackImporter.test.ts|tests/mockCallbackImporter.test.ts"
    "tests/schoolAuthService.test.ts|tests/schoolAuthService.test.ts"
    "electron/main.ts|electron/main.ts"
    "electron/preload.ts|electron/preload.ts"
    "src/components/LoginPanel.tsx|src/components/LoginPanel.tsx"
    "src/app/App.tsx|src/app/App.tsx"
    "docs/dev-log/day-online-login.md|docs/dev-log/day-online-login.md"
    "docs/CURRENT_STATUS.md|docs/CURRENT_STATUS.md"
    "docs/architecture.md|docs/architecture.md"
    "docs/test-plan.md|docs/test-plan.md"
    ".gitignore|.gitignore"
    "src/global.d.ts|src/global.d.ts"
)

for entry in "${FILES[@]}"; do
    IFS='|' read -r src dest <<< "$entry"
    srcPath="$SANDBOX/$src"
    destPath="$PROJECT_ROOT/$dest"

    if [ ! -f "$srcPath" ]; then
        echo "SKIP (not found): $src"
        continue
    fi

    # Create destination directory if needed
    destDir="$(dirname "$destPath")"
    mkdir -p "$destDir"

    # Copy file
    cp "$srcPath" "$destPath"
    echo "OK: $dest"
done

echo ""
echo "All files copied. Run 'npm run typecheck' and 'npm test' to verify."
