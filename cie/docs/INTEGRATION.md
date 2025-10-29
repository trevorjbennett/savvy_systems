# CIE Integration Guide

How to integrate the Community Intelligence Engine SDK into SAVVY Community and Enterprise editions.

---

## Overview

The CIE SDK is a **standalone npm package** (`@savvy/cie-sdk`) that both Community and Enterprise editions install as a dependency.

**This branch (`feature/community-intelligence-engine`) contains:**
1. **SDK Code** - TypeScript package published to npm
2. **Server Code** - FastAPI backend deployed to cloud
3. **Documentation** - Integration guides

**This branch does NOT contain:**
- ❌ SAVVY desktop app code (that's in `community` and `enterprise` branches)
- ❌ UI components (those live in the edition branches)

---

## Installation

### Step 1: Publish SDK to npm (One-Time Setup)

```bash
# In this CIE branch
cd cie/sdk
npm publish --access public

# SDK is now available as:
# @savvy/cie-sdk
```

### Step 2: Install in Community Edition

```bash
# Switch to community branch
git checkout community

# Install SDK
npm install @savvy/cie-sdk

# Commit
git add package.json package-lock.json
git commit -m "feat: Add CIE SDK dependency"
```

### Step 3: Install in Enterprise Edition

```bash
# Switch to enterprise branch
git checkout enterprise

# Install SDK (same package)
npm install @savvy/cie-sdk

# Commit
git add package.json package-lock.json
git commit -m "feat: Add CIE SDK dependency"
```

---

## Integration Steps

### 1. Create CIE Service Wrapper

In both `community` and `enterprise` branches, create:

**`src/services/cie.ts`**

```typescript
import { CIEClient, CIEConfig } from '@savvy/cie-sdk';

// Initialize CIE client (singleton)
let cieClient: CIEClient | null = null;

export function initializeCIE(config: CIEConfig): void {
  if (cieClient) {
    console.warn('CIE already initialized');
    return;
  }

  cieClient = new CIEClient({
    enabled: config.enabled,
    apiEndpoint: config.apiEndpoint || 'https://cie.savvy.app',
    batchSize: config.batchSize || 100,
    flushInterval: config.flushInterval || 86400000, // 24 hours
  });

  console.log('CIE initialized:', config.enabled ? 'enabled' : 'disabled');
}

export function getCIEClient(): CIEClient | null {
  return cieClient;
}

export function logInstallAttempt(packageId: string, manager: 'choco' | 'winget'): void {
  cieClient?.logEvent({
    type: 'install_attempt',
    packageId,
    manager,
    timestamp: Date.now(),
  });
}

export function logInstallSuccess(packageId: string, manager: 'choco' | 'winget'): void {
  cieClient?.logEvent({
    type: 'install_success',
    packageId,
    manager,
    timestamp: Date.now(),
  });
}

export function logInstallError(
  packageId: string,
  manager: 'choco' | 'winget',
  errorCode: string,
  errorMessage: string
): void {
  cieClient?.logError({
    packageId,
    manager,
    errorCode,
    errorMessage,
    timestamp: Date.now(),
  });
}

export async function getSuggestedFixes(
  packageId: string,
  errorCode: string
): Promise<Solution[]> {
  if (!cieClient) return [];

  try {
    return await cieClient.getSolutions({ packageId, errorCode });
  } catch (error) {
    console.error('Failed to fetch CIE solutions:', error);
    return [];
  }
}

export function submitSolutionFeedback(solutionId: string, helpful: boolean): void {
  cieClient?.submitFeedback({ solutionId, helpful });
}
```

---

### 2. Initialize CIE on App Startup

**`src/App.tsx`** or **`src/main.tsx`**

```typescript
import { initializeCIE } from './services/cie';

// On app startup
useEffect(() => {
  // Check if user has opted in/out
  const cieEnabled = localStorage.getItem('savvy-cie-enabled');

  // Community Edition: opt-in (default: false)
  // Enterprise Edition: opt-out (default: true)
  const defaultEnabled = IS_ENTERPRISE_EDITION ? true : false;

  const enabled = cieEnabled !== null
    ? cieEnabled === 'true'
    : defaultEnabled;

  initializeCIE({
    enabled,
    apiEndpoint: 'https://cie.savvy.app',
  });
}, []);
```

---

### 3. Hook into Package Operations

**Wherever packages are installed/updated:**

```typescript
import {
  logInstallAttempt,
  logInstallSuccess,
  logInstallError
} from './services/cie';

async function installPackage(pkg: Package) {
  // Log attempt
  logInstallAttempt(pkg.id, pkg.manager);

  try {
    // Run Chocolatey/WinGet command
    const result = await runPackageManager(pkg);

    if (result.success) {
      // Log success
      logInstallSuccess(pkg.id, pkg.manager);
    } else {
      // Log error
      logInstallError(
        pkg.id,
        pkg.manager,
        result.errorCode,
        result.errorMessage
      );

      // Show suggested fixes
      showErrorSuggestionsModal(pkg, result);
    }
  } catch (error) {
    logInstallError(
      pkg.id,
      pkg.manager,
      'UNKNOWN',
      error.message
    );
  }
}
```

---

### 4. Create Suggested Fixes Modal

**`src/components/SuggestedFixesModal.tsx`**

```typescript
import { useState, useEffect } from 'react';
import { getSuggestedFixes, submitSolutionFeedback } from '../services/cie';
import type { Solution } from '@savvy/cie-sdk';

interface SuggestedFixesModalProps {
  packageId: string;
  errorCode: string;
  errorMessage: string;
  onClose: () => void;
  onRetry: () => void;
}

export function SuggestedFixesModal({
  packageId,
  errorCode,
  errorMessage,
  onClose,
  onRetry,
}: SuggestedFixesModalProps) {
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSolutions() {
      const fixes = await getSuggestedFixes(packageId, errorCode);
      setSolutions(fixes);
      setLoading(false);
    }
    fetchSolutions();
  }, [packageId, errorCode]);

  function handleFeedback(solutionId: string, helpful: boolean) {
    submitSolutionFeedback(solutionId, helpful);
    // Show thank you message
  }

  if (loading) {
    return <div>Loading suggestions...</div>;
  }

  return (
    <div className="modal">
      <h2>Installation Failed</h2>
      <p>Package: {packageId}</p>
      <p>Error: {errorMessage}</p>

      {solutions.length > 0 && (
        <>
          <h3>Suggested Fixes ({solutions.length})</h3>
          {solutions.map(solution => (
            <div key={solution.id} className="solution-card">
              <h4>{solution.title}</h4>
              <p>{solution.success_rate * 100}% success rate</p>
              <ol>
                {solution.steps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
              <div>
                <button onClick={() => handleFeedback(solution.id, true)}>
                  👍 Helpful
                </button>
                <button onClick={() => handleFeedback(solution.id, false)}>
                  👎 Not helpful
                </button>
              </div>
            </div>
          ))}
        </>
      )}

      <button onClick={onRetry}>Try Again</button>
      <button onClick={onClose}>Close</button>
    </div>
  );
}
```

---

### 5. Add Settings Toggle

**`src/components/Settings.tsx`**

```typescript
import { useState } from 'react';
import { getCIEClient } from '../services/cie';

export function Settings() {
  const [cieEnabled, setCieEnabled] = useState(() => {
    return localStorage.getItem('savvy-cie-enabled') === 'true';
  });

  function handleCIEToggle(enabled: boolean) {
    localStorage.setItem('savvy-cie-enabled', String(enabled));
    setCieEnabled(enabled);

    // Reinitialize CIE
    const client = getCIEClient();
    if (client) {
      enabled ? client.enable() : client.disable();
    }
  }

  return (
    <div className="settings">
      <h2>Privacy & Data</h2>

      <div className="setting-row">
        <div>
          <h3>Help Improve SAVVY</h3>
          <p>
            Share anonymous error data to help improve the app and build a
            community error dictionary.
          </p>
          <a href="#" onClick={() => showPrivacyModal()}>
            What data is collected?
          </a>
        </div>
        <label className="toggle">
          <input
            type="checkbox"
            checked={cieEnabled}
            onChange={(e) => handleCIEToggle(e.target.checked)}
          />
          <span className="slider"></span>
        </label>
      </div>
    </div>
  );
}
```

---

## Configuration Differences

### Community Edition

```typescript
// src/config.ts
export const CIE_CONFIG = {
  defaultEnabled: false, // Opt-in
  apiEndpoint: 'https://cie.savvy.app',
  showConsentModal: true, // Show on first launch
};
```

### Enterprise Edition

```typescript
// src/config.ts
export const CIE_CONFIG = {
  defaultEnabled: true, // Opt-out
  apiEndpoint: 'https://cie.savvy.app', // Or private instance
  showConsentModal: false, // Admin decides org-wide
};
```

---

## Testing Integration

### 1. Test Event Collection

```typescript
// In dev console
import { getCIEClient } from './services/cie';

const client = getCIEClient();

// Check if enabled
console.log('CIE enabled:', client?.isEnabled());

// Manually trigger event
client?.logEvent({
  type: 'install_attempt',
  packageId: 'test-package',
  manager: 'choco',
  timestamp: Date.now(),
});

// Check localStorage for batched events
console.log(localStorage.getItem('savvy-cie-events'));
```

### 2. Test Solution Fetching

```typescript
const solutions = await getSuggestedFixes('docker-desktop', '1603');
console.log('Solutions:', solutions);
```

### 3. Test Opt-In/Out

1. Open Settings
2. Toggle CIE on/off
3. Check localStorage: `savvy-cie-enabled`
4. Verify events stop being collected when disabled

---

## Deployment Checklist

### Before Merging to Community/Enterprise

- [ ] CIE SDK published to npm
- [ ] `@savvy/cie-sdk` version: `1.0.0`
- [ ] CIE backend deployed to `https://cie.savvy.app`
- [ ] API endpoints tested and working
- [ ] Privacy policy reviewed and approved
- [ ] Settings UI created in both editions
- [ ] Error modal with suggestions tested
- [ ] Event collection tested end-to-end
- [ ] Opt-in/opt-out tested

### Community Edition Specific

- [ ] Default: CIE disabled
- [ ] Consent modal shown on first launch
- [ ] Clear "Help improve SAVVY" messaging
- [ ] Link to privacy policy prominent

### Enterprise Edition Specific

- [ ] Default: CIE enabled (but can be disabled)
- [ ] Admin can control org-wide setting (future)
- [ ] Option to use private CIE instance (future)

---

## Version Compatibility

| SAVVY Edition | CIE SDK Version | Notes |
|---------------|----------------|-------|
| Community 1.0+ | @savvy/cie-sdk@^1.0.0 | Optional dependency |
| Enterprise 1.0+ | @savvy/cie-sdk@^1.0.0 | Recommended |

---

## Troubleshooting

### SDK Not Collecting Events

1. Check if CIE is enabled: `localStorage.getItem('savvy-cie-enabled')`
2. Check for errors in console
3. Verify API endpoint is reachable

### Solutions Not Showing

1. Check if CIE backend is running: `curl https://cie.savvy.app/health`
2. Verify error code matches dictionary entries
3. Check network tab for failed requests

### Events Not Sending

1. Check batch size (default: 100 events before sending)
2. Check flush interval (default: 24 hours)
3. Manually trigger flush: `client.flush()`

---

## Future Enhancements

1. **Private CIE Instances** - Enterprise customers can deploy their own CIE
2. **Org-Wide Settings** - Admin controls CIE for all users
3. **Advanced Analytics** - More insights in Enterprise dashboard
4. **ML Predictions** - Proactive error suggestions

---

## Questions?

- **SDK Issues:** Open issue in this branch
- **Integration Help:** Check `cie/sdk/README.md`
- **Backend Issues:** Check `cie/server/README.md`
