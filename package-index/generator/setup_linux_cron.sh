#!/bin/bash
# Linux Cron Setup Script
# Creates a cron job to run the scraper daily at 2 AM

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PYTHON_CMD="${PYTHON_CMD:-python3}"
SCRAPER_SCRIPT="$SCRIPT_DIR/scraper_with_github.py"
LOG_DIR="$SCRIPT_DIR/logs"

echo "============================================"
echo "  SAVVY Package Index - Cron Setup"
echo "============================================"
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo "⚠ Warning: Running as root"
    echo "  Cron job will be created for root user"
    echo ""
fi

# Validate Python installation
echo "Checking Python installation..."
if ! command -v $PYTHON_CMD &> /dev/null; then
    echo "  ✗ Error: Python not found at '$PYTHON_CMD'"
    echo "  Please install Python 3 or set PYTHON_CMD environment variable"
    exit 1
fi

PYTHON_VERSION=$($PYTHON_CMD --version 2>&1)
echo "  ✓ Found: $PYTHON_VERSION"

# Get full path to Python
PYTHON_PATH=$(which $PYTHON_CMD)

# Check for GitHub token
if [ -z "$GITHUB_TOKEN" ]; then
    echo ""
    echo "GitHub Token Setup:"
    echo "  No GITHUB_TOKEN environment variable found."
    read -p "  Enter your GitHub Personal Access Token (or press Enter to skip): " token

    if [ -n "$token" ]; then
        # Add to .bashrc or .profile
        if [ -f "$HOME/.bashrc" ]; then
            echo "export GITHUB_TOKEN=\"$token\"" >> "$HOME/.bashrc"
            export GITHUB_TOKEN="$token"
            echo "  ✓ Token saved to ~/.bashrc"
        elif [ -f "$HOME/.profile" ]; then
            echo "export GITHUB_TOKEN=\"$token\"" >> "$HOME/.profile"
            export GITHUB_TOKEN="$token"
            echo "  ✓ Token saved to ~/.profile"
        fi
        echo "  Run 'source ~/.bashrc' or log out and back in to apply"
    else
        echo "  ⚠ Warning: Scraper will run but won't publish to GitHub"
    fi
fi

# Install Python dependencies
echo ""
echo "Installing Python dependencies..."
$PYTHON_CMD -m pip install -r "$SCRIPT_DIR/requirements.txt" --quiet --user
if [ $? -eq 0 ]; then
    echo "  ✓ Dependencies installed"
else
    echo "  ⚠ Warning: Some dependencies may not have installed correctly"
fi

# Create logs directory
mkdir -p "$LOG_DIR"

# Create wrapper script that sets environment
WRAPPER_SCRIPT="$SCRIPT_DIR/run_scraper.sh"
cat > "$WRAPPER_SCRIPT" << EOF
#!/bin/bash
# Auto-generated wrapper script for cron

# Set PATH to ensure Python is found
export PATH="/usr/local/bin:/usr/bin:/bin:\$PATH"

# Load environment variables
[ -f "\$HOME/.bashrc" ] && source "\$HOME/.bashrc"
[ -f "\$HOME/.profile" ] && source "\$HOME/.profile"

# Set GitHub token if provided
[ -n "\$GITHUB_TOKEN" ] && export GITHUB_TOKEN

# Run the scraper
cd "$SCRIPT_DIR"
$PYTHON_PATH "$SCRAPER_SCRIPT"
EOF

chmod +x "$WRAPPER_SCRIPT"
echo "  ✓ Created wrapper script: $WRAPPER_SCRIPT"

# Prepare cron entry
CRON_CMD="0 2 * * * $WRAPPER_SCRIPT >> $LOG_DIR/cron.log 2>&1"

echo ""
echo "Setting up cron job..."
echo "  Schedule: Daily at 2:00 AM"
echo "  Command: $WRAPPER_SCRIPT"
echo "  Log: $LOG_DIR/cron.log"

# Check if cron job already exists
(crontab -l 2>/dev/null | grep -v "$WRAPPER_SCRIPT"; echo "$CRON_CMD") | crontab -

if [ $? -eq 0 ]; then
    echo "  ✓ Cron job created successfully!"
else
    echo "  ✗ Error creating cron job"
    exit 1
fi

# Verify cron job was created
echo ""
echo "Current crontab:"
crontab -l | grep "$WRAPPER_SCRIPT" || echo "  No matching cron jobs found"

echo ""
echo "============================================"
echo "  Setup Complete!"
echo "============================================"
echo ""
echo "Cron Details:"
echo "  Schedule: Daily at 2:00 AM (0 2 * * *)"
echo "  Script: $WRAPPER_SCRIPT"
echo "  Logs: $LOG_DIR/"
echo ""
echo "Useful Commands:"
echo "  View crontab:     crontab -l"
echo "  Edit crontab:     crontab -e"
echo "  View logs:        tail -f $LOG_DIR/cron.log"
echo "  Run manually:     $WRAPPER_SCRIPT"
echo "  Remove cron job:  crontab -e (then delete the line)"
echo ""

# Ask if user wants to run immediately
read -p "Would you like to run the scraper now to test it? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Starting scraper..."
    $WRAPPER_SCRIPT
fi

echo ""
