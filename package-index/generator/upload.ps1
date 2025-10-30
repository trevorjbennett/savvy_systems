# Automated Upload Script for Chocolatey Package Index
# Run this after choco_scraper.py finishes

Write-Host "=" -ForegroundColor Cyan -NoNewline; Write-Host ("=" * 59) -ForegroundColor Cyan
Write-Host "Package Index Upload Script" -ForegroundColor Cyan
Write-Host "=" -ForegroundColor Cyan -NoNewline; Write-Host ("=" * 59) -ForegroundColor Cyan
Write-Host ""

# Check if metadata.json exists
if (-not (Test-Path "metadata.json")) {
    Write-Host "ERROR: metadata.json not found!" -ForegroundColor Red
    Write-Host "Please run: python choco_scraper.py first" -ForegroundColor Yellow
    exit 1
}

# Read metadata
$metadata = Get-Content "metadata.json" | ConvertFrom-Json
$version = $metadata.version
$count = $metadata.packageCount
$sizeMB = [math]::Round($metadata.compressedSize / 1024 / 1024, 2)

Write-Host "Package Index Details:" -ForegroundColor Green
Write-Host "  Version: $version"
Write-Host "  Packages: $count"
Write-Host "  Compressed Size: $sizeMB MB"
Write-Host ""

# Check if files exist
$files = @("choco-index.json.gz", "choco-index.json", "metadata.json")
$missing = @()
foreach ($file in $files) {
    if (-not (Test-Path $file)) {
        $missing += $file
    }
}

if ($missing.Count -gt 0) {
    Write-Host "ERROR: Missing files:" -ForegroundColor Red
    $missing | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
    exit 1
}

Write-Host "All files found!" -ForegroundColor Green
Write-Host ""

# Check if gh CLI is installed
try {
    $ghVersion = gh --version 2>$null
    Write-Host "GitHub CLI found: $($ghVersion[0])" -ForegroundColor Green
} catch {
    Write-Host "ERROR: GitHub CLI (gh) not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install it from: https://cli.github.com/" -ForegroundColor Yellow
    Write-Host "Or create the release manually at:" -ForegroundColor Yellow
    Write-Host "https://github.com/trevorjbennett/savvy_systems/releases/new" -ForegroundColor Cyan
    exit 1
}

Write-Host ""
Write-Host "Creating GitHub Release..." -ForegroundColor Yellow

# Create tag name
$tag = "choco-index-$version"

# Create release notes
$notes = @"
## Chocolatey Package Index

**Generated:** $version
**Packages:** $count
**Compressed Size:** $sizeMB MB

### Files
- ``choco-index.json.gz`` - Compressed package index (use this in production)
- ``choco-index.json`` - Uncompressed package index (for debugging)
- ``metadata.json`` - Index metadata and checksums

### Usage in SAVVY
``````bash
# Download compressed index
curl -L -o choco-index.json.gz https://github.com/trevorjbennett/savvy_systems/releases/download/$tag/choco-index.json.gz

# Decompress
gunzip choco-index.json.gz
``````

---
🤖 Generated automatically from local scraper
"@

try {
    # Create the release
    gh release create $tag `
        choco-index.json.gz `
        choco-index.json `
        metadata.json `
        --repo trevorjbennett/savvy_systems `
        --title "Chocolatey Package Index - $version" `
        --notes $notes

    Write-Host ""
    Write-Host "SUCCESS! Release created!" -ForegroundColor Green
    Write-Host ""
    Write-Host "View it at:" -ForegroundColor Cyan
    Write-Host "https://github.com/trevorjbennett/savvy_systems/releases/tag/$tag" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Download URL for SAVVY:" -ForegroundColor Cyan
    Write-Host "https://github.com/trevorjbennett/savvy_systems/releases/latest/download/choco-index.json.gz" -ForegroundColor Cyan

} catch {
    Write-Host ""
    Write-Host "ERROR: Failed to create release" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "You may need to authenticate first:" -ForegroundColor Yellow
    Write-Host "  gh auth login" -ForegroundColor Cyan
    exit 1
}
