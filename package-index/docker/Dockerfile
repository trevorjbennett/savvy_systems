# SAVVY Package Index Scraper - Docker Container
# Lightweight Python container that scrapes Chocolatey and publishes to GitHub

FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install dependencies first (better caching)
COPY generator/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy scraper script
COPY generator/scraper_with_github.py .

# Create logs directory
RUN mkdir -p /app/logs

# Set environment variables (override via docker-compose or -e flag)
ENV GITHUB_OWNER=trevorjbennett
ENV GITHUB_REPO=savvy_systems
ENV OUTPUT_DIR=/app

# Run the scraper
CMD ["python", "scraper_with_github.py"]
