// Search Service - Python backend integration
use serde::{Deserialize, Serialize};
use std::process::Command;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize)]
pub struct SearchResult {
    pub id: String,
    pub title: String,
    pub summary: String,
    pub score: f32,
    pub source: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SearchRequest {
    pub query: String,
    pub source: Option<String>,
    pub limit: Option<usize>,
    pub threshold: Option<f32>,
}

/// Call Python search service for semantic search
pub fn semantic_search(request: SearchRequest) -> Result<Vec<SearchResult>, String> {
    // Get the path to the Python search service
    let app_dir = std::env::current_dir().map_err(|e| e.to_string())?;
    let python_script = app_dir.join("python_service").join("search_service.py");

    if !python_script.exists() {
        return Err(format!("Python search service not found at {:?}", python_script));
    }

    // Serialize request to JSON
    let request_json = serde_json::to_string(&request)
        .map_err(|e| format!("Failed to serialize request: {}", e))?;

    // Call Python script
    let output = Command::new("python")
        .arg(python_script)
        .arg("search")
        .arg(&request_json)
        .output()
        .map_err(|e| format!("Failed to execute Python service: {}", e))?;

    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Python service error: {}", error));
    }

    // Parse response
    let results: Vec<SearchResult> = serde_json::from_slice(&output.stdout)
        .map_err(|e| format!("Failed to parse results: {}", e))?;

    Ok(results)
}
