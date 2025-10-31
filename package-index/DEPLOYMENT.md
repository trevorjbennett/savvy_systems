# SAVVY Package Index - Deployment Guide

Complete guide for deploying the automated Chocolatey package index scraper on your server.

## Overview

The scraper runs locally (avoiding IP blocks), publishes to GitHub Releases automatically, and runs daily at 2 AM.

**Architecture:**
```
Local Server → Chocolatey API → GitHub Releases → SAVVY Clients
   (scraper)     (fetch data)     (publish)        (download)
```

## Prerequisites

### Required
- **Python 3.7+** - Check with `python --version` or `python3 --version`
- **Git** - For cloning the repository
- **GitHub Personal Access Token** - With `repo` scope ([create here](https://github.com/settings/tokens/new))

### Optional
- **Internet connection** - Must be stable (scraping takes 10-15 minutes)
- **Disk space** - ~500 MB for Python, dependencies, and index files

## Quick Start (5 Minutes)

### Windows

```powershell
# 1. Clone or copy the generator directory to your server
cd C:\path\to\package-index\generator

# 2. Run the setup script (as Administrator)
.\setup_windows_scheduler.ps1

# 3. Enter your GitHub token when prompted
# The script will:
#   - Install Python dependencies
#   - Create Windows Scheduled Task (daily at 2 AM)
#   - Optionally run immediately for testing
```

### Linux

```bash
# 1. Clone or copy the generator directory to your server
cd /path/to/package-index/generator

# 2. Make scripts executable
chmod +x setup_linux_cron.sh

# 3. Run the setup script
./setup_linux_cron.sh

# 4. Enter your GitHub token when prompted
# The script will:
#   - Install Python dependencies
#   - Create cron job (daily at 2 AM)
#   - Optionally run immediately for testing
```

## Detailed Setup

### Step 1: Prepare the Server

**Choose your deployment location:**

1. **Dedicated Server** (recommended)
   - VPS, cloud instance, or physical machine
   - Must be always-on or powered on at 2 AM
   - Examples: AWS EC2, DigitalOcean Droplet, home server

2. **Local Machine**
   - Your development machine or workstation
   - Must be powered on at 2 AM daily
   - Good for testing

### Step 2: Install Dependencies

**Windows:**
```powershell
# Install Python 3 if not already installed
# Download from: https://www.python.org/downloads/

# Verify installation
python --version

# Install pip dependencies
cd generator
pip install -r requirements.txt
```

**Linux:**
```bash
# Install Python 3 and pip
sudo apt update
sudo apt install python3 python3-pip -y  # Debian/Ubuntu
# OR
sudo yum install python3 python3-pip -y  # CentOS/RHEL

# Verify installation
python3 --version

# Install pip dependencies
cd generator
pip3 install -r requirements.txt --user
```

### Step 3: Configure GitHub Token

**Create Token:**
1. Go to https://github.com/settings/tokens/new
2. Note: "SAVVY Package Index Scraper"
3. Expiration: No expiration (or custom)
4. Select scope: `repo` (full control)
5. Click "Generate token"
6. **Copy the token** (starts with `ghp_...`)

**Set Environment Variable:**

**Windows (PowerShell):**
```powershell
# Set for current user (permanent)
[System.Environment]::SetEnvironmentVariable("GITHUB_TOKEN", "ghp_your_token_here", [System.EnvironmentVariableTarget]::User)

# Or add to script directly (less secure)
$env:GITHUB_TOKEN = "ghp_your_token_here"
```

**Linux (Bash):**
```bash
# Add to ~/.bashrc or ~/.profile
echo 'export GITHUB_TOKEN="ghp_your_token_here"' >> ~/.bashrc
source ~/.bashrc

# Verify
echo $GITHUB_TOKEN
```

### Step 4: Test Manually

Before setting up automation, test the scraper:

```bash
# Windows
cd generator
python scraper_with_github.py

# Linux
cd generator
python3 scraper_with_github.py
```

Expected output:
```
======================================================================
Chocolatey Package Index Generator with GitHub Integration
======================================================================
Log file: logs/scraper_20250131_020000.log

Starting to fetch package data from Chocolatey community feed...
Fetching page 1...
  Retrieved 100 packages (total: 100)
Fetching page 2...
...
✓ Package index created successfully!
  - Packages: 9,847
  - Uncompressed: 12.34 MB
  - Compressed: 3.21 MB
  - Compression: 74.0%

Creating GitHub Release: package-index-2025.01.31
✓ Release created: https://github.com/trevorjbennett/savvy_systems/releases/...
Uploading choco-index.json.gz...
  ✓ choco-index.json.gz uploaded successfully
...
✓ Complete! Duration: 12.45 minutes
```

### Step 5: Set Up Automation

#### Option A: Windows Task Scheduler (Recommended for Windows)

**Automated Setup:**
```powershell
# Run as Administrator
.\setup_windows_scheduler.ps1
```

**Manual Setup:**
1. Open Task Scheduler (`taskschd.msc`)
2. Create Basic Task
   - Name: "SAVVY-PackageIndexScraper"
   - Trigger: Daily at 2:00 AM
   - Action: Start a program
     - Program: `C:\Path\To\Python\python.exe`
     - Arguments: `"C:\path\to\scraper_with_github.py"`
     - Start in: `C:\path\to\generator\`
3. Settings:
   - Run whether user is logged on or not
   - Run with highest privileges
   - Wake computer to run

#### Option B: Linux Cron (Recommended for Linux)

**Automated Setup:**
```bash
./setup_linux_cron.sh
```

**Manual Setup:**
```bash
# Edit crontab
crontab -e

# Add this line (runs daily at 2 AM)
0 2 * * * cd /path/to/generator && /usr/bin/python3 scraper_with_github.py >> /path/to/logs/cron.log 2>&1
```

#### Option C: Python Scheduler (Cross-platform, runs as service)

**Start the scheduler:**
```bash
# Windows
python scheduler.py

# Linux
python3 scheduler.py

# Run immediately on startup (for testing)
python3 scheduler.py --now
```

**Run as background service:**

**Windows (NSSM):**
```powershell
# Install NSSM: https://nssm.cc/download
nssm install SAVVY-Scheduler "C:\Path\To\Python\python.exe" "C:\path\to\scheduler.py"
nssm start SAVVY-Scheduler
```

**Linux (systemd):**
```bash
# Create service file
sudo nano /etc/systemd/system/savvy-scraper.service

# Add:
[Unit]
Description=SAVVY Package Index Scheduler
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/path/to/generator
ExecStart=/usr/bin/python3 /path/to/generator/scheduler.py
Restart=always

[Install]
WantedBy=multi-user.target

# Enable and start
sudo systemctl enable savvy-scraper
sudo systemctl start savvy-scraper
sudo systemctl status savvy-scraper
```

## Configuration Options

### Environment Variables

```bash
# GitHub configuration
GITHUB_TOKEN=ghp_your_token_here          # Required for publishing
GITHUB_OWNER=trevorjbennett               # Repository owner
GITHUB_REPO=savvy_systems                 # Repository name

# Output directory
OUTPUT_DIR=/path/to/output                # Where to save index files
```

### Customizing the Schedule

**Windows Task Scheduler:**
- Right-click task → Properties → Triggers → Edit
- Change time or frequency

**Linux Cron:**
```bash
crontab -e

# Examples:
0 2 * * *      # Daily at 2 AM (current)
0 */6 * * *    # Every 6 hours
0 0 * * 0      # Weekly on Sunday at midnight
0 0 1 * *      # Monthly on 1st at midnight
```

**Python Scheduler:**
Edit `scheduler.py`:
```python
# Change this line:
schedule.every().day.at("02:00").do(run_scraper)

# To:
schedule.every().day.at("03:00").do(run_scraper)  # 3 AM
schedule.every(6).hours.do(run_scraper)           # Every 6 hours
schedule.every().monday.at("02:00").do(run_scraper)  # Weekly
```

## Monitoring & Maintenance

### View Logs

**Windows:**
```powershell
# View latest log
Get-Content "logs\scraper_*.log" -Tail 50

# View all logs
Get-ChildItem "logs\scraper_*.log" | Sort-Object LastWriteTime -Descending
```

**Linux:**
```bash
# View latest log
tail -f logs/scraper_*.log

# View cron log (if using cron)
tail -f logs/cron.log

# View all logs
ls -lt logs/
```

### Check Task Status

**Windows:**
```powershell
# View task
Get-ScheduledTask -TaskName "SAVVY-PackageIndexScraper"

# View last run result
Get-ScheduledTask -TaskName "SAVVY-PackageIndexScraper" | Get-ScheduledTaskInfo

# Run manually
Start-ScheduledTask -TaskName "SAVVY-PackageIndexScraper"
```

**Linux:**
```bash
# View crontab
crontab -l

# View cron logs
grep CRON /var/log/syslog  # Ubuntu/Debian
tail -f /var/log/cron       # CentOS/RHEL

# Run manually
./run_scraper.sh
```

### Verify GitHub Releases

Check your repository releases:
```
https://github.com/trevorjbennett/savvy_systems/releases
```

Each release should have:
- Tag: `package-index-YYYY.MM.DD`
- 3 assets: `choco-index.json.gz`, `choco-index.json`, `metadata.json`
- Release notes with package count and file sizes

### Common Issues

**Issue: Script runs but doesn't publish to GitHub**
- Check `GITHUB_TOKEN` is set: `echo $GITHUB_TOKEN` (Linux) or `$env:GITHUB_TOKEN` (Windows)
- Verify token has `repo` scope
- Check logs for "GITHUB_TOKEN not set" warning

**Issue: Script times out or hangs**
- Check internet connection
- Chocolatey API may be slow - increase timeout in script
- Check firewall isn't blocking requests

**Issue: Task doesn't run at scheduled time (Windows)**
- Ensure computer is powered on
- Check Task Scheduler History (Actions → Enable All Tasks History)
- Verify "Wake computer to run" is enabled

**Issue: Cron job doesn't run (Linux)**
- Check cron service is running: `systemctl status cron`
- Verify environment variables are loaded in wrapper script
- Check system time and timezone: `date`

## Updating the Scraper

When updates are pushed to the repository:

```bash
# Pull latest changes
git pull origin main

# Windows
.\setup_windows_scheduler.ps1  # Re-run setup

# Linux
./setup_linux_cron.sh  # Re-run setup

# Or manually:
pip install -r requirements.txt --upgrade
```

## Security Best Practices

1. **Protect GitHub Token**
   - Never commit token to git
   - Use environment variables
   - Rotate token periodically

2. **Server Security**
   - Keep Python and dependencies updated
   - Use firewall rules
   - Monitor logs for suspicious activity

3. **Backup**
   - Keep a copy of your token securely
   - Document your setup
   - Consider multiple scraper instances for redundancy

## Performance Optimization

### Reduce Scraping Time
- Use faster internet connection
- Run on server closer to Chocolatey's CDN
- Adjust sleep delay between requests (default: 0.1s)

### Reduce Storage
- Compressed index is 70% smaller (use by default)
- Clean up old log files regularly
- Only keep latest release in GitHub

### Reduce Bandwidth
- Compressed index reduces download size for clients
- Consider CDN in front of GitHub Releases

## Alternative Deployment Options

### Docker Container

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY generator/ /app/
RUN pip install -r requirements.txt

ENV GITHUB_TOKEN=""
CMD ["python", "scraper_with_github.py"]
```

```bash
# Build
docker build -t savvy-scraper .

# Run manually
docker run -e GITHUB_TOKEN=$GITHUB_TOKEN savvy-scraper

# Run with cron (docker-compose)
# See docker-compose.yml
```

### Kubernetes CronJob

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: savvy-package-index
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: scraper
            image: your-registry/savvy-scraper:latest
            env:
            - name: GITHUB_TOKEN
              valueFrom:
                secretKeyRef:
                  name: github-token
                  key: token
          restartPolicy: OnFailure
```

## Support

For issues or questions:
1. Check logs first
2. Review this documentation
3. Open issue on GitHub: https://github.com/trevorjbennett/savvy_systems/issues
4. Include:
   - Operating system
   - Python version
   - Log file excerpt
   - Error messages

## Next Steps

After deployment:
1. Verify first successful run
2. Check GitHub Releases
3. Update SAVVY client to download from releases
4. Monitor for a few days
5. Consider setting up alerting (email on failure)
