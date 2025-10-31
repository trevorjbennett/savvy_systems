import { useState, useEffect, useRef } from 'react';
import './SearchBar.css';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  suggestions?: string[];
}

export function SearchBar({ value, onChange, suggestions = [] }: SearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Update local value when prop changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleInputChange = (newValue: string) => {
    setLocalValue(newValue);
    setShowSuggestions(newValue.length > 0);

    // Clear existing timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Set new timer - only call onChange after 300ms of no typing
    debounceTimer.current = setTimeout(() => {
      onChange(newValue);
    }, 300);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      // Immediate search on Enter
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      onChange(localValue);
      setShowSuggestions(false);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setLocalValue(suggestion);
    onChange(suggestion);
    setShowSuggestions(false);
  };

  return (
    <div className={`search-bar ${isFocused ? 'focused' : ''}`}>
      <svg
        className="search-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
      <input
        type="text"
        className="search-input"
        placeholder="Search for packages... (press Enter to search)"
        value={localValue}
        onChange={(e) => handleInputChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          setIsFocused(false);
          // Delay hiding suggestions to allow clicking them
          setTimeout(() => setShowSuggestions(false), 200);
        }}
      />
      {showSuggestions && suggestions.length > 0 && (
        <div className="search-suggestions">
          {suggestions.slice(0, 5).map((suggestion, index) => (
            <div
              key={index}
              className="search-suggestion"
              onClick={() => handleSuggestionClick(suggestion)}
            >
              {suggestion}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
