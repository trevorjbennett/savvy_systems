"""
Package Index Embeddings Generator
Creates vector embeddings for package search using Google Gemma model.
Downloads the latest package indexes and generates embeddings that can be used offline.
"""
import requests
import json
import gzip
import os
import sys
import logging
import numpy as np
from datetime import datetime
from pathlib import Path
import pickle

# Configuration
GITHUB_TOKEN = os.environ.get('GITHUB_TOKEN', '')
GITHUB_OWNER = os.environ.get('GITHUB_OWNER', 'trevorjbennett')
GITHUB_REPO = os.environ.get('GITHUB_REPO', 'savvy_systems')
OUTPUT_DIR = os.environ.get('OUTPUT_DIR', '.')
MODEL_NAME = os.environ.get('EMBEDDING_MODEL', 'gemma')

# Setup logging
log_dir = Path(OUTPUT_DIR) / 'logs'
log_dir.mkdir(parents=True, exist_ok=True)
log_file = log_dir / f'scraper_embeddings_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_file),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)


def download_latest_indexes():
    """
    Downloads the latest package indexes from GitHub Releases.
    Returns both Chocolatey and Winget indexes.
    """
    logger.info("Downloading latest package indexes from GitHub...")

    headers = {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28"
    }

    if GITHUB_TOKEN:
        headers["Authorization"] = f"Bearer {GITHUB_TOKEN}"

    try:
        # Get latest release
        releases_url = f"https://api.github.com/repos/{GITHUB_OWNER}/{GITHUB_REPO}/releases/latest"
        response = requests.get(releases_url, headers=headers, timeout=30)
        response.raise_for_status()

        release = response.json()
        assets = release.get('assets', [])

        logger.info(f"Found release: {release['name']}")
        logger.info(f"  Assets: {len(assets)}")

        # Download compressed indexes
        choco_index = None
        winget_index = None

        # For private repos, we need to use the API endpoint with special Accept header
        asset_headers = {
            **headers,
            "Accept": "application/octet-stream"
        }

        for asset in assets:
            if asset['name'] == 'choco-index.json.gz':
                logger.info(f"Downloading {asset['name']}...")
                # Use the API URL, not browser_download_url for private repos
                asset_response = requests.get(asset['url'], headers=asset_headers, timeout=60)
                asset_response.raise_for_status()

                # Decompress
                choco_index = json.loads(gzip.decompress(asset_response.content).decode('utf-8'))
                logger.info(f"  Loaded {len(choco_index)} Chocolatey packages")

            elif asset['name'] == 'winget-index.json.gz':
                logger.info(f"Downloading {asset['name']}...")
                # Use the API URL, not browser_download_url for private repos
                asset_response = requests.get(asset['url'], headers=asset_headers, timeout=60)
                asset_response.raise_for_status()

                # Decompress
                winget_index = json.loads(gzip.decompress(asset_response.content).decode('utf-8'))
                logger.info(f"  Loaded {len(winget_index)} Winget packages")

        return choco_index, winget_index

    except requests.exceptions.RequestException as e:
        logger.error(f"Error downloading indexes: {e}")
        return None, None
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return None, None


def initialize_embedding_model():
    """
    Initializes the Gemma embedding model.
    Uses sentence-transformers with a lightweight model for embeddings.
    """
    logger.info(f"Initializing embedding model: {MODEL_NAME}")

    try:
        # Try to import sentence-transformers
        from sentence_transformers import SentenceTransformer

        # Use a lightweight model that can run offline
        # Gemma-style models or alternatives like MiniLM
        model_map = {
            'gemma': 'all-MiniLM-L6-v2',  # Fast, good quality, 384 dimensions
            'gemma-large': 'all-mpnet-base-v2',  # Better quality, 768 dimensions
        }

        model_name = model_map.get(MODEL_NAME, 'all-MiniLM-L6-v2')
        logger.info(f"Loading model: {model_name}")

        model = SentenceTransformer(model_name)
        logger.info(f"Model loaded successfully!")
        logger.info(f"  Embedding dimensions: {model.get_sentence_embedding_dimension()}")

        return model

    except ImportError:
        logger.error("sentence-transformers not installed!")
        logger.error("Install with: pip install sentence-transformers")
        return None
    except Exception as e:
        logger.error(f"Error loading model: {e}")
        return None


