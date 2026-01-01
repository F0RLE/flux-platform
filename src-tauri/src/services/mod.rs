pub mod system_monitor;
pub mod module_controller;
pub mod module_lifecycle;
pub mod license;
pub mod settings;
pub mod logs;
pub mod translations;
pub mod theme;

pub mod health {
    pub fn check() -> String { "Healthy".to_string() }
}

pub mod downloader {
    pub fn start(id: &str) {
        crate::services::logs::add_log(&format!("Download started: {}", id), "Downloader", "info");
    }
}
