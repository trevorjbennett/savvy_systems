import { useState, useEffect } from 'react';
import type { Package } from '../types/package';
import type { Persona, PersonaCollection } from '../types/persona';
import { MOCK_PERSONA_COLLECTIONS, MOCK_PERSONAS } from '../data/mockPersonas';
import { ShareCollectionModal } from './ShareCollectionModal';
import './Collections.css';

interface CollectionsProps {
  allPackages: Package[];
  currentPersona: Persona;
  onClose: () => void;
}

export function Collections({ allPackages, currentPersona, onClose }: CollectionsProps) {
  const [collections, setCollections] = useState<PersonaCollection[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [collectionToShare, setCollectionToShare] = useState<PersonaCollection | null>(null);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionDescription, setNewCollectionDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [selectedPackages, setSelectedPackages] = useState<string[]>([]);
  const [expandedCollection, setExpandedCollection] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'my' | 'shared'>('my');

  // Load collections for current persona
  useEffect(() => {
    // In production, this would fetch from Firebase
    // Filter collections owned by current persona OR shared with them
    const myCollections = MOCK_PERSONA_COLLECTIONS.filter(
      c => c.personaId === currentPersona.id
    );
    const sharedCollections = MOCK_PERSONA_COLLECTIONS.filter(
      c => c.personaId !== currentPersona.id && (
        c.isPublic || c.sharedWith?.includes(currentPersona.id)
      )
    );

    if (viewMode === 'my') {
      setCollections(myCollections);
    } else {
      setCollections(sharedCollections);
    }
  }, [currentPersona, viewMode]);

  const saveCollection = (collection: PersonaCollection) => {
    // In production, this would save to Firebase
    setCollections(prev => [...prev, collection]);
  };

  const handleCreateCollection = () => {
    if (!newCollectionName.trim() || selectedPackages.length === 0) return;

    const newCollection: PersonaCollection = {
      id: Date.now().toString(),
      personaId: currentPersona.id,
      name: newCollectionName,
      description: newCollectionDescription,
      packageIds: selectedPackages,
      isPublic: isPublic,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    saveCollection(newCollection);
    setNewCollectionName('');
    setNewCollectionDescription('');
    setIsPublic(false);
    setSelectedPackages([]);
    setShowCreateModal(false);
  };

  const handleDeleteCollection = (id: string) => {
    setCollections(prev => prev.filter(c => c.id !== id));
  };

  const handleExportCollection = (collection: PersonaCollection) => {
    const dataStr = JSON.stringify(collection, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `${collection.name.replace(/\s+/g, '-').toLowerCase()}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImportCollection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        imported.id = Date.now().toString(); // Generate new ID
        imported.createdAt = new Date();
        saveCollections([...collections, imported]);
      } catch (error) {
        alert('Failed to import collection. Invalid file format.');
      }
    };
    reader.readAsText(file);
  };

  const handleShareCollection = (collection: PersonaCollection) => {
    setCollectionToShare(collection);
    setShowShareModal(true);
  };

  const handleTogglePublic = (collection: PersonaCollection) => {
    // In production, this would update Firebase
    const updated = collections.map(c =>
      c.id === collection.id ? { ...c, isPublic: !c.isPublic, updatedAt: new Date() } : c
    );
    setCollections(updated);
    alert(`Collection is now ${!collection.isPublic ? 'public' : 'private'}`);
  };

  const togglePackageSelection = (pkgId: string) => {
    setSelectedPackages(prev =>
      prev.includes(pkgId)
        ? prev.filter(id => id !== pkgId)
        : [...prev, pkgId]
    );
  };

  return (
    <div className="collections-modal-overlay" onClick={onClose}>
      <div className="collections-modal" onClick={(e) => e.stopPropagation()}>
        <div className="collections-header">
          <h2 className="collections-title">Package Collections</h2>
          <button className="collections-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="collections-body">
          <div className="persona-info-bar">
            <span className="persona-info-text">Viewing as: <strong>{currentPersona.displayName}</strong></span>
          </div>

          <div className="collections-tabs">
            <button
              className={`collections-tab ${viewMode === 'my' ? 'active' : ''}`}
              onClick={() => setViewMode('my')}
            >
              My Collections
            </button>
            <button
              className={`collections-tab ${viewMode === 'shared' ? 'active' : ''}`}
              onClick={() => setViewMode('shared')}
            >
              Shared with Me
            </button>
          </div>

          {viewMode === 'my' && (
            <div className="collections-actions">
              <button className="collections-btn" onClick={() => setShowCreateModal(true)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                New Collection
              </button>
              <label className="collections-btn collections-import">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                </svg>
                Import Collection
                <input type="file" accept=".json" onChange={handleImportCollection} style={{ display: 'none' }} />
              </label>
            </div>
          )}

          {collections.length === 0 ? (
            <div className="collections-empty">
              <svg className="collections-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <p className="collections-empty-text">No collections yet</p>
              <p className="collections-empty-hint">Create a collection to group your favorite packages</p>
            </div>
          ) : (
            <div className="collections-list">
              {collections.map(collection => {
                const packages = collection.packageIds
                  .map(id => allPackages.find(p => p.id === id))
                  .filter(Boolean) as Package[];

                const isOwner = collection.personaId === currentPersona.id;

                return (
                  <div key={collection.id} className={`collection-card ${collection.isPublic ? 'public' : ''}`}>
                    <div className="collection-card-header" onClick={() => setExpandedCollection(expandedCollection === collection.id ? null : collection.id)}>
                      <div>
                        <div className="collection-header-row">
                          <h3 className="collection-name">{collection.name}</h3>
                          {collection.isPublic && (
                            <span className="public-badge">PUBLIC</span>
                          )}
                          {!collection.isPublic && collection.sharedWith && collection.sharedWith.length > 0 && (
                            <span className="shared-badge">SHARED</span>
                          )}
                        </div>
                        <p className="collection-meta">
                          {packages.length} packages
                          {isOwner && collection.sharedWith && collection.sharedWith.length > 0 && (
                            ` • Shared with ${collection.sharedWith.length} ${collection.sharedWith.length === 1 ? 'user' : 'users'}`
                          )}
                          {!isOwner && ` • Shared by ${MOCK_PERSONAS.find(p => p.id === collection.personaId)?.displayName}`}
                        </p>
                      </div>
                      {isOwner && (
                        <div className="collection-card-actions">
                          <button
                            className={`collection-action-btn ${collection.isPublic ? 'active' : ''}`}
                            onClick={(e) => { e.stopPropagation(); handleTogglePublic(collection); }}
                            title={collection.isPublic ? 'Make Private' : 'Make Public'}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              {collection.isPublic ? (
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
                              ) : (
                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22" />
                              )}
                            </svg>
                          </button>
                          <button
                            className="collection-action-btn"
                            onClick={(e) => { e.stopPropagation(); handleShareCollection(collection); }}
                            title="Share with User"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                              <polyline points="16 6 12 2 8 6" />
                              <line x1="12" y1="2" x2="12" y2="15" />
                            </svg>
                          </button>
                          <button className="collection-action-btn" onClick={(e) => { e.stopPropagation(); handleExportCollection(collection); }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                            </svg>
                          </button>
                          <button className="collection-action-btn delete" onClick={(e) => { e.stopPropagation(); handleDeleteCollection(collection.id); }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                    {expandedCollection === collection.id && (
                      <div className="collection-packages">
                        {packages.map(pkg => (
                          <div key={pkg.id} className="collection-package-item">
                            <span className="collection-package-name">{pkg.name}</span>
                            <span className={`collection-package-status ${pkg.installed ? 'installed' : 'not-installed'}`}>
                              {pkg.installed ? 'Installed' : 'Not Installed'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {showCreateModal && (
          <div className="create-collection-modal">
            <h3 className="create-collection-title">Create New Collection</h3>
            <input
              type="text"
              className="collection-name-input"
              placeholder="Collection name..."
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
            />
            <div className="create-collection-packages">
              <h4 className="create-collection-subtitle">Select Packages</h4>
              <div className="package-selection-list">
                {allPackages.map(pkg => (
                  <label key={pkg.id} className="package-selection-item">
                    <input
                      type="checkbox"
                      checked={selectedPackages.includes(pkg.id)}
                      onChange={() => togglePackageSelection(pkg.id)}
                    />
                    <span className="package-selection-name">{pkg.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="create-collection-actions">
              <button className="collections-btn" onClick={() => setShowCreateModal(false)}>Cancel</button>
              <button className="collections-btn collections-btn-primary" onClick={handleCreateCollection}>Create</button>
            </div>
          </div>
        )}

        {showShareModal && collectionToShare && (
          <ShareCollectionModal
            collection={collectionToShare}
            availablePersonas={MOCK_PERSONAS}
            currentPersona={currentPersona}
            onShare={(collection, personaId) => {
              // Update the collection's sharedWith array
              const updated = collections.map(c =>
                c.id === collection.id
                  ? {
                      ...c,
                      sharedWith: [...(c.sharedWith || []), personaId],
                      updatedAt: new Date(),
                    }
                  : c
              );
              setCollections(updated);
              setShowShareModal(false);
              setCollectionToShare(null);
              alert(`Collection shared successfully!`);
            }}
            onClose={() => {
              setShowShareModal(false);
              setCollectionToShare(null);
            }}
          />
        )}
      </div>
    </div>
  );
}
