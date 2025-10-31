"""
Chocolatey Package Scraper - XML/Atom API Edition
Scrapes ALL packages from Chocolatey using OData XML API
"""
import requests
import xml.etree.ElementTree as ET
import json
import time
import logging
from typing import Dict, List, Optional

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

# Chocolatey OData API
CHOCOLATEY_API = "https://community.chocolatey.org/api/v2/Packages"

# XML namespaces used by OData/Atom
NAMESPACES = {
    'atom': 'http://www.w3.org/2005/Atom',
    'd': 'http://schemas.microsoft.com/ado/2007/08/dataservices',
    'm': 'http://schemas.microsoft.com/ado/2007/08/dataservices/metadata'
}


def parse_package_entry(entry: ET.Element) -> Optional[Dict]:
    """Parse a package entry from the XML feed"""
    try:
        # Get package ID from atom:id element
        # Format: http://community.chocolatey.org/api/v2/Packages(Id='package-name',Version='1.0.0')
        import re

        id_elem = entry.find('atom:id', NAMESPACES)
        if id_elem is None or not id_elem.text:
            return None

        match = re.search(r"Id='([^']+)'", id_elem.text)
        if not match:
            return None

        package_id = match.group(1)

        # Get properties
        properties = entry.find('.//m:properties', NAMESPACES)
        if properties is None:
            return None

        # Helper to get text from property
        def get_prop(name: str) -> str:
            elem = properties.find(f'd:{name}', NAMESPACES)
            return elem.text if elem is not None and elem.text else ''

        # Get authors from atom:author/atom:name
        author_elem = entry.find('.//atom:author/atom:name', NAMESPACES)
        authors = author_elem.text if author_elem is not None and author_elem.text else ''

        package = {
            'id': package_id,
            'title': get_prop('Title') or package_id,
            'version': get_prop('Version'),
            'summary': get_prop('Summary'),
            'description': get_prop('Description'),
            'tags': get_prop('Tags'),
            'authors': authors,
            'downloads': int(get_prop('DownloadCount') or '0'),
            'iconUrl': get_prop('IconUrl'),
            'projectUrl': get_prop('ProjectUrl'),
            'packageSourceUrl': get_prop('PackageSourceUrl'),
            'lastUpdated': get_prop('Published'),
            'isLatestVersion': get_prop('IsLatestVersion') == 'true'
        }

        return package
    except Exception as e:
        logging.error(f"Error parsing package entry: {e}")
        return None


def fetch_packages_page(skip: int = 0, top: int = 100) -> tuple[List[Dict], Optional[str]]:
    """
    Fetch a page of packages from Chocolatey API
    Returns (packages, next_link)
    """
    params = {
        '$skip': skip,
        '$top': top,
        '$orderby': 'Id'
        # Don't filter by IsLatestVersion - we'll dedupe ourselves
    }

    headers = {
        'Accept': 'application/atom+xml,application/xml',
        'User-Agent': 'SAVVY-Package-Scraper/1.0'
    }

    try:
        response = requests.get(CHOCOLATEY_API, params=params, headers=headers, timeout=30)
        response.raise_for_status()

        # Parse XML
        root = ET.fromstring(response.content)

        # Extract packages
        packages = []
        for entry in root.findall('.//atom:entry', NAMESPACES):
            package = parse_package_entry(entry)
            if package:
                packages.append(package)

        # Look for next link
        next_link = None
        for link in root.findall('.//atom:link[@rel="next"]', NAMESPACES):
            next_link = link.get('href')
            break

        return packages, next_link
    except requests.exceptions.RequestException as e:
        logging.error(f"Request error: {e}")
        return [], None
    except ET.ParseError as e:
        logging.error(f"XML parse error: {e}")
        return [], None


def scrape_all_packages(max_packages: Optional[int] = None) -> List[Dict]:
    """
    Scrape all packages from Chocolatey API

    Args:
        max_packages: Optional limit on number of packages to fetch (for testing)

    Returns:
        List of package dictionaries
    """
    all_packages = []
    skip = 0
    page = 1
    batch_size = 100

    logging.info("Starting Chocolatey package scrape...")
    logging.info(f"This will fetch ALL packages (may take 10-15 minutes)")

    while True:
        if max_packages and len(all_packages) >= max_packages:
            logging.info(f"Reached max packages limit: {max_packages}")
            break

        logging.info(f"Fetching page {page} (skip={skip}, top={batch_size})...")

        packages, next_link = fetch_packages_page(skip=skip, top=batch_size)

        if not packages:
            logging.info("No more packages found, stopping.")
            break

        all_packages.extend(packages)
        logging.info(f"Page {page}: Got {len(packages)} packages (total: {len(all_packages)})")

        # Check if we should continue
        if len(packages) < batch_size and not next_link:
            logging.info("Reached end of packages")
            break

        # Move to next page
        skip += batch_size
        page += 1

        # Rate limiting - be nice to the API
        time.sleep(1)

    logging.info(f"Scraping complete! Total packages: {len(all_packages)}")
    return all_packages


