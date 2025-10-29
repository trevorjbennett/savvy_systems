import { useState } from 'react';
import type { Persona, PersonaCollection } from '../types/persona';
import './ShareCollectionModal.css';

interface ShareCollectionModalProps {
  collection: PersonaCollection;
  availablePersonas: Persona[];
  currentPersona: Persona;
  onShare: (collection: PersonaCollection, personaId: string) => void;
  onClose: () => void;
}

export function ShareCollectionModal({
  collection,
  availablePersonas,
  currentPersona,
  onShare,
  onClose,
}: ShareCollectionModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);

  // Filter personas (exclude current user and already shared personas)
  const filteredPersonas = availablePersonas.filter(persona => {
    if (persona.id === currentPersona.id) return false;
    if (collection.sharedWith?.includes(persona.id)) return false;

    const query = searchQuery.toLowerCase();
    return (
      persona.displayName.toLowerCase().includes(query) ||
      persona.email.toLowerCase().includes(query)
    );
  });

  const handleShare = () => {
    if (selectedPersona) {
      onShare(collection, selectedPersona.id);
      onClose();
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="share-modal-overlay" onClick={onClose}>
      <div className="share-modal" onClick={(e) => e.stopPropagation()}>
        <div className="share-modal-header">
          <h2 className="share-modal-title">Share Collection</h2>
          <button className="share-modal-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="share-modal-content">
          <div className="share-collection-info">
            <h3 className="share-collection-name">{collection.name}</h3>
            <p className="share-collection-meta">
              {collection.packageIds.length} packages
            </p>
          </div>

          <div className="share-search-section">
            <label className="share-search-label">Search by username or email</label>
            <input
              type="text"
              className="share-search-input"
              placeholder="Enter username or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>

          <div className="share-persona-list">
            {filteredPersonas.length === 0 ? (
              <div className="share-no-results">
                <p>No users found matching "{searchQuery}"</p>
              </div>
            ) : (
              filteredPersonas.map(persona => (
                <button
                  key={persona.id}
                  className={`share-persona-item ${selectedPersona?.id === persona.id ? 'selected' : ''}`}
                  onClick={() => setSelectedPersona(persona)}
                >
                  <div className="share-persona-avatar">
                    {persona.avatar ? (
                      <img src={persona.avatar} alt={persona.displayName} />
                    ) : (
                      <span className="share-persona-initials">{getInitials(persona.displayName)}</span>
                    )}
                  </div>
                  <div className="share-persona-info">
                    <span className="share-persona-name">{persona.displayName}</span>
                    <span className="share-persona-email">{persona.email}</span>
                  </div>
                  {selectedPersona?.id === persona.id && (
                    <svg className="share-persona-check" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        <div className="share-modal-footer">
          <button className="share-modal-btn share-cancel-btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="share-modal-btn share-confirm-btn"
            onClick={handleShare}
            disabled={!selectedPersona}
          >
            Share Collection
          </button>
        </div>
      </div>
    </div>
  );
}
