use anyhow::{Context, Result};
use dirs::home_dir;
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use std::fs;
use std::path::PathBuf;
use tauri::State;
use chrono::Utc;

use crate::AppState;

/// 获取nanobot配置文件路径
pub fn get_config_path_internal() -> Result<PathBuf> {
    let home = home_dir().context("无法找到用户主目录")?;
    let config_path = home.join(".nanobot").join("config.json");
    Ok(config_path)
}

/// 获取配置历史目录
pub fn get_config_history_dir() -> Result<PathBuf> {
    let home = home_dir().context("无法找到用户主目录")?;
    let history_dir = home.join(".nanobot").join("config_history");
    Ok(history_dir)
}

/// 配置历史版本信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigHistoryVersion {
    pub filename: String,
    pub timestamp: i64,
    pub size: u64,
}

/// 创建历史记录备份
fn create_history_backup() -> Result<()> {
    let config_path = get_config_path_internal()?;
    let history_dir = get_config_history_dir()?;

    // 确保历史目录存在
    fs::create_dir_all(&history_dir)
        .context("创建历史目录失败")?;

    // 如果配置文件不存在，跳过
    if !config_path.exists() {
        return Ok(());
    }

    // 读取当前配置
    let content = fs::read_to_string(&config_path)
        .context("读取配置文件失败")?;

    // 生成备份文件名（使用时间戳）
    let timestamp = Utc::now().timestamp();
    let backup_filename = format!("config_{}.json", timestamp);
    let backup_path = history_dir.join(&backup_filename);

    // 写入备份文件
    fs::write(&backup_path, content)
        .context("写入备份文件失败")?;

    // 清理旧备份（保留最近10个）
    cleanup_old_backups(10)?;

    Ok(())
}

/// 清理旧备份文件，保留指定数量
fn cleanup_old_backups(keep_count: usize) -> Result<()> {
    let history_dir = get_config_history_dir()?;

    if !history_dir.exists() {
        return Ok(());
    }

    // 获取所有备份文件并按时间排序
    let mut backups: Vec<PathBuf> = fs::read_dir(&history_dir)
        .context("读取历史目录失败")?
        .filter_map(|entry| entry.ok())
        .map(|entry| entry.path())
        .filter(|path| path.extension().and_then(|s| s.to_str()) == Some("json"))
        .collect();

    // 按修改时间排序（最新的在前）
    backups.sort_by(|a, b| {
        let a_time = a.metadata().and_then(|m| m.modified()).unwrap_or(std::time::SystemTime::UNIX_EPOCH);
        let b_time = b.metadata().and_then(|m| m.modified()).unwrap_or(std::time::SystemTime::UNIX_EPOCH);
        b_time.cmp(&a_time)
    });

    // 删除超出保留数量的备份
    for backup in backups.into_iter().skip(keep_count) {
        fs::remove_file(&backup)
            .context(format!("删除备份文件 {:?} 失败", backup))?;
    }

    Ok(())
}

/// 加载配置文件（内部函数，不需要 State）
pub fn load_config_internal() -> Result<JsonValue, String> {
    let config_path = get_config_path_internal().map_err(|e| e.to_string())?;

    if !config_path.exists() {
        return Ok(serde_json::json!({
            "error": "config_not_found",
            "message": "配置文件不存在，请先运行 nanobot onboard 初始化"
        }));
    }

    let content = fs::read_to_string(&config_path)
        .map_err(|e| format!("读取配置文件失败: {}", e))?;

    let config: JsonValue = serde_json::from_str(&content)
        .map_err(|e| format!("解析配置文件失败: {}", e))?;

    Ok(config)
}

/// 加载配置文件
#[tauri::command]
pub async fn load_config(state: State<'_, AppState>) -> Result<JsonValue, String> {
    let config = load_config_internal()?;

    // 保存配置路径到状态
    let config_path = get_config_path_internal().map_err(|e| e.to_string())?;
    *state.config_path.lock().unwrap() = Some(config_path.to_string_lossy().to_string());

    Ok(config)
}

/// 保存配置文件
#[tauri::command]
pub async fn save_config(config: JsonValue) -> Result<(), String> {
    let config_path = get_config_path_internal().map_err(|e| e.to_string())?;

    // 在保存前创建历史备份
    if config_path.exists() {
        if let Err(e) = create_history_backup() {
            eprintln!("创建配置备份失败: {}", e);
        }
    }

    // 确保目录存在
    if let Some(parent) = config_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("创建配置目录失败: {}", e))?;
    }

    // 格式化JSON并保存
    let content = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("序列化配置失败: {}", e))?;

    fs::write(&config_path, content)
        .map_err(|e| format!("写入配置文件失败: {}", e))?;

    Ok(())
}

