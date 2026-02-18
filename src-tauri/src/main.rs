// Prevents additional console window on Windows in release builds
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;

mod config;
mod process;
mod logger;
mod network;
mod session;
mod theme;
mod menu;
mod cron;

use std::sync::Mutex;
use std::sync::Arc;

struct AppState {
    config_path: Mutex<Option<String>>,
    nanobot_process: Mutex<Option<process::ProcessManager>>,
}

#[tokio::main]
async fn main() {
    env_logger::init();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState {
            config_path: Mutex::new(None),
            nanobot_process: Mutex::new(None),
        })
        .manage(Arc::new(tokio::sync::Mutex::new(logger::FileTracker::new())))
        .manage(Arc::new(logger::WatcherHandle::new()))
        .manage(std::sync::Mutex::new(network::NetworkMonitor::new()))
        .manage(theme::ThemeState::new())
        .setup(|app| {
            // 设置窗口图标
            if let Some(window) = app.get_webview_window("main") {
                let icon_bytes = include_bytes!("../icons/32x32.png");
                let icon = tauri::image::Image::new(icon_bytes, 32, 32);
                let _ = window.set_icon(icon);
            }

            // 构建并设置应用菜单
            let app_handle = app.handle();
            let menu = menu::build_menu(app_handle);
            app.set_menu(menu)?;

            // macOS 不显示托盘图标，只在 Windows/Linux 上显示
            #[cfg(not(target_os = "macos"))]
            menu::setup_tray(app_handle)?;

            // 监听菜单事件
            let app_handle = app.handle().clone();
            let app_handle_for_menu = app_handle.clone();
            app.on_menu_event(move |_app, event| {
                log::info!("Menu event: {:?}", event.id);
                menu::handle_menu_event(&app_handle_for_menu, event.id.0.as_ref());
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Config commands
            config::load_config,
            config::save_config,
            config::get_config_path,
            config::validate_config,
            config::get_config_history,
            config::restore_config_version,
            config::delete_config_version,
            // Process commands
            process::start_nanobot,
            process::stop_nanobot,
            process::get_status,
            process::get_dashboard_data,
            process::download_nanobot,
            process::download_nanobot_with_uv,
            process::onboard_nanobot,
            process::get_system_info,
            process::get_nanobot_version,
            process::get_nanobot_path,
            process::check_nanobot_config,
            process::diagnose_nanobot,
            // Logger commands
            logger::get_logs,
            logger::get_log_statistics,
            logger::start_log_stream,
            logger::stop_log_stream,
            logger::is_log_stream_running,
            // Network commands
            network::init_network_monitor,
            network::get_network_stats,
            // Session commands
            session::list_sessions,
            session::get_session_memory,
            session::get_workspace_files,
            session::delete_session,
            session::rename_session,
            session::save_session_memory,
            session::save_workspace_file,
            // Skill commands
            session::list_skills,
            session::get_skill_content,
            session::save_skill,
            session::delete_skill,
            session::toggle_skill,
            // File system commands
            session::get_directory_tree,
            session::get_file_content,
            session::create_folder,
            session::delete_folder,
            session::delete_file,
            session::rename_item,
            // Chat session commands
            session::list_chat_sessions,
            session::get_chat_session_content,
            // Theme commands
            theme::get_theme,
            theme::set_theme,
            theme::toggle_theme,
            // Cron commands
            cron::cron_list,
            cron::cron_add,
            cron::cron_update,
            cron::cron_remove,
            cron::cron_enable,
            cron::cron_run,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
