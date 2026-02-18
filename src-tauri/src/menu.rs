use tauri::{AppHandle, Manager, Wry};
use tauri::menu::{Menu, MenuItem, Submenu, PredefinedMenuItem};
use tauri::tray::{MouseButton, TrayIconBuilder, TrayIconEvent};
use tauri::Emitter;

/// 构建应用菜单
pub fn build_menu(app: &AppHandle) -> Menu<Wry> {
    // 文件菜单
    let refresh_config = MenuItem::with_id(app, "refresh_config", "Refresh Config 刷新配置", true, None::<&str>).unwrap();
    let export_config = MenuItem::with_id(app, "export_config", "Export Config 导出配置", true, None::<&str>).unwrap();
    let preferences = MenuItem::new(app, "Preferences... 偏好设置...", true, None::<&str>).unwrap();
    let quit = PredefinedMenuItem::quit(app, Some("Quit 退出")).unwrap();
    let file_menu = Submenu::with_items(app, "File 文件", true, &[&refresh_config, &export_config, &preferences, &quit]).unwrap();

    // 编辑菜单
    let undo = PredefinedMenuItem::undo(app, Some("Undo 撤销")).unwrap();
    let redo = PredefinedMenuItem::redo(app, Some("Redo 重做")).unwrap();
    let separator_edit = PredefinedMenuItem::separator(app).unwrap();
    let cut = PredefinedMenuItem::cut(app, Some("Cut 剪切")).unwrap();
    let copy = PredefinedMenuItem::copy(app, Some("Copy 复制")).unwrap();
    let paste = PredefinedMenuItem::paste(app, Some("Paste 粘贴")).unwrap();
    let select_all = PredefinedMenuItem::select_all(app, Some("Select All 全选")).unwrap();
    let edit_menu = Submenu::with_items(app, "Edit 编辑", true, &[&undo, &redo, &separator_edit, &cut, &copy, &paste, &select_all]).unwrap();

    // 视图菜单
    let dashboard = MenuItem::with_id(app, "view_dashboard", "Dashboard 仪表盘", true, None::<&str>).unwrap();
    let config_editor = MenuItem::with_id(app, "view_config", "Config Editor 配置编辑", true, None::<&str>).unwrap();
    let logs = MenuItem::with_id(app, "view_logs", "Logs 日志", true, None::<&str>).unwrap();
    let sessions = MenuItem::with_id(app, "view_sessions", "Sessions 会话管理", true, None::<&str>).unwrap();
    let separator1 = PredefinedMenuItem::separator(app).unwrap();
    let toggle_theme = MenuItem::with_id(app, "toggle_theme", "Toggle Theme 切换主题", true, None::<&str>).unwrap();
    let view_menu = Submenu::with_items(
        app,
        "View 视图",
        true,
        &[&dashboard, &config_editor, &logs, &sessions, &separator1, &toggle_theme],
    )
    .unwrap();

    // 工具菜单
    let start_nanobot = MenuItem::with_id(app, "start_nanobot", "Start Nanobot 启动助手", true, None::<&str>).unwrap();
    let stop_nanobot = MenuItem::with_id(app, "stop_nanobot", "Stop Nanobot 停止助手", true, None::<&str>).unwrap();
    let separator2 = PredefinedMenuItem::separator(app).unwrap();
    let diagnostics = MenuItem::with_id(app, "run_diagnostics", "Run Diagnostics 运行诊断", true, None::<&str>).unwrap();
    let tools_menu = Submenu::with_items(
        app,
        "Tools 工具",
        true,
        &[&start_nanobot, &stop_nanobot, &separator2, &diagnostics],
    )
    .unwrap();

    // 帮助菜单
    let docs = MenuItem::with_id(app, "open_docs", "Documentation 文档", true, None::<&str>).unwrap();
    let issue = MenuItem::with_id(app, "report_issue", "Report Issue 报告问题", true, None::<&str>).unwrap();
    let separator3 = PredefinedMenuItem::separator(app).unwrap();
    let about = MenuItem::with_id(app, "about", "About Nanoboard 关于", true, None::<&str>).unwrap();
    let help_menu = Submenu::with_items(app, "Help 帮助", true, &[&docs, &issue, &separator3, &about]).unwrap();

    Menu::with_items(app, &[&file_menu, &edit_menu, &view_menu, &tools_menu, &help_menu]).unwrap()
}

