use serde::{Deserialize, Serialize};
use std::fmt;

/// Package source (Chocolatey or Winget)
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum PackageSource {
    Chocolatey,
    Winget,
}

impl fmt::Display for PackageSource {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            PackageSource::Chocolatey => write!(f, "chocolatey"),
            PackageSource::Winget => write!(f, "winget"),
        }
    }
}

/// Result of a package installation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstallResult {
    pub success: bool,
    pub package_id: String,
    pub version: Option<String>,
    pub output: String,
    pub error: Option<String>,
}

/// Result of a package uninstallation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UninstallResult {
    pub success: bool,
    pub package_id: String,
    pub output: String,
    pub error: Option<String>,
}

/// Result of a package upgrade
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpgradeResult {
    pub success: bool,
    pub package_id: String,
    pub old_version: Option<String>,
    pub new_version: Option<String>,
    pub output: String,
    pub error: Option<String>,
}

/// Information about an installed package
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstalledPackage {
    pub id: String,
    pub version: String,
    pub source: PackageSource,
    pub name: Option<String>,
}

/// Package operation status for real-time updates
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OperationStatus {
    pub operation: String,
    pub package_id: String,
    pub progress: f32, // 0.0 to 1.0
    pub message: String,
    pub completed: bool,
}

/// Errors that can occur during package operations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PackageError {
    NotFound(String),
    CommandFailed(String),
    PermissionDenied(String),
    AlreadyInstalled(String),
    NotInstalled(String),
    Unknown(String),
}

impl fmt::Display for PackageError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            PackageError::NotFound(msg) => write!(f, "Package not found: {}", msg),
            PackageError::CommandFailed(msg) => write!(f, "Command failed: {}", msg),
            PackageError::PermissionDenied(msg) => write!(f, "Permission denied: {}", msg),
            PackageError::AlreadyInstalled(msg) => write!(f, "Already installed: {}", msg),
            PackageError::NotInstalled(msg) => write!(f, "Not installed: {}", msg),
            PackageError::Unknown(msg) => write!(f, "Unknown error: {}", msg),
        }
    }
}

impl std::error::Error for PackageError {}
