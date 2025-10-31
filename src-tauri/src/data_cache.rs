// Data Cache Service - Downloads and caches package indexes and embeddings
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use reqwest;

#[derive(Debug, Serialize, Deserialize)]
pub struct DownloadProgress {
    pub file_name: String,
    pub bytes_downloaded: u64,
    pub total_bytes: Option<u64>,
    pub percentage: Option<f32>,
}

const GITHUB_OWNER: &str = "trevorjbennett";
const GITHUB_REPO: &str = "savvy_systems";

/// Get the cache directory path (~/.savvy/cache)
pub fn get_cache_dir() -> Result<PathBuf, String> {
    let home_dir = dirs::home_dir()
        .ok_or_else(|| "Could not determine home directory".to_string())?;

    let cache_dir = home_dir.join(".savvy").join("cache");

    // Create directory if it doesn't exist
    fs::create_dir_all(&cache_dir)
        .map_err(|e| format!("Failed to create cache directory: {}", e))?;

    Ok(cache_dir)
}

/// Download a file from GitHub Release to cache directory
pub async fn download_file(file_name: &str) -> Result<PathBuf, String> {
    // Get latest release info
    let client = reqwest::Client::new();
    let url = format!(
        "https://api.github.com/repos/{}/{}/releases/latest",
        GITHUB_OWNER, GITHUB_REPO
    );

    let response = client
        .get(&url)
        .header("User-Agent", "SAVVY-Package-Manager")
        .send()
        .await
        .map_err(|e| format!("Failed to fetch release info: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("GitHub API returned status: {}", response.status()));
    }

    let release: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse release JSON: {}", e))?;

    // Find the asset
    let assets = release["assets"]
        .as_array()
        .ok_or_else(|| "No assets found in release".to_string())?;

    let asset = assets
        .iter()
        .find(|a| a["name"].as_str() == Some(file_name))
        .ok_or_else(|| format!("File {} not found in release", file_name))?;

    let download_url = asset["browser_download_url"]
        .as_str()
        .ok_or_else(|| "No download URL found".to_string())?;

    // Download the file
    let response = client
        .get(download_url)
        .send()
        .await
        .map_err(|e| format!("Failed to download file: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Download failed with status: {}", response.status()));
    }

    let bytes = response
        .bytes()
        .await
        .map_err(|e| format!("Failed to read file bytes: {}", e))?;

    // Save to cache directory
    let cache_dir = get_cache_dir()?;
    let file_path = cache_dir.join(file_name);

    fs::write(&file_path, &bytes)
        .map_err(|e| format!("Failed to write file: {}", e))?;

    Ok(file_path)
}

/// Download all required files (indexes and embeddings)
pub async fn download_all_data() -> Result<Vec<PathBuf>, String> {
    let files = vec![
        "choco-index.json.gz",
        "winget-index.json.gz",
        "choco-embeddings.json.gz",
        "winget-embeddings.json.gz",
    ];

    let mut downloaded_files = Vec::new();

    for file_name in files {
        println!("Downloading {}...", file_name);
        let path = download_file(file_name).await?;
        downloaded_files.push(path);
    }

    Ok(downloaded_files)
}

/// Check if cache exists and is recent (within 7 days)
pub fn is_cache_valid() -> bool {
    let cache_dir = match get_cache_dir() {
        Ok(dir) => dir,
        Err(_) => return false,
    };

    let required_files = vec![
        "choco-index.json.gz",
        "winget-index.json.gz",
        "choco-embeddings.json.gz",
        "winget-embeddings.json.gz",
    ];

    // Check if all files exist
    for file_name in &required_files {
        if !cache_dir.join(file_name).exists() {
            return false;
        }
    }

    // Check if files are recent (within 7 days)
    if let Ok(metadata) = fs::metadata(cache_dir.join("choco-index.json.gz")) {
        if let Ok(modified) = metadata.modified() {
            if let Ok(elapsed) = modified.elapsed() {
                return elapsed.as_secs() < 7 * 24 * 60 * 60; // 7 days
            }
        }
    }

    false
}
