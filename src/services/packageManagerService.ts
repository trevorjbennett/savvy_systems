/**
 * Package Manager Service
 * Bridges the frontend to Tauri backend for package operations
 */

import { invoke } from '@tauri-apps/api/tauri';

export type PackageSource = 'chocolatey' | 'winget';

export interface InstallResult {
  success: boolean;
  package_id: string;
  version?: string;
  output: string;
  error?: string;
}

export interface UninstallResult {
  success: boolean;
  package_id: string;
  output: string;
  error?: string;
}

export interface UpgradeResult {
  success: boolean;
  package_id: string;
  old_version?: string;
  new_version?: string;
  output: string;
  error?: string;
}

export interface InstalledPackage {
  id: string;
  version: string;
  source: PackageSource;
}

export interface PackageOperation {
  package_id: string;
  source: PackageSource;
  operation: 'install' | 'uninstall' | 'upgrade';
  status: 'pending' | 'running' | 'success' | 'failed';
  result?: InstallResult | UninstallResult | UpgradeResult;
  error?: string;
}

class PackageManagerService {
  private operations: Map<string, PackageOperation> = new Map();
  private listeners: Set<(operations: PackageOperation[]) => void> = new Set();

  /**
   * Install a package
   */
  async install(packageId: string, source: PackageSource): Promise<InstallResult> {
    const operationId = `${source}:${packageId}:install`;

    // Create operation
    const operation: PackageOperation = {
      package_id: packageId,
      source,
      operation: 'install',
      status: 'pending'
    };

    this.operations.set(operationId, operation);
    this.notifyListeners();

    try {
      // Update to running
      operation.status = 'running';
      this.notifyListeners();

      // Invoke Tauri command
      const result = await invoke<InstallResult>('install_package', {
        packageId,
        source
      });

      // Update operation
      operation.status = result.success ? 'success' : 'failed';
      operation.result = result;
      operation.error = result.error;

      this.notifyListeners();

      return result;
    } catch (error) {
      operation.status = 'failed';
      operation.error = String(error);
      this.notifyListeners();

      throw error;
    }
  }

  /**
   * Uninstall a package
   */
  async uninstall(packageId: string, source: PackageSource): Promise<UninstallResult> {
    const operationId = `${source}:${packageId}:uninstall`;

    const operation: PackageOperation = {
      package_id: packageId,
      source,
      operation: 'uninstall',
      status: 'pending'
    };

    this.operations.set(operationId, operation);
    this.notifyListeners();

    try {
      operation.status = 'running';
      this.notifyListeners();

      const result = await invoke<UninstallResult>('uninstall_package', {
        packageId,
        source
      });

      operation.status = result.success ? 'success' : 'failed';
      operation.result = result;
      operation.error = result.error;

      this.notifyListeners();

      return result;
    } catch (error) {
      operation.status = 'failed';
      operation.error = String(error);
      this.notifyListeners();

      throw error;
    }
  }

  /**
   * Upgrade a package
   */
  async upgrade(packageId: string, source: PackageSource): Promise<UpgradeResult> {
    const operationId = `${source}:${packageId}:upgrade`;

    const operation: PackageOperation = {
      package_id: packageId,
      source,
      operation: 'upgrade',
      status: 'pending'
    };

    this.operations.set(operationId, operation);
    this.notifyListeners();

    try {
      operation.status = 'running';
      this.notifyListeners();

      const result = await invoke<UpgradeResult>('upgrade_package', {
        packageId,
        source
      });

      operation.status = result.success ? 'success' : 'failed';
      operation.result = result;
      operation.error = result.error;

      this.notifyListeners();

      return result;
    } catch (error) {
      operation.status = 'failed';
      operation.error = String(error);
      this.notifyListeners();

      throw error;
    }
  }

  /**
   * List installed packages
   */
  async listInstalled(source: PackageSource): Promise<InstalledPackage[]> {
    try {
      const result = await invoke<InstalledPackage[]>('list_installed_packages', {
        source
      });

      return result;
    } catch (error) {
      console.error(`Error listing installed ${source} packages:`, error);
      throw error;
    }
  }

  /**
   * Get all operations
   */
  getOperations(): PackageOperation[] {
    return Array.from(this.operations.values());
  }

  /**
   * Get operations by status
   */
  getOperationsByStatus(status: PackageOperation['status']): PackageOperation[] {
    return this.getOperations().filter(op => op.status === status);
  }

  /**
   * Clear completed operations
   */
  clearCompletedOperations(): void {
    const toDelete: string[] = [];

    this.operations.forEach((op, key) => {
      if (op.status === 'success' || op.status === 'failed') {
        toDelete.push(key);
      }
    });

    toDelete.forEach(key => this.operations.delete(key));
    this.notifyListeners();
  }

  /**
   * Subscribe to operation updates
   */
  subscribe(listener: (operations: PackageOperation[]) => void): () => void {
    this.listeners.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of operation updates
   */
  private notifyListeners(): void {
    const operations = this.getOperations();
    this.listeners.forEach(listener => listener(operations));
  }
}

// Singleton instance
export const packageManagerService = new PackageManagerService();
