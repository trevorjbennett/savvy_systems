import { useState } from 'react';
import type { Package } from '../types/package';
import './PackageCard.css';

interface PackageCardProps {
  package: Package;
  allPackages: Package[];
  onPackageClick: (pkg: Package) => void;
}

export function PackageCard({ package: pkg, allPackages, onPackageClick }: PackageCardProps) {
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [showDetails, setShowDetails] = useState(false);

  // Get similar apps based on category (excluding current package)
  const similarApps = allPackages
    .filter(p => p.category === pkg.category && p.id !== pkg.id)
    .slice(0, 3);

  const handleAction = (action: string) => {
    setNotificationMessage(`${action} ${pkg.name}...`);
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 3000);
  };

  return (
    <>
      <div className="package-card">
        <div className="package-icon">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z" />
          </svg>
        </div>

        <div className="package-info">
          <div className="package-header">
            <h3 className="package-name" onClick={() => setShowDetails(true)} style={{ cursor: 'pointer' }}>
              {pkg.name}
            </h3>
            <div className="package-badges">
              <span className={`badge source-badge ${pkg.source}`}>
                {pkg.source.toUpperCase()}
              </span>
              {pkg.installed && (
                <span className="badge installed-badge">
                  <svg className="check-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                  INSTALLED
                </span>
              )}
            </div>
          </div>

          <p className="package-description">{pkg.description}</p>

          <div className="package-meta">
            <span className="meta-item">v{pkg.version}</span>
            <span className="meta-divider">•</span>
            <span className="meta-item">{pkg.category}</span>
            <span className="meta-divider">•</span>
            <button className="meta-link" onClick={() => setShowDetails(true)}>Details</button>
          </div>
        </div>

        <div className="package-actions">
          {pkg.installed ? (
            <>
              <button
                className="btn btn-primary"
                onClick={() => handleAction('Updating')}
              >
                <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 4v6h6M23 20v-6h-6" />
                  <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
                </svg>
                Update
              </button>
              <button
                className="btn btn-danger"
                onClick={() => handleAction('Uninstalling')}
              >
                <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                Uninstall
              </button>
            </>
          ) : (
            <button
              className="btn btn-success"
              onClick={() => handleAction('Installing')}
            >
              <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
              Install
            </button>
          )}
        </div>
      </div>

      {showNotification && (
        <div className="notification">
          <div className="notification-content">
            <svg className="notification-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
            <span>{notificationMessage}</span>
          </div>
        </div>
      )}

      {showDetails && (
        <div className="modal-overlay" onClick={() => setShowDetails(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{pkg.name}</h2>
              <button className="modal-close" onClick={() => setShowDetails(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="modal-body">
              <div className="modal-section">
                <h3 className="modal-label">Description</h3>
                <p className="modal-text">{pkg.description}</p>
              </div>

              <div className="modal-grid">
                <div className="modal-section">
                  <h3 className="modal-label">Version</h3>
                  <p className="modal-text">{pkg.version}</p>
                </div>

                <div className="modal-section">
                  <h3 className="modal-label">Source</h3>
                  <p className="modal-text">{pkg.source.toUpperCase()}</p>
                </div>

                <div className="modal-section">
                  <h3 className="modal-label">Category</h3>
                  <p className="modal-text">{pkg.category}</p>
                </div>

                <div className="modal-section">
                  <h3 className="modal-label">Status</h3>
                  <p className="modal-text">{pkg.installed ? 'INSTALLED' : 'NOT INSTALLED'}</p>
                </div>
              </div>

              <div className="modal-section">
                <h3 className="modal-label">Package ID</h3>
                <p className="modal-text modal-code">{pkg.id}</p>
              </div>

              {pkg.dependencies && pkg.dependencies.length > 0 && (
                <div className="modal-section">
                  <h3 className="modal-label">Dependencies</h3>
                  <div className="dependencies-list">
                    {pkg.dependencies.map((depId) => {
                      const dep = allPackages.find(p => p.id === depId);
                      return (
                        <div key={depId} className="dependency-item">
                          <svg className="dependency-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z" />
                          </svg>
                          <span className="dependency-name">{dep ? dep.name : depId}</span>
                          {dep && dep.installed && (
                            <svg className="dependency-check" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                            </svg>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {similarApps.length > 0 && (
                <div className="modal-section">
                  <h3 className="modal-label">Similar Apps</h3>
                  <div className="similar-apps">
                    {similarApps.map(similar => (
                      <button
                        key={similar.id}
                        className="similar-app-card"
                        onClick={() => {
                          setShowDetails(false);
                          onPackageClick(similar);
                        }}
                      >
                        <div className="similar-app-info">
                          <span className="similar-app-name">{similar.name}</span>
                          <span className="similar-app-desc">{similar.description}</span>
                        </div>
                        <svg className="similar-app-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M5 12h14M12 5l7 7-7 7"/>
                        </svg>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              {pkg.installed ? (
                <>
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      handleAction('Updating');
                      setShowDetails(false);
                    }}
                  >
                    <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 4v6h6M23 20v-6h-6" />
                      <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
                    </svg>
                    Update
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => {
                      handleAction('Uninstalling');
                      setShowDetails(false);
                    }}
                  >
                    <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                    Uninstall
                  </button>
                </>
              ) : (
                <button
                  className="btn btn-success"
                  onClick={() => {
                    handleAction('Installing');
                    setShowDetails(false);
                  }}
                >
                  <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                  </svg>
                  Install
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
