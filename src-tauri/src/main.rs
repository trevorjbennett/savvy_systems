// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod package_manager;
mod search_service;
mod data_cache;

use package_manager::{PackageManager, PackageSource, InstallResult, UninstallResult, UpgradeResult, InstalledPackage, PackageError};
use search_service::{SearchRequest, SearchResult};
use tauri::State;
use std::sync::Arc;
use std::path::PathBuf;

/// Tauri state for package manager
struct AppState {
    package_manager: Arc<PackageManager>,
}

/// Install a package
#[tauri::command]
async fn install_package(
    package_id: String,
    source: PackageSource,
    state: State<'_, AppState>,
) -> Result<InstallResult, String> {
    state
        .package_manager
        .install(&package_id, source)
        .await
        .map_err(|e| e.to_string())
}

/// Uninstall a package
#[tauri::command]
async fn uninstall_package(
    package_id: String,
    source: PackageSource,
    state: State<'_, AppState>,
) -> Result<UninstallResult, String> {
    state
        .package_manager
        .uninstall(&package_id, source)
        .await
        .map_err(|e| e.to_string())
}

/// Upgrade a package
#[tauri::command]
async fn upgrade_package(
    package_id: String,
    source: PackageSource,
    state: State<'_, AppState>,
) -> Result<UpgradeResult, String> {
    state
        .package_manager
        .upgrade(&package_id, source)
        .await
        .map_err(|e| e.to_string())
}

/// List installed packages
#[tauri::command]
async fn list_installed_packages(
    source: PackageSource,
    state: State<'_, AppState>,
) -> Result<Vec<InstalledPackage>, String> {
    state
        .package_manager
        .list_installed(source)
        .await
        .map_err(|e| e.to_string())
}

/// Semantic search using Python backend
#[tauri::command]
async fn semantic_search(request: SearchRequest) -> Result<Vec<SearchResult>, String> {
    search_service::semantic_search(request)
}

/// Download and cache all data files
#[tauri::command]
async fn download_cache_data() -> Result<Vec<PathBuf>, String> {
    data_cache::download_all_data().await
}

/// Check if cache is valid
#[tauri::command]
fn is_cache_valid() -> bool {
    data_cache::is_cache_valid()
}

/// Get cache directory path
#[tauri::command]
fn get_cache_dir() -> Result<PathBuf, String> {
    data_cache::get_cache_dir()
}

fn main() {
    let package_manager = Arc::new(PackageManager::new());

    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .manage(AppState {
            package_manager,
        })
        .invoke_handler(tauri::generate_handler![
            install_package,
            uninstall_package,
            upgrade_package,
            list_installed_packages,
            semantic_search,
            download_cache_data,
            is_cache_valid,
            get_cache_dir,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
