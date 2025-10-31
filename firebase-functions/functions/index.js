const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onRequest } = require('firebase-functions/v2/https');
const axios = require('axios');
const zlib = require('zlib');
const { Octokit } = require('octokit');
const { promisify } = require('util');

const gzip = promisify(zlib.gzip);

// Configuration
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = 'trevorjbennett';
const GITHUB_REPO = 'savvy_systems';

/**
 * Fetches all Chocolatey packages with pagination
 */
async function getAllChocoPackageVersions() {
  const baseUrl = 'https://community.chocolatey.org/api/v2/Packages';
  const params = {
    $select: 'Id,Version,Title,Summary,DownloadCount,Tags,LastUpdated',
    $orderby: 'Id,Version'
  };
  const headers = {
    'Accept': 'application/json'
  };

  const allPackageVersions = [];
  let nextPageUrl = baseUrl;
  let pageCount = 0;

  console.log('Starting Chocolatey package fetch...');

  while (nextPageUrl) {
    try {
      const response = await axios.get(nextPageUrl, {
        headers,
        params: pageCount === 0 ? params : undefined,
        timeout: 60000
      });

      const data = response.data;
      const results = data?.d?.results || [];

      allPackageVersions.push(...results);
      pageCount++;

      console.log(`Fetched page ${pageCount}: ${results.length} packages (total: ${allPackageVersions.length})`);

      nextPageUrl = data?.d?.__next || null;

      // Small delay to avoid rate limiting
      if (nextPageUrl) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error(`Error fetching page ${pageCount + 1}:`, error.message);
      throw error;
    }
  }

  console.log(`Fetch complete. Total package versions: ${allPackageVersions.length}`);
  return allPackageVersions;
}

/**
 * Filters to keep only the latest version of each package
 */
function filterLatestVersions(packages) {
  const latestVersions = {};

  for (const pkg of packages) {
    const pkgId = pkg.Id.toLowerCase();
    const currentVersion = pkg.Version;

    if (!latestVersions[pkgId]) {
      latestVersions[pkgId] = pkg;
    } else {
      const existingVersion = latestVersions[pkgId].Version;
      if (compareVersions(currentVersion, existingVersion) > 0) {
        latestVersions[pkgId] = pkg;
      }
    }
  }

  return Object.values(latestVersions);
}

/**
 * Simple version comparison (supports semantic versioning basics)
 */
