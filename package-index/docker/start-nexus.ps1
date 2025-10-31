# Quick Start Script for SAVVY Package Index with Nexus
# Automated setup for Chocolatey mirroring solution

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SAVVY Package Index - Nexus Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$composeFile = "docker-compose-with-nexus.yml"

# Check Docker is running
try {
    docker ps | Out-Null
    Write-Host "OK Docker is running" -ForegroundColor Green
} catch {
    Write-Host "ERROR Docker is not running!" -ForegroundColor Red
    Write-Host "  Please start Docker Desktop and try again" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "What would you like to do?" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Initial Setup (Start Nexus + Configure)" -ForegroundColor White
Write-Host "2. Start All Services (Nexus + Scheduler)" -ForegroundColor White
Write-Host "3. Run Scraper Now (one-time)" -ForegroundColor White
Write-Host "4. View Logs" -ForegroundColor White
Write-Host "5. Stop All Services" -ForegroundColor White
Write-Host "6. Get Nexus Admin Password" -ForegroundColor White
Write-Host "7. Rebuild Scraper" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Enter your choice (1-7)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "=== Initial Setup ===" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Step 1: Starting Nexus..." -ForegroundColor Yellow
        Write-Host "  This will take 2-3 minutes on first start..." -ForegroundColor Gray
        docker-compose -f $composeFile up -d nexus

        Write-Host ""
        Write-Host "Waiting for Nexus to be ready..." -ForegroundColor Yellow
        Start-Sleep -Seconds 10

        $ready = $false
        $attempts = 0
        $maxAttempts = 30

        while (-not $ready -and $attempts -lt $maxAttempts) {
            try {
                $response = Invoke-WebRequest -Uri "http://localhost:8081" -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
                $ready = $true
            } catch {
                $attempts++
                Write-Host "  Waiting... ($attempts/$maxAttempts)" -ForegroundColor Gray
                Start-Sleep -Seconds 10
            }
        }

        if ($ready) {
            Write-Host ""
            Write-Host "OK Nexus is ready!" -ForegroundColor Green
            Write-Host ""
            Write-Host "Step 2: Get Admin Password" -ForegroundColor Yellow
            Write-Host "  Getting initial admin password..." -ForegroundColor Gray

            try {
                $password = docker exec savvy-nexus cat /nexus-data/admin.password 2>$null
                if ($password) {
                    Write-Host ""
                    Write-Host "===================================" -ForegroundColor Yellow
                    Write-Host "  Initial Admin Password:" -ForegroundColor White
                    Write-Host "  $password" -ForegroundColor Green
                    Write-Host "===================================" -ForegroundColor Yellow
                    Write-Host ""
                    Write-Host "Copy this password!" -ForegroundColor Yellow
                }
            } catch {
                Write-Host "  Note: Password file not found (may already be set up)" -ForegroundColor Gray
            }

            Write-Host ""
            Write-Host "Step 3: Configure Nexus Web UI" -ForegroundColor Yellow
            Write-Host ""
            Write-Host "Opening Nexus in your browser..." -ForegroundColor Gray
            Start-Process "http://localhost:8081"
            Write-Host ""
            Write-Host "Follow these steps in the browser:" -ForegroundColor White
            Write-Host "  1. Click 'Sign In' (top right)" -ForegroundColor Gray
            Write-Host "  2. Username: admin" -ForegroundColor Gray
            Write-Host "  3. Password: (paste from above)" -ForegroundColor Gray
            Write-Host "  4. Complete setup wizard (enable anonymous access)" -ForegroundColor Gray
            Write-Host "  5. Create repository:" -ForegroundColor Gray
            Write-Host "     - Settings > Repositories > Create repository" -ForegroundColor Gray
            Write-Host "     - Select 'nuget (proxy)'" -ForegroundColor Gray
            Write-Host "     - Name: chocolatey-proxy" -ForegroundColor Gray
            Write-Host "     - Remote: https://community.chocolatey.org/api/v2/" -ForegroundColor Gray
            Write-Host "     - Uncheck 'Auto-block enabled'" -ForegroundColor Gray
            Write-Host "     - Create repository" -ForegroundColor Gray
            Write-Host ""
            Write-Host "See NEXUS_SETUP.md for detailed instructions" -ForegroundColor Yellow
            Write-Host ""
            Read-Host "Press Enter when you have completed the setup in the browser"

            Write-Host ""
            Write-Host "OK Setup complete!" -ForegroundColor Green
            Write-Host "  You can now run the scraper (option 3) or start the scheduler (option 2)" -ForegroundColor Gray
        } else {
            Write-Host "ERROR Nexus did not start in time" -ForegroundColor Red
            Write-Host "  Check logs: docker-compose -f $composeFile logs nexus" -ForegroundColor Yellow
        }
    }
    "2" {
        Write-Host ""
        Write-Host "Starting all services..." -ForegroundColor Yellow
        docker-compose -f $composeFile up -d
        Write-Host ""
        Write-Host "OK Services started!" -ForegroundColor Green
        Write-Host "  Nexus Web UI: http://localhost:8081" -ForegroundColor Gray
        Write-Host "  Scraper will run daily at 2:00 AM UTC" -ForegroundColor Gray
        Write-Host ""
        Write-Host "View logs: docker-compose -f $composeFile logs -f" -ForegroundColor Gray
    }
    "3" {
        Write-Host ""
        Write-Host "Running scraper now..." -ForegroundColor Yellow
        Write-Host "This will take 10-30 minutes (first run caches to Nexus)..." -ForegroundColor Gray
        Write-Host ""
        docker-compose -f $composeFile run --rm scraper
    }
    "4" {
        Write-Host ""
        Write-Host "Viewing logs (Ctrl+C to exit)..." -ForegroundColor Yellow
        docker-compose -f $composeFile logs -f
    }
    "5" {
        Write-Host ""
        Write-Host "Stopping services..." -ForegroundColor Yellow
        docker-compose -f $composeFile down
        Write-Host "OK Services stopped" -ForegroundColor Green
    }
    "6" {
        Write-Host ""
        Write-Host "Getting Nexus admin password..." -ForegroundColor Yellow
        try {
            $password = docker exec savvy-nexus cat /nexus-data/admin.password 2>$null
            if ($password) {
                Write-Host ""
                Write-Host "Initial Admin Password: $password" -ForegroundColor Green
                Write-Host ""
                Write-Host "Use this at http://localhost:8081" -ForegroundColor Gray
            } else {
                Write-Host ""
                Write-Host "Password file not found." -ForegroundColor Yellow
                Write-Host "  This means you have already logged in and changed the password." -ForegroundColor Gray
                Write-Host "  Use the password you set during initial setup." -ForegroundColor Gray
            }
        } catch {
            Write-Host "  Error: Could not read password file" -ForegroundColor Red
            Write-Host "  Make sure Nexus container is running" -ForegroundColor Yellow
        }
    }
    "7" {
        Write-Host ""
        Write-Host "Rebuilding scraper..." -ForegroundColor Yellow
        docker-compose -f $composeFile build --no-cache scraper
        Write-Host "OK Rebuild complete" -ForegroundColor Green
        Write-Host ""
        Write-Host "Run scraper now? (y/n)" -ForegroundColor Yellow
        $run = Read-Host
        if ($run -eq "y" -or $run -eq "Y") {
            docker-compose -f $composeFile run --rm scraper
        }
    }
    default {
        Write-Host ""
        Write-Host "Invalid choice. Please run the script again." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
