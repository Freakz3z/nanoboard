use anyhow::{Context, Result};
use dirs::home_dir;
use serde_json::json;
use std::fs;
use std::path::PathBuf;

/// 获取workspace路径
fn get_workspace_path() -> Result<PathBuf> {
    let home = home_dir().context("无法找到用户主目录")?;
    let workspace_path = home.join(".nanobot").join("workspace");
    Ok(workspace_path)
}

/// 列出所有会话
#[tauri::command]
pub async fn list_sessions() -> Result<serde_json::Value, String> {
    let workspace_path = get_workspace_path().map_err(|e| e.to_string())?;

    if !workspace_path.exists() {
        return Ok(json!({
            "sessions": [],
            "message": "workspace目录不存在"
        }));
    }

    let memory_path = workspace_path.join("memory");
    if !memory_path.exists() {
        return Ok(json!({
            "sessions": [],
            "message": "memory目录不存在"
        }));
    }

    let mut sessions = Vec::new();

    // 读取memory目录中的所有会话文件
    if let Ok(entries) = fs::read_dir(&memory_path) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() {
                if let Some(file_name) = path.file_name().and_then(|n| n.to_str()) {
                    if file_name.ends_with(".md") || file_name.ends_with(".json") {
                        // 读取文件元数据
                        if let Ok(metadata) = fs::metadata(&path) {
                            if let Ok(modified) = metadata.modified() {
                                sessions.push(json!({
                                    "id": file_name,
                                    "name": file_name.trim_end_matches(".md").trim_end_matches(".json"),
                                    "path": path.to_string_lossy(),
                                    "modified": modified.duration_since(std::time::UNIX_EPOCH)
                                        .map(|d| d.as_secs()).unwrap_or(0),
                                    "size": metadata.len()
                                }));
                            }
                        }
                    }
                }
            }
        }
    }

    // 按修改时间排序
    sessions.sort_by(|a, b| {
        let a_time = a.get("modified").and_then(|v| v.as_u64()).unwrap_or(0);
        let b_time = b.get("modified").and_then(|v| v.as_u64()).unwrap_or(0);
        b_time.cmp(&a_time)
    });

    Ok(json!({
        "sessions": sessions,
        "total": sessions.len()
    }))
}

/// 获取会话记忆内容
#[tauri::command]
pub async fn get_session_memory(session_id: String) -> Result<serde_json::Value, String> {
    let workspace_path = get_workspace_path().map_err(|e| e.to_string())?;
    let memory_path = workspace_path.join("memory").join(&session_id);

    if !memory_path.exists() {
        return Ok(json!({
            "error": "not_found",
            "message": format!("会话 {} 不存在", session_id)
        }));
    }

    let content = fs::read_to_string(&memory_path)
        .map_err(|e| format!("读取会话内容失败: {}", e))?;

    Ok(json!({
        "id": session_id,
        "content": content,
        "size": content.len()
    }))
}

/// 获取workspace文件列表
#[tauri::command]
pub async fn get_workspace_files() -> Result<serde_json::Value, String> {
    let workspace_path = get_workspace_path().map_err(|e| e.to_string())?;

    if !workspace_path.exists() {
        return Ok(json!({
            "files": [],
            "message": "workspace目录不存在"
        }));
    }

    let mut files = Vec::new();

    // 读取workspace目录中的所有文件
    if let Ok(entries) = fs::read_dir(&workspace_path) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() {
                if let Some(file_name) = path.file_name().and_then(|n| n.to_str()) {
                    // 读取文件内容
                    let content = fs::read_to_string(&path).unwrap_or_default();

                    if let Ok(metadata) = fs::metadata(&path) {
                        if let Ok(modified) = metadata.modified() {
                            files.push(json!({
                                "name": file_name,
                                "path": path.to_string_lossy(),
                                "content": content,
                                "size": metadata.len(),
                                "modified": modified.duration_since(std::time::UNIX_EPOCH)
                                    .map(|d| d.as_secs()).unwrap_or(0)
                            }));
                        }
                    }
                }
            }
        }
    }

    // 排序文件
    files.sort_by(|a, b| {
        let a_name = a.get("name").and_then(|v| v.as_str()).unwrap_or("");
        let b_name = b.get("name").and_then(|v| v.as_str()).unwrap_or("");
        a_name.cmp(b_name)
    });

    Ok(json!({
        "files": files,
        "total": files.len()
    }))
}

/// 删除会话
#[tauri::command]
pub async fn delete_session(session_id: String) -> Result<serde_json::Value, String> {
    let workspace_path = get_workspace_path().map_err(|e| e.to_string())?;
    let memory_path = workspace_path.join("memory").join(&session_id);

    if !memory_path.exists() {
        return Ok(json!({
            "success": false,
            "message": format!("会话 {} 不存在", session_id)
        }));
    }

    fs::remove_file(&memory_path)
        .map_err(|e| format!("删除会话失败: {}", e))?;

    Ok(json!({
        "success": true,
        "message": format!("会话 {} 已删除", session_id)
    }))
}

/// 重命名会话
#[tauri::command]
pub async fn rename_session(session_id: String, new_name: String) -> Result<serde_json::Value, String> {
    let workspace_path = get_workspace_path().map_err(|e| e.to_string())?;
    let memory_path = workspace_path.join("memory");
    let old_path = memory_path.join(&session_id);

    if !old_path.exists() {
        return Ok(json!({
            "success": false,
            "message": format!("会话 {} 不存在", session_id)
        }));
    }

    // 获取文件扩展名
    let extension = old_path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("md");

    // 构建新文件名
    let new_filename = format!("{}.{}", new_name.trim(), extension);
    let new_path = memory_path.join(&new_filename);

    // 检查新文件名是否已存在
    if new_path.exists() {
        return Ok(json!({
            "success": false,
            "message": format!("会话名称 {} 已存在", new_name)
        }));
    }

    // 重命名文件
    fs::rename(&old_path, &new_path)
        .map_err(|e| format!("重命名会话失败: {}", e))?;

    Ok(json!({
        "success": true,
        "message": format!("会话已重命名为 {}", new_name),
        "old_id": session_id,
        "new_id": new_filename
    }))
}

/// 保存会话记忆内容
#[tauri::command]
pub async fn save_session_memory(session_id: String, content: String) -> Result<serde_json::Value, String> {
    let workspace_path = get_workspace_path().map_err(|e| e.to_string())?;
    let memory_path = workspace_path.join("memory");

    // 确保目录存在
    fs::create_dir_all(&memory_path)
        .map_err(|e| format!("创建memory目录失败: {}", e))?;

    let file_path = memory_path.join(&session_id);

    // 写入文件
    fs::write(&file_path, content)
        .map_err(|e| format!("保存会话内容失败: {}", e))?;

    Ok(json!({
        "success": true,
        "message": format!("会话 {} 已保存", session_id)
    }))
}

/// 保存工作区文件
#[tauri::command]
pub async fn save_workspace_file(file_name: String, content: String) -> Result<serde_json::Value, String> {
    let workspace_path = get_workspace_path().map_err(|e| e.to_string())?;

    // 确保目录存在
    fs::create_dir_all(&workspace_path)
        .map_err(|e| format!("创建workspace目录失败: {}", e))?;

    let file_path = workspace_path.join(&file_name);

    // 写入文件
    fs::write(&file_path, content)
        .map_err(|e| format!("保存工作区文件失败: {}", e))?;

    Ok(json!({
        "success": true,
        "message": format!("文件 {} 已保存", file_name)
    }))
}
