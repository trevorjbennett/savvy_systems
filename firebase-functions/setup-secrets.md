# Set Up Firebase Secrets

Before deploying, you need to set up the GitHub token as a Firebase secret.

## Step 1: Create GitHub Personal Access Token

1. Go to: https://github.com/settings/tokens/new
2. Note: "SAVVY Package Index Scraper"
3. Expiration: "No expiration" (or custom)
4. Select scopes:
   - ✅ **repo** (Full control of private repositories)
5. Click "Generate token"
6. **Copy the token** (you'll only see it once!)

## Step 2: Set Firebase Secret

Run this command and paste your token when prompted:

```bash
cd c:\Users\Jae\savvy_new\savvy\firebase-functions
firebase functions:secrets:set GITHUB_TOKEN
```

It will prompt: "Enter a value for GITHUB_TOKEN:"
Paste your token (ghp_...) and press Enter.

## Step 3: Verify Secret

Check that the secret was set:

```bash
firebase functions:secrets:access GITHUB_TOKEN --project savvy-package-index
```

If it shows an error or empty, repeat Step 2.

## Optional: Set API Key

For manual HTTP trigger authentication (optional):

```bash
firebase functions:secrets:set API_KEY
```

Enter any secure random string (e.g., generated from https://www.uuidgenerator.net/).

---

**After setting secrets, proceed with deployment:**

```bash
firebase deploy --only functions --project savvy-package-index
```
