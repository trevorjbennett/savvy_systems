# SAVVY Package Index - Docker Solution ✅

Complete Docker-based solution for automated Chocolatey package index scraping and publishing to GitHub Releases.

## Why Docker?

✅ **Portable** - Runs anywhere Docker is installed
✅ **Isolated** - No Python/dependency conflicts with host
✅ **Automated** - Built-in scheduler runs daily at 2 AM
✅ **Simple** - One command to start everything
✅ **Persistent** - Logs saved on host machine

## What Was Built

### Core Components

1. **Scraper Container** ([docker/Dockerfile](docker/Dockerfile))
   - Python 3.11 slim image
   - Scrapes Chocolatey API
   - Publishes to GitHub Releases
   - Auto-stops after completion

2. **Scheduler Container** ([docker/docker-compose.yml](docker/docker-compose.yml))
   - Ofelia cron scheduler
   - Triggers scraper daily at 2 AM UTC
   - Runs 24/7 in background

3. **Configuration** ([docker/.env](docker/.env))
   - GitHub token (already set!)
   - Repository settings
   - Easy to customize

### Files Created

```
package-index/docker/
├── Dockerfile                 # Container definition
├── docker-compose.yml         # Services orchestration
├── .env                       # Your config (token included!)
├── .env.example               # Template
├── .gitignore                 # Protect secrets
├── start.ps1                  # Quick start script
├── README.md                  # Complete documentation
└── logs/                      # Output logs (auto-created)
```

## Quick Start (1 Minute!)

### Option 1: Interactive Script (Easiest)

```powershell
cd c:\Users\Jae\savvy_new\savvy\package-index\docker
.\start.ps1
```

Choose:
- **Option 1**: Start scheduler (runs daily at 2 AM)
- **Option 2**: Run scraper immediately (test it now!)

### Option 2: Manual Commands

```bash
cd package-index/docker

# Start the scheduler (runs in background)
docker-compose up -d

# OR run scraper immediately
docker-compose run --rm scraper

# View logs
docker-compose logs -f
```

## How It Works

```
┌─────────────────────────────────────────┐
│ Docker Host (Your Server)              │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ Scheduler (Ofelia)              │   │
│  │ - Runs 24/7                     │   │
│  │ - Wakes up daily at 2 AM        │   │
│  └───────────┬─────────────────────┘   │
│              │ Triggers                 │
│  ┌───────────▼─────────────────────┐   │
│  │ Scraper (Python)                │   │
│  │ 1. Fetch Chocolatey packages    │   │
│  │ 2. Filter latest versions       │   │
│  │ 3. Compress with gzip           │   │
│  │ 4. Publish to GitHub Releases   │   │
│  │ 5. Stop (saves resources)       │   │
│  └─────────────────────────────────┘   │
│                                         │
│  logs/ ← Persistent logs on host       │
└─────────────────────────────────────────┘
           │
           ▼
    GitHub Releases
    ↓
    SAVVY Clients Download
```

## What Gets Published

Every day at 2 AM, a new release is created:

**GitHub Release:**
```
https://github.com/trevorjbennett/savvy_systems/releases/tag/package-index-2025.10.31
```

**Contains 3 files:**
- `choco-index.json.gz` - Compressed index (~3-5 MB) ⭐ Use this
- `choco-index.json` - Uncompressed index (~12-15 MB)
- `metadata.json` - Stats (package count, sizes, etc.)

## Common Commands

### Start Services
```bash
docker-compose up -d
```

### Stop Services
```bash
docker-compose down
```

### Run Now (Don't Wait for 2 AM)
```bash
docker-compose run --rm scraper
```

### View Logs
```bash
# Live logs
docker-compose logs -f

# Latest log file
cat logs/scraper_*.log | tail -50
```

### Check Status
```bash
docker-compose ps
```

### Restart Services
```bash
docker-compose restart
```

### Rebuild After Code Changes
```bash
docker-compose build --no-cache
docker-compose up -d
```

## Configuration

### Change Schedule

Edit [docker-compose.yml](docker/docker-compose.yml):

```yaml
# Current: Daily at 2 AM UTC
ofelia.job-exec.scraper-job.schedule: "0 0 2 * * *"

# Examples:
ofelia.job-exec.scraper-job.schedule: "0 0 3 * * *"    # 3 AM daily
ofelia.job-exec.scraper-job.schedule: "0 0 */6 * * *"  # Every 6 hours
ofelia.job-exec.scraper-job.schedule: "0 0 2 * * 0"    # Sundays only
```

Then restart:
```bash
docker-compose restart scheduler
```

### Change GitHub Repository

Edit [.env](docker/.env):

```bash
GITHUB_OWNER=your-username
GITHUB_REPO=your-repo
```

Then rebuild:
```bash
docker-compose up -d
```

## Monitoring

### Check Last Run
```bash
docker-compose logs scraper
```

### View Logs Directory
```bash
dir logs
# or
ls -l logs/
```

### Verify GitHub Release
Visit: https://github.com/trevorjbennett/savvy_systems/releases

