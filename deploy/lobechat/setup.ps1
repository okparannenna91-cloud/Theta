# Local working copy of the LobeChat fork, next to the Theta project.
# Keeps LobeChat OUT of the Theta git repo (separate app, ~15k files) while
# giving you a local folder to inspect/edit it on this machine.
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File setup.ps1
#   powershell -ExecutionPolicy Bypass -File setup.ps1 -Target ..\..\lobechat

param(
    [string]$Target = "..\..\..\lobechat",
    [string]$Branch = "flow3-identity"
)

$ErrorActionPreference = "Stop"

$ForkUrl = "https://github.com/okparannenna91-cloud/lobehub.git"
$Patch = Join-Path $PSScriptRoot "patches\0001-flow3-identity.patch"
$Resolved = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot $Target))

Write-Host "LobeChat fork -> $Resolved"

if (Test-Path $Resolved) {
    if (-not (Test-Path (Join-Path $Resolved ".git"))) {
        Write-Host "Folder exists but is not a git repo - removing and re-cloning..."
        Remove-Item -Recurse -Force $Resolved
    } else {
        Write-Host "Folder exists, pulling latest $Branch..."
        Push-Location $Resolved
        try {
            git pull --ff-only origin $Branch
            if (-not $?) { throw "pull failed" }
        } finally { Pop-Location }
    }
}

if (-not (Test-Path $Resolved)) {
    Write-Host "Cloning fork (branch $Branch)..."
    git clone --depth 1 --branch $Branch $ForkUrl $Resolved
    if (-not $?) { throw "clone failed" }
}

Push-Location $Resolved
try {
    $applied = git log --oneline -1
    Write-Host "HEAD: $applied"
    if (-not (Select-String -LiteralPath "src\app\(backend)\webapi\chat\[provider]\route.ts" -Pattern "FLOW3_PROVIDER_ID" -Quiet)) {
        Write-Host "Applying identity patch..."
        git apply "$Patch"
        if (-not $?) { throw "patch apply failed" }
    } else {
        Write-Host "Patch already applied."
    }
} finally {
    Pop-Location
}

Write-Host "`nDone. Folder: $Resolved"
Write-Host "Next: open it in an editor, or skip straight to the Vercel deploy (deploy/lobechat/README.md)."