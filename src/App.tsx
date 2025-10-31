import { useState, useEffect } from 'react';
import './App.css';
import { SearchBar } from './components/SearchBar';
import { WelcomeScreen } from './components/WelcomeScreen';
import { PackageList } from './components/PackageList';
import { Collections } from './components/Collections';
import { PersonaSwitcher } from './components/PersonaSwitcher';
import type { Package } from './types/package';
import type { Persona } from './types/persona';
import { MOCK_PERSONAS } from './data/mockPersonas';
import { MOCK_PACKAGES } from './data/mockData';
import { appInitService } from './services/appInitService';
import { semanticSearchService } from './services/semanticSearchService';
import { packageIndexService } from './services/packageIndexService';
import type { PackageMetadata } from './services/packageIndexService';

type FilterStatus = 'all' | 'installed' | 'not-installed';
type FilterSource = 'all' | 'chocolatey' | 'winget';
type SortBy = 'name' | 'category' | 'status';

// Convert PackageMetadata to Package type
function convertToPackage(pkg: PackageMetadata, source: 'chocolatey' | 'winget'): Package {
  // Clean up version string - remove 'v' prefix if present
  const cleanVersion = pkg.version ? pkg.version.replace(/^v/, '') : '';

  // Extract category from tags - prioritize meaningful categories
  const tags = pkg.tags?.split(',').map(t => t.trim()).filter(Boolean) || [];

  // Common metadata tags to skip (not categories)
  const metaTags = ['admin', 'foss', 'cross-platform', 'cli', 'recommended', 'notsilent'];

  // Category mapping for common tags
  const categoryMap: { [key: string]: string } = {
    // Development
    'development': 'Development',
    'developer': 'Development',
    'programming': 'Development',
    'ide': 'Development',
    'editor': 'Development',
    'vcs': 'Development',
    'git': 'Development',

    // Web & Browsers
    'browser': 'Web Browser',
    'web': 'Web',
    'internet': 'Internet',

    // Media
    'media': 'Media',
    'video': 'Video',
    'audio': 'Audio',
    'music': 'Music',
    'graphics': 'Graphics',
    'photo': 'Graphics',
    'image': 'Graphics',

    // Gaming
    'game': 'Games',
    'games': 'Games',
    'gaming': 'Games',

    // Utilities
    'utility': 'Utilities',
    'utilities': 'Utilities',
    'tools': 'Tools',
    'tool': 'Tools',

    // System
    'system': 'System',
    'security': 'Security',
    'backup': 'Backup',

    // Communication
    'communication': 'Communication',
    'chat': 'Communication',
    'messaging': 'Communication',

    // Productivity
    'productivity': 'Productivity',
    'office': 'Office',
    'document': 'Documents',

    // Education
    'education': 'Education',
    'learning': 'Education',
  };

  // First try to find a tag that maps to a known category
  let category = '';
  for (const tag of tags) {
    const lowerTag = tag.toLowerCase();
    if (categoryMap[lowerTag]) {
      category = categoryMap[lowerTag];
      break;
    }
  }

  // If no mapped category, find first meaningful tag
  if (!category) {
    category = tags.find(t =>
      !metaTags.includes(t.toLowerCase()) &&
      t.length > 2 // Skip very short tags
    ) || '';
  }

  // If still no category, try to infer from package name
  if (!category) {
    const name = pkg.title?.toLowerCase() || pkg.id?.toLowerCase() || '';
    const desc = pkg.summary?.toLowerCase() || pkg.description?.toLowerCase() || '';
    const combined = `${name} ${desc}`;

    if (combined.includes('game')) category = 'Games';
    else if (combined.includes('browser')) category = 'Web Browser';
    else if (combined.includes('develop') || combined.includes('code') || combined.includes('ide')) category = 'Development';
    else if (combined.includes('media') || combined.includes('video') || combined.includes('audio') || combined.includes('player')) category = 'Media';
    else if (combined.includes('office') || combined.includes('document')) category = 'Office';
    else if (combined.includes('security') || combined.includes('antivirus')) category = 'Security';
    else if (combined.includes('chat') || combined.includes('messaging')) category = 'Communication';
    else category = tags[0] || 'Utilities';
  }

  // Capitalize first letter
  category = category.charAt(0).toUpperCase() + category.slice(1);

  return {
    id: pkg.id,
    name: pkg.title || pkg.id,
    description: pkg.summary || pkg.description || 'No description available',
    version: cleanVersion || '1.0.0',
    source: source,
    installed: false, // TODO: Check installed status
    hasUpdate: false, // TODO: Check for updates
    category: category,
    publisher: pkg.publisher || 'Unknown Publisher'
  };
}

