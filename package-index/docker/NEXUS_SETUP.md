# SAVVY Package Index - Nexus Mirror Solution

Complete Docker setup with Nexus Repository Manager to mirror Chocolatey and scrape from local proxy (no rate limiting!).

## Why Nexus?

✅ **No API rate limits** - Nexus caches packages locally
✅ **Faster** - Local network speeds after initial cache
✅ **Reliable** - No dependency on external API availability
✅ **Professional** - Industry-standard repository manager
✅ **Persistent** - Packages stay cached

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│ Docker Host                                             │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Nexus Container (Port 8081)                      │  │
│  │ - Proxies community.chocolatey.org               │  │
│  │ - Caches all packages locally                    │  │
│  │ - Provides local OData API                       │  │
│  └────────────┬─────────────────────────────────────┘  │
│               │                                         │
│  ┌────────────▼─────────────────────────────────────┐  │
│  │ Scraper Container                                │  │
│  │ - Fetches from local Nexus (fast!)              │  │
│  │ - No rate limits                                 │  │
│  │ - Publishes to GitHub Releases                   │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Scheduler Container                              │  │
│  │ - Runs scraper daily at 2 AM                     │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Quick Start

### Step 1: Start Nexus

```bash
cd c:\Users\Jae\savvy_new\savvy\package-index\docker

# Start Nexus (this will take 2-3 minutes first time)
docker-compose -f docker-compose-with-nexus.yml up -d nexus

# Wait for Nexus to be ready
docker-compose -f docker-compose-with-nexus.yml logs -f nexus
# Look for: "Started Sonatype Nexus"
```

### Step 2: Configure Nexus

1. **Open Nexus Web UI**
   ```
   http://localhost:8081
   ```

2. **Get Initial Admin Password**
   ```bash
   # Windows
   docker exec savvy-nexus cat /nexus-data/admin.password

   # Copy the password shown
   ```

3. **Complete Setup Wizard**
   - Click "Sign In" (top right)
   - Username: `admin`
   - Password: (paste from above)
   - Follow wizard:
     - Change password (save it!)
     - Enable Anonymous Access: **Yes**
     - Click "Finish"

4. **Create Chocolatey Proxy Repository**

   a. Click **Settings (gear icon)** → **Repositories** → **Create repository**

   b. Select **nuget (proxy)**

   c. Configure:
   - **Name**: `chocolatey-proxy`
   - **Remote storage**: `https://community.chocolatey.org/api/v2/`
   - **Auto-block enabled**: Uncheck this
   - **Maximum component age**: `1440` (24 hours)
   - **Maximum metadata age**: `1440`
   - Click **Create repository**

### Step 3: Test Nexus

```bash
# Test the proxy is working
curl http://localhost:8081/repository/chocolatey-proxy/

# Should return XML feed with Chocolatey packages
```

### Step 4: Run Scraper

```bash
# Build and run scraper
docker-compose -f docker-compose-with-nexus.yml build scraper
docker-compose -f docker-compose-with-nexus.yml run --rm scraper
```

### Step 5: Start Scheduler

```bash
# Start scheduler for daily automatic runs
docker-compose -f docker-compose-with-nexus.yml up -d scheduler
```

## Configuration

### Environment Variables

Edit [.env](c:\Users\Jae\savvy_new\savvy\package-index\docker\.env):

```bash
GITHUB_TOKEN=ghp_your_token_here
GITHUB_OWNER=trevorjbennett
GITHUB_REPO=savvy_systems
```

### Nexus Settings

Access at `http://localhost:8081` (admin/your-password)

**Repository Settings:**
- Settings → Repositories → chocolatey-proxy → Edit

**Cache Settings:**
- Maximum component age: How long to cache packages
- Maximum metadata age: How long to cache package metadata

**Storage:**
- Blob store: Where packages are stored (local by default)

## Commands

### Start All Services
```bash
docker-compose -f docker-compose-with-nexus.yml up -d
```

### Stop All Services
```bash
docker-compose -f docker-compose-with-nexus.yml down
```

### View Logs
```bash
# All services
docker-compose -f docker-compose-with-nexus.yml logs -f

# Nexus only
docker-compose -f docker-compose-with-nexus.yml logs -f nexus

# Scraper only
docker-compose -f docker-compose-with-nexus.yml logs -f scraper
```

### Run Scraper Manually
```bash
docker-compose -f docker-compose-with-nexus.yml run --rm scraper
```

### Restart Nexus
```bash
docker-compose -f docker-compose-with-nexus.yml restart nexus
```

### Rebuild Scraper
```bash
docker-compose -f docker-compose-with-nexus.yml build --no-cache scraper
docker-compose -f docker-compose-with-nexus.yml up -d scraper
```

## Nexus Management

### Access Web UI
```
URL: http://localhost:8081
Default user: admin
Password: Set during initial setup
```

### View Cached Packages
1. Browse → chocolatey-proxy
2. See all packages that have been cached

### Clear Cache
1. Settings → Repositories → chocolatey-proxy
2. "Invalidate cache" button
3. Packages will be re-downloaded on next request

### View Storage Usage
1. Settings → System → Nodes
2. See disk space used by Nexus

