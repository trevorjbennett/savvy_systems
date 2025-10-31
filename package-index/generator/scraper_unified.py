"""
Unified Package Index Scraper
Runs both Chocolatey and Winget scrapers, then publishes to a single GitHub Release.
"""
import requests
import time
import json
import os
import sys
import logging
from datetime import datetime
from pathlib import Path

# Import the individual scrapers
import scraper_nexus
import scraper_winget

# Configuration
GITHUB_TOKEN = os.environ.get('GITHUB_TOKEN', '')
GITHUB_OWNER = os.environ.get('GITHUB_OWNER', 'trevorjbennett')
GITHUB_REPO = os.environ.get('GITHUB_REPO', 'savvy_systems')
OUTPUT_DIR = os.environ.get('OUTPUT_DIR', '.')

# Setup logging
log_dir = Path(OUTPUT_DIR) / 'logs'
log_dir.mkdir(exist_ok=True)
log_file = log_dir / f'scraper_unified_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_file),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)


def create_unified_github_release(choco_metadata, choco_files, winget_metadata, winget_files):
    """Create a single GitHub Release with both Chocolatey and Winget assets."""
    if not GITHUB_TOKEN:
        logger.error("GITHUB_TOKEN not set! Cannot create release.")
        logger.error("Set environment variable: GITHUB_TOKEN=ghp_your_token")
        return False

    tag = f"package-index-{choco_metadata['version']}"
    release_name = f"Package Index - {choco_metadata['version']}"

    logger.info(f"Creating unified GitHub Release: {tag}")

    headers = {
        "Authorization": f"Bearer {GITHUB_TOKEN}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28"
    }

    # Check if release exists and delete it
    get_url = f"https://api.github.com/repos/{GITHUB_OWNER}/{GITHUB_REPO}/releases/tags/{tag}"
    try:
        response = requests.get(get_url, headers=headers)
        if response.status_code == 200:
            release_id = response.json()['id']
            delete_url = f"https://api.github.com/repos/{GITHUB_OWNER}/{GITHUB_REPO}/releases/{release_id}"
            requests.delete(delete_url, headers=headers)
            logger.info(f"Deleted existing release: {tag}")
    except Exception as e:
        logger.debug(f"No existing release to delete: {e}")

    # Create release body with both Chocolatey and Winget info
    body = f"""## Package Index (Chocolatey + Winget)

**Version**: {choco_metadata['version']}
**Generated**: {choco_metadata['generated']}

### Chocolatey Index

**Total Packages**: {choco_metadata['packageCount']:,}
**Source**: Nexus proxy of Chocolatey repository

**Download URLs:**
- [choco-index.json.gz](https://github.com/{GITHUB_OWNER}/{GITHUB_REPO}/releases/download/{tag}/choco-index.json.gz) (recommended)
- [choco-index.json](https://github.com/{GITHUB_OWNER}/{GITHUB_REPO}/releases/download/{tag}/choco-index.json)
- [metadata.json](https://github.com/{GITHUB_OWNER}/{GITHUB_REPO}/releases/download/{tag}/metadata.json)

**File Sizes:**
- Compressed: {choco_metadata['compressedSize'] / 1024 / 1024:.2f} MB
- Uncompressed: {choco_metadata['uncompressedSize'] / 1024 / 1024:.2f} MB
- Compression: {choco_metadata['compressionRatio']}

### Winget Index

**Total Packages**: {winget_metadata['packageCount']:,}
**Source**: Microsoft winget-pkgs repository

**Download URLs:**
- [winget-index.json.gz](https://github.com/{GITHUB_OWNER}/{GITHUB_REPO}/releases/download/{tag}/winget-index.json.gz) (recommended)
- [winget-index.json](https://github.com/{GITHUB_OWNER}/{GITHUB_REPO}/releases/download/{tag}/winget-index.json)
- [winget-metadata.json](https://github.com/{GITHUB_OWNER}/{GITHUB_REPO}/releases/download/{tag}/winget-metadata.json)

**File Sizes:**
- Compressed: {winget_metadata['compressedSize'] / 1024 / 1024:.2f} MB
- Uncompressed: {winget_metadata['uncompressedSize'] / 1024 / 1024:.2f} MB
- Compression: {winget_metadata['compressionRatio']}

---

🐳 Generated automatically by Docker + Nexus
"""

    # Create the release
    create_url = f"https://api.github.com/repos/{GITHUB_OWNER}/{GITHUB_REPO}/releases"
    release_data = {
        "tag_name": tag,
        "name": release_name,
        "body": body,
        "draft": False,
        "prerelease": False
    }

    try:
        logger.info("Creating unified release...")
        response = requests.post(create_url, headers=headers, json=release_data)
        response.raise_for_status()
        release = response.json()
        upload_url = release['upload_url'].replace('{?name,label}', '')
        logger.info(f"Release created: {release['html_url']}")

        # Upload all assets (Chocolatey + Winget)
        all_files = choco_files + winget_files
        for file_path in all_files:
            file_path = Path(file_path)
            logger.info(f"Uploading {file_path.name}...")

            content_types = {
                '.gz': 'application/gzip',
                '.json': 'application/json'
            }
            content_type = content_types.get(file_path.suffix, 'application/octet-stream')

            upload_headers = {
                **headers,
                "Content-Type": content_type
            }

            with open(file_path, 'rb') as f:
                file_data = f.read()

            upload_response = requests.post(
                f"{upload_url}?name={file_path.name}",
                headers=upload_headers,
                data=file_data
            )
            upload_response.raise_for_status()
            logger.info(f"  {file_path.name} uploaded successfully")

        logger.info(f"\nGitHub Release published successfully!")
        logger.info(f"  URL: {release['html_url']}")
        return True

    except requests.exceptions.RequestException as e:
        logger.error(f"Error creating GitHub release: {e}")
        if hasattr(e.response, 'text'):
            logger.error(f"Response: {e.response.text}")
        return False


