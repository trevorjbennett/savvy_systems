# Community Intelligence Engine (CIE)

A privacy-first, community-powered intelligence system that collects anonymous usage data and builds a centralized knowledge base for package errors, failures, and solutions.

## 🎯 Project Goal

Leverage collective, anonymous insights from the SAVVY user community to:
- Build a comprehensive error dictionary with crowdsourced solutions
- Proactively identify and resolve common package installation issues
- Improve user experience through intelligent suggestions
- Drive data-informed product development

## 🏗️ Architecture

```
┌─────────────────────────────────────┐
│  SAVVY Desktop App                  │
│  ┌───────────────────────────────┐  │
│  │  CIE Client SDK               │  │
│  │  - Event collection           │  │
│  │  - Anonymization              │  │
│  │  - Local batching             │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
            ↓ (HTTPS)
┌─────────────────────────────────────┐
│  CIE Service (Cloud)                │
│  ┌────────────┐  ┌───────────────┐ │
│  │ Ingestion  │→ │ Processing    │ │
│  │ API        │  │ Pipeline      │ │
│  └────────────┘  └───────────────┘ │
│                         ↓           │
│  ┌────────────┐  ┌───────────────┐ │
│  │ Error      │  │ Analytics     │ │
│  │ Dictionary │  │ DB            │ │
│  └────────────┘  └───────────────┘ │
│         ↑                           │
│  ┌────────────┐                    │
│  │ Query API  │ (Public)           │
│  └────────────┘                    │
└─────────────────────────────────────┘
```

## 📁 Project Structure

```
cie/
├── docs/                   # Documentation
│   ├── ROADMAP.md         # Development roadmap
│   ├── ARCHITECTURE.md    # Technical architecture
│   ├── PRIVACY.md         # Privacy policy
│   └── API.md             # API documentation
├── client/                # Client-side SDK (embedded in SAVVY)
│   ├── src/
│   │   ├── collector.ts   # Event collection
│   │   ├── anonymizer.ts  # Data anonymization
│   │   ├── batcher.ts     # Local batching
│   │   └── api.ts         # API client
│   ├── types/
│   └── package.json
└── server/                # Backend service
    ├── api/               # REST API (FastAPI)
    ├── processing/        # Data processing pipeline
    ├── models/            # Database models
    ├── ml/                # ML models (future)
    └── requirements.txt
```

## 🔐 Privacy Principles

1. **No PII Collection** - Zero personally identifiable information
2. **Anonymous by Design** - Device hashing, no tracking
3. **Opt-In First** - Community Edition: opt-in, Enterprise: opt-out
4. **Transparent** - Clear documentation on what's collected
5. **User Control** - Easy to disable at any time

## 📊 What We Collect

### ✅ Collected (Anonymous)
- Package IDs (e.g., "docker-desktop", "git")
- Error codes and sanitized error messages
- Success/failure outcomes
- OS version (e.g., "Windows 11 23H2")
- Package manager type (choco/winget)
- Timestamp (rounded to hour)
- Anonymous device hash (SHA256)

### ❌ NOT Collected
- User emails, names, or accounts
- Device names or hostnames
- File paths or directory structures
- IP addresses (not logged)
- Personal data of any kind

## 🚀 Quick Start

### Client SDK (in SAVVY app)

```typescript
import { CIEClient } from './cie/client';

const cie = new CIEClient({
  enabled: userOptedIn,
  apiEndpoint: 'https://cie.savvy.app'
});

// Log an installation attempt
cie.logEvent({
  type: 'install_attempt',
  packageId: 'docker-desktop',
  manager: 'choco'
});

// Log an error
cie.logError({
  packageId: 'docker-desktop',
  manager: 'choco',
  errorCode: '1603',
  errorMessage: 'Installation failed'
});

// Query for solutions
const solutions = await cie.getSolutions({
  packageId: 'docker-desktop',
  errorCode: '1603'
});
```

## 📈 Roadmap

See [docs/ROADMAP.md](docs/ROADMAP.md) for detailed development plan.

**High-Level Phases:**
1. **Phase 1:** Basic error logging (Weeks 1-2)
2. **Phase 2:** Error dictionary (Weeks 3-4)
3. **Phase 3:** Community contributions (Weeks 5-6)
4. **Phase 4:** Intelligence layer (Months 2-3)

## 🤝 Contributing

This is a core feature affecting both Community and Enterprise editions. Contributions welcome!

## 📝 License

- Client SDK: Same as SAVVY editions (MIT for Community, Proprietary for Enterprise)
- Server: Proprietary (SAVVY Systems)
