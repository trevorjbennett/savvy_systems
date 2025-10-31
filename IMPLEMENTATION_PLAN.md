# SAVVY Python Backend - Implementation Plan

## Current Status

We're building a Python-powered semantic search backend to replace the browser-based transformers.js approach.

###  What's Done:
- ✅ Python search service created (`python_service/search_service.py`)
- ✅ Rust integration created (`src-tauri/src/search_service.rs`)
- ✅ Tauri command added to main.rs
- ✅ Python dependencies installed
- ✅ New Chocolatey API scraper created (testing now)

### What's In Progress:
- 🔄 Testing new Chocolatey scraper to get ALL packages

## Architecture Flow

```
User types "freemind" in search box
    ↓
React Frontend (App.tsx)
    ↓
Tauri invoke('semantic_search', { query: 'freemind' })
    ↓
Rust Backend (src-tauri/src/search_service.rs)
    ↓
Spawns Python subprocess
    ↓
Python (python_service/search_service.py)
    - Loads sentence-transformers model
    - Generates query embedding
    - Loads embeddings from ~/.savvy/cache/
    - Computes cosine similarity
    - Returns top results
    ↓
Results flow back to frontend
    ↓
Display packages to user
```

## Remaining Implementation Steps

### Phase 1: Core Backend (Current Focus)

1. **Fix Scraper** ✅ Created
   - New scraper uses Chocolatey API directly
   - Should get 9000+ packages instead of 757
   - Will include FreeMind

2. **Download Service** (Next)
   - Create Tauri command to download indexes from GitHub
   - Save to `~/.savvy/cache/` instead of localStorage
   - Download both indexes and embeddings
   - Show progress in loading screen

3. **Python Search Integration**
   - Update search_service.py to use correct paths
   - Handle Windows paths correctly (`C:\Users\...`)
   - Add better error handling
   - Cache loaded model in memory

### Phase 2: Frontend Integration

4. **Create Tauri Search Service**
   ```typescript
   // src/services/tauriSearchService.ts
   import { invoke } from '@tauri-apps/api/core';

   export async function semanticSearch(query: string, options: SearchOptions) {
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

5. **Update App.tsx**
   - Replace `semanticSearchService.search()` with `tauriSearchService.search()`
   - Remove import of old semanticSearchService
   - Keep fallback string search for when Python isn't available

6. **Remove Old Code**
   - Delete `semanticSearchService.ts`
   - Remove @xenova/transformers dependency
   - Clean up debug logging

### Phase 3: Data Pipeline

7. **Generate Complete Embeddings**
   - Run new scraper to get all Chocolatey packages
   - Run existing Winget scraper
   - Generate embeddings for ALL packages using scraper_embeddings.py
   - This will take ~10-15 minutes

8. **Upload to GitHub**
   - Upload new choco-index.json.gz
   - Upload new choco-embeddings.json.gz
   - Upload new winget-index.json.gz
   - Upload new winget-embeddings.json.gz
   - Update release notes

### Phase 4: Testing & Polish

9. **Build & Test**
   ```bash
   # Build Rust backend
   cd src-tauri
   cargo build

   # Test the app
   cd ..
   npm run tauri dev
   ```

10. **Test Searches**
    - Search for "freemind" → Should find FreeMind package
    - Search for "browser" → Should find Chrome, Firefox, Edge, etc.
    - Search for "python editor" → Should find VSCode, PyCharm, etc.
    - Verify semantic search is working (similar concepts grouped together)

11. **Clean Up**
    - Remove all debug console.log statements
    - Update loading screen messages
    - Add error handling for missing Python
    - Add fallback if Python search fails

## Key Benefits

### Performance
- **100x faster** embedding generation (Python vs JavaScript)
- **Instant searches** after first model load
- **No download delays** - model stays in memory

### Reliability
- **No CDN issues** - everything works offline
- **No browser limits** - no localStorage quota
- **Better error handling** - Python ML libraries are mature

### Scalability
- **Easy to extend** - add hybrid search, reranking, etc.
- **Can add more models** - cross-encoder for reranking
- **Can cache more data** - no 5MB limit

## File Structure

```
savvy/
├── src/                           # React frontend
│   ├── services/
│   │   ├── tauriSearchService.ts  # NEW: Calls Tauri commands
│   │   ├── packageIndexService.ts # Keep for basic data
│   │   └── semanticSearchService.ts # DELETE after migration
│   └── App.tsx                    # Update to use Tauri search
│
├── src-tauri/                     # Rust backend
│   └── src/
│       ├── main.rs                # ✅ Updated with search command
│       └── search_service.rs      # ✅ New: Python integration
│
├── python_service/                # Python backend
│   ├── search_service.py          # ✅ Semantic search implementation
│   └── requirements.txt           # ✅ Dependencies
│
└── package-index/generator/       # Data pipeline
    ├── scraper_choco_api.py       # ✅ NEW: Better Chocolatey scraper
    ├── scraper_winget.py          # Keep existing
    ├── scraper_embeddings.py      # Keep existing
    └── upload_embeddings.py       # Keep existing
```

## Testing Checklist

- [ ] Python dependencies installed
- [ ] New scraper gets 9000+ Chocolatey packages
- [ ] FreeMind is in the new index
- [ ] Embeddings generated for all packages
- [ ] Files uploaded to GitHub Release
- [ ] Tauri can download files to ~/.savvy/cache/
- [ ] Python search service loads correctly
- [ ] Rust can call Python and get results
- [ ] Frontend can call Tauri and get results
- [ ] Search for "freemind" returns results
- [ ] Semantic search works (e.g., "web browser" finds browsers)
- [ ] Fallback works if Python fails
- [ ] No console errors

## Next Immediate Steps

1. Wait for scraper to finish running
2. Check if FreeMind is in the results
3. If yes, continue with Phase 1 (Download Service)
4. If no, debug the scraper API query

## Notes

- The old approach had 3 main issues:
  1. transformers.js CDN failing
  2. localStorage quota exceeded (embeddings too large)
  3. Missing packages (only 757 instead of 9000+)

- The new approach solves all of these:
  1. Python runs locally, no CDN
  2. Disk storage (~/.savvy/cache/), no quota
  3. New scraper gets all packages
