# SAVVY Package Index Generator

Enhanced Python scraper that fetches all Chocolatey packages, filters to latest versions, compresses the index, and publishes directly to GitHub Releases.

## Quick Start

### Run Once (Manual)

```bash
# Windows
python scraper_with_github.py

# Linux
python3 scraper_with_github.py
```

### Set Up Automation (Daily at 2 AM)

**Windows:**
```powershell
# Run as Administrator
.\setup_windows_scheduler.ps1
```

**Linux:**
```bash
chmod +x setup_linux_cron.sh
./setup_linux_cron.sh
```

## What It Does

1. **Fetches** all packages from Chocolatey API (~10,000+ packages)
2. **Filters** to latest version only (reduces size by 80%)
3. **Compresses** with gzip (reduces size by 70%)
4. **Publishes** to GitHub Releases automatically
5. **Logs** everything to `logs/` directory

## Files

- **`scraper_with_github.py`** - Main scraper with GitHub integration
- **`scheduler.py`** - Optional: Run as persistent service
- **`setup_windows_scheduler.ps1`** - Windows Task Scheduler setup
- **`setup_linux_cron.sh`** - Linux cron setup
- **`requirements.txt`** - Python dependencies

## Configuration

Set via environment variables:

```bash
export GITHUB_TOKEN="ghp_your_token_here"  # Required for publishing
export GITHUB_OWNER="trevorjbennett"       # Optional
export GITHUB_REPO="savvy_systems"         # Optional
export OUTPUT_DIR="."                       # Optional
```

## Output

Creates 3 files:
- `choco-index.json.gz` - Compressed index (~3-5 MB)
- `choco-index.json` - Uncompressed index (~12-15 MB)
- `metadata.json` - Stats and info

And publishes to:
```
https://github.com/trevorjbennett/savvy_systems/releases/tag/package-index-YYYY.MM.DD
```

## Logs

All runs are logged to:
```
logs/scraper_YYYYMMDD_HHMMSS.log
```

## Requirements

- Python 3.7+
- Internet connection
- GitHub Personal Access Token (with `repo` scope)

## Installation

```bash
pip install -r requirements.txt
```

Dependencies:
- `requests` - HTTP client for API calls
- `packaging` - Version comparison
- `schedule` - Task scheduling (only for scheduler.py)

## Documentation

- **[DEPLOYMENT.md](../DEPLOYMENT.md)** - Complete deployment guide
- **[MANUAL_UPLOAD.md](../MANUAL_UPLOAD.md)** - Alternative manual workflow

## Troubleshooting

**Token not found:**
```bash
# Set environment variable
export GITHUB_TOKEN="ghp_your_token_here"
```

**Python not found:**
```bash
# Linux
sudo apt install python3 python3-pip

# Windows
# Download from https://www.python.org/downloads/
```

**Dependencies fail to install:**
```bash
# Try with --user flag
pip install -r requirements.txt --user
```

**Script times out:**
- Check internet connection
- Chocolatey API may be slow (normal: 10-15 minutes)

## Examples

### Run manually and check output
```bash
python3 scraper_with_github.py
ls -lh choco-index.*
cat metadata.json
```

### Run without publishing to GitHub
```bash
unset GITHUB_TOKEN
python3 scraper_with_github.py
# Will generate files locally but skip GitHub release
```

### Test scheduling (runs immediately)
```bash
python3 scheduler.py --now
```

## Support

Issues or questions? See [DEPLOYMENT.md](../DEPLOYMENT.md) or open an issue on GitHub.
