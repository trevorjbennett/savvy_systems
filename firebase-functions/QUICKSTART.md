# Firebase Functions Quick Start (5 Minutes)

Get the package index scraper running in the cloud in 5 minutes.

## Prerequisites

- Google account
- Firebase CLI installed: `npm install -g firebase-tools`
- GitHub Personal Access Token ([create here](https://github.com/settings/tokens))

## Step 1: Create Firebase Project (2 minutes)

```bash
# Login to Firebase
firebase login

# Create new project (or use existing)
# Visit: https://console.firebase.google.com/
# Click "Add project" and follow wizard

# Enable Blaze plan for Cloud Scheduler
# (required for scheduled functions, costs ~$0.10/month)
```

## Step 2: Configure Project (1 minute)

```bash
cd firebase-functions

# Link to your Firebase project
firebase use --add
# Select your project, set alias as 'default'

# Set GitHub token (will open browser to paste token)
firebase functions:secrets:set GITHUB_TOKEN
# Paste your GitHub token (ghp_...)

# Optional: Set API key for manual triggers
firebase functions:secrets:set API_KEY
# Enter any secure random string
```

## Step 3: Update Configuration (30 seconds)

Edit `functions/index.js` and update your GitHub info:

```javascript
const GITHUB_OWNER = 'your-github-username';
const GITHUB_REPO = 'savvy_systems';  // or your repo name
```

## Step 4: Deploy (1 minute)

```bash
cd functions
npm install

cd ..
firebase deploy --only functions
```

## Step 5: Test It! (30 seconds)

```bash
# Option 1: Trigger manually via curl
# (Get URL from deploy output)
curl https://us-central1-YOUR_PROJECT.cloudfunctions.net/updatePackageIndexManual

# Option 2: Wait for scheduled run (daily at 2 AM UTC)

# Option 3: Check logs
firebase functions:log --only updatePackageIndex
```

## Done! 🎉

Your scraper is now:
- ✅ Running in the cloud
- ✅ Executing daily at 2 AM UTC
- ✅ Publishing to GitHub Releases automatically
- ✅ Costs ~$0.11/month

## View Results

Check your GitHub repository releases:
```
https://github.com/YOUR_USERNAME/YOUR_REPO/releases
```

You should see releases tagged `package-index-YYYY.MM.DD` with three assets:
- `choco-index.json.gz` (compressed, recommended)
- `choco-index.json` (uncompressed)
- `metadata.json` (stats)

## Troubleshooting

**"UNAUTHENTICATED" error?**
```bash
firebase functions:secrets:set GITHUB_TOKEN
```

**Function timing out?**
- Check logs: `firebase functions:log`
- Increase memory in `index.js` (currently 512MiB)

**Wrong repository?**
- Update `GITHUB_OWNER` and `GITHUB_REPO` in `index.js`
- Redeploy: `firebase deploy --only functions`

## Next Steps

- Customize schedule in `index.js` (default: daily at 2 AM UTC)
- Set up monitoring alerts in Firebase Console
- Integrate SAVVY client to download the index

See [README.md](README.md) for detailed documentation.
