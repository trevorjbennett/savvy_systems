/**
 * Semantic Search Service - Tauri Backend Edition
 * Uses Python-powered semantic search via Tauri commands
 */

import { invoke } from '@tauri-apps/api/core';
import { packageIndexService } from './packageIndexService';
import type { PackageMetadata } from './packageIndexService';

export interface SearchResult {
  package: PackageMetadata;
  score: number;
  source: 'chocolatey' | 'winget';
}

interface TauriSearchResult {
  id: string;
  title: string;
  summary: string;
  score: number;
  source: 'chocolatey' | 'winget';
}

class SemanticSearchService {
  private cacheReady = false;

  /**
   * Initialize the search service - downloads and caches data if needed
   */
  async initialize(): Promise<void> {
    console.log('Initializing Tauri-based semantic search service...');

    try {
      // Check if cache is valid
      const isValid = await invoke<boolean>('is_cache_valid');

      if (!isValid) {
        console.log('Cache invalid or missing, downloading data...');
        const files = await invoke<string[]>('download_cache_data');
        console.log(`Downloaded ${files.length} files to cache:`, files);
      } else {
        console.log('Cache is valid, using existing data');
      }

      this.cacheReady = true;
      console.log('Semantic search service ready!');
    } catch (error) {
      console.error('Error initializing semantic search:', error);
      console.warn('Falling back to string-based search');
      this.cacheReady = false;
    }
  }

  /**
   * Search for packages using semantic similarity via Python backend
   */
  async search(query: string, options: {
    source?: 'chocolatey' | 'winget' | 'both';
    limit?: number;
    threshold?: number;
  } = {}): Promise<SearchResult[]> {
    const {
      source = 'both',
      limit = 20,
      threshold = 0.3
    } = options;

    console.log(`[Semantic Search] Query: "${query}", cacheReady: ${this.cacheReady}`);

    // If cache not ready, fall back to string search
    if (!this.cacheReady) {
      console.log('[Semantic Search] Cache not ready, using fallback search');
      return this.fallbackSearch(query, source, limit);
    }

    try {
      // Call Python backend via Tauri
      const results = await invoke<TauriSearchResult[]>('semantic_search', {
        request: {
          query,
          source,
          limit,
          threshold
        }
      });

      console.log(`[Semantic Search] Python backend returned ${results.length} results`);

      // Convert Tauri results to SearchResult format with full package metadata
      const searchResults: SearchResult[] = results.map(result => {
        // Get full package metadata from index
        const index = result.source === 'chocolatey'
          ? packageIndexService.getChocoIndex()
          : packageIndexService.getWingetIndex();

        const pkg = index?.[result.id];

        // If we have full metadata, use it; otherwise construct from Tauri result
        const packageData: PackageMetadata = pkg || {
          id: result.id,
          title: result.title,
          summary: result.summary,
          version: '',
          tags: '',
          source: result.source
        };

        return {
          package: packageData,
          score: result.score,
          source: result.source
        };
      });

      console.log(`[Semantic Search] Converted to ${searchResults.length} search results`);
      return searchResults;
    } catch (error) {
      console.error('[Semantic Search] Error during Tauri search:', error);
      console.log('[Semantic Search] Falling back to string search');
      // Fall back to string search
      return this.fallbackSearch(query, source, limit);
    }
  }

  /**
   * Fallback to string-based search when Python backend isn't available
   */
  private fallbackSearch(
    query: string,
    source: 'chocolatey' | 'winget' | 'both',
    limit: number
  ): SearchResult[] {
    console.log(`[Fallback Search] Query: "${query}", Source: ${source}, Limit: ${limit}`);
    const lowerQuery = query.toLowerCase();
    const results: SearchResult[] = [];

    const searchInIndex = (indexSource: 'chocolatey' | 'winget') => {
      const packages = packageIndexService.searchPackages(query, indexSource);
      console.log(`[Fallback Search] Found ${packages.length} packages in ${indexSource} index`);

      packages.forEach(pkg => {
        // Simple scoring based on where the match occurs
        let score = 0;

        if (pkg.id.toLowerCase().includes(lowerQuery)) {
          score += 1.0;
        }
        if (pkg.title.toLowerCase().includes(lowerQuery)) {
          score += 0.8;
        }
        if (pkg.summary?.toLowerCase().includes(lowerQuery)) {
          score += 0.5;
        }
        if (pkg.tags?.toLowerCase().includes(lowerQuery)) {
          score += 0.3;
        }

        if (score > 0) {
          results.push({
            package: pkg,
            score,
            source: indexSource
          });
        }
      });
    };

    if (source === 'both') {
      searchInIndex('chocolatey');
      searchInIndex('winget');
    } else {
      searchInIndex(source);
    }

    // Sort by score and limit
    results.sort((a, b) => b.score - a.score);
    console.log(`[Fallback Search] Total results: ${results.length}, returning top ${Math.min(results.length, limit)}`);
    if (results.length > 0) {
      console.log(`[Fallback Search] Sample results:`, results.slice(0, 3).map(r => ({ id: r.package.id, title: r.package.title, score: r.score })));
    }
    return results.slice(0, limit);
  }

  /**
   * Check if semantic search is available
   */
  isSemanticSearchAvailable(): boolean {
    return this.cacheReady;
  }

  /**
   * Get cache directory path
   */
  async getCacheDir(): Promise<string> {
    try {
      return await invoke<string>('get_cache_dir');
    } catch (error) {
      console.error('Error getting cache directory:', error);
      return 'Unknown';
    }
  }
}

// Singleton instance
export const semanticSearchService = new SemanticSearchService();
