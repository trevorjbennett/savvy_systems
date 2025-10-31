"""
Enhanced Chocolatey Package Index Scraper - Nexus Version
Fetches from local Nexus mirror instead of Chocolatey API to avoid rate limiting.
"""
import requests
import time
import json
import gzip
import os
import sys
import logging
import xml.etree.ElementTree as ET
from datetime import datetime
from packaging import version as version_parser
from pathlib import Path

# Configuration
GITHUB_TOKEN = os.environ.get('GITHUB_TOKEN', '')
GITHUB_OWNER = os.environ.get('GITHUB_OWNER', 'trevorjbennett')
GITHUB_REPO = os.environ.get('GITHUB_REPO', 'savvy_systems')
OUTPUT_DIR = os.environ.get('OUTPUT_DIR', '.')
NEXUS_URL = os.environ.get('NEXUS_URL', 'http://nexus:8081/repository/chocolatey-proxy/')

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


def wait_for_nexus(max_retries=30, retry_interval=10):
    """Wait for Nexus to be ready before scraping."""
    nexus_base = NEXUS_URL.rstrip('/')
    health_url = nexus_base.replace('/repository/chocolatey-proxy', '')

    logger.info(f"Waiting for Nexus to be ready at {health_url}...")

    for i in range(max_retries):
        try:
            response = requests.get(health_url, timeout=5)
            if response.status_code < 500:
                logger.info("Nexus is ready!")
                return True
        except requests.exceptions.RequestException as e:
            logger.debug(f"Nexus not ready yet (attempt {i+1}/{max_retries}): {e}")

        if i < max_retries - 1:
            time.sleep(retry_interval)

    logger.error("Nexus did not become ready in time")
    return False


