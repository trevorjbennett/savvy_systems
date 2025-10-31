"""
Direct Chocolatey API Scraper
Queries chocolatey.org API directly to get ALL packages
"""
import requests
import json
import time
import logging
from pathlib import Path
from typing import List, Dict
import gzip

logger = logging.getLogger(__name__)

CHOCOLATEY_API = "https://community.chocolatey.org/api/v2/Packages"
OUTPUT_DIR = Path(".")


def fetch_all_chocolatey_packages() -> List[Dict]:
    """
    Fetch ALL packages from Chocolatey API using pagination

    Returns:
        List of package dictionaries
    """
    all_packages = []
    skip = 0
    top = 100  # Fetch 100 packages per request

    logger.info(f"Fetching packages from Chocolatey API: {CHOCOLATEY_API}")
    logger.info("This will take several minutes...")

    page_count = 0

    while True:
        page_count += 1
        logger.info(f"Fetching page {page_count} (skip={skip}, top={top})...")

        params = {
            "$skip": skip,
            "$top": top,
            "$orderby": "Id",
            "$filter": "IsLatestVersion eq true"  # Only get latest versions
        }

        headers = {
            "Accept": "application/json"
        }

        try:
            response = requests.get(CHOCOLATEY_API, params=params, headers=headers, timeout=30)
            response.raise_for_status()

            data = response.json()

            # OData format has results in 'd' field
            results = data.get('d', {}).get('results', []) if isinstance(data, dict) else data

            if not results or len(results) == 0:
                logger.info("No more packages to fetch")
                break

            logger.info(f"  Got {len(results)} packages")
            all_packages.extend(results)

            # Check if we got fewer results than requested (last page)
            if len(results) < top:
                logger.info("Reached last page")
                break

            skip += top

            # Rate limiting - be nice to the API
            time.sleep(0.5)

        except requests.RequestException as e:
            logger.error(f"Error fetching page {page_count}: {e}")
            # Try to continue with next page
            skip += top
            time.sleep(2)  # Wait longer on error
            continue

    logger.info(f"Total packages fetched: {len(all_packages)}")
    return all_packages


def normalize_package(pkg: Dict) -> Dict:
    """
    Normalize package data to our standard format

    Args:
        pkg: Raw package data from Chocolatey API

    Returns:
        Normalized package dictionary
    """
    # Extract properties (different API versions have different structures)
    props = pkg.get('properties', pkg)

    return {
        "id": props.get('Id', ''),
        "title": props.get('Title', props.get('Id', '')),
        "version": props.get('Version', ''),
        "summary": props.get('Summary', ''),
        "description": props.get('Description', ''),
        "tags": props.get('Tags', ''),
        "publisher": props.get('Authors', ''),
        "downloads": props.get('DownloadCount', 0),
        "lastUpdated": props.get('Published', props.get('LastUpdated', '')),
        "source": "chocolatey"
    }


def save_chocolatey_index(packages: List[Dict], output_dir: Path = OUTPUT_DIR):
    """
    Save Chocolatey index in our standard format

    Args:
        packages: List of package dictionaries
        output_dir: Directory to save files

    Returns:
        Tuple of (metadata, file_paths)
    """
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    # Normalize all packages
    normalized = {pkg['id']: normalize_package(pkg) for pkg in packages}

    # Create index dictionary
    index_file = output_dir / 'choco-index.json'
    with open(index_file, 'w') as f:
        json.dump(normalized, f, indent=2)

    # Create compressed version
    compressed_file = output_dir / 'choco-index.json.gz'
    with gzip.open(compressed_file, 'wt') as f:
        json.dump(normalized, f)

    # Create metadata
    uncompressed_size = index_file.stat().st_size
    compressed_size = compressed_file.stat().st_size

    metadata = {
        "source": "chocolatey",
        "packageCount": len(normalized),
        "version": time.strftime("%Y.%m.%d"),
        "generated": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
        "uncompressedSize": uncompressed_size,
        "compressedSize": compressed_size,
        "compressionRatio": f"{(1 - compressed_size/uncompressed_size) * 100:.1f}%"
    }

    metadata_file = output_dir / 'choco-metadata.json'
    with open(metadata_file, 'w') as f:
        json.dump(metadata, f, indent=2)

    logger.info(f"Saved {len(normalized)} packages to {index_file}")
    logger.info(f"Compressed: {compressed_size / 1024 / 1024:.2f} MB")
    logger.info(f"Uncompressed: {uncompressed_size / 1024 / 1024:.2f} MB")

    return metadata, [index_file, compressed_file, metadata_file]


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s'
    )

    print("Fetching all Chocolatey packages...")
    packages = fetch_all_chocolatey_packages()

    print(f"\nSaving {len(packages)} packages...")
    metadata, files = save_chocolatey_index(packages)

    print(f"\nDone! Generated files:")
    for f in files:
        print(f"  - {f}")
