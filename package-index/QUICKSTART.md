# Package Index Quick Start

Get the package index system running in 5 minutes.

## 🚀 Step 1: Push to GitHub

```bash
# Navigate to your repo
cd c:\Users\Jae\savvy_new

# Add the new files
git add package-index/
git add .github/workflows/update-package-index.yml

# Commit
git commit -m "Add automated package index system

- Python scraper for Chocolatey packages
- GitHub Actions workflow for daily updates
- Auto-creates releases with compressed index
- ~5-10 MB compressed package database
"

# Push to GitHub
git push origin main
```

## 🎯 Step 2: Trigger the Workflow

### Option A: Manual Trigger (Recommended for first run)

1. Go to your GitHub repo: `https://github.com/trevorjbennett/savvy_systems`
2. Click **"Actions"** tab
3. Click **"Update Package Index"** workflow
4. Click **"Run workflow"** button
5. Select branch (main) and click green **"Run workflow"**
6. Wait 5-10 minutes for it to complete

### Option B: Wait for Automatic (Daily at 2 AM UTC)

The workflow will run automatically every day at 2 AM UTC.

## ✅ Step 3: Verify the Release

1. Go to **"Releases"** in your GitHub repo
2. You should see a new release named like: `choco-index-2025-01-30T12:34:56Z`
3. It should contain 3 files:
   - `choco-index.json.gz` (~5-10 MB) - **Use this in production**
   - `choco-index.json` (~20-30 MB) - For debugging
   - `metadata.json` - Version info

## 📥 Step 4: Download & Test Locally

```bash
# Download the compressed index
curl -L -o choco-index.json.gz https://github.com/trevorjbennett/savvy_systems/releases/latest/download/choco-index.json.gz

# Decompress
gunzip choco-index.json.gz

# View a sample (first 50 lines)
head -n 50 choco-index.json
```

## 🔍 Step 5: Search the Index (Quick Python Test)

Create a test script `test_search.py`:

```python
import json

# Load the index
with open('choco-index.json', 'r') as f:
    packages = json.load(f)

# Simple search function
def search(query):
    query = query.lower()
    results = []
    for pkg_id, pkg_data in packages.items():
        if query in pkg_id.lower() or query in pkg_data.get('title', '').lower() or query in pkg_data.get('summary', '').lower():
            results.append(pkg_data)
    return results

# Test searches
print("Searching for 'python':")
results = search('python')
for pkg in results[:5]:  # Show first 5
    print(f"  - {pkg['title']} (v{pkg['version']}) - {pkg.get('downloads', 0)} downloads")

print("\nSearching for 'editor':")
results = search('editor')
for pkg in results[:5]:
    print(f"  - {pkg['title']} (v{pkg['version']}) - {pkg.get('downloads', 0)} downloads")
```

Run it:
```bash
python test_search.py
```

## 🎉 Done!

You now have:
- ✅ Automated daily package index generation
- ✅ GitHub Actions running the scraper
- ✅ Releases with compressed index files
- ✅ A working local search example

## 🔧 Troubleshooting

### Workflow fails with "Permission denied"

Make sure your repo has the correct permissions:
1. Go to repo **Settings** → **Actions** → **General**
2. Under **"Workflow permissions"**, select:
   - ✅ **"Read and write permissions"**
3. Save and re-run the workflow

### No releases created

Check the workflow logs:
1. Go to **Actions** tab
2. Click on the failed workflow run
3. Check each step for errors
4. Common issues:
   - Python dependencies not installing
   - Chocolatey API timeout
   - GitHub token permissions

### Index seems outdated

The workflow runs daily at 2 AM UTC. To force an update:
1. Go to **Actions** → **Update Package Index**
2. Click **"Run workflow"**
3. Wait for it to complete

### Want to test without creating a release?

Comment out the "Create Release" step in `.github/workflows/update-package-index.yml`:

```yaml
# - name: Create Release
#   if: steps.check-changes.outputs.should_release == 'true'
#   uses: softprops/action-gh-release@v1
#   ...
```

The scraper will still run and you can download the artifacts from the workflow run.

## 🚀 Next Steps

1. **Integrate into SAVVY**: Create a TypeScript client to download and search the index
2. **Add Winget**: Create `winget_scraper.py` and update workflow
3. **Add semantic search**: Integrate embeddings for "smart" search
4. **Optimize**: Add delta updates, caching, etc.

See the main [README.md](README.md) for more details!
