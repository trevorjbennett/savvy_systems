# SAVVY Package Index - Firebase Functions

Automated Chocolatey package index generation using Firebase Functions and Cloud Scheduler.

## Overview

This Firebase Function scrapes all Chocolatey packages daily and publishes a compressed index to GitHub Releases, bypassing the IP blocking issues encountered with GitHub Actions.

**Architecture:**
```
Cloud Scheduler → Firebase Function → Chocolatey API → GitHub Releases → SAVVY
     (daily)          (scraper)         (fetch)         (publish)      (download)
```

## Features

- **Fully Automated**: Runs daily at 2 AM UTC via Cloud Scheduler
- **Manual Trigger**: HTTP endpoint for on-demand updates
- **Compressed Output**: gzip compression reduces index size by ~70%
- **GitHub Integration**: Automatically creates releases with assets
- **Error Handling**: Robust retry logic and logging
- **Cost Effective**: Fits within Firebase free tier

## Prerequisites

1. **Firebase CLI**
   ```bash
   npm install -g firebase-tools
   firebase login
   ```

2. **Firebase Project**
   - Create at [Firebase Console](https://console.firebase.google.com/)
   - Enable Blaze (pay-as-you-go) plan for Cloud Scheduler
   - Note your project ID

3. **GitHub Personal Access Token**
   - Create at [GitHub Settings > Tokens](https://github.com/settings/tokens)
   - Scopes needed: `repo` (full control)
   - Copy the token (you'll only see it once)

## Setup

### 1. Initialize Firebase Project

```bash
cd firebase-functions

# Set your Firebase project ID
firebase use --add
# Select your project and set alias as 'default'

# Or edit .firebaserc manually:
# {
#   "projects": {
#     "default": "your-project-id"
#   }
# }
```

### 2. Configure Environment Variables

```bash
cd functions

# Create .env file (don't commit this!)
cp .env.example .env

# Edit .env and add your tokens:
# GITHUB_TOKEN=ghp_your_actual_token
# API_KEY=some_random_secure_string
```

### 3. Set Firebase Secrets

Firebase Functions v2 uses Cloud Secret Manager for environment variables:

```bash
# Set GitHub token
firebase functions:secrets:set GITHUB_TOKEN
# Paste your token when prompted

# Optional: Set API key for manual trigger authentication
firebase functions:secrets:set API_KEY
# Enter a secure random string
```

### 4. Install Dependencies

```bash
cd functions
npm install
```

### 5. Deploy

```bash
# Deploy all functions
firebase deploy --only functions

# Or deploy specific function
firebase deploy --only functions:updatePackageIndex
```

## Usage

### Automatic Schedule

Once deployed, the function runs automatically every day at 2 AM UTC (configured in `index.js`):

```javascript
schedule: '0 2 * * *'  // Cron format: minute hour day month weekday
```

To change the schedule, edit `index.js` and redeploy.

### Manual Trigger

Trigger manually via HTTP request:

```bash
# Get your function URL from deployment output or Firebase Console
# URL format: https://REGION-PROJECT_ID.cloudfunctions.net/updatePackageIndexManual

# Trigger without auth (if API_KEY not set)
curl https://us-central1-your-project.cloudfunctions.net/updatePackageIndexManual

# Trigger with API key
curl "https://us-central1-your-project.cloudfunctions.net/updatePackageIndexManual?key=YOUR_API_KEY"

# Or with header
curl -H "x-api-key: YOUR_API_KEY" \
  https://us-central1-your-project.cloudfunctions.net/updatePackageIndexManual
```

### View Logs

```bash
# Stream logs in real-time
firebase functions:log --only updatePackageIndex

# Or view in Firebase Console
# https://console.firebase.google.com/project/YOUR_PROJECT/functions/logs
```

## Configuration

### Update GitHub Repository

Edit `index.js` to change the target repository:

```javascript
const GITHUB_OWNER = 'your-username';
const GITHUB_REPO = 'your-repo';
```

### Adjust Memory/Timeout

The function is configured with:
- **Memory**: 512 MiB (enough for ~10,000 packages)
- **Timeout**: 540 seconds (9 minutes, Cloud Functions max)

If you need more resources, edit `index.js`:

```javascript
{
  memory: '1GiB',      // Options: 128MiB, 256MiB, 512MiB, 1GiB, 2GiB, 4GiB, 8GiB
  timeoutSeconds: 540  // Max: 540 (9 minutes) for HTTP, 3600 for event-driven
}
```

### Change Schedule

Edit the cron expression in `index.js`:

```javascript
schedule: '0 2 * * *'  // Daily at 2 AM UTC

// Examples:
// '0 */6 * * *'   - Every 6 hours
// '0 0 * * 0'     - Weekly on Sunday at midnight
// '0 0 1 * *'     - Monthly on 1st at midnight
```

## Cost Estimate

**Firebase Free Tier (Spark Plan):**
- Cloud Functions: 2M invocations/month
- Outbound data: 5GB/month
- ⚠️ **Cloud Scheduler requires Blaze plan** (~$0.10/month for 1 job)

**Expected Costs (Blaze Plan):**
- Cloud Scheduler: ~$0.10/month (1 job, daily)
- Function invocations: Free (30 invocations/month)
- Compute time: ~$0.01/month (30 runs × ~5 min × 512MB)
- Outbound data: Free (within 5GB)

**Total: ~$0.11/month**

## Troubleshooting

### Function Timeout

If scraping takes longer than 9 minutes:
- Split into multiple smaller functions
- Use Cloud Tasks for longer operations
- Consider Pub/Sub for pagination

### Chocolatey API Rate Limiting

The scraper includes 100ms delays between requests. If you hit rate limits:
- Increase delay in `index.js` (currently 100ms)
- Add exponential backoff on failures

### GitHub Release Upload Fails

Check:
- GitHub token has `repo` scope
- Repository name/owner is correct
- Token hasn't expired

### "UNAUTHENTICATED" Error

Make sure secrets are set:
```bash
firebase functions:secrets:access GITHUB_TOKEN
```

If empty, set it:
```bash
firebase functions:secrets:set GITHUB_TOKEN
```

## Development

### Local Testing

Test functions locally with Firebase Emulator:

```bash
cd functions
npm run serve

# Function will be available at:
# http://localhost:5001/YOUR_PROJECT/us-central1/updatePackageIndexManual
```

**Note**: Scheduled functions can't be triggered in emulator. Use the manual HTTP endpoint for testing.

### Test Without Deploying

Run the scraper logic locally:

```bash
node -e "
const { updatePackageIndexManual } = require('./index.js');
// Note: This won't work directly due to Firebase dependencies
// Use the emulator instead
"
```

## Monitoring

### View Execution History

Firebase Console > Functions > Dashboard shows:
- Invocation count
- Error rate
- Execution time
- Memory usage

### Set Up Alerts

Firebase Console > Alerts > Create Alert:
- Alert on function failures
- Alert on high memory usage
- Alert on timeout errors

## Migration from GitHub Actions

The Firebase Function provides the same functionality as the GitHub Actions workflow but:
- ✅ Bypasses Chocolatey's IP blocking
- ✅ Fully automated (no local machine needed)
- ✅ Better error handling and retry logic
- ✅ Integrated logging and monitoring
- ✅ Scales automatically

The output format is identical - GitHub Releases with compressed index.

## Next Steps

1. **Deploy the function** and verify it runs successfully
2. **Test manual trigger** to generate first release
3. **Monitor the scheduled runs** for a few days
4. **Update SAVVY client** to download from latest release
5. **Retire manual upload workflow** once stable

## Support

- [Firebase Functions Docs](https://firebase.google.com/docs/functions)
- [Cloud Scheduler Docs](https://cloud.google.com/scheduler/docs)
- [Octokit (GitHub API) Docs](https://github.com/octokit/octokit.js)