function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredPackages, setFilteredPackages] = useState<Package[]>([]);
  const [allPackages, setAllPackages] = useState<Package[]>([]);
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [browseAll, setBrowseAll] = useState(false);
  const [showCollections, setShowCollections] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

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

  // Initialize services on mount
  useEffect(() => {
    const initServices = async () => {
      try {
        console.log('Initializing SAVVY services...');
        await appInitService.initialize();

        // Load all packages from indexes
        const chocoIndex = packageIndexService.getChocoIndex();
        const wingetIndex = packageIndexService.getWingetIndex();

        const packages: Package[] = [];

        if (chocoIndex) {
          Object.values(chocoIndex).forEach(pkg => {
            packages.push(convertToPackage(pkg, 'chocolatey'));
          });
        }

        if (wingetIndex) {
          Object.values(wingetIndex).forEach(pkg => {
            packages.push(convertToPackage(pkg, 'winget'));
          });
        }

        setAllPackages(packages);
        setIsInitializing(false);
        console.log(`Loaded ${packages.length} packages`);
      } catch (error) {
        console.error('Failed to initialize services:', error);
        console.warn('Falling back to mock data');
        // Fallback to mock data if real data fails
        setAllPackages(MOCK_PACKAGES);
        setIsInitializing(false);
      }
    };

    initServices();
  }, []);

  // Calculate updates count
  const updatesAvailable = allPackages.filter(pkg => pkg.installed && pkg.hasUpdate).length;

  // Get unique categories
  const categories = ['all', ...Array.from(new Set(allPackages.map(pkg => pkg.category)))];

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

  const handleSearch = async (query: string) => {
    console.log(`[App.handleSearch] Called with query: "${query}"`);
    setSearchQuery(query);
    setBrowseAll(false);

    if (query.trim()) {
      const lowerQuery = query.toLowerCase();

      // Generate search suggestions based on partial match
      if (query.length >= 2) {
        const suggestions = Array.from(new Set(
          allPackages
            .filter(pkg =>
              pkg.name.toLowerCase().includes(lowerQuery) ||
              pkg.id.toLowerCase().includes(lowerQuery)
            )
            .map(pkg => pkg.name)
            .slice(0, 10)
        ));
        setSearchSuggestions(suggestions);
        console.log(`[App.handleSearch] Generated ${suggestions.length} suggestions`);
      } else {
        setSearchSuggestions([]);
      }

      // Use semantic search if available
      console.log(`[App.handleSearch] Calling semanticSearchService.search...`);
      const searchResults = await semanticSearchService.search(query, {
        source: 'both',
        limit: 100,
        threshold: 0.2 // Lower threshold for more results
      });

      console.log(`[App.handleSearch] Got ${searchResults.length} results from semantic search`);

      // Convert search results to Package type
      const packages = searchResults.map(result =>
        convertToPackage(result.package, result.source)
      );

      console.log(`[App.handleSearch] Converted to ${packages.length} Package objects`);
      setFilteredPackages(applyFiltersAndSort(packages));
      setIsSearchActive(true);
      console.log(`[App.handleSearch] Search complete`);
    } else {
      setFilteredPackages([]);
      setSearchSuggestions([]);
      setIsSearchActive(false);
    }
  };

  const handleBrowseAll = () => {
    setSearchQuery('');
    setFilteredPackages(applyFiltersAndSort(allPackages));
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
        setFilteredPackages(applyFiltersAndSort(allPackages));
      } else if (searchQuery.trim()) {
        // Re-run search with new filters
        handleSearch(searchQuery);
      }
    }
  }, [filterStatus, filterSource, filterCategory, sortBy]);

  // Show loading state during initialization
  if (isInitializing) {
    return (
      <div className="app">
        <div className="loading-screen">
          <h1>SAVVY</h1>
          <p>Intelligent Package Management</p>
          <div className="loading-spinner"></div>
          <div className="loading-steps">
            <div className="loading-step active">Downloading Package Indexes</div>
            <div className="loading-step">Loading AI Search Model</div>
            <div className="loading-step">Preparing Interface</div>
          </div>
        </div>
      </div>
    );
  }

  // Show error state if initialization failed
  if (initError) {
    return (
      <div className="app">
        <div className="error-screen">
          <h1>SAVVY</h1>
          <p>Failed to initialize: {initError}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div className="logo-section" onClick={handleGoHome} style={{ cursor: 'pointer' }}>
            <h1 className="app-title">SAVVY</h1>
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
        <Collections allPackages={allPackages} currentPersona={currentPersona} onClose={() => setShowCollections(false)} />
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
              <SearchBar value={searchQuery} onChange={handleSearch} suggestions={searchSuggestions} />
            </div>
            <div className="content-section">
              <PackageList packages={filteredPackages} />
            </div>
          </>
        ) : (
          <div className="welcome-container">
            <WelcomeScreen>
              <SearchBar value={searchQuery} onChange={handleSearch} suggestions={searchSuggestions} />
            </WelcomeScreen>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
