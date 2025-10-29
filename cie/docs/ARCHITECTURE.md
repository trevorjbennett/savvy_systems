# CIE Technical Architecture

## System Overview

The Community Intelligence Engine (CIE) is a distributed system consisting of:
1. **Client SDK** - Embedded in SAVVY desktop app
2. **Ingestion Service** - Cloud API for receiving events
3. **Processing Pipeline** - Aggregates and analyzes data
4. **Error Dictionary** - Centralized knowledge base
5. **Query API** - Public API for fetching solutions

---

## Architecture Diagram

```
┌───────────────────────────────────────────────────────────────┐
│  SAVVY Desktop App (Windows)                                  │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  CIE Client SDK                                         │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │  │
│  │  │  Event       │→ │  Anonymizer  │→ │  Local       │ │  │
│  │  │  Collector   │  │              │  │  Storage     │ │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘ │  │
│  │         ↓                                      ↓        │  │
│  │  ┌──────────────────────────────────────────────────┐  │  │
│  │  │  Batcher (sends every 24hrs or on error)        │  │  │
│  │  └──────────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
                        ↓ HTTPS POST /ingest
┌───────────────────────────────────────────────────────────────┐
│  CIE Service (Cloud - FastAPI + PostgreSQL + Redis)          │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Ingestion Layer                                        │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │ │
│  │  │  Load        │→ │  Validation  │→ │  Sanitizer   │ │ │
│  │  │  Balancer    │  │              │  │              │ │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘ │ │
│  └─────────────────────────────────────────────────────────┘ │
│                             ↓                                 │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Storage Layer                                          │ │
│  │  ┌──────────────────────────┐  ┌────────────────────┐  │ │
│  │  │  PostgreSQL              │  │  Redis Cache       │  │ │
│  │  │  - events table          │  │  - Error lookups   │  │ │
│  │  │  - error_dictionary      │  │  - Solution cache  │  │ │
│  │  │  - solutions             │  │  - Rate limiting   │  │ │
│  │  │  - feedback              │  │                    │  │ │
│  │  └──────────────────────────┘  └────────────────────┘  │ │
│  └─────────────────────────────────────────────────────────┘ │
│                             ↓                                 │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Processing Pipeline (Scheduled Jobs)                   │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │ │
│  │  │  Aggregator  │→ │  Analyzer    │→ │  Dictionary  │ │ │
│  │  │  (Hourly)    │  │              │  │  Updater     │ │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘ │ │
│  └─────────────────────────────────────────────────────────┘ │
│                             ↑                                 │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Query API (Public)                                     │ │
│  │  GET /errors/{package_id}                               │ │
│  │  GET /solutions/{error_id}                              │ │
│  │  POST /feedback                                         │ │
│  └─────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────┘
                        ↑ HTTPS GET
┌───────────────────────────────────────────────────────────────┐
│  SAVVY Desktop App (Query for solutions)                     │
└───────────────────────────────────────────────────────────────┘
```

---

## Component Details

### 1. Client SDK

**Location:** `cie/client/`

**Responsibilities:**
- Collect events from SAVVY app
- Anonymize all data before sending
- Batch events locally
- Send events to ingestion API
- Query solutions from API

**Key Modules:**

#### `collector.ts`
```typescript
class EventCollector {
  private queue: TelemetryEvent[] = [];

  collect(event: TelemetryEvent): void {
    // Validate event
    // Add to queue
    // Check if batch size reached
  }

  flush(): void {
    // Send batch to API
    // Clear queue
  }
}
```

#### `anonymizer.ts`
```typescript
class Anonymizer {
  private deviceHash: string;

  constructor() {
    // Generate or retrieve device hash from localStorage
    this.deviceHash = this.getOrCreateDeviceHash();
  }

  anonymize(event: TelemetryEvent): AnonymizedEvent {
    return {
      ...event,
      deviceId: this.deviceHash,
      timestamp: this.roundTimestamp(event.timestamp),
      errorMessage: this.sanitizeMessage(event.errorMessage)
    };
  }

  private sanitizeMessage(message: string): string {
    // Remove file paths: C:\Users\John\... → [REDACTED_PATH]
    // Remove usernames: @john → [REDACTED_USER]
    // Remove emails: john@example.com → [REDACTED_EMAIL]
  }
}
```

