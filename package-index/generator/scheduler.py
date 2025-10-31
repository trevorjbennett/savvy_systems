"""
Scheduler wrapper for running the scraper daily at 2 AM.
Can run as a persistent service or be triggered by system scheduler.
"""
import schedule
import time
import sys
import os
import logging
from datetime import datetime
from pathlib import Path
import subprocess

# Setup logging
log_dir = Path(__file__).parent / 'logs'
log_dir.mkdir(exist_ok=True)
log_file = log_dir / f'scheduler_{datetime.now().strftime("%Y%m%d")}.log'

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_file),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)


def run_scraper():
    """Execute the scraper script."""
    logger.info("=" * 70)
    logger.info(f"Starting scheduled scraper run at {datetime.now()}")
    logger.info("=" * 70)

    script_path = Path(__file__).parent / 'scraper_with_github.py'

    try:
        # Run the scraper as a subprocess
        result = subprocess.run(
            [sys.executable, str(script_path)],
            capture_output=True,
            text=True,
            timeout=3600  # 1 hour timeout
        )

        logger.info(f"Scraper exit code: {result.returncode}")

        if result.stdout:
            logger.info("Scraper output:")
            logger.info(result.stdout)

        if result.stderr:
            logger.error("Scraper errors:")
            logger.error(result.stderr)

        if result.returncode == 0:
            logger.info("✓ Scraper completed successfully")
        else:
            logger.error(f"❌ Scraper failed with exit code {result.returncode}")

    except subprocess.TimeoutExpired:
        logger.error("❌ Scraper timed out after 1 hour")
    except Exception as e:
        logger.exception(f"❌ Error running scraper: {e}")

    logger.info("=" * 70)
    logger.info("")


def main():
    """Main scheduler loop."""
    logger.info("=" * 70)
    logger.info("SAVVY Package Index Scheduler")
    logger.info("=" * 70)
    logger.info(f"Log file: {log_file}")
    logger.info("Scheduled to run daily at 2:00 AM")
    logger.info("")

    # Schedule the job for 2 AM every day
    schedule.every().day.at("02:00").do(run_scraper)

    logger.info("Scheduler started. Press Ctrl+C to stop.")
    logger.info(f"Next run: {schedule.next_run()}")
    logger.info("")

    # Optional: Run immediately on startup
    if "--now" in sys.argv:
        logger.info("Running immediately (--now flag detected)...")
        run_scraper()

    # Main loop
    try:
        while True:
            schedule.run_pending()
            time.sleep(60)  # Check every minute

    except KeyboardInterrupt:
        logger.info("\n\nScheduler stopped by user")
        sys.exit(0)
    except Exception as e:
        logger.exception(f"Scheduler error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
