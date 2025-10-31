# SAVVY Package Index - Docker Deployment

Automated Chocolatey package index scraper running in Docker, publishing to GitHub Releases daily at 2 AM.

## Architecture

```
┌─────────────────────────────────────────┐
│ Docker Host (Your Server)              │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ Scheduler Container (Ofelia)    │   │
│  │ - Cron: Daily at 2 AM           │   │
│  │ - Triggers scraper container    │   │
│  └───────────┬─────────────────────┘   │
│              │                          │
│  ┌───────────▼─────────────────────┐   │
│  │ Scraper Container (Python)      │   │
│  │ - Fetches Chocolatey packages   │   │
│  │ - Compresses index              │   │
│  │ - Publishes to GitHub Releases  │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
           │
           ▼
    GitHub Releases (CDN)
```

## Quick Start (2 Minutes)

### Prerequisites
- Docker installed and running
- Docker Compose installed (usually included with Docker Desktop)

### 1. Configure Environment

```bash
cd docker

# Copy and edit environment file
cp .env.example .env
# Edit .env and set your GITHUB_TOKEN
```

### 2. Build and Start

```bash
# Build the container
docker-compose build

# Start the scheduler (runs in background)
docker-compose up -d

# View logs
docker-compose logs -f
```

### 3. Test Immediately (Optional)

```bash
# Run scraper now instead of waiting for 2 AM
docker-compose run --rm scraper
```

## What It Does

1. **Scheduler** (Ofelia) wakes up daily at 2 AM UTC
2. **Triggers** the scraper container to run
3. **Scraper** fetches all Chocolatey packages (~10,000+)
4. **Filters** to latest versions only
5. **Compresses** the index with gzip (~70% smaller)
6. **Publishes** to GitHub Releases automatically
7. **Logs** everything to `logs/` directory (persisted on host)
8. **Stops** container after completion (saves resources)

## Configuration

### Environment Variables

Edit `.env` file:

```bash
# Required
GITHUB_TOKEN=ghp_your_token_here

# Optional (defaults shown)
GITHUB_OWNER=trevorjbennett
GITHUB_REPO=savvy_systems
```

### Change Schedule

Edit `docker-compose.yml`:

```yaml
# Current: Daily at 2 AM UTC
ofelia.job-exec.scraper-job.schedule: "0 0 2 * * *"

# Examples:
# Every 6 hours:   "0 0 */6 * * *"
# Daily at 3 AM:   "0 0 3 * * *"
# Weekly Sunday:   "0 0 2 * * 0"
```

Schedule format: `second minute hour day month weekday`

After changing, restart:
```bash
docker-compose restart scheduler
```

## Commands

### Start Services
```bash
docker-compose up -d
```

### Stop Services
```bash
docker-compose down
```

### View Logs
```bash
# All services
docker-compose logs -f

# Scraper only
docker-compose logs -f scraper

# Scheduler only
docker-compose logs -f scheduler
```

### Run Manually
```bash
# Run scraper now (one-off)
docker-compose run --rm scraper

# Run scraper in background
docker-compose up -d scraper
```

### Check Status
```bash
docker-compose ps
```

### Rebuild After Changes
```bash
docker-compose build --no-cache
docker-compose up -d
```

## File Structure

```
docker/
├── Dockerfile              # Container definition
├── docker-compose.yml      # Services orchestration
├── .env                    # Your configuration (NOT in git)
├── .env.example            # Template
├── .gitignore              # Git ignore rules
├── logs/                   # Scraper logs (auto-created)
└── README.md               # This file
```

## Logs

Logs are persisted on the host in `logs/` directory:

```bash
# View latest log
ls -lt logs/
cat logs/scraper_20250131_020000.log

# Follow live logs
tail -f logs/scraper_*.log
```

Log format:
```
2025-01-31 02:00:00,123 - INFO - Starting Package Index Generation
2025-01-31 02:00:01,456 - INFO - Fetching page 1...
2025-01-31 02:00:02,789 - INFO -   Retrieved 100 packages (total: 100)
...
2025-01-31 02:15:30,123 - INFO - ✓ Complete! Duration: 15.50 minutes
```

## Monitoring

### Check Last Run
```bash
docker-compose logs --tail=50 scraper
```