function compareVersions(v1, v2) {
  const parts1 = v1.split(/[.-]/).map(p => parseInt(p) || 0);
  const parts2 = v2.split(/[.-]/).map(p => parseInt(p) || 0);
  const maxLen = Math.max(parts1.length, parts2.length);

  for (let i = 0; i < maxLen; i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
}

/**
 * Creates a GitHub Release with the package index
 */
async function createGitHubRelease(indexData, metadata) {
  const octokit = new Octokit({ auth: GITHUB_TOKEN });

  // Compress the index
  const jsonString = JSON.stringify(indexData, null, 2);
  const compressed = await gzip(jsonString);

  const version = metadata.version;
  const tag = `package-index-${version}`;

  console.log(`Creating GitHub release: ${tag}`);

  // Check if release exists
  try {
    const { data: existingRelease } = await octokit.rest.repos.getReleaseByTag({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      tag
    });

    // Delete existing release if it exists
    await octokit.rest.repos.deleteRelease({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      release_id: existingRelease.id
    });
    console.log('Deleted existing release');
  } catch (error) {
    // Release doesn't exist, that's fine
  }

  // Create the release
  const { data: release } = await octokit.rest.repos.createRelease({
    owner: GITHUB_OWNER,
    repo: GITHUB_REPO,
    tag_name: tag,
    name: `Chocolatey Package Index - ${version}`,
    body: `
## Chocolatey Package Index

**Version**: ${version}
**Generated**: ${metadata.generated}
**Total Packages**: ${metadata.packageCount.toLocaleString()}

### Download URLs

- **Compressed Index** (recommended): [choco-index.json.gz](https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/download/${tag}/choco-index.json.gz)
- **Uncompressed Index**: [choco-index.json](https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/download/${tag}/choco-index.json)
- **Metadata**: [metadata.json](https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/download/${tag}/metadata.json)

### File Sizes

- Compressed: ${(compressed.length / 1024 / 1024).toFixed(2)} MB
- Uncompressed: ${(jsonString.length / 1024 / 1024).toFixed(2)} MB
- Compression Ratio: ${((1 - compressed.length / jsonString.length) * 100).toFixed(1)}%

🤖 Generated automatically by Firebase Functions
`,
    draft: false,
    prerelease: false
  });

  console.log(`Release created: ${release.html_url}`);

  // Upload assets
  const assets = [
    { name: 'choco-index.json.gz', data: compressed, contentType: 'application/gzip' },
    { name: 'choco-index.json', data: Buffer.from(jsonString), contentType: 'application/json' },
    { name: 'metadata.json', data: Buffer.from(JSON.stringify(metadata, null, 2)), contentType: 'application/json' }
  ];

  for (const asset of assets) {
    console.log(`Uploading ${asset.name}...`);
    await octokit.rest.repos.uploadReleaseAsset({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      release_id: release.id,
      name: asset.name,
      data: asset.data,
      headers: {
        'content-type': asset.contentType,
        'content-length': asset.data.length
      }
    });
    console.log(`✓ ${asset.name} uploaded`);
  }

  return release;
}

/**
 * Main scraper function
 */
async function scrapeAndPublish() {
  console.log('=== Starting Package Index Generation ===');
  const startTime = Date.now();

  try {
    // Step 1: Fetch all packages
    const allPackages = await getAllChocoPackageVersions();

    // Step 2: Filter to latest versions
    const latestPackages = filterLatestVersions(allPackages);
    console.log(`Filtered to ${latestPackages.length} latest versions`);

    // Step 3: Prepare metadata
    const metadata = {
      version: new Date().toISOString().split('T')[0].replace(/-/g, '.'),
      generated: new Date().toISOString(),
      packageCount: latestPackages.length,
      source: 'chocolatey',
      generator: 'firebase-functions'
    };

    // Step 4: Create GitHub Release
    const release = await createGitHubRelease(latestPackages, metadata);

    const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(2);
    console.log(`=== Complete! Duration: ${duration} minutes ===`);
    console.log(`Release URL: ${release.html_url}`);

    return {
      success: true,
      metadata,
      releaseUrl: release.html_url,
      duration: `${duration} minutes`
    };
  } catch (error) {
    console.error('Error in scrapeAndPublish:', error);
    throw error;
  }
}

/**
 * Scheduled function (runs daily at 2 AM UTC)
 */
exports.updatePackageIndex = onSchedule(
  {
    schedule: '0 2 * * *', // Daily at 2 AM UTC
    timeoutSeconds: 540, // 9 minutes (max for Cloud Functions)
    memory: '512MiB',
    region: 'us-central1'
  },
  async (event) => {
    try {
      const result = await scrapeAndPublish();
      console.log('Scheduled update complete:', result);
      return result;
    } catch (error) {
      console.error('Scheduled update failed:', error);
      throw error;
    }
  }
);

/**
 * HTTP function for manual triggering
 */
exports.updatePackageIndexManual = onRequest(
  {
    timeoutSeconds: 540,
    memory: '512MiB',
    region: 'us-central1'
  },
  async (req, res) => {
    try {
      // Simple auth check (optional)
      const authKey = req.query.key || req.headers['x-api-key'];
      const expectedKey = process.env.API_KEY;

      if (expectedKey && authKey !== expectedKey) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const result = await scrapeAndPublish();
      res.status(200).json(result);
    } catch (error) {
      console.error('Manual update failed:', error);
      res.status(500).json({
        error: error.message,
        stack: error.stack
      });
    }
  }
);
