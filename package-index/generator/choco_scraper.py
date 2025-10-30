import requests
import time
import json
import gzip
from datetime import datetime
from packaging import version

def get_all_choco_packages():
    """
    Fetches all packages from Chocolatey using NuGet V2 API with XML parsing.
    The API returns XML by default, so we parse that instead of trying JSON.

    Returns:
        list: List of all package version dictionaries
    """
    import xml.etree.ElementTree as ET

    # Use the base Packages endpoint
    base_url = "https://community.chocolatey.org/api/v2/Packages"

    all_package_versions = []
    page_count = 0
    next_url = base_url

    print("Starting to fetch package data from Chocolatey community feed...")
    print("Parsing XML responses from API...")

    # XML namespaces used by the API
    namespaces = {
        'atom': 'http://www.w3.org/2005/Atom',
        'm': 'http://schemas.microsoft.com/ado/2007/08/dataservices/metadata',
        'd': 'http://schemas.microsoft.com/ado/2007/08/dataservices'
    }

    try:
        while next_url:
            page_count += 1
            print(f"Fetching page {page_count}...", end='\r')

            response = requests.get(next_url, timeout=90)
            response.raise_for_status()

            # Parse XML response
            try:
                root = ET.fromstring(response.content)

                # Find all entry elements (each is a package)
                entries = root.findall('.//atom:entry', namespaces)

                for entry in entries:
                    # Extract properties from each entry
                    properties = entry.find('.//m:properties', namespaces)
                    if properties is not None:
                        pkg = {}

                        # Extract common fields
                        for field in ['Id', 'Version', 'Title', 'Summary', 'DownloadCount', 'Tags', 'LastUpdated']:
                            elem = properties.find(f'd:{field}', namespaces)
                            if elem is not None and elem.text:
                                pkg[field] = elem.text

                        if 'Id' in pkg:  # Only add if we got at least the ID
                            all_package_versions.append(pkg)

                # Look for next page link
                next_link = root.find(".//atom:link[@rel='next']", namespaces)
                if next_link is not None:
                    next_url = next_link.get('href')
                else:
                    next_url = None

            except ET.ParseError as e:
                print(f"\nFailed to parse XML response: {e}")
                break

            time.sleep(0.15)

            # Safety limit
            if page_count >= 200:
                print(f"\nReached page limit, stopping...")
                break

    except requests.exceptions.RequestException as e:
        print(f"\nError fetching data: {e}")
        return []

    print(f"\nFetched {len(all_package_versions)} total package versions.")
    return all_package_versions


def get_latest_versions(flat_list):
    """
    Keeps only the latest version of each package.

    Args:
        flat_list: List of all package versions

    Returns:
        dict: Dictionary with only latest version per package
    """
    print("Filtering to latest versions only...")
    latest_packages = {}

    for pkg in flat_list:
        pkg_id = pkg.get('Id')
        pkg_version = pkg.get('Version')

        if not pkg_id or not pkg_version:
            continue

        # If this is the first version we see, or it's newer than what we have
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
            # Compare versions and keep the latest
            try:
                current_ver = version.parse(latest_packages[pkg_id]['version'])
                new_ver = version.parse(pkg_version)
                if new_ver > current_ver:
                    latest_packages[pkg_id]['version'] = pkg_version
                    latest_packages[pkg_id]['title'] = pkg.get('Title') or pkg_id
                    latest_packages[pkg_id]['summary'] = pkg.get('Summary', '')
                    latest_packages[pkg_id]['downloads'] = pkg.get('DownloadCount', 0)
                    latest_packages[pkg_id]['tags'] = pkg.get('Tags', '')
                    latest_packages[pkg_id]['lastUpdated'] = pkg.get('LastUpdated', '')
            except:
                # If version parsing fails, keep the first one we found
                pass

    print(f"Filtered to {len(latest_packages)} unique packages (latest versions only).")
    return latest_packages


def save_index(packages_dict, output_dir="."):
    """
    Saves the package index in multiple formats.

    Args:
        packages_dict: Dictionary of packages
        output_dir: Directory to save files
    """
    timestamp = datetime.utcnow().isoformat() + "Z"

    # Create metadata
    metadata = {
        "version": timestamp,
        "packageCount": len(packages_dict),
        "source": "chocolatey",
        "generatedAt": timestamp,
        "checksums": {}
    }

    # Save full JSON (uncompressed for debugging)
    json_filename = f"{output_dir}/choco-index.json"
    print(f"Saving uncompressed index to {json_filename}...")
    with open(json_filename, "w", encoding="utf-8") as f:
        json.dump(packages_dict, f, indent=2)

    # Save compressed JSON (for production use)
    gz_filename = f"{output_dir}/choco-index.json.gz"
    print(f"Saving compressed index to {gz_filename}...")
    with gzip.open(gz_filename, "wt", encoding="utf-8") as f:
        json.dump(packages_dict, f, separators=(',', ':'))  # No indentation for smaller size

    # Calculate file sizes for metadata
    import os
    metadata["uncompressedSize"] = os.path.getsize(json_filename)
    metadata["compressedSize"] = os.path.getsize(gz_filename)
    metadata["compressionRatio"] = f"{(1 - metadata['compressedSize'] / metadata['uncompressedSize']) * 100:.1f}%"

    # Save metadata
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

    # Step 1: Fetch all package versions
    all_versions = get_all_choco_packages()

    if not all_versions:
        print("❌ No packages fetched. Exiting.")
        exit(1)

    # Step 2: Filter to latest versions only
    latest_packages = get_latest_versions(all_versions)

    if not latest_packages:
        print("❌ No packages after filtering. Exiting.")
        exit(1)

    # Step 3: Save the index
    metadata = save_index(latest_packages)

    print("\n✓ Done!")