### Check Scheduler Status
```bash
docker-compose logs scheduler
```

### Verify GitHub Release
Visit: https://github.com/trevorjbennett/savvy_systems/releases

Look for tags like: `package-index-2025.01.31`

## Troubleshooting

### Container won't start
```bash
# Check Docker is running
docker ps

# Check logs
docker-compose logs

# Rebuild
docker-compose build --no-cache
```

### Token not working
```bash
# Verify token is set
cat .env | grep GITHUB_TOKEN

# Test manually
docker-compose run --rm scraper
```

### Scraper failing with 406 errors
- Chocolatey API may be blocking your IP
- Wait an hour (rate limiting)
- Check Chocolatey status page

### Schedule not running
```bash
# Check scheduler is running
docker-compose ps scheduler

# View scheduler logs
docker-compose logs scheduler

# Restart scheduler
docker-compose restart scheduler
```

### Logs not persisted
```bash
# Check volume mount
docker-compose config

# Verify logs directory exists
ls -la logs/
```

## Advanced Usage

### Custom Network
```yaml
# docker-compose.yml already includes a custom network
networks:
  savvy-network:
    driver: bridge
```

### Resource Limits
Add to `docker-compose.yml` under `scraper` service:

```yaml
scraper:
  # ... existing config ...
  deploy:
    resources:
      limits:
        cpus: '1.0'
        memory: 512M
      reservations:
        memory: 256M
```

### Multiple Schedules
Add multiple job labels to scheduler:

```yaml
labels:
  # Daily at 2 AM
  ofelia.job-exec.scraper-daily.schedule: "0 0 2 * * *"
  ofelia.job-exec.scraper-daily.container: "savvy-package-index-scraper"

  # Weekly backup at Sunday midnight
  ofelia.job-exec.scraper-weekly.schedule: "0 0 0 * * 0"
  ofelia.job-exec.scraper-weekly.container: "savvy-package-index-scraper"
```

## Security

### Protect Token
- ✅ `.env` is in `.gitignore` (not committed)
- ✅ Token only visible inside container
- ✅ No token in logs

### Best Practices
- Use dedicated GitHub token (not personal)
- Rotate token periodically
- Limit token scope to `repo` only
- Run container as non-root (optional):

```yaml
scraper:
  user: "1000:1000"  # Your user:group ID
```

## Updating

### Update Scraper Code
```bash
# Pull latest changes
git pull

# Rebuild and restart
docker-compose build
docker-compose up -d
```

### Update Python Dependencies
Edit `../generator/requirements.txt`, then:
```bash
docker-compose build --no-cache
docker-compose up -d
```

## Deployment on Server

### Linux Server
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install docker-compose

# Clone repository
git clone https://github.com/trevorjbennett/savvy_systems.git
cd savvy_systems/package-index/docker

# Configure
cp .env.example .env
nano .env  # Add your GITHUB_TOKEN

# Start
docker-compose up -d

# Enable on boot
sudo systemctl enable docker
```

### Windows Server (Docker Desktop)
```powershell
# Ensure Docker Desktop is running
docker --version

# Navigate to directory
cd C:\path\to\savvy_systems\package-index\docker

# Configure
copy .env.example .env
notepad .env  # Add your GITHUB_TOKEN

# Start
docker-compose up -d
```

## Uninstall

```bash
# Stop and remove containers
docker-compose down

# Remove images
docker-compose down --rmi all

# Remove volumes (careful - deletes logs!)
docker-compose down -v

# Remove all
docker-compose down --rmi all -v
```

## Cost

- **Docker hosting:** FREE (uses your server)
- **Container resources:** ~512MB RAM, minimal CPU
- **GitHub Releases:** FREE (unlimited bandwidth)
- **Storage:** ~500MB for container + logs

## Support

- Docker Docs: https://docs.docker.com/
- Ofelia (Scheduler): https://github.com/mcuadros/ofelia
- GitHub API: https://docs.github.com/en/rest

## Next Steps

1. ✅ Start the containers: `docker-compose up -d`
2. ✅ Test manually: `docker-compose run --rm scraper`
3. ✅ Verify GitHub Release created
4. ✅ Check logs: `docker-compose logs -f`
5. ✅ Let it run - scheduler handles the rest!
