"""
Upload Embeddings to GitHub Release
Uploads generated embedding files to the latest package-index GitHub Release.
"""
import requests
import os
import sys
import logging
from pathlib import Path

# Configuration
GITHUB_TOKEN = os.environ.get('GITHUB_TOKEN', '')
GITHUB_OWNER = os.environ.get('GITHUB_OWNER', 'trevorjbennett')
GITHUB_REPO = os.environ.get('GITHUB_REPO', 'savvy_systems')
OUTPUT_DIR = os.environ.get('OUTPUT_DIR', '.')

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def upload_embeddings_to_release():
    """Uploads all embedding files to the latest package-index release."""
    if not GITHUB_TOKEN:
        logger.error("GITHUB_TOKEN not set!")
        return False

    headers = {
        "Authorization": f"Bearer {GITHUB_TOKEN}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28"
    }

    try:
        # Get latest release
        logger.info("Finding latest package-index release...")
        releases_url = f"https://api.github.com/repos/{GITHUB_OWNER}/{GITHUB_REPO}/releases/latest"
        response = requests.get(releases_url, headers=headers, timeout=30)
        response.raise_for_status()

        release = response.json()
        release_id = release['id']
        release_tag = release['tag_name']
        upload_url = release['upload_url'].replace('{?name,label}', '')

        logger.info(f"Found release: {release_tag}")
        logger.info(f"Release ID: {release_id}")

        # Find all embedding files
        output_path = Path(OUTPUT_DIR)
        embedding_files = list(output_path.glob('*-embeddings*'))

        logger.info(f"Found {len(embedding_files)} embedding files to upload")

        # Upload each file
        for file_path in embedding_files:
            filename = file_path.name
            logger.info(f"Uploading {filename}...")

            # Determine content type
            content_types = {
                '.gz': 'application/gzip',
                '.json': 'application/json',
                '.pkl': 'application/octet-stream',
                '.npy': 'application/octet-stream'
            }
            content_type = content_types.get(file_path.suffix, 'application/octet-stream')

            upload_headers = {
                **headers,
                "Content-Type": content_type
            }

            with open(file_path, 'rb') as f:
                file_data = f.read()

            upload_response = requests.post(
                f"{upload_url}?name={filename}",
                headers=upload_headers,
                data=file_data,
                timeout=300
            )

            if upload_response.status_code in [200, 201]:
                logger.info(f"  ✓ {filename} uploaded successfully")
            else:
                logger.error(f"  ✗ Failed to upload {filename}: {upload_response.status_code}")
                logger.error(f"    {upload_response.text}")

        logger.info("\n✓ All embeddings uploaded successfully!")
        logger.info(f"Release URL: {release['html_url']}")
        return True

    except requests.exceptions.RequestException as e:
        logger.error(f"Error uploading embeddings: {e}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return False


if __name__ == "__main__":
    success = upload_embeddings_to_release()
    sys.exit(0 if success else 1)
