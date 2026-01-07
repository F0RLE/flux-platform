use crate::services::downloader;

#[tauri::command]
pub fn start_download(id: String) {
    downloader::start(&id);
}
