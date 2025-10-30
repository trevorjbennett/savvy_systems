"""
This is your EXACT original working code with only minimal changes for compression.
Let's use what actually works!
"""
import requests
import time
import json
import gzip
from datetime import datetime
from packaging import version as version_parser

def get_all_choco_package_versions():
    """
    Fetches a flat list of all package versions from the Chocolatey community feed.
    This is the ORIGINAL WORKING CODE.
    """
    base_url = "https://community.chocolatey.org/api/v2/Packages"

    params = {
        "$select": "Id,Version,Title,Summary,DownloadCount,Tags,LastUpdated",
        "$orderby": "Id,Version"
    }

    headers = {"Accept": "application/json"}

    all_package_versions = []
    page_count = 0
    next_page_url = base_url

    print("Starting to fetch package data from Chocolatey community feed...")

    try:
        while next_page_url:
            page_count += 1
            print(f"Fetching page {page_count}...")

            response = requests.get(next_page_url, headers=headers, params=params, timeout=60)

            if params:
                params = None

            response.raise_for_status()
            data = response.json()

            results = data.get('d', {}).get('results', [])
            all_package_versions.extend(results)

            next_page_url = data.get('d', {}).get('__next', None)

            time.sleep(0.1)

    except requests.exceptions.RequestException as e:
        print(f"\nAn error occurred while fetching data: {e}")
        return []
    except json.JSONDecodeError as e:
        print(f"\nAn error occurred while parsing JSON data: {e}")
        return []

    print(f"\nFinished fetching. Retrieved {len(all_package_versions)} total package versions.")
    return all_package_versions


def get_latest_versions(flat_list):
    """Filter to latest version per package."""
    print("Filtering to latest versions only...")
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
            except:
                pass

    print(f"Filtered to {len(latest_packages)} unique packages (latest versions only).")
    return latest_packages


def save_index(packages_dict, output_dir="."):
    """Save the index."""
    timestamp = datetime.utcnow().isoformat() + "Z"

    metadata = {
        "version": timestamp,
        "packageCount": len(packages_dict),
        "source": "chocolatey",
        "generatedAt": timestamp
    }

    json_filename = f"{output_dir}/choco-index.json"
    print(f"Saving uncompressed index to {json_filename}...")
    with open(json_filename, "w", encoding="utf-8") as f:
        json.dump(packages_dict, f, indent=2)

    gz_filename = f"{output_dir}/choco-index.json.gz"
    print(f"Saving compressed index to {gz_filename}...")
    with gzip.open(gz_filename, "wt", encoding="utf-8") as f:
        json.dump(packages_dict, f, separators=(',', ':'))

    import os
    metadata["uncompressedSize"] = os.path.getsize(json_filename)
    metadata["compressedSize"] = os.path.getsize(gz_filename)
    metadata["compressionRatio"] = f"{(1 - metadata['compressedSize'] / metadata['uncompressedSize']) * 100:.1f}%"

    metadata_filename = f"{output_dir}/metadata.json"
    print(f"Saving metadata to {metadata_filename}...")
    with open(metadata_filename, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    print(f"\n✓ Package index created successfully!")
    print(f"  - Packages: {metadata['packageCount']}")
    print(f"  - Uncompressed: {metadata['uncompressedSize'] / 1024 / 1024:.2f} MB")
    print(f"  - Compressed: {metadata['compressedSize'] / 1024 / 1024:.2f} MB")
    print(f"  - Compression: {metadata['compressionRatio']}")

    return metadata


if __name__ == "__main__":
    print("=" * 60)
    print("Chocolatey Package Index Generator")
    print("=" * 60)
    print()

    all_versions = get_all_choco_package_versions()

    if not all_versions:
        print("❌ No packages fetched. Exiting.")
        exit(1)

    latest_packages = get_latest_versions(all_versions)

    if not latest_packages:
        print("❌ No packages after filtering. Exiting.")
        exit(1)

    metadata = save_index(latest_packages)

    print("\n✓ Done!")
