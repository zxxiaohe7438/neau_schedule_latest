# apply-changes.ps1
# Moves generated files from gptdata/internet_con_t/ to their correct project locations.
# Run this from the project root: D:\coding_relative\neau-local-schedule

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot | Split-Path -Parent
$sandbox = Join-Path $projectRoot "gptdata\internet_con_t"

Write-Host "Project root: $projectRoot" -ForegroundColor Cyan
Write-Host "Sandbox: $sandbox" -ForegroundColor Cyan
Write-Host ""

# List of files to copy: source (relative to sandbox) -> dest (relative to project root)
$files = @(
    # New files
    @{ Src = "src\security\credentialStore.ts"; Dest = "src\security\credentialStore.ts" }
    @{ Src = "electron\services\schoolAuthService.ts"; Dest = "electron\services\schoolAuthService.ts" }
    @{ Src = "electron\ipc\authIpc.ts"; Dest = "electron\ipc\authIpc.ts" }
    @{ Src = "tests\fixtures\mock-callback-response.json"; Dest = "tests\fixtures\mock-callback-response.json" }
    @{ Src = "tests\mockCallbackImporter.test.ts"; Dest = "tests\mockCallbackImporter.test.ts" }
    @{ Src = "tests\schoolAuthService.test.ts"; Dest = "tests\schoolAuthService.test.ts" }

    # Modified files
    @{ Src = "electron\main.ts"; Dest = "electron\main.ts" }
    @{ Src = "electron\preload.ts"; Dest = "electron\preload.ts" }
    @{ Src = "src\components\LoginPanel.tsx"; Dest = "src\components\LoginPanel.tsx" }
    @{ Src = "src\app\App.tsx"; Dest = "src\app\App.tsx" }

    # Documentation
    @{ Src = "docs\dev-log\day-online-login.md"; Dest = "docs\dev-log\day-online-login.md" }
    @{ Src = "docs\CURRENT_STATUS.md"; Dest = "docs\CURRENT_STATUS.md" }
    @{ Src = "docs\architecture.md"; Dest = "docs\architecture.md" }
    @{ Src = "docs\test-plan.md"; Dest = "docs\test-plan.md" }

    # Gitignore update
    @{ Src = ".gitignore"; Dest = ".gitignore" }

    # Type declarations
    @{ Src = "src\global.d.ts"; Dest = "src\global.d.ts" }
)

foreach ($file in $files) {
    $srcPath = Join-Path $sandbox $file.Src
    $destPath = Join-Path $projectRoot $file.Dest

    if (-not (Test-Path $srcPath)) {
        Write-Host "SKIP (not found): $($file.Src)" -ForegroundColor Yellow
        continue
    }

    # Create destination directory if needed
    $destDir = Split-Path -Parent $destPath
    if (-not (Test-Path $destDir)) {
        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
        Write-Host "Created dir: $destDir" -ForegroundColor DarkGray
    }

    # Copy file
    Copy-Item -Path $srcPath -Destination $destPath -Force
    Write-Host "OK: $($file.Dest)" -ForegroundColor Green
}

Write-Host ""
Write-Host "All files copied. Run 'npm run typecheck' and 'npm test' to verify." -ForegroundColor Cyan
