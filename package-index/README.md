# SAVVY Package Index System

Lightning-fast local package search powered by automated index generation and GitHub Actions.

## 🎯 What This Does

Instead of hitting the Chocolatey/Winget APIs every time a user searches, SAVVY downloads a pre-built package index that enables:

- ⚡ **Lightning-fast search** - No network requests needed
- 🔍 **Semantic search** - Find packages by description, not just name
- 📴 **Offline-first** - Works without internet after first download
- 🔄 **Auto-updates** - Index refreshes daily via GitHub Actions

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│  GitHub Actions (Runs Daily at 2 AM)   │
│  - Scrapes Chocolatey API              │
│  - Filters to latest versions          │
│  - Compresses with gzip                 │
│  - Creates GitHub Release               │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  GitHub Releases (CDN)                  │
│  - choco-index.json.gz (~5-10MB)       │
│  - metadata.json                        │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  SAVVY App (Community & Enterprise)     │
│  - Downloads on first launch            │
│  - Checks for updates daily             │
│  - Decompresses and loads into memory   │
│  - Local search (no API calls!)         │
└─────────────────────────────────────────┘
```

## 📁 Directory Structure

```
package-index/
├── generator/           # Python scripts for scraping & indexing
│   ├── choco_scraper.py    # Chocolatey package scraper
│   ├── winget_scraper.py   # Winget package scraper (TODO)
│   └── requirements.txt    # Python dependencies
├── client/             # TypeScript client library (TODO)
│   ├── downloader.ts       # Download & update index
│   └── searcher.ts         # Local search implementation
└── docs/
    └── ARCHITECTURE.md     # Detailed architecture docs
```

## 🚀 How It Works

### 1. GitHub Actions (Automated)

The workflow runs **daily at 2 AM UTC** and:

1. ✅ Scrapes all packages from Chocolatey API
2. ✅ Filters to **latest version only** (reduces size by 80%)
3. ✅ Compresses with gzip (reduces size by 60-70%)
4. ✅ Creates a GitHub Release with the index files
5. ✅ Includes metadata (version, package count, checksums)

**Trigger Options:**
- ⏰ Automatic: Daily at 2 AM UTC
- 🔘 Manual: Click "Run workflow" in GitHub Actions tab
- 📝 On push: Triggers when generator code changes

### 2. SAVVY App (Client)

On first launch:
1. Check latest release from GitHub
2. Download `choco-index.json.gz` (~5-10 MB)
3. Decompress and load into memory
4. Ready for instant local search!

On subsequent launches:
1. Check if new release available (compare versions)
2. Download if index is >7 days old or new version exists
3. Otherwise use cached index

## 📊 Index Format

The index is a JSON object with this structure:

```json
{
  "package-id": {
    "id": "vscode",
    "title": "Visual Studio Code",
    "version": "1.85.0",
    "summary": "Code editor redefined and optimized for building and debugging modern web and cloud applications",
    "description": "Full description...",
    "downloads": 1234567,
    "tags": "microsoft visualstudio vscode editor ide",
    "lastUpdated": "2024-01-15T10:30:00Z",
    "authors": "Microsoft",
    "projectUrl": "https://code.visualstudio.com",
    "iconUrl": "https://...",
    "source": "chocolatey"
  }
}
```

## 🔧 Local Development

### Run the scraper locally:

```bash
cd package-index/generator

# Install dependencies
pip install -r requirements.txt

# Run scraper
python choco_scraper.py
```

This will create:
- `choco-index.json` - Uncompressed (~20-30 MB)
- `choco-index.json.gz` - Compressed (~5-10 MB)
- `metadata.json` - Version info and stats

### Test the GitHub Actions workflow:

1. Push changes to the `package-index/generator/` directory
2. Workflow will trigger automatically
3. Check the "Actions" tab in GitHub
4. View the created release in "Releases"

## 📈 Stats

Based on ~10,000 Chocolatey packages:

| Metric | Value |
|--------|-------|
| Total packages | ~10,000 |
| JSON uncompressed | ~20-30 MB |
| JSON compressed (gzip) | ~5-10 MB |
| Compression ratio | ~60-70% |
| GitHub Actions runtime | ~5-10 minutes |
| Download time (10 Mbps) | ~5-8 seconds |

## 🔮 Future Enhancements

### Phase 1 (Current)
- ✅ Chocolatey scraper
- ✅ GitHub Actions automation
- ✅ Gzip compression
- ✅ Metadata generation

### Phase 2 (Next)
- ⬜ Winget scraper (GitHub API)
- ⬜ Client downloader (TypeScript)
- ⬜ Simple string search
- ⬜ Integration into SAVVY

### Phase 3 (Future)
- ⬜ Semantic search with embeddings
- ⬜ Delta updates (only download changes)
- ⬜ Multiple language support
- ⬜ Search suggestions/autocomplete

## 🤝 Contributing

The package index system is separate from the main SAVVY app but serves both Community and Enterprise editions.

### To add a new package source:

1. Create a new scraper in `generator/` (e.g., `winget_scraper.py`)
2. Follow the same format as `choco_scraper.py`
3. Update the GitHub Actions workflow to run both scrapers
4. Create separate releases for each source

## 📝 License

Part of the SAVVY project. See root LICENSE file.

## 🙏 Acknowledgments

- Chocolatey Community for their excellent API
- GitHub Actions for free automation
- The SAVVY community for feedback and testing
