pub mod chocolatey;
pub mod winget;
pub mod types;

pub use types::*;
pub use chocolatey::ChocolateyManager;
pub use winget::WingetManager;

use std::sync::Arc;
use tokio::sync::Mutex;

/// Central package manager that coordinates between Chocolatey and Winget
pub struct PackageManager {
    chocolatey: Arc<Mutex<ChocolateyManager>>,
    winget: Arc<Mutex<WingetManager>>,
}

impl PackageManager {
    pub fn new() -> Self {
        Self {
            chocolatey: Arc::new(Mutex::new(ChocolateyManager::new())),
            winget: Arc::new(Mutex::new(WingetManager::new())),
        }
    }

    /// Install a package using the specified package manager
    pub async fn install(&self, package_id: &str, source: PackageSource) -> Result<InstallResult, PackageError> {
        match source {
            PackageSource::Chocolatey => {
                let manager = self.chocolatey.lock().await;
                manager.install(package_id).await
            }
            PackageSource::Winget => {
                let manager = self.winget.lock().await;
                manager.install(package_id).await
            }
        }
    }

    /// Uninstall a package
    pub async fn uninstall(&self, package_id: &str, source: PackageSource) -> Result<UninstallResult, PackageError> {
        match source {
            PackageSource::Chocolatey => {
                let manager = self.chocolatey.lock().await;
                manager.uninstall(package_id).await
            }
            PackageSource::Winget => {
                let manager = self.winget.lock().await;
                manager.uninstall(package_id).await
            }
        }
    }

    /// Get list of installed packages
    pub async fn list_installed(&self, source: PackageSource) -> Result<Vec<InstalledPackage>, PackageError> {
        match source {
            PackageSource::Chocolatey => {
                let manager = self.chocolatey.lock().await;
                manager.list_installed().await
            }
            PackageSource::Winget => {
                let manager = self.winget.lock().await;
                manager.list_installed().await
            }
        }
    }

    /// Upgrade a package to the latest version
    pub async fn upgrade(&self, package_id: &str, source: PackageSource) -> Result<UpgradeResult, PackageError> {
        match source {
            PackageSource::Chocolatey => {
                let manager = self.chocolatey.lock().await;
                manager.upgrade(package_id).await
            }
            PackageSource::Winget => {
                let manager = self.winget.lock().await;
                manager.upgrade(package_id).await
            }
        }
    }
}

impl Default for PackageManager {
    fn default() -> Self {
        Self::new()
    }
}
