# Manual Package Index Upload

Since Chocolatey blocks GitHub Actions IPs, we'll run the scraper locally and upload manually.

## 🚀 Quick Start (5 minutes)

### 1. Run the Scraper Locally

```bash
cd c:\Users\Jae\savvy_new\savvy\package-index\generator

# Install dependencies (first time only)
pip install -r requirements.txt

# Run the scraper
python choco_scraper.py
```

This will create:
- `choco-index.json` (~20-30 MB)
- `choco-index.json.gz` (~5-10 MB) ← **This is what we upload**
- `metadata.json`

### 2. Create a GitHub Release

1. Go to: https://github.com/trevorjbennett/savvy_systems/releases
2. Click **"Draft a new release"**
3. Tag: `choco-index-YYYY-MM-DD` (e.g., `choco-index-2025-01-30`)
4. Title: `Chocolatey Package Index - January 30, 2025`
5. Description:
   ```markdown
   ## Chocolatey Package Index

   **Generated:** [Copy from metadata.json "version"]
   **Packages:** [Copy from metadata.json "packageCount"]
   **Size:** [Copy from metadata.json "compressedSize" / 1024 / 1024] MB

   ### Files
   - `choco-index.json.gz` - Compressed package index (use in production)
   - `choco-index.json` - Uncompressed (for debugging)
   - `metadata.json` - Index metadata
   ```
6. Drag and drop these 3 files into the assets area:
   - `choco-index.json.gz`
   - `choco-index.json`
   - `metadata.json`
7. Click **"Publish release"**

### 3. Done! ✅

SAVVY can now download from:
```
https://github.com/trevorjbennett/savvy_systems/releases/latest/download/choco-index.json.gz
```

## 🔄 Updating the Index

Run this whenever you want to update (weekly/monthly):

```bash
cd c:\Users\Jae\savvy_new\savvy\package-index\generator
python choco_scraper.py
# Then create a new release with the new files
```

## 🤖 Optional: Automate with GitHub CLI

Install [GitHub CLI](https://cli.github.com/), then:

```bash
cd c:\Users\Jae\savvy_new\savvy\package-index\generator

# Run scraper
python choco_scraper.py

# Read metadata
$VERSION = (Get-Content metadata.json | ConvertFrom-Json).version
$COUNT = (Get-Content metadata.json | ConvertFrom-Json).packageCount

# Create release
gh release create "choco-index-$VERSION" `
  choco-index.json.gz `
  choco-index.json `
  metadata.json `
  --title "Chocolatey Package Index - $VERSION" `
  --notes "Generated $VERSION with $COUNT packages"
```

Save this as `upload.ps1` and just run it after the scraper finishes!

## 📝 Notes

- **First time setup**: ~10 minutes to scrape all packages
- **Subsequent runs**: ~10 minutes (same time, gets all packages)
- **Update frequency**: Weekly or monthly is fine (packages don't change that often)
- **No GitHub Actions needed**: Your local machine works perfectly!

## ❓ Troubleshooting

**Scraper fails locally too?**
- Check internet connection
- Try again (Chocolatey API sometimes has hiccups)
- Add `time.sleep(0.5)` in the loop for slower requests

**Can't create releases?**
- Make sure you have write access to the repo
- Use GitHub CLI for easier automation

**Files too large?**
- Use only the `.gz` file (compressed)
- Can skip uploading the uncompressed `.json` if needed
