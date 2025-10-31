/**
 * App Initialization Service
 * Coordinates initialization of all services on app startup
 */

import { packageIndexService } from './packageIndexService';
import { semanticSearchService } from './semanticSearchService';

export interface InitializationStatus {
  packageIndexes: 'pending' | 'loading' | 'ready' | 'error';
  semanticSearch: 'pending' | 'loading' | 'ready' | 'error';
  overall: 'pending' | 'loading' | 'ready' | 'error';
}

class AppInitService {
  private status: InitializationStatus = {
    packageIndexes: 'pending',
    semanticSearch: 'pending',
    overall: 'pending'
  };

  private listeners: Set<(status: InitializationStatus) => void> = new Set();

  /**
   * Initialize all app services
   */
  async initialize(): Promise<void> {
    console.log('Starting SAVVY initialization...');

    this.status.overall = 'loading';
    this.notifyListeners();

    try {
      // Step 1: Initialize package indexes (critical)
      console.log('Step 1: Initializing package indexes...');
      this.status.packageIndexes = 'loading';
      this.notifyListeners();

      await packageIndexService.initialize();

      this.status.packageIndexes = 'ready';
      console.log('Package indexes ready!');
      this.notifyListeners();

      // Step 2: Initialize semantic search (optional, can fail gracefully)
      console.log('Step 2: Initializing semantic search...');
      this.status.semanticSearch = 'loading';
      this.notifyListeners();

      try {
        await semanticSearchService.initialize();
        this.status.semanticSearch = 'ready';
        console.log('Semantic search ready!');
      } catch (error) {
        console.warn('Semantic search initialization failed (will use fallback):', error);
        this.status.semanticSearch = 'error';
      }

      this.notifyListeners();

      // Overall status
      this.status.overall = 'ready';
      console.log('SAVVY initialization complete!');
      this.notifyListeners();
    } catch (error) {
      console.error('Critical initialization error:', error);
      this.status.overall = 'error';
      this.notifyListeners();
      throw error;
    }
  }

  /**
   * Get current initialization status
   */
  getStatus(): InitializationStatus {
    return { ...this.status };
  }

  /**
   * Check if app is ready
   */
  isReady(): boolean {
    return this.status.overall === 'ready';
  }

  /**
   * Check if semantic search is available
   */
  isSemanticSearchReady(): boolean {
    return this.status.semanticSearch === 'ready';
  }

  /**
   * Subscribe to status updates
   */
  subscribe(listener: (status: InitializationStatus) => void): () => void {
    this.listeners.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of status updates
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.getStatus()));
  }
}

// Singleton instance
export const appInitService = new AppInitService();
