use std::path::PathBuf;
use std::fs;
use once_cell::sync::Lazy;

pub static APPDATA_ROOT: Lazy<PathBuf> = Lazy::new(|| {
    let mut path = dirs::config_dir().unwrap_or_else(|| PathBuf::from("."));
    path.push("FluxData");
    path
});

pub static USER_ROOT: Lazy<PathBuf> = Lazy::new(|| APPDATA_ROOT.join("User"));
pub static CONFIG_DIR: Lazy<PathBuf> = Lazy::new(|| USER_ROOT.join("Configs"));

pub static SYSTEM_ROOT: Lazy<PathBuf> = Lazy::new(|| APPDATA_ROOT.join("System"));
pub static LOG_DIR: Lazy<PathBuf> = Lazy::new(|| SYSTEM_ROOT.join("Logs"));
pub static TEMP_DIR: Lazy<PathBuf> = Lazy::new(|| SYSTEM_ROOT.join("Temp"));
pub static RUNTIME_DIR: Lazy<PathBuf> = Lazy::new(|| SYSTEM_ROOT.join("Runtime"));
pub static FONT_DIR: Lazy<PathBuf> = Lazy::new(|| SYSTEM_ROOT.join("Fonts"));

pub static FILE_ENV: Lazy<PathBuf> = Lazy::new(|| CONFIG_DIR.join(".env"));
pub static FILE_GEN_CONFIG: Lazy<PathBuf> = Lazy::new(|| CONFIG_DIR.join("generation_config.json"));

pub fn init_filesystem() -> Result<(), String> {
    let dirs = [
        &*CONFIG_DIR,
        &*SYSTEM_ROOT,
        &*RUNTIME_DIR,
        &*LOG_DIR,
        &*TEMP_DIR,
        &*FONT_DIR,
    ];

    for dir in dirs {
        fs::create_dir_all(dir).map_err(|e| format!("Failed to create {:?}: {}", dir, e))?;
    }

    Ok(())
}