def get_all_choco_package_versions():
    """
    Fetches all package versions from Nexus mirror of Chocolatey.
    Uses the NuGet v2 OData API that Nexus proxies.
    """
    # Nexus repository proxies the NuGet feed
    # URL format: http://nexus:8081/repository/chocolatey-proxy/Packages
    nexus_base = NEXUS_URL.rstrip('/')
    base_url = nexus_base + '/Packages'

    params = {
        "$orderby": "Id,Version"
    }

    # Nexus returns XML (Atom feed format)
    headers = {"Accept": "application/atom+xml"}

    all_package_versions = []
    page_count = 0
    next_page_url = base_url

    # XML namespaces
    namespaces = {
        'd': 'http://schemas.microsoft.com/ado/2007/08/dataservices',
        'm': 'http://schemas.microsoft.com/ado/2007/08/dataservices/metadata',
        'atom': 'http://www.w3.org/2005/Atom'
    }

    logger.info(f"Fetching packages from Nexus mirror: {NEXUS_URL}")
    logger.info("This will take several minutes...")

    try:
        while next_page_url:
            page_count += 1
            logger.info(f"Fetching page {page_count}...")

            response = requests.get(next_page_url, headers=headers, params=params, timeout=60)

            # Params only needed for first request
            if params:
                params = None

            response.raise_for_status()

            # Parse XML response
            root = ET.fromstring(response.content)

            # Extract entries from Atom feed
            entries = root.findall('atom:entry', namespaces)

            for entry in entries:
                properties = entry.find('m:properties', namespaces)
                if properties is not None:
                    pkg_data = {
                        'Id': properties.findtext('d:Id', '', namespaces) or properties.findtext('d:Title', '', namespaces),
                        'Version': properties.findtext('d:Version', '', namespaces),
                        'Title': entry.findtext('atom:title', '', namespaces),
                        'Summary': entry.findtext('atom:summary', '', namespaces),
                        'DownloadCount': int(properties.findtext('d:DownloadCount', '0', namespaces) or '0'),
                        'Tags': properties.findtext('d:Tags', '', namespaces),
                        'LastUpdated': entry.findtext('atom:updated', '', namespaces)
                    }
                    all_package_versions.append(pkg_data)

            logger.info(f"  Retrieved {len(entries)} packages (total: {len(all_package_versions)})")

            # Check for next page link
            next_link = root.find("atom:link[@rel='next']", namespaces)
            next_page_url = next_link.get('href') if next_link is not None else None

            # If relative URL, make it absolute
            if next_page_url and not next_page_url.startswith('http'):
                next_page_url = nexus_base + '/' + next_page_url

            # Be nice to Nexus
            time.sleep(0.1)

    except requests.exceptions.RequestException as e:
        logger.error(f"Error fetching data from Nexus: {e}")
        logger.error(f"URL attempted: {next_page_url if next_page_url else base_url}")
        return []
    except ET.ParseError as e:
        logger.error(f"Error parsing XML: {e}")
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
                "source": "chocolatey-nexus"
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
        "source": "chocolatey-nexus",
        "generated": timestamp,
        "generator": "python-scraper-nexus"
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

    logger.info(f"Package index created successfully!")
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
    body = f"""## Chocolatey Package Index (via Nexus Mirror)

**Version**: {metadata['version']}
**Generated**: {metadata['generated']}
**Total Packages**: {metadata['packageCount']:,}
**Source**: Nexus proxy of Chocolatey repository

### Download URLs

- **Compressed Index** (recommended): [choco-index.json.gz](https://github.com/{GITHUB_OWNER}/{GITHUB_REPO}/releases/download/{tag}/choco-index.json.gz)
- **Uncompressed Index**: [choco-index.json](https://github.com/{GITHUB_OWNER}/{GITHUB_REPO}/releases/download/{tag}/choco-index.json)
- **Metadata**: [metadata.json](https://github.com/{GITHUB_OWNER}/{GITHUB_REPO}/releases/download/{tag}/metadata.json)

### File Sizes

- Compressed: {metadata['compressedSize'] / 1024 / 1024:.2f} MB
- Uncompressed: {metadata['uncompressedSize'] / 1024 / 1024:.2f} MB
- Compression Ratio: {metadata['compressionRatio']}

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
        logger.info("Creating release...")
        response = requests.post(create_url, headers=headers, json=release_data)
        response.raise_for_status()
        release = response.json()
        upload_url = release['upload_url'].replace('{?name,label}', '')
        logger.info(f"Release created: {release['html_url']}")

        # Upload assets
        for file_path in files:
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
    logger.info("Chocolatey Package Index Generator (Nexus Mirror)")
    logger.info("=" * 70)
    logger.info(f"Log file: {log_file}")
    logger.info(f"Nexus URL: {NEXUS_URL}")
    logger.info("")

    # Wait for Nexus to be ready
    if not wait_for_nexus():
        logger.error("Cannot proceed without Nexus")
        return 1

    # Validate configuration
    if not GITHUB_TOKEN:
        logger.warning("GITHUB_TOKEN not set - will skip GitHub release creation")

    # Step 1: Fetch packages from Nexus
    all_versions = get_all_choco_package_versions()
    if not all_versions:
        logger.error("No packages fetched. Exiting.")
        return 1

    # Step 2: Group packages with all versions
    logger.info("Grouping packages with all versions...")
    grouped_packages = {}
    for pkg in all_versions:
        pkg_id = pkg.get('Id')
        if not pkg_id:
            continue

        if pkg_id not in grouped_packages:
            grouped_packages[pkg_id] = {
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
        grouped_packages[pkg_id]["versions"].append(version_info)

    logger.info(f"Grouped into {len(grouped_packages)} unique packages with all versions.")

    if not grouped_packages:
        logger.error("No packages after grouping. Exiting.")
        return 1

    # Step 3: Save index files
    metadata, files = save_index(grouped_packages, OUTPUT_DIR)

    # Step 4: Create GitHub Release
    if GITHUB_TOKEN:
        success = create_github_release(metadata, files)
        if not success:
            logger.error("Failed to create GitHub release")
            return 1
    else:
        logger.warning("Skipping GitHub release (no token provided)")

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
