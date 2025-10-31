/**
 * Package Index Service
 * Downloads and caches package indexes and embeddings from GitHub Releases
 */

import { fetch } from '@tauri-apps/plugin-http';

export interface PackageIndex {
  [packageId: string]: PackageMetadata;
}

export interface PackageMetadata {
  id: string;
  title: string;
  version?: string;
  summary?: string;
  description?: string;
  tags?: string;
  publisher?: string;
  downloads?: number;
  lastUpdated?: string;
  versions?: VersionInfo[];
  source: 'chocolatey' | 'winget';
}

export interface VersionInfo {
  version: string;
  releaseDate?: string;
}

export interface EmbeddingsIndex {
  metadata: {
    source: string;
    packageCount: number;
    embeddingDimensions: number;
    model: string;
    generated: string;
    version: string;
  };
  packages: EmbeddedPackage[];
}

export interface EmbeddedPackage {
  id: string;
  title: string;
  publisher: string;
  embedding: number[];
  versionCount: number;
}

const GITHUB_OWNER = 'trevorjbennett';
const GITHUB_REPO = 'savvy_systems';
const CACHE_KEY_PREFIX = 'savvy_package_index_';
const CACHE_EXPIRY_DAYS = 7;

class PackageIndexService {
  private chocoIndex: PackageIndex | null = null;
  private wingetIndex: PackageIndex | null = null;
  private chocoEmbeddings: EmbeddingsIndex | null = null;
  private wingetEmbeddings: EmbeddingsIndex | null = null;

  /**
   * Initialize the service by loading cached indexes or downloading fresh ones
   */
  async initialize(): Promise<void> {
    console.log('Initializing Package Index Service...');

    // Try to load from cache first
    const cached = this.loadFromCache();
    if (cached) {
      console.log('Loaded indexes from cache');
      return;
    }

    // Download fresh indexes
    await this.downloadIndexes();
  }

  /**
   * Download package indexes and embeddings from GitHub Releases
   */
  private async downloadIndexes(): Promise<void> {
    try {
      console.log('Downloading package indexes from GitHub...');

      // Get latest release
      const releaseUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;
      const releaseResponse = await fetch(releaseUrl);

      if (!releaseResponse.ok) {
        throw new Error(`Failed to fetch release: ${releaseResponse.statusText}`);
      }

      const release = await releaseResponse.json();
      console.log(`Found release: ${release.tag_name}`);

      // Download Chocolatey index
      await this.downloadAsset(release, 'choco-index.json.gz', 'chocolatey', 'index');

      // Download Winget index
      await this.downloadAsset(release, 'winget-index.json.gz', 'winget', 'index');

      // Download embeddings
      await this.downloadAsset(release, 'choco-embeddings.json.gz', 'chocolatey', 'embeddings');
      await this.downloadAsset(release, 'winget-embeddings.json.gz', 'winget', 'embeddings');

      // Save to cache
      this.saveToCache();

      console.log('Successfully downloaded and cached package indexes');
    } catch (error) {
      console.error('Error downloading package indexes:', error);
      throw error;
    }
  }

  /**
   * Download and decompress an asset from the release
   */
  private async downloadAsset(
    release: any,
    assetName: string,
    source: 'chocolatey' | 'winget',
    type: 'index' | 'embeddings'
  ): Promise<void> {
    const asset = release.assets.find((a: any) => a.name === assetName);
    if (!asset) {
      console.warn(`Asset ${assetName} not found in release`);
      return;
    }

    console.log(`Downloading ${assetName}...`);

    const response = await fetch(asset.browser_download_url);
    if (!response.ok) {
      throw new Error(`Failed to download ${assetName}: ${response.statusText}`);
    }

    // Decompress gzip and parse JSON
    const arrayBuffer = await response.arrayBuffer();
    const decompressed = await this.decompressGzip(arrayBuffer);
    const json = JSON.parse(decompressed);

    // Store the data
    if (type === 'index') {
      if (source === 'chocolatey') {
        this.chocoIndex = json;
      } else {
        this.wingetIndex = json;
      }
    } else {
      if (source === 'chocolatey') {
        this.chocoEmbeddings = json;
      } else {
        this.wingetEmbeddings = json;
      }
    }

    const count = Object.keys(json).length || json.packages?.length || 0;
    console.log(`✓ Downloaded ${assetName}: ${count} entries`);
  }

  /**
   * Decompress gzip data
   */
  private async decompressGzip(buffer: ArrayBuffer): Promise<string> {
    // Use the browser's DecompressionStream API
    const stream = new Response(buffer).body!;
    const decompressedStream = stream.pipeThrough(
      new DecompressionStream('gzip')
    );
    const decompressed = await new Response(decompressedStream).arrayBuffer();
    return new TextDecoder().decode(decompressed);
  }