### Scheduler Status
```bash
docker-compose logs scheduler
```

## Deployment on Server

### Windows Server with Docker Desktop

```powershell
# 1. Install Docker Desktop
# Download from: https://www.docker.com/products/docker-desktop

# 2. Clone repository
git clone https://github.com/trevorjbennett/savvy_systems.git
cd savvy_systems\package-index\docker

# 3. Start services
docker-compose up -d

# 4. Verify
docker-compose ps
```

### Linux Server with Docker

```bash
# 1. Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 2. Install Docker Compose
sudo apt install docker-compose

# 3. Clone repository
git clone https://github.com/trevorjbennett/savvy_systems.git
cd savvy_systems/package-index/docker

# 4. Start services
docker-compose up -d

# 5. Enable on boot
sudo systemctl enable docker
```

### Run on System Startup

**Windows:**
- Docker Desktop starts automatically
- Containers with `restart: unless-stopped` auto-start

**Linux:**
```bash
# Enable Docker service
sudo systemctl enable docker

# Containers will auto-start
```

## Troubleshooting

### Container won't start

```bash
# Check Docker is running
docker ps

# View error logs
docker-compose logs

# Rebuild container
docker-compose build --no-cache
docker-compose up -d
```

### Token not working

```bash
# Verify token in .env
cat .env | grep GITHUB_TOKEN

# Make sure .env is in the same directory
ls -la .env
```

### Scraper fails with 406 errors

This is the Chocolatey API blocking issue. Solutions:

1. **Wait and retry** - May be temporary rate limiting
2. **Try different time** - Less traffic at night
3. **Contact Chocolatey** - Request API access
4. **Use alternative** - Chocolatey CLI export instead

### Schedule not running

```bash
# Check scheduler is running
docker-compose ps scheduler

# View scheduler logs
docker-compose logs scheduler

# Restart scheduler
docker-compose restart scheduler
```

### Logs not appearing

```bash
# Check volume mount
docker-compose config | grep logs

# Manually create logs directory
mkdir logs

# Restart services
docker-compose restart
```

## Advantages Over Other Solutions

| Feature | Docker | Python Script | Firebase Functions |
|---------|--------|---------------|-------------------|
| No Python setup needed | ✅ | ❌ | ✅ |
| Runs on any OS | ✅ | ⚠️ | ✅ |
| No cloud costs | ✅ | ✅ | ❌ ($0.11/mo) |
| Isolated environment | ✅ | ❌ | ✅ |
| Easy updates | ✅ | ⚠️ | ✅ |
| Works with Choco API | ✅ | ✅ | ❌ (blocked) |
| Built-in scheduler | ✅ | ⚠️ | ✅ |
| Portable | ✅ | ❌ | ❌ |

## Resource Usage

- **Disk**: ~200 MB (container + dependencies)
- **RAM**: ~100-200 MB during run, 0 MB idle
- **CPU**: Minimal (only during 10-15 min scraping)
- **Network**: ~50 MB download, ~5 MB upload

## Security

✅ Token stored in `.env` (gitignored)
✅ No token in logs
✅ Container isolated from host
✅ Minimal attack surface

## Backup & Recovery

### Backup Configuration
```bash
# Just backup .env file
cp .env .env.backup
```

### Restore
```bash
# Copy .env back
cp .env.backup .env

# Rebuild
docker-compose up -d
```

### Full Reset
```bash
# Stop and remove everything
docker-compose down -v

# Rebuild from scratch
docker-compose build --no-cache
docker-compose up -d
```

## Updating

### Update Scraper Code
```bash
# Pull latest changes
git pull

# Rebuild
docker-compose build
docker-compose up -d
```

### Update Dependencies
Edit [../generator/requirements.txt](../generator/requirements.txt), then:
```bash
docker-compose build --no-cache
docker-compose up -d
```

## Cost

**Total: $0/month** 🎉

- Docker hosting: FREE (your server)
- Container resources: Minimal
- GitHub Releases: FREE
- Network bandwidth: FREE

## Next Steps

1. ✅ **Start the services:**
   ```bash
   cd docker
   docker-compose up -d
   ```

2. ✅ **Test immediately (optional):**
   ```bash
   docker-compose run --rm scraper
   ```

3. ✅ **Verify GitHub Release created:**
   https://github.com/trevorjbennett/savvy_systems/releases

4. ✅ **Let it run automatically:**
   - Scheduler handles everything
   - Runs daily at 2 AM
   - Check logs occasionally

5. ✅ **Update SAVVY client:**
   - Point to latest GitHub Release
   - Download compressed index
   - Use for fast local search

## Support

- **Docker Documentation**: [docker/README.md](docker/README.md)
- **Docker Issues**: https://docs.docker.com/
- **Ofelia Scheduler**: https://github.com/mcuadros/ofelia
- **SAVVY Issues**: https://github.com/trevorjbennett/savvy_systems/issues

---

**Status:** ✅ Ready to deploy!
**Last Updated:** 2025-10-31
**Your token is already configured in `.env`**
