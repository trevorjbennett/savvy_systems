use super::types::*;
use std::process::Command;
use tokio::process::Command as TokioCommand;

/// Chocolatey package manager wrapper
pub struct ChocolateyManager {
    exe_path: String,
}

impl ChocolateyManager {
    pub fn new() -> Self {
        Self {
            exe_path: "choco".to_string(),
        }
    }

    /// Check if Chocolatey is installed
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
                "Chocolatey is not installed".to_string(),
            ));
        }

        let output = TokioCommand::new(&self.exe_path)
            .args(&["install", package_id, "-y", "--no-progress"])
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
                "Chocolatey is not installed".to_string(),
            ));
        }

        let output = TokioCommand::new(&self.exe_path)
            .args(&["uninstall", package_id, "-y"])
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
                "Chocolatey is not installed".to_string(),
            ));
        }

        let output = TokioCommand::new(&self.exe_path)
            .args(&["list", "--local-only", "--limit-output"])
            .output()
            .await
            .map_err(|e| PackageError::CommandFailed(e.to_string()))?;

        if !output.status.success() {
            return Err(PackageError::CommandFailed(
                String::from_utf8_lossy(&output.stderr).to_string(),
            ));
        }

        let stdout = String::from_utf8_lossy(&output.stdout);
        let packages = stdout
            .lines()
            .filter_map(|line| {
                let parts: Vec<&str> = line.split('|').collect();
                if parts.len() >= 2 {
                    Some(InstalledPackage {
                        id: parts[0].trim().to_string(),
                        version: parts[1].trim().to_string(),
                        source: PackageSource::Chocolatey,
                        name: Some(parts[0].trim().to_string()),
                    })
                } else {
                    None
                }
            })
            .collect();

        Ok(packages)
    }

    /// Upgrade a package
    pub async fn upgrade(&self, package_id: &str) -> Result<UpgradeResult, PackageError> {
        if !self.is_installed() {
            return Err(PackageError::NotFound(
                "Chocolatey is not installed".to_string(),
            ));
        }

        // Get current version first
        let installed = self.list_installed().await?;
        let old_version = installed
            .iter()
            .find(|p| p.id == package_id)
            .map(|p| p.version.clone());

        let output = TokioCommand::new(&self.exe_path)
            .args(&["upgrade", package_id, "-y", "--no-progress"])
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
        // Look for patterns like "v1.2.3" or "version 1.2.3"
        for line in output.lines() {
            if line.contains("successfully installed") || line.contains("upgraded") {
                // Try to extract version using regex-like pattern
                let words: Vec<&str> = line.split_whitespace().collect();
                for (i, word) in words.iter().enumerate() {
                    if word.contains("v") || (i > 0 && words[i - 1].contains("version")) {
                        return Some(word.trim_start_matches('v').to_string());
                    }
                }
            }
        }
        None
    }
}

impl Default for ChocolateyManager {
    fn default() -> Self {
        Self::new()
    }
}
