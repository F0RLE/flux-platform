pub mod commands;
pub mod errors;
pub mod models;
pub mod services;
pub mod utils;

#[cfg(test)]
mod tests;

use commands::*;
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Manager,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize logging
    crate::services::logs::init_global_logger().ok();

    // Set WebView2 user data folder to Temp to avoid creating it in AppData/Local
    // This makes it easier to swap/remove Tauri without leaving residue in standard user folders
    if let Ok(temp_dir) = std::env::temp_dir().canonicalize() {
        let webview_data_dir = temp_dir.join("com.flux.platform");
        std::env::set_var("WEBVIEW2_USER_DATA_FOLDER", webview_data_dir);
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            health::get_health,
            settings::get_settings,
            settings::save_settings,
            settings::save_setting,
            settings::get_system_language,
            logs::get_logs,
            logs::clear_logs,
            logs::add_log,
            downloader::start_download,
            system::get_system_stats,
            system::get_gpu_info,
            system::set_monitoring_paused,
            modules::get_modules,
            modules::control_module,
            window::minimize_window,
            window::maximize_window,
            window::close_window,
            window::show_window,
            window::hide_window,
            translations::get_translations,
            // License commands
            license::get_license_status,
            license::activate_license,
            license::deactivate_license,
            license::check_feature,
            theme::get_theme_colors,
            // Window settings commands
            window_settings::get_window_settings,
            window_settings::save_window_size,
            window_settings::save_window_position,
            window_settings::save_maximized_state,
            window_settings::save_zoom_level,
            window_settings::set_webview_zoom,
            window_settings::get_webview_zoom,
            // UI State commands
            ui_state::get_ui_state,
            ui_state::save_ui_state,
        ])
        .setup(|app| {
            // Initialize directories
            crate::utils::paths::init_filesystem().ok();

            // Initialize process group (Windows Job Objects)
            crate::utils::process::init_process_group();

            // Start system monitoring with events
            // Polling reduced to 2000ms (2s) to save CPU
            services::system_monitor::start_monitoring(app.handle().clone(), 2000);

            // Register Global Shortcut
            #[cfg(desktop)]
            {
                use tauri_plugin_global_shortcut::{Code, Modifiers, ShortcutState};

                app.handle().plugin(
                    tauri_plugin_global_shortcut::Builder::new()
                        .with_shortcut("Ctrl+Space")?
                        .with_handler(|app, shortcut, event| {
                            if event.state == ShortcutState::Pressed
                                && shortcut.matches(Modifiers::CONTROL, Code::Space)
                            {
                                if let Some(window) = app.get_webview_window("main") {
                                    let is_visible = window.is_visible().unwrap_or(false);
                                    let is_focused = window.is_focused().unwrap_or(false);

                                    if is_visible && is_focused {
                                        let _ = window.minimize();
                                    } else {
                                        let _ = window.unminimize();
                                        let _ = window.show();
                                        let _ = window.set_focus();
                                    }
                                }
                            }
                        })
                        .build(),
                )?;
            }

            // Setup System Tray
            setup_system_tray(app)?;

            log::info!("✅ Setup complete");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

/// Setup system tray icon with menu
fn setup_system_tray(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    // Create menu items
    let show_item = MenuItem::with_id(app, "show", "Открыть", true, None::<&str>)?;
    let quit_item = MenuItem::with_id(app, "quit", "Выход", true, None::<&str>)?;

    // Create menu
    let menu = Menu::with_items(app, &[&show_item, &quit_item])?;

    // Build tray icon
    let _tray = TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .tooltip("Flux Platform")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| {
            match event.id.as_ref() {
                "show" => {
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.unminimize();
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
                "quit" => {
                    // Graceful shutdown
                    services::system_monitor::stop_monitoring();
                    app.exit(0);
                }
                _ => {}
            }
        })
        .on_tray_icon_event(|tray, event| {
            if let tauri::tray::TrayIconEvent::DoubleClick { .. } = event {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.unminimize();
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        })
        .build(app)?;

    Ok(())
}