def deduplicate_packages(packages: List[Dict], keep_versions: int = 3) -> List[Dict]:
    """
    Keep the latest N versions of each package

    Args:
        packages: List of package dictionaries
        keep_versions: Number of versions to keep per package (default: 3)

    Returns:
        List of packages with up to N versions per package ID
    """
    from packaging import version

    # Group by package ID
    packages_by_id = {}
    for pkg in packages:
        pkg_id = pkg['id']
        if pkg_id not in packages_by_id:
            packages_by_id[pkg_id] = []
        packages_by_id[pkg_id].append(pkg)

    # For each package ID, keep the latest N versions
    kept_packages = []
    for pkg_id, pkg_versions in packages_by_id.items():
        # Sort by version (descending) and take the top N
        try:
            pkg_versions.sort(key=lambda x: version.parse(x['version']), reverse=True)
        except:
            # If version parsing fails, just use the original order
            pass

        # Keep up to keep_versions versions
        kept_packages.extend(pkg_versions[:keep_versions])

    return kept_packages


def create_package_index(packages: List[Dict]) -> Dict:
    """Convert package list to index format with version support"""
    # Keep latest 3 versions of each package
    packages = deduplicate_packages(packages, keep_versions=3)
    logging.info(f"After deduplication: {len(packages)} package versions")

    # Group packages by ID to collect versions
    from packaging import version as pkg_version

    packages_by_id = {}
    for pkg in packages:
        pkg_id = pkg['id']
        if pkg_id not in packages_by_id:
            packages_by_id[pkg_id] = []
        packages_by_id[pkg_id].append(pkg)

    # Create index with version information
    index = {}

    for pkg_id, pkg_versions in packages_by_id.items():
        # Sort versions descending
        try:
            pkg_versions.sort(key=lambda x: pkg_version.parse(x['version']), reverse=True)
        except:
            pass

        # Use the latest version as the primary package info
        latest_pkg = pkg_versions[0]

        # Create versions array
        versions_info = [
            {
                'version': v['version'],
                'releaseDate': v.get('lastUpdated'),
                'downloads': v['downloads']
            }
            for v in pkg_versions
        ]

        index[pkg_id] = {
            'id': pkg_id,
            'title': latest_pkg['title'],
            'version': latest_pkg['version'],  # Latest version
            'summary': latest_pkg['summary'] or latest_pkg['description'][:200] if latest_pkg.get('description') else '',
            'description': latest_pkg['description'],
            'tags': latest_pkg['tags'],
            'publisher': latest_pkg['authors'],
            'downloads': latest_pkg['downloads'],
            'iconUrl': latest_pkg.get('iconUrl'),
            'projectUrl': latest_pkg.get('projectUrl'),
            'lastUpdated': latest_pkg.get('lastUpdated'),
            'versions': versions_info,  # All available versions
            'source': 'chocolatey'
        }

    logging.info(f"Created index with {len(index)} unique packages")
    return index


def main():
    """Main scraping function"""
    # Scrape all packages
    packages = scrape_all_packages()

    if not packages:
        logging.error("No packages scraped!")
        return

    # Create index
    logging.info("Creating package index...")
    index = create_package_index(packages)

    # Save to file
    output_file = 'choco-index-full.json'
    logging.info(f"Saving index to {output_file}...")

    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(index, f, indent=2, ensure_ascii=False)

    logging.info(f"SUCCESS! Saved {len(index)} packages to {output_file}")

    # Print some stats
    logging.info("\nPackage Statistics:")
    logging.info(f"  Total packages: {len(index)}")
    logging.info(f"  Total downloads: {sum(pkg['downloads'] for pkg in index.values()):,}")

    # Show sample of popular packages
    popular = sorted(packages, key=lambda x: x['downloads'], reverse=True)[:10]
    logging.info("\nTop 10 most downloaded packages:")
    for i, pkg in enumerate(popular, 1):
        logging.info(f"  {i}. {pkg['title']} ({pkg['id']}) - {pkg['downloads']:,} downloads")


if __name__ == '__main__':
    main()
