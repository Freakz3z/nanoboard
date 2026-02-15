// 主题管理模块
// 支持获取和设置应用主题（亮色/暗色模式）

use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::State;

/// 获取主题配置文件路径
fn get_theme_config_path() -> PathBuf {
    let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
    home.join(".nanobot").join("theme.json")
}

/// 从文件加载主题
fn load_theme_from_file() -> String {
    let path = get_theme_config_path();
    if path.exists() {
        if let Ok(content) = fs::read_to_string(&path) {
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
                if let Some(theme) = json.get("theme").and_then(|t| t.as_str()) {
                    if theme == "light" || theme == "dark" {
                        return theme.to_string();
                    }
                }
            }
        }
    }
    "light".to_string() // 默认亮色主题
}

/// 保存主题到文件
fn save_theme_to_file(theme: &str) -> Result<(), String> {
    let path = get_theme_config_path();

    // 确保目录存在
    if let Some(parent) = path.parent() {
        if let Err(e) = fs::create_dir_all(parent) {
            return Err(format!("创建主题目录失败: {}", e));
        }
    }

    let content = serde_json::json!({ "theme": theme });
    let content_str = serde_json::to_string_pretty(&content)
        .map_err(|e| format!("序列化主题失败: {}", e))?;

    fs::write(&path, content_str)
        .map_err(|e| format!("保存主题文件失败: {}", e))?;

    Ok(())
}

/// 应用主题状态
pub struct ThemeState {
    current_theme: Mutex<String>,
}

impl ThemeState {
    pub fn new() -> Self {
        Self {
            current_theme: Mutex::new(load_theme_from_file()),
        }
    }
}

/// 获取当前主题
#[tauri::command]
pub async fn get_theme(state: State<'_, ThemeState>) -> Result<String, String> {
    Ok(state.current_theme.lock().unwrap().clone())
}

/// 设置主题
#[tauri::command]
pub async fn set_theme(theme: String, state: State<'_, ThemeState>) -> Result<String, String> {
    // 验证主题值
    if theme != "light" && theme != "dark" {
        return Err("Invalid theme value. Must be 'light' or 'dark'".to_string());
    }

    // 保存到文件
    save_theme_to_file(&theme)?;

    // 保存到状态
    let mut current = state.current_theme.lock().unwrap();
    *current = theme.clone();

    Ok(theme)
}

/// 切换主题
#[tauri::command]
pub async fn toggle_theme(state: State<'_, ThemeState>) -> Result<String, String> {
    let mut current = state.current_theme.lock().unwrap();

    let new_theme = if current.as_str() == "dark" {
        "light".to_string()
    } else {
        "dark".to_string()
    };

    // 保存到文件
    save_theme_to_file(&new_theme)?;

    *current = new_theme.clone();
    Ok(new_theme)
}