def main():
    """Main execution function."""
    start_time = time.time()
    logger.info("=" * 70)
    logger.info("Unified Package Index Generator (Chocolatey + Winget)")
    logger.info("=" * 70)
    logger.info(f"Log file: {log_file}")
    logger.info("")

    if not GITHUB_TOKEN:
        logger.error("GITHUB_TOKEN not set! Cannot create release.")
        return 1

    # Step 1: Run Chocolatey scraper
    logger.info("=" * 70)
    logger.info("Step 1: Fetching Chocolatey packages...")
    logger.info("=" * 70)

    # Wait for Nexus
    if not scraper_nexus.wait_for_nexus():
        logger.error("Nexus not ready. Exiting.")
        return 1

    # Fetch Chocolatey packages
    choco_all_versions = scraper_nexus.get_all_choco_package_versions()
    if not choco_all_versions:
        logger.error("No Chocolatey packages fetched. Exiting.")
        return 1

    # Group packages with all versions
    logger.info("Grouping Chocolatey packages with all versions...")
    choco_grouped_packages = {}
    for pkg in choco_all_versions:
        pkg_id = pkg.get('Id')
        if not pkg_id:
            continue

        if pkg_id not in choco_grouped_packages:
            choco_grouped_packages[pkg_id] = {
                "id": pkg_id,
                "title": pkg.get('Title') or pkg_id,
                "versions": []
            }

        version_info = {
            "version": pkg.get('Version'),
            "summary": pkg.get('Summary', ''),
            "downloads": pkg.get('DownloadCount', 0),
            "tags": pkg.get('Tags', ''),
            "lastUpdated": pkg.get('LastUpdated', '')
        }
        choco_grouped_packages[pkg_id]["versions"].append(version_info)

    logger.info(f"Grouped into {len(choco_grouped_packages)} unique Chocolatey packages.")

    # Save Chocolatey index
    choco_metadata, choco_files = scraper_nexus.save_index(choco_grouped_packages, OUTPUT_DIR)

    # Step 2: Run Winget scraper
    logger.info("")
    logger.info("=" * 70)
    logger.info("Step 2: Fetching Winget packages...")
    logger.info("=" * 70)

    winget_packages = scraper_winget.get_all_winget_packages()
    if not winget_packages:
        logger.error("No Winget packages fetched. Exiting.")
        return 1

    # Save Winget index
    winget_metadata, winget_files = scraper_winget.save_winget_index(winget_packages, OUTPUT_DIR)

    # Step 3: Create unified GitHub Release
    logger.info("")
    logger.info("=" * 70)
    logger.info("Step 3: Publishing to GitHub...")
    logger.info("=" * 70)

    success = create_unified_github_release(choco_metadata, choco_files, winget_metadata, winget_files)
    if not success:
        logger.error("Failed to create GitHub release")
        return 1

    # Done!
    duration = time.time() - start_time
    logger.info("")
    logger.info("=" * 70)
    logger.info(f"Complete! Duration: {duration / 60:.2f} minutes")
    logger.info("=" * 70)
    return 0


if __name__ == "__main__":
    try:
        exit_code = main()
        sys.exit(exit_code)
    except KeyboardInterrupt:
        logger.info("\n\nInterrupted by user")
        sys.exit(130)
    except Exception as e:
        logger.exception(f"Unexpected error: {e}")
        sys.exit(1)
