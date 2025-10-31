use super::types::*;
use std::process::Command;
use tokio::process::Command as TokioCommand;

/// Winget package manager wrapper
pub struct WingetManager {
    exe_path: String,
}

impl WingetManager {
    pub fn new() -> Self {
        Self {
            exe_path: "winget".to_string(),
        }
    }

    /// Check if Winget is installed
    pub fn is_installed(&self) -> bool {
        Command::new(&self.exe_path)
            .arg("--version")
            .output()
            .is_ok()
    }

    /// Install a package
    pub async fn install(&self, package_id: &str) -> Result<InstallResult, PackageError> {
        if !self.is_installed() {
            return Err(PackageError::NotFound(
                "Winget is not installed".to_string(),
            ));
        }

        let output = TokioCommand::new(&self.exe_path)
            .args(&["install", "--id", package_id, "--silent", "--accept-package-agreements", "--accept-source-agreements"])
            .output()
            .await
            .map_err(|e| PackageError::CommandFailed(e.to_string()))?;

        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        let success = output.status.success();

        // Parse version from output
        let version = Self::parse_version_from_output(&stdout);

        Ok(InstallResult {
            success,
            package_id: package_id.to_string(),
            version,
            output: stdout,
            error: if success { None } else { Some(stderr) },
        })
    }

    /// Uninstall a package
    pub async fn uninstall(&self, package_id: &str) -> Result<UninstallResult, PackageError> {
        if !self.is_installed() {
            return Err(PackageError::NotFound(
                "Winget is not installed".to_string(),
            ));
        }

        let output = TokioCommand::new(&self.exe_path)
            .args(&["uninstall", "--id", package_id, "--silent"])
            .output()
            .await
            .map_err(|e| PackageError::CommandFailed(e.to_string()))?;

        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        let success = output.status.success();

        Ok(UninstallResult {
            success,
            package_id: package_id.to_string(),
            output: stdout,
            error: if success { None } else { Some(stderr) },
        })
    }

    /// List installed packages
    pub async fn list_installed(&self) -> Result<Vec<InstalledPackage>, PackageError> {
        if !self.is_installed() {
            return Err(PackageError::NotFound(
                "Winget is not installed".to_string(),
            ));
        }

        let output = TokioCommand::new(&self.exe_path)
            .args(&["list"])
            .output()
            .await
            .map_err(|e| PackageError::CommandFailed(e.to_string()))?;

        if !output.status.success() {
            return Err(PackageError::CommandFailed(
                String::from_utf8_lossy(&output.stderr).to_string(),
            ));
        }

        let stdout = String::from_utf8_lossy(&output.stdout);
        let mut packages = Vec::new();

        // Skip header lines
        let lines: Vec<&str> = stdout.lines().skip(2).collect();

        for line in lines {
            if line.trim().is_empty() || line.starts_with('-') {
                continue;
            }

            // Parse winget list output format: Name   Id   Version   Source
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() >= 3 {
                // Find the ID (looks like Publisher.AppName)
                let id_index = parts.iter().position(|&p| p.contains('.'));
                if let Some(idx) = id_index {
                    let id = parts[idx].to_string();
                    let version = parts.get(idx + 1).unwrap_or(&"unknown").to_string();
                    let name = parts[..idx].join(" ");

                    packages.push(InstalledPackage {
                        id: id.clone(),
                        version,
                        source: PackageSource::Winget,
                        name: Some(if name.is_empty() { id } else { name }),
                    });
                }
            }
        }

        Ok(packages)
    }

    /// Upgrade a package
    pub async fn upgrade(&self, package_id: &str) -> Result<UpgradeResult, PackageError> {
        if !self.is_installed() {
            return Err(PackageError::NotFound(
                "Winget is not installed".to_string(),
            ));
        }

        // Get current version first
        let installed = self.list_installed().await?;
        let old_version = installed
            .iter()
            .find(|p| p.id == package_id)
            .map(|p| p.version.clone());

        let output = TokioCommand::new(&self.exe_path)
            .args(&["upgrade", "--id", package_id, "--silent", "--accept-package-agreements"])
            .output()
            .await
            .map_err(|e| PackageError::CommandFailed(e.to_string()))?;

        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        let success = output.status.success();

        // Parse new version from output
        let new_version = Self::parse_version_from_output(&stdout);

        Ok(UpgradeResult {
            success,
            package_id: package_id.to_string(),
            old_version,
            new_version,
            output: stdout,
            error: if success { None } else { Some(stderr) },
        })
    }

    /// Parse version number from command output
    fn parse_version_from_output(output: &str) -> Option<String> {
        // Look for version patterns in winget output
        for line in output.lines() {
            if line.contains("Successfully installed") || line.contains("upgraded") {
                let words: Vec<&str> = line.split_whitespace().collect();
                // Version is usually after "version" keyword or in format X.Y.Z
                for word in words {
                    if word.chars().any(|c| c == '.') && word.chars().any(|c| c.is_numeric()) {
                        return Some(word.to_string());
                    }
                }
            }
        }
        None
    }
}

impl Default for WingetManager {
    fn default() -> Self {
        Self::new()
    }
}
