import { useState } from 'react';
import type { Persona } from '../types/persona';
import './PersonaSwitcher.css';

interface PersonaSwitcherProps {
  personas: Persona[];
  currentPersona: Persona;
  onSwitch: (persona: Persona) => void;
}

export function PersonaSwitcher({ personas, currentPersona, onSwitch }: PersonaSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSwitch = (persona: Persona) => {
    onSwitch(persona);
    setIsOpen(false);
  };

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="persona-switcher">
      <button className="persona-btn" onClick={() => setIsOpen(!isOpen)}>
        <div className="persona-avatar">
          {currentPersona.avatar ? (
            <img src={currentPersona.avatar} alt={currentPersona.displayName} />
          ) : (
            <span className="persona-initials">{getInitials(currentPersona.displayName)}</span>
          )}
        </div>
        <span className="persona-name">{currentPersona.displayName}</span>
        <svg className="persona-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <div className="persona-dropdown">
          <div className="persona-dropdown-header">
            <h3 className="persona-dropdown-title">Switch Persona</h3>
          </div>
          <div className="persona-list">
            {personas.map(persona => (
              <button
                key={persona.id}
                className={`persona-item ${persona.id === currentPersona.id ? 'active' : ''}`}
                onClick={() => handleSwitch(persona)}
              >
                <div className="persona-avatar">
                  {persona.avatar ? (
                    <img src={persona.avatar} alt={persona.displayName} />
                  ) : (
                    <span className="persona-initials">{getInitials(persona.displayName)}</span>
                  )}
                </div>
                <div className="persona-info">
                  <span className="persona-item-name">{persona.displayName}</span>
                  <span className="persona-item-email">{persona.email}</span>
                </div>
                {persona.id === currentPersona.id && (
                  <svg className="persona-check" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                )}
              </button>
            ))}
          </div>
          <div className="persona-dropdown-footer">
            <p className="persona-hint">
              Switch personas to see different collections and setups
            </p>
          </div>
        </div>
      )}

      {isOpen && (
        <div className="persona-overlay" onClick={() => setIsOpen(false)} />
      )}
    </div>
  );
}
