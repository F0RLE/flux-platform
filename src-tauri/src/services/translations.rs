use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};
use crate::errors::AppError;

pub fn get_locales_dir(app: &AppHandle) -> PathBuf {
    app.path().resource_dir().unwrap_or_default()
        .join("resources")
        .join("locales")
}

pub fn get_translations(app: &AppHandle, lang: &str) -> Result<serde_json::Value, AppError> {
    let locales_dir = get_locales_dir(app);
    let locale_file = locales_dir.join(format!("{}.json", lang));

    if !locale_file.exists() {
        return Ok(serde_json::json!({}));
    }

    let content = fs::read_to_string(&locale_file).map_err(|e| AppError::Io(e))?;
    serde_json::from_str(&content).map_err(|e| AppError::Serialization(e))
}
