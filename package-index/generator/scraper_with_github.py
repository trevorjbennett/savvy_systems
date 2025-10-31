"""
Enhanced Chocolatey Package Index Scraper with GitHub Releases Integration
Runs standalone, publishes directly to GitHub, and can be scheduled to run daily at 2 AM.
"""
import requests
import time
import json
import gzip
import os
import sys
import logging
from datetime import datetime
from packaging import version as version_parser
from pathlib import Path

# Configuration (can be set via environment variables)
GITHUB_TOKEN = os.environ.get('GITHUB_TOKEN', '')
GITHUB_OWNER = os.environ.get('GITHUB_OWNER', 'trevorjbennett')
GITHUB_REPO = os.environ.get('GITHUB_REPO', 'savvy_systems')
OUTPUT_DIR = os.environ.get('OUTPUT_DIR', '.')

# Setup logging
log_dir = Path(OUTPUT_DIR) / 'logs'
log_dir.mkdir(exist_ok=True)
log_file = log_dir / f'scraper_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_file),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)


def get_all_choco_package_versions():
    """
    Fetches all package versions from Chocolatey community feed.
    EXACT COPY of working code from choco_repo_main.py
    """
    base_url = "https://community.chocolatey.org/api/v2/Packages"

    # Parameters to select all the desired fields.
    # We order by Id and then Version to ensure the data is consistent for grouping.
    params = {
        "$select": "Id,Version,Title,Summary,DownloadCount,Tags,LastUpdated",
        "$orderby": "Id,Version"
    }

    headers = {"Accept": "application/json"}

    all_package_versions = []
    page_count = 0
    next_page_url = base_url

    logger.info("Starting to fetch package data from Chocolatey community feed...")
    logger.info("This will be slower as more data is being retrieved per package.")

    try:
        while next_page_url:
            page_count += 1
            logger.info(f"Fetching page {page_count}...")

            # Make the HTTP GET request.
            response = requests.get(next_page_url, headers=headers, params=params, timeout=60)

            # Params are only needed for the first request.
            if params:
                params = None

            response.raise_for_status()
            data = response.json()

            # The package list is in the 'd.results' key.
            results = data.get('d', {}).get('results', [])
            all_package_versions.extend(results)
            logger.info(f"  Retrieved {len(results)} packages (total: {len(all_package_versions)})")

            # The link to the next page of results.
            next_page_url = data.get('d', {}).get('__next', None)

            time.sleep(0.1)

    except requests.exceptions.RequestException as e:
        logger.error(f"Error fetching data: {e}")
        return []
    except json.JSONDecodeError as e:
        logger.error(f"Error parsing JSON: {e}")
        return []

    logger.info(f"Finished fetching. Retrieved {len(all_package_versions)} total package versions.")
    return all_package_versions


def get_latest_versions(flat_list):
    """Filter to latest version per package."""
    logger.info("Filtering to latest versions only...")
    latest_packages = {}

    for pkg in flat_list:
        pkg_id = pkg.get('Id')
        pkg_version = pkg.get('Version')

        if not pkg_id or not pkg_version:
            continue

        if pkg_id not in latest_packages:
            latest_packages[pkg_id] = {
                "id": pkg_id,
                "title": pkg.get('Title') or pkg_id,
                "version": pkg_version,
                "summary": pkg.get('Summary', ''),
                "downloads": pkg.get('DownloadCount', 0),
                "tags": pkg.get('Tags', ''),
                "lastUpdated": pkg.get('LastUpdated', ''),
                "source": "chocolatey"
            }
        else:
            try:
                current_ver = version_parser.parse(latest_packages[pkg_id]['version'])
                new_ver = version_parser.parse(pkg_version)
                if new_ver > current_ver:
                    latest_packages[pkg_id]['version'] = pkg_version
                    latest_packages[pkg_id]['title'] = pkg.get('Title') or pkg_id
                    latest_packages[pkg_id]['summary'] = pkg.get('Summary', '')
                    latest_packages[pkg_id]['downloads'] = pkg.get('DownloadCount', 0)
                    latest_packages[pkg_id]['tags'] = pkg.get('Tags', '')
                    latest_packages[pkg_id]['lastUpdated'] = pkg.get('LastUpdated', '')
            except Exception as e:
                logger.debug(f"Version comparison failed for {pkg_id}: {e}")

    logger.info(f"Filtered to {len(latest_packages)} unique packages (latest versions only).")
    return latest_packages