#### `api.ts`
```typescript
class CIEApi {
  async ingest(events: AnonymizedEvent[]): Promise<void> {
    await fetch('https://cie.savvy.app/ingest', {
      method: 'POST',
      body: JSON.stringify({ events }),
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async getSolutions(packageId: string, errorCode: string): Promise<Solution[]> {
    const response = await fetch(
      `https://cie.savvy.app/solutions?package=${packageId}&error=${errorCode}`
    );
    return response.json();
  }
}
```

---

### 2. Ingestion Service

**Location:** `cie/server/api/`

**Technology:** FastAPI (Python)

**Responsibilities:**
- Receive event batches from clients
- Validate and sanitize incoming data
- Store events in database
- Rate limiting and DDoS protection

**Key Endpoints:**

#### `POST /ingest`
```python
@app.post("/ingest")
async def ingest_events(
    batch: EventBatch,
    db: Session = Depends(get_db)
):
    # Validate batch
    if len(batch.events) > 100:
        raise HTTPException(400, "Batch too large")

    # Additional sanitization
    sanitized = [sanitize_event(e) for e in batch.events]

    # Store in database
    for event in sanitized:
        db.add(Event(**event))
    db.commit()

    return {"status": "ok", "received": len(batch.events)}
```

**Rate Limiting:**
- 100 requests per hour per device
- 1000 events per batch max
- Implemented with Redis + FastAPI middleware

---

### 3. Processing Pipeline

**Location:** `cie/server/processing/`

**Responsibilities:**
- Aggregate raw events into error dictionary
- Calculate statistics (frequency, success rate)
- Update error severity
- Run anomaly detection (Phase 4)

**Scheduled Jobs:**

#### Error Aggregation (Runs every hour)
```python
def aggregate_errors():
    # Group events by package_id + error_code
    grouped = db.query(Event)\
        .filter(Event.type == 'error')\
        .group_by(Event.package_id, Event.error_code)\
        .with_entities(
            Event.package_id,
            Event.error_code,
            func.count().label('frequency'),
            func.min(Event.timestamp).label('first_seen'),
            func.max(Event.timestamp).label('last_seen')
        ).all()

    # Update or create error dictionary entries
    for group in grouped:
        error = db.query(ErrorDictionary)\
            .filter_by(
                package_id=group.package_id,
                error_code=group.error_code
            ).first()

        if error:
            error.frequency = group.frequency
            error.last_seen = group.last_seen
        else:
            error = ErrorDictionary(**group)
            db.add(error)

    db.commit()
```

---

### 4. Error Dictionary

**Location:** PostgreSQL tables

**Schema:**

```sql
CREATE TABLE error_dictionary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id VARCHAR(255) NOT NULL,
    manager VARCHAR(10) NOT NULL CHECK (manager IN ('choco', 'winget')),
    error_code VARCHAR(50) NOT NULL,
    error_message TEXT,
    frequency INTEGER DEFAULT 0,
    severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    first_seen TIMESTAMP NOT NULL,
    last_seen TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(package_id, manager, error_code)
);

