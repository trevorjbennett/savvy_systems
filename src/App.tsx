import { useState, useEffect } from 'react';
import './App.css';
import { SearchBar } from './components/SearchBar';
import { WelcomeScreen } from './components/WelcomeScreen';
import { PackageList } from './components/PackageList';
import { Collections } from './components/Collections';
import { PersonaSwitcher } from './components/PersonaSwitcher';
import type { Package } from './types/package';
import type { Persona } from './types/persona';
import { MOCK_PACKAGES } from './data/mockData';
import { MOCK_PERSONAS } from './data/mockPersonas';

type FilterStatus = 'all' | 'installed' | 'not-installed';
type FilterSource = 'all' | 'chocolatey' | 'winget';
type SortBy = 'name' | 'category' | 'status';

function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredPackages, setFilteredPackages] = useState<Package[]>([]);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [browseAll, setBrowseAll] = useState(false);
  const [showCollections, setShowCollections] = useState(false);

  // Persona state
  const [currentPersona, setCurrentPersona] = useState<Persona>(() => {
    const saved = localStorage.getItem('savvy-current-persona');
    return saved ? JSON.parse(saved) : MOCK_PERSONAS[0];
  });

  // New filter/sort states
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterSource, setFilterSource] = useState<FilterSource>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortBy>('name');
  const [showFilters, setShowFilters] = useState(false);

  // Calculate updates count
  const updatesAvailable = MOCK_PACKAGES.filter(pkg => pkg.installed && pkg.hasUpdate).length;

  // Get unique categories
  const categories = ['all', ...Array.from(new Set(MOCK_PACKAGES.map(pkg => pkg.category)))];

  // Handle persona switch
  const handlePersonaSwitch = (persona: Persona) => {
    setCurrentPersona(persona);
    localStorage.setItem('savvy-current-persona', JSON.stringify(persona));
  };

  useEffect(() => {
    // Apply dark mode class to document
    if (darkMode) {
      document.documentElement.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
    }
  }, [darkMode]);

  const applyFiltersAndSort = (packages: Package[]) => {
    let result = [...packages];

    // Apply status filter
    if (filterStatus === 'installed') {
      result = result.filter(pkg => pkg.installed);
    } else if (filterStatus === 'not-installed') {
      result = result.filter(pkg => !pkg.installed);
    }

    // Apply source filter
    if (filterSource !== 'all') {
      result = result.filter(pkg => pkg.source === filterSource);
    }

    // Apply category filter
    if (filterCategory !== 'all') {
      result = result.filter(pkg => pkg.category === filterCategory);
    }

    // Apply sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'category':
          return a.category.localeCompare(b.category);
        case 'status':
          if (a.installed === b.installed) return a.name.localeCompare(b.name);
          return a.installed ? -1 : 1;
        default:
          return 0;
      }
    });

    return result;
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setBrowseAll(false);

    if (query.trim()) {
      const filtered = MOCK_PACKAGES.filter(
        (pkg) =>
          pkg.name.toLowerCase().includes(query.toLowerCase()) ||
          pkg.description.toLowerCase().includes(query.toLowerCase()) ||
          pkg.id.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredPackages(applyFiltersAndSort(filtered));
      setIsSearchActive(true);
    } else {
      setFilteredPackages([]);
      setIsSearchActive(false);
    }
  };

  const handleBrowseAll = () => {
    setSearchQuery('');
    setFilteredPackages(applyFiltersAndSort(MOCK_PACKAGES));
    setIsSearchActive(true);
    setBrowseAll(true);
  };

  const handleGoHome = () => {
    setSearchQuery('');
    setFilteredPackages([]);
    setIsSearchActive(false);
    setBrowseAll(false);
    setFilterStatus('all');
    setFilterSource('all');
    setFilterCategory('all');
    setSortBy('name');
  };

  const handleUpdateAll = () => {
    alert('Updating all packages with available updates...');
  };

  // Re-apply filters when filter/sort changes
  useEffect(() => {
    if (isSearchActive) {
      if (browseAll) {
        setFilteredPackages(applyFiltersAndSort(MOCK_PACKAGES));
      } else if (searchQuery.trim()) {
        const filtered = MOCK_PACKAGES.filter(
          (pkg) =>
            pkg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            pkg.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            pkg.id.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setFilteredPackages(applyFiltersAndSort(filtered));
      }
    }
  }, [filterStatus, filterSource, filterCategory, sortBy]);

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div className="logo-section" onClick={handleGoHome} style={{ cursor: 'pointer' }}>
            <h1 className="app-title">
              SAVVY
              <span className="edition-badge">Enterprise</span>
            </h1>
            <span className="app-subtitle">Package Manager</span>
          </div>
          <div className="header-actions">
            {updatesAvailable > 0 && (
              <button className="header-btn header-btn-with-icon" onClick={handleUpdateAll}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 4v6h6M23 20v-6h-6" />
                  <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
                </svg>
                Update All
                <span className="update-badge">{updatesAvailable}</span>
              </button>
            )}
            <button className="header-btn header-btn-with-icon" onClick={handleBrowseAll}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
              Browse All
            </button>
            <button className="header-btn header-btn-with-icon" onClick={() => setShowCollections(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
              Collections
            </button>
            <button
              className="header-btn header-icon-btn"
              onClick={() => setShowFilters(!showFilters)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
            </button>
            <button
              className="header-btn header-icon-btn"
              onClick={() => setShowSettings(!showSettings)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 1v6m0 6v6m6-12l-4.24 4.24M9.88 14.12L5.64 18.36m12.72 0l-4.24-4.24M9.88 9.88L5.64 5.64" />
              </svg>
            </button>
            <PersonaSwitcher
              personas={MOCK_PERSONAS}
              currentPersona={currentPersona}
              onSwitch={handlePersonaSwitch}
            />
          </div>
        </div>
      </header>

      {showCollections && (
        <Collections allPackages={MOCK_PACKAGES} currentPersona={currentPersona} onClose={() => setShowCollections(false)} />
      )}

      {showSettings && (
        <div className="settings-dropdown">
          <div className="settings-item">
            <span className="settings-label">Dark Mode</span>
            <button
              className={`toggle-switch ${darkMode ? 'active' : ''}`}
              onClick={() => setDarkMode(!darkMode)}
            >
              <span className="toggle-slider"></span>
            </button>
          </div>
        </div>
      )}

      {showFilters && (
        <div className="filters-panel">
          <div className="filter-section">
            <label className="filter-label">Status</label>
            <div className="filter-group">
              <button className={`filter-chip ${filterStatus === 'all' ? 'active' : ''}`} onClick={() => setFilterStatus('all')}>All</button>
              <button className={`filter-chip ${filterStatus === 'installed' ? 'active' : ''}`} onClick={() => setFilterStatus('installed')}>Installed</button>
              <button className={`filter-chip ${filterStatus === 'not-installed' ? 'active' : ''}`} onClick={() => setFilterStatus('not-installed')}>Not Installed</button>
            </div>
          </div>

          <div className="filter-section">
            <label className="filter-label">Source</label>
            <div className="filter-group">
              <button className={`filter-chip ${filterSource === 'all' ? 'active' : ''}`} onClick={() => setFilterSource('all')}>All</button>
              <button className={`filter-chip ${filterSource === 'chocolatey' ? 'active' : ''}`} onClick={() => setFilterSource('chocolatey')}>Chocolatey</button>
              <button className={`filter-chip ${filterSource === 'winget' ? 'active' : ''}`} onClick={() => setFilterSource('winget')}>Winget</button>
            </div>
          </div>

          <div className="filter-section">
            <label className="filter-label">Category</label>
            <div className="filter-group">
              {categories.map(cat => (
                <button
                  key={cat}
                  className={`filter-chip ${filterCategory === cat ? 'active' : ''}`}
                  onClick={() => setFilterCategory(cat)}
                >
                  {cat === 'all' ? 'All' : cat}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-section">
            <label className="filter-label">Sort By</label>
            <div className="filter-group">
              <button className={`filter-chip ${sortBy === 'name' ? 'active' : ''}`} onClick={() => setSortBy('name')}>Name</button>
              <button className={`filter-chip ${sortBy === 'category' ? 'active' : ''}`} onClick={() => setSortBy('category')}>Category</button>
              <button className={`filter-chip ${sortBy === 'status' ? 'active' : ''}`} onClick={() => setSortBy('status')}>Status</button>
            </div>
          </div>
        </div>
      )}

      <main className="app-main">
        {isSearchActive ? (
          <>
            <div className="search-section">
              <SearchBar value={searchQuery} onChange={handleSearch} />
            </div>
            <div className="content-section">
              <PackageList packages={filteredPackages} />
            </div>
          </>
        ) : (
          <div className="welcome-container">
            <WelcomeScreen>
              <SearchBar value={searchQuery} onChange={handleSearch} />
            </WelcomeScreen>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
