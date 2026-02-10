// Prevents additional console window on Windows in release builds
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod config;
mod process;
mod logger;
mod session;

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
        .manage(AppState {
            config_path: Mutex::new(None),
            nanobot_process: Mutex::new(None),
        })
        .manage(Arc::new(tokio::sync::Mutex::new(logger::FileTracker::new())))
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
            process::download_nanobot,
            process::onboard_nanobot,
            process::get_system_info,
            process::get_nanobot_version,
            process::check_nanobot_config,
            // Logger commands
            logger::get_logs,
            logger::start_log_stream,
            logger::stop_log_stream,
            // Session commands
            session::list_sessions,
            session::get_session_memory,
            session::get_workspace_files,
            session::delete_session,
            session::rename_session,
            session::save_session_memory,
            session::save_workspace_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