def save_index(packages_dict, output_dir="."):
    """Save the index files locally."""
    timestamp = datetime.utcnow().isoformat() + "Z"
    version = datetime.utcnow().strftime("%Y.%m.%d")

    metadata = {
        "version": version,
        "packageCount": len(packages_dict),
        "source": "chocolatey",
        "generated": timestamp,
        "generator": "python-scraper"
    }

    output_path = Path(output_dir)
    output_path.mkdir(exist_ok=True)

    # Save uncompressed JSON
    json_filename = output_path / "choco-index.json"
    logger.info(f"Saving uncompressed index to {json_filename}...")
    with open(json_filename, "w", encoding="utf-8") as f:
        json.dump(packages_dict, f, indent=2)

    # Save compressed JSON
    gz_filename = output_path / "choco-index.json.gz"
    logger.info(f"Saving compressed index to {gz_filename}...")
    with gzip.open(gz_filename, "wt", encoding="utf-8") as f:
        json.dump(packages_dict, f, separators=(',', ':'))

    # Update metadata with file sizes
    metadata["uncompressedSize"] = json_filename.stat().st_size
    metadata["compressedSize"] = gz_filename.stat().st_size
    metadata["compressionRatio"] = f"{(1 - metadata['compressedSize'] / metadata['uncompressedSize']) * 100:.1f}%"

    # Save metadata
    metadata_filename = output_path / "metadata.json"
    logger.info(f"Saving metadata to {metadata_filename}...")
    with open(metadata_filename, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    logger.info(f"✓ Package index created successfully!")
    logger.info(f"  - Packages: {metadata['packageCount']}")
    logger.info(f"  - Uncompressed: {metadata['uncompressedSize'] / 1024 / 1024:.2f} MB")
    logger.info(f"  - Compressed: {metadata['compressedSize'] / 1024 / 1024:.2f} MB")
    logger.info(f"  - Compression: {metadata['compressionRatio']}")

    return metadata, [json_filename, gz_filename, metadata_filename]


def create_github_release(metadata, files):
    """Create GitHub Release and upload assets."""
    if not GITHUB_TOKEN:
        logger.error("GITHUB_TOKEN not set! Cannot create release.")
        logger.error("Set environment variable: GITHUB_TOKEN=ghp_your_token")
        return False

    tag = f"package-index-{metadata['version']}"
    release_name = f"Chocolatey Package Index - {metadata['version']}"

    logger.info(f"Creating GitHub Release: {tag}")

    # GitHub API headers
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

    # Create release body
    body = f"""## Chocolatey Package Index

**Version**: {metadata['version']}
**Generated**: {metadata['generated']}
**Total Packages**: {metadata['packageCount']:,}

### Download URLs

- **Compressed Index** (recommended): [choco-index.json.gz](https://github.com/{GITHUB_OWNER}/{GITHUB_REPO}/releases/download/{tag}/choco-index.json.gz)
- **Uncompressed Index**: [choco-index.json](https://github.com/{GITHUB_OWNER}/{GITHUB_REPO}/releases/download/{tag}/choco-index.json)
- **Metadata**: [metadata.json](https://github.com/{GITHUB_OWNER}/{GITHUB_REPO}/releases/download/{tag}/metadata.json)

### File Sizes

- Compressed: {metadata['compressedSize'] / 1024 / 1024:.2f} MB
- Uncompressed: {metadata['uncompressedSize'] / 1024 / 1024:.2f} MB
- Compression Ratio: {metadata['compressionRatio']}

🤖 Generated automatically by Python scraper running locally
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
        logger.info("Creating release...")
        response = requests.post(create_url, headers=headers, json=release_data)
        response.raise_for_status()
        release = response.json()
        upload_url = release['upload_url'].replace('{?name,label}', '')
        logger.info(f"✓ Release created: {release['html_url']}")

        # Upload assets
        for file_path in files:
            file_path = Path(file_path)
            logger.info(f"Uploading {file_path.name}...")

            # Determine content type
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
            logger.info(f"  ✓ {file_path.name} uploaded successfully")

        logger.info(f"\n✓ GitHub Release published successfully!")
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
    logger.info("Chocolatey Package Index Generator with GitHub Integration")
    logger.info("=" * 70)
    logger.info(f"Log file: {log_file}")
    logger.info("")

    # Validate configuration
    if not GITHUB_TOKEN:
        logger.warning("GITHUB_TOKEN not set - will skip GitHub release creation")
        logger.warning("Set environment variable: GITHUB_TOKEN=ghp_your_token")

    # Step 1: Fetch packages
    all_versions = get_all_choco_package_versions()
    if not all_versions:
        logger.error("❌ No packages fetched. Exiting.")
        return 1

    # Step 2: Filter to latest versions
    latest_packages = get_latest_versions(all_versions)
    if not latest_packages:
        logger.error("❌ No packages after filtering. Exiting.")
        return 1

    # Step 3: Save index files
    metadata, files = save_index(latest_packages, OUTPUT_DIR)

    # Step 4: Create GitHub Release
    if GITHUB_TOKEN:
        success = create_github_release(metadata, files)
        if not success:
            logger.error("❌ Failed to create GitHub release")
            return 1
    else:
        logger.warning("⚠️  Skipping GitHub release (no token provided)")

    # Done!
    duration = time.time() - start_time
    logger.info("")
    logger.info("=" * 70)
    logger.info(f"✓ Complete! Duration: {duration / 60:.2f} minutes")
    logger.info("=" * 70)
    return 0


if __name__ == "__main__":
    try:
        exit_code = main()
        sys.exit(exit_code)
    except KeyboardInterrupt:
        logger.info("\n\n⚠️  Interrupted by user")
        sys.exit(130)
    except Exception as e:
        logger.exception(f"❌ Unexpected error: {e}")
        sys.exit(1)
