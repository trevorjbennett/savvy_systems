# SAVVY Python Backend Setup

## Overview

We've started building a Python-powered semantic search backend for SAVVY to provide:
- ✅ **Faster search** using native sentence-transformers
- ✅ **Better performance** with numpy/scipy
- ✅ **No browser limitations** (no model download issues, no storage quota)
- ✅ **Disk-based caching** instead of localStorage

## Architecture

```
React Frontend (TypeScript)
    ↓ (Tauri invoke)
Rust Backend (src-tauri/)
    ↓ (subprocess call)
Python Search Service (python_service/)
    ↓ (loads from disk)
Cached Embeddings (~/.savvy/cache/)
```

## Files Created

### 1. Rust Integration (`src-tauri/src/search_service.rs`)
- Handles calling Python subprocess
- Serializes/deserializes JSON requests/responses
- Error handling

### 2. Python Service (`python_service/search_service.py`)
- Loads sentence-transformers model (MiniLM-L6-v2)
- Performs semantic search with cosine similarity
- Caches embeddings in `~/.savvy/cache/`
- CLI interface for Rust to call

### 3. Tauri Commands (`src-tauri/src/main.rs`)
- Added `semantic_search` command
- Exposed to frontend via Tauri invoke

## Next Steps

### 1. Install Python Dependencies
```bash
cd python_service
pip install sentence-transformers numpy
```

### 2. Download Embeddings to Python Cache
We need to modify the app to download embeddings to `~/.savvy/cache/` instead of localStorage:
- Download from GitHub Release
- Extract to `~/.savvy/cache/choco-embeddings.json`
- Extract to `~/.savvy/cache/winget-embeddings.json`
- Extract indexes too

### 3. Update Frontend to Use Tauri Command
Replace the current semanticSearchService with:
```typescript
import { invoke } from '@tauri-apps/api/core';

async function search(query: string, options: SearchOptions) {
  const results = await invoke('semantic_search', {
    request: {
      query,
      source: options.source || 'both',
      limit: options.limit || 20,
      threshold: options.threshold || 0.3
    }
  });
  return results;
}
```

### 4. Fix the Package Scraper
The current scraper only gets 757 Chocolatey packages. Need to:
- Query Chocolatey API directly: `https://community.chocolatey.org/api/v2/Packages`
- Implement proper pagination to get ALL packages
- Include FreeMind and other missing packages

### 5. Rebuild and Test
```bash
# Build Rust backend
cd src-tauri
cargo build

# Run app
cd ..
npm run tauri dev
```

## Benefits of This Approach

1. **No browser model loading** - Python loads the model once, keeps it in memory
2. **Fast searches** - Native numpy operations, not JavaScript
3. **No storage limits** - Embeddings stored on disk, not in 5MB localStorage
4. **Better error handling** - Python has better ML library support
5. **Easy to extend** - Can add more advanced features (reranking, hybrid search, etc.)

## Current Issues

1. **FreeMind not in index** - Scraper needs to get more packages from Chocolatey
2. **transformers.js failing** - CDN issues, but Python backend will bypass this
3. **localStorage quota exceeded** - Python backend stores on disk instead

## Testing

Once set up, test with:
```javascript
// In browser console
await window.__TAURI__.invoke('semantic_search', {
  request: {
    query: 'freemind',
    source: 'both',
    limit: 10,
    threshold: 0.2
  }
});
```

This should return semantic search results once embeddings are in `~/.savvy/cache/`.
