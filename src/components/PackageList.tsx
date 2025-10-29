import { useState } from 'react';
import type { Package } from '../types/package';
import { PackageCard } from './PackageCard';
import './PackageList.css';
import { MOCK_PACKAGES } from '../data/mockData';

interface PackageListProps {
  packages: Package[];
}

export function PackageList({ packages }: PackageListProps) {
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [batchMode, setBatchMode] = useState(false);
  const [selectedPackages, setSelectedPackages] = useState<Set<string>>(new Set());

  const handlePackageClick = (pkg: Package) => {
    setSelectedPackage(pkg);
    // Scroll to top when a new package is clicked
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const togglePackageSelection = (pkgId: string) => {
    setSelectedPackages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pkgId)) {
        newSet.delete(pkgId);
      } else {
        newSet.add(pkgId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedPackages(new Set(packages.map(p => p.id)));
  };

  const clearSelection = () => {
    setSelectedPackages(new Set());
  };

  const handleBatchAction = (action: string) => {
    const count = selectedPackages.size;
    alert(`${action} ${count} package${count !== 1 ? 's' : ''}...`);
    clearSelection();
    setBatchMode(false);
  };

  if (packages.length === 0) {
    return (
      <div className="no-results">
        <svg className="no-results-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
          <line x1="8" y1="11" x2="14" y2="11" />
        </svg>
        <h3 className="no-results-title">No packages found</h3>
        <p className="no-results-text">Try a different search term</p>
      </div>
    );
  }

  return (
    <div className="package-list">
      <div className="results-header">
        <h3 className="results-count">
          Found {packages.length} package{packages.length !== 1 ? 's' : ''}
        </h3>
        <div className="batch-controls">
          {!batchMode ? (
            <button className="batch-toggle-btn" onClick={() => setBatchMode(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 11H3v2h6m0-2V9m0 2v2m0-2h2l3-3m-2 6l3 3m-11 1h6m-6 0v-2m0 2v2" />
                <rect x="3" y="3" width="6" height="6" />
                <rect x="15" y="15" width="6" height="6" />
              </svg>
              Batch Select
            </button>
          ) : (
            <>
              <span className="batch-selection-count">{selectedPackages.size} selected</span>
              <button className="batch-action-btn" onClick={selectAll}>Select All</button>
              <button className="batch-action-btn" onClick={clearSelection}>Clear</button>
              {selectedPackages.size > 0 && (
                <>
                  <button className="batch-action-btn batch-install" onClick={() => handleBatchAction('Installing')}>Install</button>
                  <button className="batch-action-btn batch-update" onClick={() => handleBatchAction('Updating')}>Update</button>
                  <button className="batch-action-btn batch-uninstall" onClick={() => handleBatchAction('Uninstalling')}>Uninstall</button>
                </>
              )}
              <button className="batch-action-btn" onClick={() => { setBatchMode(false); clearSelection(); }}>Done</button>
            </>
          )}
        </div>
      </div>
      <div className={`package-grid ${batchMode ? 'batch-mode' : ''}`}>
        {packages.map((pkg) => (
          <div key={pkg.id} className="package-item-wrapper">
            {batchMode && (
              <div className="package-checkbox-wrapper">
                <input
                  type="checkbox"
                  className="package-checkbox"
                  checked={selectedPackages.has(pkg.id)}
                  onChange={() => togglePackageSelection(pkg.id)}
                />
              </div>
            )}
            <PackageCard
              package={pkg}
              allPackages={MOCK_PACKAGES}
              onPackageClick={handlePackageClick}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