CREATE TABLE solutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    error_id UUID REFERENCES error_dictionary(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    steps JSONB NOT NULL, -- Array of step strings
    success_rate FLOAT DEFAULT 0.0,
    upvotes INTEGER DEFAULT 0,
    downvotes INTEGER DEFAULT 0,
    contributed_by VARCHAR(20) DEFAULT 'community' CHECK (contributed_by IN ('community', 'official')),
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    solution_id UUID REFERENCES solutions(id) ON DELETE CASCADE,
    device_hash VARCHAR(64) NOT NULL,
    helpful BOOLEAN NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_error_package ON error_dictionary(package_id);
CREATE INDEX idx_error_frequency ON error_dictionary(frequency DESC);
CREATE INDEX idx_solution_error ON solutions(error_id);
```

---

### 5. Query API

**Location:** `cie/server/api/routes/errors.py`

**Responsibilities:**
- Provide public API for querying error dictionary
- Return solutions with success rates
- Accept feedback (upvotes/downvotes)

**Key Endpoints:**

#### `GET /errors/{package_id}`
```python
@router.get("/errors/{package_id}")
async def get_errors(
    package_id: str,
    manager: Optional[str] = None,
    db: Session = Depends(get_db),
    cache: Redis = Depends(get_redis)
):
    # Check cache first
    cache_key = f"errors:{package_id}:{manager}"
    cached = cache.get(cache_key)
    if cached:
        return json.loads(cached)

    # Query database
    query = db.query(ErrorDictionary).filter_by(package_id=package_id)
    if manager:
        query = query.filter_by(manager=manager)

    errors = query.order_by(ErrorDictionary.frequency.desc()).all()

    # Cache for 1 hour
    cache.setex(cache_key, 3600, json.dumps([e.dict() for e in errors]))

    return errors
```

#### `GET /solutions/{error_id}`
```python
@router.get("/solutions/{error_id}")
async def get_solutions(
    error_id: str,
    db: Session = Depends(get_db),
    cache: Redis = Depends(get_redis)
):
    # Check cache
    cache_key = f"solutions:{error_id}"
    cached = cache.get(cache_key)
    if cached:
        return json.loads(cached)

    # Query solutions, ordered by success rate
    solutions = db.query(Solution)\
        .filter_by(error_id=error_id)\
        .order_by(Solution.success_rate.desc())\
        .all()

    # Cache for 1 hour
    cache.setex(cache_key, 3600, json.dumps([s.dict() for s in solutions]))

    return solutions
```

#### `POST /feedback`
```python
@router.post("/feedback")
async def submit_feedback(
    feedback: FeedbackRequest,
    db: Session = Depends(get_db)
):
    # Store feedback
    db.add(Feedback(**feedback.dict()))

    # Update solution success_rate
    solution = db.query(Solution).get(feedback.solution_id)
    if feedback.helpful:
        solution.upvotes += 1
    else:
        solution.downvotes += 1

    total = solution.upvotes + solution.downvotes
    solution.success_rate = solution.upvotes / total if total > 0 else 0

    db.commit()

    # Invalidate cache
    cache.delete(f"solutions:{solution.error_id}")

    return {"status": "ok"}
```

---

## Data Flow

### Event Collection Flow

1. User installs package in SAVVY
2. Installation fails with error
3. SAVVY detects error and creates event:
   ```typescript
   {
     type: 'install_failed',
     packageId: 'docker-desktop',
     manager: 'choco',
     errorCode: '1603',
     errorMessage: 'Installation failed: Hyper-V not enabled',
     timestamp: Date.now(),
     osVersion: 'Windows 11 23H2'
   }
   ```
4. CIE Client anonymizes event:
   ```typescript
   {
     type: 'install_failed',
     packageId: 'docker-desktop',
     manager: 'choco',
     errorCode: '1603',
     errorMessage: 'Installation failed: [SANITIZED]',
     timestamp: 1705320000000, // Rounded to hour
     osVersion: 'Windows 11 23H2',
     deviceHash: 'abc123...' // SHA256 hash
   }
   ```
5. Event stored in local queue
6. After 24 hours (or immediately on error), batch sent to CIE API
7. CIE API validates, sanitizes, stores in database

### Solution Query Flow

1. User encounters error in SAVVY
2. SAVVY queries CIE API: `GET /solutions?package=docker-desktop&error=1603`
3. CIE checks Redis cache (hit rate: 90%)
4. If cache miss, query PostgreSQL
5. Return top 3 solutions sorted by success_rate
6. SAVVY displays "Suggested Fixes" modal
7. User selects solution and follows steps
8. User provides feedback (helpful: yes/no)
9. SAVVY sends feedback to CIE: `POST /feedback`
10. CIE updates solution success_rate

---

## Security Considerations

### Data Privacy
- No PII collected at any layer
- Device hashing uses SHA256 + random salt
- Timestamps rounded to nearest hour
- Error messages sanitized to remove file paths, usernames

### API Security
- HTTPS only (TLS 1.3)
- Rate limiting per device (100 req/hour)
- DDoS protection (Cloudflare)
- Input validation on all endpoints
- SQL injection prevention (parameterized queries)

### Database Security
- Encrypted at rest
- Access restricted to backend service only
- Regular backups
- No direct public access

---

## Scalability

### Current Capacity
- 1,000 requests/second
- 100,000 users
- 1M events/day

### Scaling Strategy
- **Horizontal scaling:** Add more API servers behind load balancer
- **Database:** PostgreSQL read replicas for queries
- **Cache:** Redis cluster for distributed caching
- **CDN:** Cloudflare for static content and DDoS protection

---

## Monitoring & Observability

### Metrics
- API request latency (p50, p95, p99)
- Error rate
- Cache hit rate
- Database query time
- Event ingestion rate
- Disk usage

### Logging
- Structured JSON logs
- Error tracking with Sentry
- Access logs for all API requests

### Alerts
- API downtime > 1 minute
- Error rate > 5%
- Database connection failures
- Disk usage > 80%

---

## Technology Stack

### Client
- TypeScript
- Web Crypto API (for hashing)
- LocalStorage (for batching)

### Server
- Python 3.10+
- FastAPI (web framework)
- SQLAlchemy (ORM)
- Alembic (migrations)
- Pydantic (validation)
- Redis (caching)
- PostgreSQL 14+ (database)

### Infrastructure
- Docker (containerization)
- GitHub Actions (CI/CD)
- Cloudflare (CDN + DDoS protection)
- Choice of: AWS/Azure/GCP/DigitalOcean

---

## Deployment Architecture

```
User → Cloudflare CDN → Load Balancer → [API Server 1, API Server 2, ...] → PostgreSQL
                                                ↓
                                            Redis Cache
```

**Production:**
- Multi-region deployment (US-East, EU-West)
- Auto-scaling based on CPU/memory
- Blue-green deployments for zero downtime

**Staging:**
- Single instance
- Separate database
- Test data only