  /**
   * Load indexes from localStorage cache
   */
  private loadFromCache(): boolean {
    try {
      const cacheTimestamp = localStorage.getItem(`${CACHE_KEY_PREFIX}timestamp`);
      if (!cacheTimestamp) return false;

      const age = Date.now() - parseInt(cacheTimestamp);
      if (age > CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000) {
        console.log('Cache expired');
        return false;
      }

      const chocoIndexStr = localStorage.getItem(`${CACHE_KEY_PREFIX}choco_index`);
      const wingetIndexStr = localStorage.getItem(`${CACHE_KEY_PREFIX}winget_index`);
      const chocoEmbeddingsStr = localStorage.getItem(`${CACHE_KEY_PREFIX}choco_embeddings`);
      const wingetEmbeddingsStr = localStorage.getItem(`${CACHE_KEY_PREFIX}winget_embeddings`);

      if (chocoIndexStr) this.chocoIndex = JSON.parse(chocoIndexStr);
      if (wingetIndexStr) this.wingetIndex = JSON.parse(wingetIndexStr);
      if (chocoEmbeddingsStr) this.chocoEmbeddings = JSON.parse(chocoEmbeddingsStr);
      if (wingetEmbeddingsStr) this.wingetEmbeddings = JSON.parse(wingetEmbeddingsStr);

      // Only use cache if we have both indexes AND embeddings
      const hasIndexes = !!(this.chocoIndex || this.wingetIndex);
      const hasEmbeddings = !!(this.chocoEmbeddings || this.wingetEmbeddings);

      if (hasIndexes && !hasEmbeddings) {
        console.log('Cache has indexes but missing embeddings, will download fresh data');
        return false;
      }

      return hasIndexes && hasEmbeddings;
    } catch (error) {
      console.error('Error loading from cache:', error);
      return false;
    }
  }

  /**
   * Save indexes to localStorage cache
   */
  private saveToCache(): void {
    try {
      localStorage.setItem(`${CACHE_KEY_PREFIX}timestamp`, Date.now().toString());
      if (this.chocoIndex) {
        localStorage.setItem(`${CACHE_KEY_PREFIX}choco_index`, JSON.stringify(this.chocoIndex));
      }
      if (this.wingetIndex) {
        localStorage.setItem(`${CACHE_KEY_PREFIX}winget_index`, JSON.stringify(this.wingetIndex));
      }
      if (this.chocoEmbeddings) {
        localStorage.setItem(`${CACHE_KEY_PREFIX}choco_embeddings`, JSON.stringify(this.chocoEmbeddings));
      }
      if (this.wingetEmbeddings) {
        localStorage.setItem(`${CACHE_KEY_PREFIX}winget_embeddings`, JSON.stringify(this.wingetEmbeddings));
      }
    } catch (error) {
      console.error('Error saving to cache:', error);
    }
  }

  /**
   * Get the Chocolatey package index
   */
  getChocoIndex(): PackageIndex | null {
    return this.chocoIndex;
  }

  /**
   * Get the Winget package index
   */
  getWingetIndex(): PackageIndex | null {
    return this.wingetIndex;
  }

  /**
   * Get Chocolatey embeddings
   */
  getChocoEmbeddings(): EmbeddingsIndex | null {
    return this.chocoEmbeddings;
  }

  /**
   * Get Winget embeddings
   */
  getWingetEmbeddings(): EmbeddingsIndex | null {
    return this.wingetEmbeddings;
  }

  /**
   * Search for packages by text (fallback string search)
   */
  searchPackages(query: string, source?: 'chocolatey' | 'winget'): PackageMetadata[] {
    const results: PackageMetadata[] = [];
    const lowerQuery = query.toLowerCase();

    const searchInIndex = (index: PackageIndex | null, indexName: string) => {
      if (!index) {
        console.log(`[packageIndexService.searchPackages] ${indexName} index is null`);
        return;
      }

      const totalPackages = Object.keys(index).length;
      console.log(`[packageIndexService.searchPackages] Searching ${totalPackages} packages in ${indexName} for "${query}"`);

      Object.values(index).forEach(pkg => {
        const matches =
          pkg.id.toLowerCase().includes(lowerQuery) ||
          pkg.title.toLowerCase().includes(lowerQuery) ||
          pkg.summary?.toLowerCase().includes(lowerQuery) ||
          pkg.tags?.toLowerCase().includes(lowerQuery);

        if (matches) {
          results.push(pkg);
        }
      });

      console.log(`[packageIndexService.searchPackages] Found ${results.length} matches in ${indexName}`);
    };

    if (!source || source === 'chocolatey') {
      searchInIndex(this.chocoIndex, 'chocolatey');
    }
    if (!source || source === 'winget') {
      searchInIndex(this.wingetIndex, 'winget');
    }

    return results.slice(0, 50); // Limit to 50 results
  }
}

// Singleton instance
export const packageIndexService = new PackageIndexService();
