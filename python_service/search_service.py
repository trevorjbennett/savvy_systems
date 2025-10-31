"""
SAVVY Python Search Service
Fast semantic search using sentence-transformers
"""
import json
import sys
import numpy as np
from pathlib import Path
from sentence_transformers import SentenceTransformer
from typing import List, Dict, Optional
import gzip

# Cache directory for embeddings and indexes
CACHE_DIR = Path.home() / '.savvy' / 'cache'
CACHE_DIR.mkdir(parents=True, exist_ok=True)

# Model
MODEL_NAME = 'sentence-transformers/all-MiniLM-L6-v2'
model = None


def load_model():
    """Load the embedding model (lazy loading)"""
    global model
    if model is None:
        print("Loading embedding model...", file=sys.stderr)
        model = SentenceTransformer(MODEL_NAME)
        print("Model loaded successfully!", file=sys.stderr)
    return model


def load_embeddings(source: str) -> Optional[Dict]:
    """Load embeddings for a given source (chocolatey or winget)"""
    # Try .gz file first, then fall back to .json
    embedding_file_gz = CACHE_DIR / f'{source}-embeddings.json.gz'
    embedding_file = CACHE_DIR / f'{source}-embeddings.json'

    if embedding_file_gz.exists():
        with gzip.open(embedding_file_gz, 'rt', encoding='utf-8') as f:
            data = json.load(f)
    elif embedding_file.exists():
        with open(embedding_file, 'r') as f:
            data = json.load(f)
    else:
        print(f"Embeddings not found: {embedding_file_gz} or {embedding_file}", file=sys.stderr)
        return None

    # Convert embeddings list to numpy array for fast computation
    for pkg in data['packages']:
        pkg['embedding'] = np.array(pkg['embedding'], dtype=np.float32)

    return data


def load_index(source: str) -> Optional[Dict]:
    """Load package index for a given source"""
    # Try .gz file first, then fall back to .json
    index_file_gz = CACHE_DIR / f'{source}-index.json.gz'
    index_file = CACHE_DIR / f'{source}-index.json'

    if index_file_gz.exists():
        with gzip.open(index_file_gz, 'rt', encoding='utf-8') as f:
            return json.load(f)
    elif index_file.exists():
        with open(index_file, 'r') as f:
            return json.load(f)
    else:
        print(f"Index not found: {index_file_gz} or {index_file}", file=sys.stderr)
        return None


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """Compute cosine similarity between two vectors"""
    dot_product = np.dot(a, b)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)

    if norm_a == 0 or norm_b == 0:
        return 0.0

    return float(dot_product / (norm_a * norm_b))


def search(query: str, source: str = 'both', limit: int = 20, threshold: float = 0.3) -> List[Dict]:
    """
    Perform semantic search across package embeddings

    Args:
        query: Search query
        source: 'chocolatey', 'winget', or 'both'
        limit: Maximum number of results
        threshold: Minimum similarity score (0-1)

    Returns:
        List of search results with scores
    """
    # Load model
    embed_model = load_model()

    # Generate query embedding
    query_embedding = embed_model.encode(query, normalize_embeddings=True)

    results = []

    # Search sources
    sources_to_search = ['chocolatey', 'winget'] if source == 'both' else [source]

    for src in sources_to_search:
        # Load embeddings and index
        embeddings_data = load_embeddings(src)
        index_data = load_index(src)

        if not embeddings_data or not index_data:
            print(f"Skipping {src} - data not available", file=sys.stderr)
            continue

        print(f"Searching {len(embeddings_data['packages'])} {src} packages...", file=sys.stderr)

        # Search through embeddings
        for pkg_data in embeddings_data['packages']:
            pkg_id = pkg_data['id']
            pkg_embedding = pkg_data['embedding']

            # Compute similarity
            similarity = cosine_similarity(query_embedding, pkg_embedding)

            if similarity >= threshold:
                # Get full package metadata from index
                if pkg_id in index_data:
                    pkg_info = index_data[pkg_id]
                    results.append({
                        'id': pkg_id,
                        'title': pkg_info.get('title', pkg_id),
                        'summary': pkg_info.get('summary', ''),
                        'score': similarity,
                        'source': src
                    })

    # Sort by score and limit
    results.sort(key=lambda x: x['score'], reverse=True)
    return results[:limit]


def main():
    """Main CLI entry point"""
    if len(sys.argv) < 3:
        print("Usage: python search_service.py <command> <json_args>", file=sys.stderr)
        sys.exit(1)

    command = sys.argv[1]
    args_json = sys.argv[2]

    if command == 'search':
        args = json.loads(args_json)
        results = search(
            query=args['query'],
            source=args.get('source', 'both'),
            limit=args.get('limit', 20),
            threshold=args.get('threshold', 0.3)
        )
        print(json.dumps(results))
    else:
        print(f"Unknown command: {command}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