/// 获取配置文件路径
#[tauri::command]
pub async fn get_config_path() -> Result<String, String> {
    let config_path = get_config_path_internal().map_err(|e| e.to_string())?;
    Ok(config_path.to_string_lossy().to_string())
}

/// 验证配置是否有效
#[tauri::command]
pub async fn validate_config(config: JsonValue) -> Result<JsonValue, String> {
    let mut errors = Vec::new();
    let mut warnings = Vec::new();

    // 检查providers配置
    if let Some(providers) = config.get("providers") {
        if let Some(obj) = providers.as_object() {
            if obj.is_empty() {
                warnings.push("未配置任何LLM提供商".to_string());
            }
        }
    } else {
        errors.push("缺少providers配置".to_string());
    }

    // 检查agents配置
    if let Some(agents) = config.get("agents") {
        if let Some(defaults) = agents.get("defaults") {
            if let Some(model) = defaults.get("model") {
                if model.as_str().map(|s| s.is_empty()).unwrap_or(true) {
                    errors.push("默认model不能为空".to_string());
                }
            }
        }
    }

    // 检查channels配置
    if let Some(channels) = config.get("channels") {
        if let Some(obj) = channels.as_object() {
            let enabled_count = obj.values()
                .filter(|v| v.get("enabled").and_then(|e| e.as_bool()).unwrap_or(false))
                .count();

            if enabled_count == 0 {
                warnings.push("没有启用任何消息渠道".to_string());
            }
        }
    }

    Ok(serde_json::json!({
        "valid": errors.is_empty(),
        "errors": errors,
        "warnings": warnings
    }))
}

/// 获取配置历史版本列表
#[tauri::command]
pub async fn get_config_history() -> Result<Vec<ConfigHistoryVersion>, String> {
    let history_dir = get_config_history_dir().map_err(|e| e.to_string())?;

    if !history_dir.exists() {
        return Ok(Vec::new());
    }

    let mut versions = Vec::new();

    let entries = fs::read_dir(&history_dir)
        .map_err(|e| format!("读取历史目录失败: {}", e))?;

    for entry in entries {
        let entry = entry.map_err(|e| format!("读取历史条目失败: {}", e))?;
        let path = entry.path();

        if path.extension().and_then(|s| s.to_str()) != Some("json") {
            continue;
        }

        let filename = path.file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("")
            .to_string();

        // 从文件名提取时间戳
        let timestamp = filename
            .strip_prefix("config_")
            .and_then(|s| s.strip_suffix(".json"))
            .and_then(|s| s.parse::<i64>().ok())
            .unwrap_or(0);

        let metadata = entry.metadata()
            .map_err(|e| format!("获取文件元数据失败: {}", e))?;

        versions.push(ConfigHistoryVersion {
            filename,
            timestamp,
            size: metadata.len(),
        });
    }

    // 按时间戳降序排序
    versions.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));

    Ok(versions)
}

/// 恢复到指定历史版本
#[tauri::command]
pub async fn restore_config_version(filename: String) -> Result<(), String> {
    let history_dir = get_config_history_dir().map_err(|e| e.to_string())?;
    let config_path = get_config_path_internal().map_err(|e| e.to_string())?;

    let backup_path = history_dir.join(&filename);

    if !backup_path.exists() {
        return Err(format!("备份文件 {} 不存在", filename));
    }

    // 读取备份文件
    let content = fs::read_to_string(&backup_path)
        .map_err(|e| format!("读取备份文件失败: {}", e))?;

    // 先备份当前配置
    if config_path.exists() {
        create_history_backup()
            .map_err(|e| format!("备份当前配置失败: {}", e))?;
    }

    // 写入配置文件
    fs::write(&config_path, content)
        .map_err(|e| format!("恢复配置文件失败: {}", e))?;

    Ok(())
}

/// 删除指定历史版本
#[tauri::command]
pub async fn delete_config_version(filename: String) -> Result<(), String> {
    let history_dir = get_config_history_dir().map_err(|e| e.to_string())?;
    let backup_path = history_dir.join(&filename);

    if !backup_path.exists() {
        return Err(format!("备份文件 {} 不存在", filename));
    }

    fs::remove_file(&backup_path)
        .map_err(|e| format!("删除备份文件失败: {}", e))?;

    Ok(())
}