### Backup Nexus Data
```bash
# Stop Nexus
docker-compose -f docker-compose-with-nexus.yml stop nexus

# Backup volume
docker run --rm -v savvy-nexus-data:/data -v c:/backup:/backup alpine tar czf /backup/nexus-backup.tar.gz /data

# Restart Nexus
docker-compose -f docker-compose-with-nexus.yml start nexus
```

## Monitoring

### Check Nexus Health
```bash
curl http://localhost:8081/service/rest/v1/status
```

### Check Repository Status
```bash
# View repository info
curl -u admin:password http://localhost:8081/service/rest/v1/repositories
```

### View Scraper Logs
```bash
# Latest logs
cat logs/scraper_*.log | tail -50

# Follow live
tail -f logs/scraper_*.log
```

## Troubleshooting

### Nexus Won't Start
```bash
# Check logs
docker-compose -f docker-compose-with-nexus.yml logs nexus

# Common issue: Not enough memory
# Edit docker-compose-with-nexus.yml:
# INSTALL4J_ADD_VM_PARAMS=-Xms512m -Xmx2048m

# Restart
docker-compose -f docker-compose-with-nexus.yml restart nexus
```

### Can't Access Web UI
```bash
# Check if Nexus is running
docker ps | grep nexus

# Check port binding
netstat -ano | findstr :8081

# Try different port
# Edit docker-compose-with-nexus.yml:
# ports: - "8082:8081"
```

### Scraper Can't Connect to Nexus
```bash
# Test connectivity
docker-compose -f docker-compose-with-nexus.yml exec scraper curl http://nexus:8081

# Check Nexus is healthy
docker-compose -f docker-compose-with-nexus.yml ps
```

### Repository Not Caching
```bash
# Check remote URL is correct
# Settings → Repositories → chocolatey-proxy
# Remote storage should be: https://community.chocolatey.org/api/v2/

# Test manually
curl http://localhost:8081/repository/chocolatey-proxy/api/v2/Packages
```

### Out of Disk Space
```bash
# Check Docker disk usage
docker system df

# Clean up old images
docker system prune -a

# Increase Docker Desktop disk limit
# Docker Desktop → Settings → Resources → Disk image size
```

## Performance

### Initial Run
- **First scrape**: 30-60 minutes (downloading all packages to Nexus cache)
- **Nexus cache population**: Happens during scrape
- **Total data**: ~2-5 GB cached in Nexus

### Subsequent Runs
- **Daily scrapes**: 10-15 minutes (reading from Nexus cache)
- **Nexus cache**: Only updates changed packages
- **Much faster** than API scraping!

## Resource Usage

### Nexus
- **RAM**: 512 MB - 1 GB
- **Disk**: 2-5 GB (grows with cache)
- **CPU**: Low (idle most of the time)

### Scraper
- **RAM**: 100-200 MB (only during run)
- **Disk**: ~50 MB logs
- **CPU**: Low-medium (only during run)

### Total
- **Disk**: ~3-6 GB
- **RAM**: ~1 GB (when scraper running)

## Security

### Nexus Authentication
- Change default admin password immediately
- Enable anonymous access for scraper (read-only)
- Or create dedicated service account

### Network
- Nexus only accessible locally (localhost:8081)
- Not exposed to internet
- Scraper connects via Docker network

### Secrets
- GitHub token in .env (gitignored)
- Nexus password stored securely in Docker volume

## Advanced Configuration

### Multiple Repositories
Add more repositories to Nexus:
- npm proxy (Node packages)
- Maven proxy (Java packages)
- Docker proxy (Container images)
- PyPI proxy (Python packages)

### External Access
Expose Nexus to network:
```yaml
ports:
  - "0.0.0.0:8081:8081"  # Allow external access
```

### Persistent Configuration
Nexus config is stored in Docker volume:
- Settings persist across restarts
- Repositories persist
- Cache persists
- Backup volume to preserve everything

### Custom Schedule
Edit [docker-compose-with-nexus.yml](docker-compose-with-nexus.yml):
```yaml
ofelia.job-exec.scraper-job.schedule: "0 0 3 * * *"  # 3 AM
ofelia.job-exec.scraper-job.schedule: "0 0 */6 * * *"  # Every 6 hours
```

## Comparison

| Method | Speed | Reliability | Complexity | Cost |
|--------|-------|-------------|------------|------|
| Direct API | Slow | 406 errors | Low | Free |
| Nexus Mirror | Fast | High | Medium | Free |
| Chocolatey CLI | Fast | High | Low | Free |
| Firebase | N/A | Blocked | Medium | $0.11/mo |

**Nexus is the best balance** of speed, reliability, and professional setup!

## Next Steps

1. ✅ Start Nexus: `docker-compose -f docker-compose-with-nexus.yml up -d nexus`
2. ✅ Configure via Web UI (http://localhost:8081)
3. ✅ Test scraper: `docker-compose -f docker-compose-with-nexus.yml run --rm scraper`
4. ✅ Start scheduler: `docker-compose -f docker-compose-with-nexus.yml up -d scheduler`
5. ✅ Verify GitHub Release created
6. ✅ Let it run automatically!

---

**Status:** Ready to deploy! 🚀
**Your token is configured in `.env`**