/// 构建系统托盘菜单 (仅 Windows/Linux)
#[cfg(not(target_os = "macos"))]
pub fn build_tray_menu(app: &AppHandle) -> Menu<Wry> {
    let toggle_window = MenuItem::with_id(app, "toggle_window", "Show/Hide Window 显示/隐藏", true, None::<&str>).unwrap();
    let separator1 = PredefinedMenuItem::separator(app).unwrap();
    let start_nanobot = MenuItem::with_id(app, "tray_start_nanobot", "Start Nanobot 启动", true, None::<&str>).unwrap();
    let stop_nanobot = MenuItem::with_id(app, "tray_stop_nanobot", "Stop Nanobot 停止", true, None::<&str>).unwrap();
    let separator2 = PredefinedMenuItem::separator(app).unwrap();
    let toggle_theme = MenuItem::with_id(app, "tray_toggle_theme", "Toggle Theme 切换", true, None::<&str>).unwrap();
    let separator3 = PredefinedMenuItem::separator(app).unwrap();
    let quit = MenuItem::with_id(app, "quit", "Quit 退出", true, None::<&str>).unwrap();

    Menu::with_items(
        app,
        &[&toggle_window, &separator1, &start_nanobot, &stop_nanobot, &separator2, &toggle_theme, &separator3, &quit],
    )
    .unwrap()
}

/// 设置系统托盘 (仅 Windows/Linux)
#[cfg(not(target_os = "macos"))]
pub fn setup_tray(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let tray_menu = build_tray_menu(app);

    // 使用专用的托盘图标 (22x22 适合 macOS 托盘)
    let icon_bytes = include_bytes!("../icons/tray_icon.png");
    let icon = tauri::image::Image::new(icon_bytes, 22, 22);

    log::info!("Creating tray icon...");

    let tray_result = TrayIconBuilder::new()
        .menu(&tray_menu)
        .tooltip("Nanoboard")
        .icon(icon)
        .build(app);

    match tray_result {
        Ok(_) => log::info!("Tray icon created successfully"),
        Err(e) => log::error!("Failed to create tray icon: {:?}", e),
    }

    // 监听托盘事件
    let app_handle = app.clone();
    app.on_tray_icon_event(move |_tray_id, event| {
        match event {
            TrayIconEvent::Click {
                id: _,
                rect: _,
                position: _,
                button,
                button_state: _,
            } => {
                if button == MouseButton::Left {
                    // 左键点击切换窗口显示/隐藏
                    if let Some(window) = app_handle.get_webview_window("main") {
                        if window.is_visible().unwrap_or(false) {
                            let _ = window.hide();
                        } else {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                }
            }
            TrayIconEvent::DoubleClick {
                id: _,
                rect: _,
                position: _,
                button: _,
            } => {
                // 双击显示窗口
                if let Some(window) = app_handle.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            _ => {}
        }
    });

    Ok(())
}

/// 处理菜单事件
pub fn handle_menu_event(app: &AppHandle, item_id: &str) {
    match item_id {
        // 文件菜单
        "refresh_config" => {
            log::info!("Menu: Refresh Config");
            let _ = app.emit("menu-refresh-config", ());
        }
        "export_config" => {
            log::info!("Menu: Export Config");
            let _ = app.emit("menu-export-config", ());
        }
        "quit" => {
            log::info!("Menu: Quit");
            app.exit(0);
        }

        // 视图菜单
        "view_dashboard" => {
            log::info!("Menu: View Dashboard");
            let _ = app.emit("menu-navigate", "/dashboard");
        }
        "view_config" => {
            log::info!("Menu: View Config Editor");
            let _ = app.emit("menu-navigate", "/config");
        }
        "view_logs" => {
            log::info!("Menu: View Logs");
            let _ = app.emit("menu-navigate", "/logs");
        }
        "view_sessions" => {
            log::info!("Menu: View Sessions");
            let _ = app.emit("menu-navigate", "/sessions");
        }
        "toggle_theme" => {
            log::info!("Menu: Toggle Theme");
            let _ = app.emit("menu-toggle-theme", ());
        }

        // 工具菜单
        "start_nanobot" | "tray_start_nanobot" => {
            log::info!("Menu: Start Nanobot");
            let _ = app.emit("menu-start-nanobot", ());
        }
        "stop_nanobot" | "tray_stop_nanobot" => {
            log::info!("Menu: Stop Nanobot");
            let _ = app.emit("menu-stop-nanobot", ());
        }
        "run_diagnostics" => {
            log::info!("Menu: Run Diagnostics");
            let _ = app.emit("menu-diagnostics", ());
        }

        // 帮助菜单
        "open_docs" => {
            log::info!("Menu: Open Documentation");
            let _ = open::that("https://github.com/Freakz3z/nanoboard");
        }
        "report_issue" => {
            log::info!("Menu: Report Issue");
            let _ = open::that("https://github.com/Freakz3z/nanoboard/issues");
        }
        "about" => {
            log::info!("Menu: About");
            let _ = app.emit("menu-about", ());
        }

        // 托盘菜单
        "toggle_window" => {
            log::info!("Menu: Toggle Window");
            if let Some(window) = app.get_webview_window("main") {
                if window.is_visible().unwrap_or(false) {
                    let _ = window.hide();
                } else {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        }
        "tray_toggle_theme" => {
            log::info!("Menu: Toggle Theme (Tray)");
            let _ = app.emit("menu-toggle-theme", ());
        }

        _ => {
            log::warn!("Unknown menu item: {}", item_id);
        }
    }
}
