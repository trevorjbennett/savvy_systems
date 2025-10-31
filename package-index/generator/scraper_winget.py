"""
Enhanced Winget Package Index Scraper
Fetches package data from winget-pkgs GitHub repository REST API.
"""
import requests
import time
import json
import gzip
import os
import sys
import logging
from datetime import datetime
from pathlib import Path

# Configuration
GITHUB_TOKEN = os.environ.get('GITHUB_TOKEN', '')
OUTPUT_DIR = os.environ.get('OUTPUT_DIR', '.')

# Setup logging
log_dir = Path(OUTPUT_DIR) / 'logs'
log_dir.mkdir(exist_ok=True)
log_file = log_dir / f'scraper_winget_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_file),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)


def get_all_winget_packages():
    """
    Fetches all package manifests from winget-pkgs repository.
    Uses GitHub tree API to get all manifests at once (much faster).
    """
    logger.info("Fetching winget packages from GitHub tree API...")
    logger.info("This will take a few minutes...")

    headers = {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28"
    }

    if GITHUB_TOKEN:
        headers["Authorization"] = f"Bearer {GITHUB_TOKEN}"

    all_packages = {}

    try:
        # Get the full repository tree recursively
        # This is much faster than crawling directory by directory
        tree_url = "https://api.github.com/repos/microsoft/winget-pkgs/git/trees/master?recursive=1"
        logger.info("Fetching complete repository tree (one request)...")
        response = requests.get(tree_url, headers=headers, timeout=120)
        response.raise_for_status()

        tree_data = response.json()
        tree_items = tree_data.get('tree', [])

        logger.info(f"Retrieved {len(tree_items)} items from repository")
        logger.info("Processing manifest directories...")

        # Parse the directory structure
        # Structure: manifests/<letter>/<publisher>/<package>/<version>/
        for item in tree_items:
            path = item['path']

            # Only process version directories (tree type, 5 parts in path)
            if not path.startswith('manifests/') or item['type'] != 'tree':
                continue

            parts = path.split('/')
            if len(parts) == 5:  # manifests/letter/publisher/package/version
                letter, publisher, package_name, version = parts[1], parts[2], parts[3], parts[4]

                package_id = f"{publisher}.{package_name}"

                if package_id not in all_packages:
                    all_packages[package_id] = {
                        "id": package_id,
                        "title": package_name,
                        "publisher": publisher,
                        "versions": []
                    }

                # Add version if not already present
                if not any(v['version'] == version for v in all_packages[package_id]['versions']):
                    version_info = {
                        "version": version
                    }
                    all_packages[package_id]["versions"].append(version_info)

        logger.info(f"Finished processing. Found {len(all_packages)} unique winget packages.")

        # Log some statistics
        total_versions = sum(len(pkg['versions']) for pkg in all_packages.values())
        logger.info(f"Total package versions: {total_versions}")

        return all_packages

    except requests.exceptions.RequestException as e:
        logger.error(f"Error fetching from GitHub: {e}")
        if hasattr(e, 'response') and e.response:
            logger.error(f"Response status: {e.response.status_code}")
        return {}
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return {}


def save_winget_index(packages_dict, output_dir="."):
    """Save the winget index files locally."""
    timestamp = datetime.utcnow().isoformat() + "Z"
    version = datetime.utcnow().strftime("%Y.%m.%d")

    metadata = {
        "version": version,
        "packageCount": len(packages_dict),
        "source": "winget-pkgs-github",
        "generated": timestamp,
        "generator": "python-scraper-winget"
    }

    output_path = Path(output_dir)
    output_path.mkdir(exist_ok=True)

    # Save uncompressed JSON
    json_filename = output_path / "winget-index.json"
    logger.info(f"Saving uncompressed winget index to {json_filename}...")
    with open(json_filename, "w", encoding="utf-8") as f:
        json.dump(packages_dict, f, indent=2)

    # Save compressed JSON
    gz_filename = output_path / "winget-index.json.gz"
    logger.info(f"Saving compressed winget index to {gz_filename}...")
    with gzip.open(gz_filename, "wt", encoding="utf-8") as f:
        json.dump(packages_dict, f, separators=(',', ':'))

    # Update metadata with file sizes
    metadata["uncompressedSize"] = json_filename.stat().st_size
    metadata["compressedSize"] = gz_filename.stat().st_size
    metadata["compressionRatio"] = f"{(1 - metadata['compressedSize'] / metadata['uncompressedSize']) * 100:.1f}%"

    # Save metadata
    metadata_filename = output_path / "winget-metadata.json"
    logger.info(f"Saving winget metadata to {metadata_filename}...")
    with open(metadata_filename, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    logger.info(f"Winget package index created successfully!")
    logger.info(f"  - Packages: {metadata['packageCount']}")
    logger.info(f"  - Uncompressed: {metadata['uncompressedSize'] / 1024 / 1024:.2f} MB")
    logger.info(f"  - Compressed: {metadata['compressedSize'] / 1024 / 1024:.2f} MB")
    logger.info(f"  - Compression: {metadata['compressionRatio']}")

    return metadata, [json_filename, gz_filename, metadata_filename]


def main():
    """Main execution function."""
    start_time = time.time()
    logger.info("=" * 70)
    logger.info("Winget Package Index Generator")
    logger.info("=" * 70)
    logger.info(f"Log file: {log_file}")
    logger.info("")

    if not GITHUB_TOKEN:
        logger.warning("GITHUB_TOKEN not set - GitHub API rate limits will be strict (60 requests/hour)")

    # Fetch packages from winget-pkgs
    all_packages = get_all_winget_packages()
    if not all_packages:
        logger.error("No packages fetched. Exiting.")
        return 1

    # Save index files
    metadata, files = save_winget_index(all_packages, OUTPUT_DIR)

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
