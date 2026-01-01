pub mod commands;
pub mod errors;
pub mod models;
pub mod services;
pub mod utils;

use commands::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize logging
    env_logger::init();
    log::info!("🚀 Starting Flux Platform");

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            health::get_health,
            settings::get_settings,
            settings::save_settings,
            settings::get_system_language,
            logs::get_logs,
            logs::clear_logs,
            logs::add_log,
            downloader::start_download,
            system::get_system_stats,
            system::get_gpu_info,
            modules::get_modules,
            modules::control_module,
            window::minimize_window,
            window::maximize_window,
            window::close_window,
            translations::get_translations,
            // License commands
            license::get_license_status,
            license::activate_license,
            license::deactivate_license,
            license::check_feature,
            theme::get_theme_colors,
        ])
        .setup(|app| {
            // Initialize directories
            crate::utils::paths::init_filesystem().ok();

            // Initialize process group (Windows Job Objects)
            crate::utils::process::init_process_group();

            // Start system monitoring with events
            services::system_monitor::start_monitoring(app.handle().clone(), 1000);

            log::info!("✅ Setup complete");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
