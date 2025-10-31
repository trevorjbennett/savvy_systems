# Windows Task Scheduler Setup Script
# Creates a scheduled task to run the scraper daily at 2 AM

param(
    [string]$PythonPath = "python",
    [string]$ScriptDir = $PSScriptRoot,
    [string]$GitHubToken = $env:GITHUB_TOKEN
)

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  SAVVY Package Index - Scheduler Setup" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Validate Python installation
Write-Host "Checking Python installation..." -ForegroundColor Yellow
try {
    $pythonVersion = & $PythonPath --version 2>&1
    Write-Host "  Found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "  Error: Python not found at '$PythonPath'" -ForegroundColor Red
    Write-Host "  Please install Python or specify the correct path with -PythonPath parameter" -ForegroundColor Red
    exit 1
}

# Check for GitHub token
if (-not $GitHubToken) {
    Write-Host ""
    Write-Host "GitHub Token Setup:" -ForegroundColor Yellow
    Write-Host "  No GITHUB_TOKEN environment variable found." -ForegroundColor Yellow
    $GitHubToken = Read-Host "  Enter your GitHub Personal Access Token (or press Enter to skip)"

    if ($GitHubToken) {
        Write-Host "  Setting GITHUB_TOKEN environment variable..." -ForegroundColor Yellow
        [System.Environment]::SetEnvironmentVariable("GITHUB_TOKEN", $GitHubToken, [System.EnvironmentVariableTarget]::User)
        $env:GITHUB_TOKEN = $GitHubToken
        Write-Host "  ✓ Token saved to user environment variables" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ Warning: Scraper will run but won't publish to GitHub" -ForegroundColor Yellow
    }
}

# Install Python dependencies
Write-Host ""
Write-Host "Installing Python dependencies..." -ForegroundColor Yellow
$requirementsPath = Join-Path $ScriptDir "requirements.txt"
& $PythonPath -m pip install -r $requirementsPath --quiet
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ Dependencies installed" -ForegroundColor Green
} else {
    Write-Host "  ⚠ Warning: Some dependencies may not have installed correctly" -ForegroundColor Yellow
}

# Prepare task configuration
$taskName = "SAVVY-PackageIndexScraper"
$scriptPath = Join-Path $ScriptDir "scraper_with_github.py"
$logPath = Join-Path $ScriptDir "logs"

# Create logs directory
if (-not (Test-Path $logPath)) {
    New-Item -ItemType Directory -Path $logPath | Out-Null
}

Write-Host ""
Write-Host "Creating Windows Scheduled Task..." -ForegroundColor Yellow
Write-Host "  Task Name: $taskName" -ForegroundColor Gray
Write-Host "  Schedule: Daily at 2:00 AM" -ForegroundColor Gray
Write-Host "  Script: $scriptPath" -ForegroundColor Gray

# Remove existing task if it exists
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existingTask) {
    Write-Host "  Removing existing task..." -ForegroundColor Gray
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}

# Create scheduled task action
$action = New-ScheduledTaskAction -Execute $PythonPath -Argument "`"$scriptPath`"" -WorkingDirectory $ScriptDir

# Create trigger for daily at 2 AM
$trigger = New-ScheduledTaskTrigger -Daily -At "2:00 AM"

# Create settings
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable `
    -ExecutionTimeLimit (New-TimeSpan -Hours 2)

# Get current user for task principal
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType S4U

# Register the task
try {
    Register-ScheduledTask `
        -TaskName $taskName `
        -Action $action `
        -Trigger $trigger `
        -Settings $settings `
        -Principal $principal `
        -Description "Automated Chocolatey package index scraper for SAVVY - Runs daily at 2 AM" | Out-Null

    Write-Host "  ✓ Scheduled task created successfully!" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Error creating scheduled task: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "  You may need to run this script as Administrator." -ForegroundColor Yellow
    Write-Host "  Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

# Verify task was created
$task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($task) {
    $nextRun = $task.Triggers[0].StartBoundary
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host "  Setup Complete!" -ForegroundColor Green
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Task Details:" -ForegroundColor Yellow
    Write-Host "  Name: $taskName" -ForegroundColor White
    Write-Host "  Status: $($task.State)" -ForegroundColor White
    Write-Host "  Schedule: Daily at 2:00 AM" -ForegroundColor White
    Write-Host "  Next Run: $nextRun" -ForegroundColor White
    Write-Host ""
    Write-Host "Useful Commands:" -ForegroundColor Yellow
    Write-Host "  View task:    Get-ScheduledTask -TaskName '$taskName'" -ForegroundColor Gray
    Write-Host "  Run now:      Start-ScheduledTask -TaskName '$taskName'" -ForegroundColor Gray
    Write-Host "  View logs:    Get-Content '$logPath\scraper_*.log' -Tail 50" -ForegroundColor Gray
    Write-Host "  Remove task:  Unregister-ScheduledTask -TaskName '$taskName'" -ForegroundColor Gray
    Write-Host ""

    # Ask if user wants to run immediately
    $runNow = Read-Host "Would you like to run the scraper now to test it? (y/n)"
    if ($runNow -eq 'y' -or $runNow -eq 'Y') {
        Write-Host ""
        Write-Host "Starting scraper..." -ForegroundColor Yellow
        Start-ScheduledTask -TaskName $taskName
        Write-Host "✓ Task started! Check logs directory for output." -ForegroundColor Green
        Write-Host "  Log directory: $logPath" -ForegroundColor Gray
    }
} else {
    Write-Host "  ✗ Task creation verification failed" -ForegroundColor Red
    exit 1
}

Write-Host ""