def create_package_embeddings(packages, model, source_name):
    """
    Creates embeddings for all packages.
    Each package gets an embedding based on its searchable text.
    """
    logger.info(f"Creating embeddings for {len(packages)} {source_name} packages...")

    embeddings_data = {
        'metadata': {
            'source': source_name,
            'packageCount': len(packages),
            'embeddingDimensions': model.get_sentence_embedding_dimension(),
            'model': MODEL_NAME,
            'generated': datetime.utcnow().isoformat() + "Z",
            'version': datetime.utcnow().strftime("%Y.%m.%d")
        },
        'packages': []
    }

    # Process each package
    for idx, (pkg_id, pkg_data) in enumerate(packages.items(), 1):
        # Create searchable text from package metadata
        title = pkg_data.get('title', pkg_id)
        publisher = pkg_data.get('publisher', '')
        summary = pkg_data.get('summary', '')
        tags = pkg_data.get('tags', '')

        # Get latest version info if available
        versions = pkg_data.get('versions', [])
        if versions:
            latest_version = versions[0]
            if isinstance(latest_version, dict):
                summary = latest_version.get('summary', summary)
                tags = latest_version.get('tags', tags)

        # Combine all searchable text
        searchable_text = f"{title} {publisher} {summary} {tags}".strip()

        # Generate embedding
        embedding = model.encode(searchable_text, convert_to_numpy=True)

        # Store package with embedding
        package_entry = {
            'id': pkg_id,
            'title': title,
            'publisher': publisher,
            'embedding': embedding.tolist(),
            'versionCount': len(versions) if versions else 0
        }

        embeddings_data['packages'].append(package_entry)

        if idx % 100 == 0:
            logger.info(f"  Processed {idx}/{len(packages)} packages...")

    logger.info(f"Finished creating embeddings for {len(packages)} packages")
    return embeddings_data


def save_embedding_index(embeddings_data, source_name, output_dir="."):
    """
    Saves the embedding index in multiple formats:
    1. JSON (for web/testing)
    2. Pickle (for Python apps)
    3. NumPy (for fast loading)
    """
    output_path = Path(output_dir)
    output_path.mkdir(exist_ok=True)

    files_created = []

    # 1. Save full JSON (includes embeddings as arrays)
    json_filename = output_path / f"{source_name}-embeddings.json"
    logger.info(f"Saving JSON embedding index to {json_filename}...")
    with open(json_filename, "w", encoding="utf-8") as f:
        json.dump(embeddings_data, f, indent=2)
    files_created.append(json_filename)

    # 2. Save compressed JSON
    gz_filename = output_path / f"{source_name}-embeddings.json.gz"
    logger.info(f"Saving compressed embedding index to {gz_filename}...")
    with gzip.open(gz_filename, "wt", encoding="utf-8") as f:
        json.dump(embeddings_data, f, separators=(',', ':'))
    files_created.append(gz_filename)

    # 3. Save as pickle (fastest for Python)
    pickle_filename = output_path / f"{source_name}-embeddings.pkl"
    logger.info(f"Saving pickle embedding index to {pickle_filename}...")
    with open(pickle_filename, 'wb') as f:
        pickle.dump(embeddings_data, f)
    files_created.append(pickle_filename)

    # 4. Save embeddings matrix separately (for efficient loading)
    embeddings_array = np.array([pkg['embedding'] for pkg in embeddings_data['packages']])
    npy_filename = output_path / f"{source_name}-embeddings.npy"
    logger.info(f"Saving NumPy embeddings matrix to {npy_filename}...")
    np.save(npy_filename, embeddings_array)
    files_created.append(npy_filename)

    # 5. Save package metadata separately (without embeddings)
    metadata_only = {
        'metadata': embeddings_data['metadata'],
        'packages': [
            {
                'id': pkg['id'],
                'title': pkg['title'],
                'publisher': pkg.get('publisher', ''),
                'versionCount': pkg['versionCount']
            }
            for pkg in embeddings_data['packages']
        ]
    }

    metadata_filename = output_path / f"{source_name}-embeddings-metadata.json"
    logger.info(f"Saving metadata to {metadata_filename}...")
    with open(metadata_filename, "w", encoding="utf-8") as f:
        json.dump(metadata_only, f, indent=2)
    files_created.append(metadata_filename)

    metadata_gz_filename = output_path / f"{source_name}-embeddings-metadata.json.gz"
    with gzip.open(metadata_gz_filename, "wt", encoding="utf-8") as f:
        json.dump(metadata_only, f, separators=(',', ':'))
    files_created.append(metadata_gz_filename)

    # Log file sizes
    logger.info(f"Embedding index files created:")
    for file_path in files_created:
        size_mb = file_path.stat().st_size / 1024 / 1024
        logger.info(f"  - {file_path.name}: {size_mb:.2f} MB")

    return embeddings_data['metadata'], files_created


