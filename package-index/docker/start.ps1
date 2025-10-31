# Quick Start Script for SAVVY Package Index Docker
# Run this script to start the automated scraper

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  SAVVY Package Index - Docker Setup" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env exists
if (-not (Test-Path ".env")) {
    Write-Host "Creating .env file..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "✓ Created .env file" -ForegroundColor Green
    Write-Host ""
    Write-Host "Your GitHub token is already configured!" -ForegroundColor Green
} else {
    Write-Host "✓ .env file exists" -ForegroundColor Green
}

# Create logs directory
if (-not (Test-Path "logs")) {
    New-Item -ItemType Directory -Path "logs" | Out-Null
    Write-Host "✓ Created logs directory" -ForegroundColor Green
} else {
    Write-Host "✓ Logs directory exists" -ForegroundColor Green
}

Write-Host ""
Write-Host "What would you like to do?" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Start scheduler (runs daily at 2 AM)" -ForegroundColor White
Write-Host "2. Run scraper now (one-time)" -ForegroundColor White
Write-Host "3. View logs" -ForegroundColor White
Write-Host "4. Stop services" -ForegroundColor White
Write-Host "5. Rebuild containers" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Enter your choice (1-5)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "Starting scheduler..." -ForegroundColor Yellow
        docker-compose up -d
        Write-Host ""
        Write-Host "✓ Scheduler started!" -ForegroundColor Green
        Write-Host "  The scraper will run daily at 2:00 AM UTC" -ForegroundColor Gray
        Write-Host ""
        Write-Host "View logs with: docker-compose logs -f" -ForegroundColor Gray
    }
    "2" {
        Write-Host ""
        Write-Host "Running scraper now..." -ForegroundColor Yellow
        Write-Host "This will take 10-15 minutes..." -ForegroundColor Gray
        Write-Host ""
        docker-compose run --rm scraper
    }
    "3" {
        Write-Host ""
        Write-Host "Viewing logs (Ctrl+C to exit)..." -ForegroundColor Yellow
        docker-compose logs -f
    }
    "4" {
        Write-Host ""
        Write-Host "Stopping services..." -ForegroundColor Yellow
        docker-compose down
        Write-Host "✓ Services stopped" -ForegroundColor Green
    }
    "5" {
        Write-Host ""
        Write-Host "Rebuilding containers..." -ForegroundColor Yellow
        docker-compose build --no-cache
        Write-Host "✓ Rebuild complete" -ForegroundColor Green
    }
    default {
        Write-Host ""
        Write-Host "Invalid choice. Please run the script again." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