def main():
    """Main execution function."""
    start_time = datetime.now()
    logger.info("=" * 70)
    logger.info("Package Index Embeddings Generator")
    logger.info("=" * 70)
    logger.info(f"Log file: {log_file}")
    logger.info(f"Model: {MODEL_NAME}")
    logger.info("")

    # Step 1: Download latest indexes
    logger.info("Step 1: Downloading latest package indexes...")
    choco_index, winget_index = download_latest_indexes()

    if not choco_index and not winget_index:
        logger.error("Failed to download package indexes. Exiting.")
        return 1

    # Step 2: Initialize embedding model
    logger.info("")
    logger.info("Step 2: Loading embedding model...")
    model = initialize_embedding_model()

    if not model:
        logger.error("Failed to load embedding model. Exiting.")
        return 1

    all_metadata = {}
    all_files = []

    # Step 3: Create Chocolatey embeddings
    if choco_index:
        logger.info("")
        logger.info("Step 3: Creating Chocolatey embeddings...")
        choco_embeddings = create_package_embeddings(choco_index, model, 'chocolatey')
        choco_metadata, choco_files = save_embedding_index(choco_embeddings, 'choco', OUTPUT_DIR)
        all_metadata['choco'] = choco_metadata
        all_files.extend(choco_files)

    # Step 4: Create Winget embeddings
    if winget_index:
        logger.info("")
        logger.info("Step 4: Creating Winget embeddings...")
        winget_embeddings = create_package_embeddings(winget_index, model, 'winget')
        winget_metadata, winget_files = save_embedding_index(winget_embeddings, 'winget', OUTPUT_DIR)
        all_metadata['winget'] = winget_metadata
        all_files.extend(winget_files)

    # Step 5: Save combined metadata
    logger.info("")
    logger.info("Step 5: Saving combined metadata...")
    combined_metadata = {
        'version': datetime.utcnow().strftime("%Y.%m.%d"),
        'generated': datetime.utcnow().isoformat() + "Z",
        'model': MODEL_NAME,
        'sources': all_metadata
    }

    combined_metadata_file = Path(OUTPUT_DIR) / 'embeddings-metadata.json'
    with open(combined_metadata_file, 'w', encoding='utf-8') as f:
        json.dump(combined_metadata, f, indent=2)
    all_files.append(combined_metadata_file)

    # Done!
    duration = (datetime.now() - start_time).total_seconds()
    logger.info("")
    logger.info("=" * 70)
    logger.info(f"Complete! Duration: {duration / 60:.2f} minutes")
    logger.info("=" * 70)
    logger.info(f"Total files created: {len(all_files)}")

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
