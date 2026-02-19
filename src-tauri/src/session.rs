use anyhow::{Context, Result};
use dirs::home_dir;
use serde_json::json;
use std::fs;
use std::path::{Path, PathBuf};

/// 获取workspace路径
fn get_workspace_path() -> Result<PathBuf> {
    let home = home_dir().context("无法找到用户主目录")?;
    let workspace_path = home.join(".nanobot").join("workspace");
    Ok(workspace_path)
}

/// 安全地验证路径是否在 workspace 内，返回规范化的路径
/// 此函数减少了 TOCTOU 漏洞风险，因为验证后的路径直接用于后续操作
fn validate_and_canonicalize_path(relative_path: &str, workspace_path: &Path) -> Result<PathBuf, String> {
    // 清理路径，移除开头的 /
    let clean_path = relative_path.trim_start_matches('/');
    let target_path = workspace_path.join(clean_path);

    // 获取规范化路径
    let canonical_workspace = fs::canonicalize(workspace_path)
        .map_err(|e| format!("获取workspace路径失败: {}", e))?;

    // 如果目标路径不存在，检查父目录
    let canonical_target = if target_path.exists() {
        fs::canonicalize(&target_path)
            .map_err(|e| format!("获取目标路径失败: {}", e))?
    } else {
        // 对于不存在的路径，规范化父目录并附加文件名
        let parent = target_path.parent()
            .ok_or_else(|| "无法获取父目录".to_string())?;

        if parent.exists() {
            let canonical_parent = fs::canonicalize(parent)
                .map_err(|e| format!("获取父目录路径失败: {}", e))?;

            if !canonical_parent.starts_with(&canonical_workspace) {
                return Err("访问被拒绝：路径超出workspace范围".to_string());
            }

            // 返回完整的规范化路径（父目录 + 文件名）
            if let Some(file_name) = target_path.file_name() {
                return Ok(canonical_parent.join(file_name));
            }
            return Err("无效的文件名".to_string());
        } else {
            return Err("父目录不存在".to_string());
        }
    };

    // 验证路径在 workspace 内
    if !canonical_target.starts_with(&canonical_workspace) {
        return Err("访问被拒绝：路径超出workspace范围".to_string());
    }

    Ok(canonical_target)
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

/// 获取skills路径
fn get_skills_path() -> Result<PathBuf> {
    let workspace_path = get_workspace_path()?;
    let skills_path = workspace_path.join("skills");
    Ok(skills_path)
}

/// 列出所有Skill（包括目录型技能和文件型技能）
#[tauri::command]
pub async fn list_skills() -> Result<serde_json::Value, String> {
    let skills_path = get_skills_path().map_err(|e| e.to_string())?;

    if !skills_path.exists() {
        return Ok(json!({
            "skills": [],
            "message": "skills目录不存在"
        }));
    }

    let mut skills = Vec::new();

    // 读取skills目录中的所有条目
    if let Ok(entries) = fs::read_dir(&skills_path) {
        for entry in entries.flatten() {
            let path = entry.path();

            // 情况1: 目录型技能（包含 SKILL.md 文件）
            if path.is_dir() {
                if let Some(dir_name) = path.file_name().and_then(|n| n.to_str()) {
                    // 跳过隐藏目录
                    if dir_name.starts_with(".") {
                        continue;
                    }

                    // 检查是否有 SKILL.md 或 SKILL.md.disabled 文件
                    let skill_file_enabled = path.join("SKILL.md");
                    let skill_file_disabled = path.join("SKILL.md.disabled");

                    let (skill_file, enabled, skill_filename) = if skill_file_enabled.exists() {
                        (skill_file_enabled, true, "SKILL.md")
                    } else if skill_file_disabled.exists() {
                        (skill_file_disabled, false, "SKILL.md.disabled")
                    } else {
                        // 目录中没有 SKILL.md 文件，跳过
                        continue;
                    };

                    // 读取文件元数据
                    if let Ok(metadata) = fs::metadata(&skill_file) {
                        if let Ok(modified) = metadata.modified() {
                            // 读取文件内容的第一行作为标题
                            let title = if let Ok(content) = fs::read_to_string(&skill_file) {
                                content
                                    .lines()
                                    .find(|line| !line.is_empty() && line.starts_with("#"))
                                    .unwrap_or("")
                                    .trim_start_matches("#")
                                    .trim()
                                    .to_string()
                            } else {
                                dir_name.to_string()
                            };

                            skills.push(json!({
                                "id": format!("{}/{}", dir_name, skill_filename),
                                "name": dir_name,
                                "title": title,
                                "enabled": enabled,
                                "type": "directory",
                                "path": skill_file.to_string_lossy(),
                                "modified": modified.duration_since(std::time::UNIX_EPOCH)
                                    .unwrap_or_default()
                                    .as_secs()
                            }));
                        }
                    }
                }
            }
            // 情况2: 文件型技能（顶级 .md 文件）
            else if path.is_file() {
                if let Some(file_name) = path.file_name().and_then(|n| n.to_str()) {
                    // 判断是否为 Skill 文件（启用或禁用状态）
                    let (skill_name, enabled) = if file_name.ends_with(".md.disabled") {
                        (file_name.trim_end_matches(".md.disabled"), false)
                    } else if file_name.ends_with(".md") {
                        (file_name.trim_end_matches(".md"), true)
                    } else {
                        continue;
                    };

                    // 读取文件元数据
                    if let Ok(metadata) = fs::metadata(&path) {
                        if let Ok(modified) = metadata.modified() {
                            // 读取文件内容的第一行作为标题
                            let title = if let Ok(content) = fs::read_to_string(&path) {
                                content
                                    .lines()
                                    .find(|line| !line.is_empty() && line.starts_with("#"))
                                    .unwrap_or("")
                                    .trim_start_matches("#")
                                    .trim()
                                    .to_string()
                            } else {
                                skill_name.to_string()
                            };

                            skills.push(json!({
                                "id": file_name,
                                "name": skill_name,
                                "title": title,
                                "enabled": enabled,
                                "type": "file",
                                "path": path.to_string_lossy(),
                                "modified": modified.duration_since(std::time::UNIX_EPOCH)
                                    .unwrap_or_default()
                                    .as_secs()
                            }));
                        }
                    }
                }
            }
        }
    }

    // 按修改时间倒序排列
    skills.sort_by(|a, b| {
        let a_time = a["modified"].as_u64().unwrap_or(0);
        let b_time = b["modified"].as_u64().unwrap_or(0);
        b_time.cmp(&a_time)
    });

    Ok(json!({
        "skills": skills
    }))
}

/// 获取Skill内容
#[tauri::command]
pub async fn get_skill_content(skill_id: String) -> Result<serde_json::Value, String> {
    let skills_path = get_skills_path().map_err(|e| e.to_string())?;
    let skill_path = skills_path.join(&skill_id);

    if !skill_path.exists() {
        return Ok(json!({
            "success": false,
            "message": format!("Skill {} 不存在", skill_id)
        }));
    }

    let content = fs::read_to_string(&skill_path)
        .map_err(|e| format!("读取Skill失败: {}", e))?;

    // 提取名称（去除 .md 或 .md.disabled 后缀）
    let name = if skill_id.ends_with(".md.disabled") {
        skill_id.trim_end_matches(".md.disabled")
    } else {
        skill_id.trim_end_matches(".md")
    };

    Ok(json!({
        "success": true,
        "content": content,
        "name": name,
        "id": skill_id
    }))
}

/// 删除Skill
#[tauri::command]
pub async fn delete_skill(skill_id: String) -> Result<serde_json::Value, String> {
    let skills_path = get_skills_path().map_err(|e| e.to_string())?;
    let skill_path = skills_path.join(&skill_id);

    if !skill_path.exists() {
        return Ok(json!({
            "success": false,
            "message": format!("Skill {} 不存在", skill_id)
        }));
    }

    fs::remove_file(&skill_path)
        .map_err(|e| format!("删除Skill失败: {}", e))?;

    Ok(json!({
        "success": true,
        "message": format!("Skill {} 已删除", skill_id)
    }))
}

/// 启用/禁用 Skill（通过重命名文件后缀）
#[tauri::command]
pub async fn toggle_skill(skill_id: String, enabled: bool) -> Result<serde_json::Value, String> {
    let skills_path = get_skills_path().map_err(|e| e.to_string())?;

    // 根据当前状态确定源文件和目标文件
    let (source_path, target_path, new_id) = if skill_id.ends_with(".md.disabled") {
        // 当前是禁用状态，要启用
        let source = skills_path.join(&skill_id);
        let name = skill_id.trim_end_matches(".md.disabled");
        let target = skills_path.join(format!("{}.md", name));
        (source, target, format!("{}.md", name))
    } else if skill_id.ends_with(".md") {
        // 当前是启用状态，要禁用
        let source = skills_path.join(&skill_id);
        let name = skill_id.trim_end_matches(".md");
        let target = skills_path.join(format!("{}.md.disabled", name));
        (source, target, format!("{}.md.disabled", name))
    } else {
        return Ok(json!({
            "success": false,
            "message": format!("无效的 Skill 文件名: {}", skill_id)
        }));
    };

    if !source_path.exists() {
        return Ok(json!({
            "success": false,
            "message": format!("Skill {} 不存在", skill_id)
        }));
    }

    // 如果目标文件已存在，返回错误
    if target_path.exists() {
        return Ok(json!({
            "success": false,
            "message": format!("目标文件已存在")
        }));
    }

    fs::rename(&source_path, &target_path)
        .map_err(|e| format!("重命名 Skill 失败: {}", e))?;

    Ok(json!({
        "success": true,
        "enabled": enabled,
        "new_id": new_id,
        "message": if enabled { "Skill 已启用" } else { "Skill 已禁用" }
    }))
}

/// 创建/保存 Skill
#[tauri::command]
pub async fn save_skill(skill_id: String, content: String) -> Result<serde_json::Value, String> {
    let skills_path = get_skills_path().map_err(|e| e.to_string())?;

    // 确保 skills 目录存在
    if !skills_path.exists() {
        fs::create_dir_all(&skills_path)
            .map_err(|e| format!("创建 skills 目录失败: {}", e))?;
    }

    // 确保 skill_id 以 .md 结尾
    let skill_file = if skill_id.ends_with(".md") {
        skill_id
    } else {
        format!("{}.md", skill_id)
    };

    let skill_path = skills_path.join(&skill_file);

    fs::write(&skill_path, &content)
        .map_err(|e| format!("保存 Skill 失败: {}", e))?;

    Ok(json!({
        "success": true,
        "id": skill_file,
        "message": format!("Skill {} 已保存", skill_file)
    }))
}

/// 获取目录树
#[tauri::command]
pub async fn get_directory_tree(relative_path: Option<String>) -> Result<serde_json::Value, String> {
    let workspace_path = get_workspace_path().map_err(|e| e.to_string())?;

    if !workspace_path.exists() {
        fs::create_dir_all(&workspace_path)
            .map_err(|e| format!("创建workspace目录失败: {}", e))?;
    }

    // 解析相对路径并验证安全性
    let target_path = if let Some(ref rel_path) = relative_path {
        if rel_path.is_empty() || rel_path == "/" {
            workspace_path.clone()
        } else {
            // 使用安全验证函数
            match validate_and_canonicalize_path(rel_path, &workspace_path) {
                Ok(path) => path,
                Err(e) => {
                    return Ok(json!({
                        "success": false,
                        "message": e
                    }));
                }
            }
        }
    } else {
        workspace_path.clone()
    };

    // 检查路径是否存在
    if !target_path.exists() {
        return Ok(json!({
            "success": false,
            "message": format!("路径 {} 不存在", relative_path.unwrap_or_default())
        }));
    }

    // 如果是目录，读取其内容
    let mut items = Vec::new();

    if target_path.is_dir() {
        if let Ok(entries) = fs::read_dir(&target_path) {
            for entry in entries.flatten() {
                let path = entry.path();
                let file_name = path.file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or("")
                    .to_string();

                // 跳过隐藏文件
                if file_name.starts_with('.') {
                    continue;
                }

                // 在根目录级别隐藏已有专门管理页面的文件夹
                if relative_path.as_ref().is_none_or(|p| p == "/" || p.is_empty()) {
                    if file_name == "memory" || file_name == "skills" {
                        continue;
                    }
                }

                let item_type = if path.is_dir() { "directory" } else { "file" };
                let metadata = fs::metadata(&path)
                    .map_err(|e| format!("读取元数据失败: {}", e))?;

                let modified = metadata.modified()
                    .map(|t| t.duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_secs())
                    .unwrap_or(0);

                // 计算相对路径
                let relative = if let Some(rel) = &relative_path {
                    if rel.is_empty() || rel == "/" {
                        file_name.clone()
                    } else {
                        format!("{}/{}", rel.trim_end_matches('/'), &file_name)
                    }
                } else {
                    file_name.clone()
                };

                items.push(json!({
                    "name": file_name,
                    "path": path.to_string_lossy(),
                    "relative_path": relative,
                    "type": item_type,
                    "size": metadata.len(),
                    "modified": modified,
                }));
            }
        }

        // 排序：目录优先，然后按名称排序
        items.sort_by(|a, b| {
            let a_type = a.get("type").and_then(|v| v.as_str()).unwrap_or("");
            let b_type = b.get("type").and_then(|v| v.as_str()).unwrap_or("");
            let a_name = a.get("name").and_then(|v| v.as_str()).unwrap_or("");
            let b_name = b.get("name").and_then(|v| v.as_str()).unwrap_or("");

            match (a_type, b_type) {
                ("directory", "directory") | ("file", "file") => a_name.cmp(b_name),
                ("directory", "file") => std::cmp::Ordering::Less,
                ("file", "directory") => std::cmp::Ordering::Greater,
                _ => a_name.cmp(b_name),
            }
        });
    }

    Ok(json!({
        "success": true,
        "path": relative_path.clone().unwrap_or("/".to_string()),
        "items": items,
        "parent": if relative_path.as_ref().is_none_or(|p| p == "/" || p.is_empty()) {
            None
        } else {
            relative_path
        }
    }))
}

/// 获取文件内容
#[tauri::command]
pub async fn get_file_content(relative_path: String) -> Result<serde_json::Value, String> {
    let workspace_path = get_workspace_path().map_err(|e| e.to_string())?;

    // 使用安全验证函数
    let file_path = match validate_and_canonicalize_path(&relative_path, &workspace_path) {
        Ok(path) => path,
        Err(e) => {
            return Ok(json!({
                "success": false,
                "message": e
            }));
        }
    };

    if !file_path.exists() {
        return Ok(json!({
            "success": false,
            "message": format!("文件 {} 不存在", relative_path)
        }));
    }

    if !file_path.is_file() {
        return Ok(json!({
            "success": false,
            "message": format!("{} 不是文件", relative_path)
        }));
    }

    let content = fs::read_to_string(&file_path)
        .map_err(|e| format!("读取文件失败: {}", e))?;

    let metadata = fs::metadata(&file_path)
        .map_err(|e| format!("读取文件元数据失败: {}", e))?;

    let file_name = file_path.file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("")
        .to_string();

    Ok(json!({
        "success": true,
        "content": content,
        "path": relative_path,
        "name": file_name,
        "size": metadata.len(),
    }))
}

/// 创建文件夹
#[tauri::command]
pub async fn create_folder(relative_path: String, folder_name: String) -> Result<serde_json::Value, String> {
    let workspace_path = get_workspace_path().map_err(|e| e.to_string())?;

    // 解析父目录路径
    let parent_path = if relative_path.is_empty() || relative_path == "/" {
        workspace_path.clone()
    } else {
        // 使用安全验证函数
        match validate_and_canonicalize_path(&relative_path, &workspace_path) {
            Ok(path) => path,
            Err(e) => {
                return Ok(json!({
                    "success": false,
                    "message": e
                }));
            }
        }
    };

    let new_folder_path = parent_path.join(&folder_name);

    if new_folder_path.exists() {
        return Ok(json!({
            "success": false,
            "message": format!("文件夹 {} 已存在", folder_name)
        }));
    }

    fs::create_dir_all(&new_folder_path)
        .map_err(|e| format!("创建文件夹失败: {}", e))?;

    Ok(json!({
        "success": true,
        "message": format!("文件夹 {} 已创建", folder_name),
        "path": if relative_path.is_empty() || relative_path == "/" {
            folder_name
        } else {
            format!("{}/{}", relative_path.trim_end_matches('/'), folder_name)
        }
    }))
}

/// 删除文件夹
#[tauri::command]
pub async fn delete_folder(relative_path: String) -> Result<serde_json::Value, String> {
    let workspace_path = get_workspace_path().map_err(|e| e.to_string())?;

    // 使用安全验证函数
    let folder_path = match validate_and_canonicalize_path(&relative_path, &workspace_path) {
        Ok(path) => path,
        Err(e) => {
            return Ok(json!({
                "success": false,
                "message": e
            }));
        }
    };

    // 获取文件夹名称
    let folder_name = folder_path.file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("");

    // 检查是否为受保护的文件夹
    let protected_folders = ["memory", "skills"];
    if protected_folders.contains(&folder_name) {
        return Ok(json!({
            "success": false,
            "message": format!("'{}' 是系统文件夹，不能删除", folder_name)
        }));
    }

    if !folder_path.exists() {
        return Ok(json!({
            "success": false,
            "message": format!("文件夹 {} 不存在", relative_path)
        }));
    }

    if !folder_path.is_dir() {
        return Ok(json!({
            "success": false,
            "message": format!("{} 不是文件夹", relative_path)
        }));
    }

    // 递归删除
    fs::remove_dir_all(&folder_path)
        .map_err(|e| format!("删除文件夹失败: {}", e))?;

    Ok(json!({
        "success": true,
        "message": format!("文件夹 {} 已删除", relative_path)
    }))
}

/// 重命名文件夹或文件
#[tauri::command]
pub async fn rename_item(relative_path: String, new_name: String) -> Result<serde_json::Value, String> {
    let workspace_path = get_workspace_path().map_err(|e| e.to_string())?;

    // 使用安全验证函数
    let item_path = match validate_and_canonicalize_path(&relative_path, &workspace_path) {
        Ok(path) => path,
        Err(e) => {
            return Ok(json!({
                "success": false,
                "message": e
            }));
        }
    };

    // 获取项目名称
    let item_name = item_path.file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("");

    // 检查是否为受保护的文件或文件夹
    let protected_folders = ["memory", "skills"];
    let protected_files = ["AGENTS.md", "SOUL.md", "USER.md"];

    if protected_folders.contains(&item_name) || protected_files.contains(&item_name) {
        return Ok(json!({
            "success": false,
            "message": format!("'{}' 是系统文件，不能重命名", item_name)
        }));
    }

    if !item_path.exists() {
        return Ok(json!({
            "success": false,
            "message": format!("{} 不存在", relative_path)
        }));
    }

    // 获取父目录
    let parent = item_path.parent()
        .ok_or_else(|| "无法获取父目录".to_string())?;

    let new_path = parent.join(&new_name);

    // 检查新名称是否已存在
    if new_path.exists() {
        return Ok(json!({
            "success": false,
            "message": format!("{} 已存在", new_name)
        }));
    }

    // 重命名
    fs::rename(&item_path, &new_path)
        .map_err(|e| format!("重命名失败: {}", e))?;

    Ok(json!({
        "success": true,
        "message": format!("已重命名为 {}", new_name),
        "new_path": new_path.to_string_lossy().to_string()
    }))
}

/// 删除文件
#[tauri::command]
pub async fn delete_file(relative_path: String) -> Result<serde_json::Value, String> {
    let workspace_path = get_workspace_path().map_err(|e| e.to_string())?;

    // 使用安全验证函数
    let file_path = match validate_and_canonicalize_path(&relative_path, &workspace_path) {
        Ok(path) => path,
        Err(e) => {
            return Ok(json!({
                "success": false,
                "message": e
            }));
        }
    };

    // 获取文件名
    let file_name = file_path.file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("");

    // 检查是否为受保护的文件
    let protected_files = ["AGENTS.md", "SOUL.md", "USER.md"];
    if protected_files.contains(&file_name) {
        return Ok(json!({
            "success": false,
            "message": format!("'{}' 是系统文件，不能删除", file_name)
        }));
    }

    if !file_path.exists() {
        return Ok(json!({
            "success": false,
            "message": format!("文件 {} 不存在", relative_path)
        }));
    }

    if !file_path.is_file() {
        return Ok(json!({
            "success": false,
            "message": format!("{} 不是文件", relative_path)
        }));
    }

    fs::remove_file(&file_path)
        .map_err(|e| format!("删除文件失败: {}", e))?;

    Ok(json!({
        "success": true,
        "message": format!("文件 {} 已删除", relative_path)
    }))
}

/// 获取 chat sessions 路径
/// 动态搜索 sessions 文件夹，优先使用 workspace/sessions，其次使用 .nanobot/sessions
fn get_chat_sessions_path() -> Result<PathBuf> {
    let home = home_dir().context("无法找到用户主目录")?;
    let nanobot_dir = home.join(".nanobot");

    // v0.1.4+ 新位置：workspace/sessions
    let workspace_sessions = nanobot_dir.join("workspace").join("sessions");
    if workspace_sessions.exists() {
        return Ok(workspace_sessions);
    }

    // 旧位置：.nanobot/sessions
    let legacy_sessions = nanobot_dir.join("sessions");
    if legacy_sessions.exists() {
        return Ok(legacy_sessions);
    }

    // 如果都不存在，返回新位置（用于创建新会话）
    Ok(workspace_sessions)
}

/// 列出所有聊天会话
#[tauri::command]
pub async fn list_chat_sessions() -> Result<serde_json::Value, String> {
    let sessions_path = get_chat_sessions_path().map_err(|e| e.to_string())?;

    if !sessions_path.exists() {
        return Ok(json!({
            "sessions": [],
            "message": "sessions目录不存在"
        }));
    }

    let mut sessions = Vec::new();

    // 读取 sessions 目录中的所有 .jsonl 文件
    if let Ok(entries) = fs::read_dir(&sessions_path) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() {
                if let Some(file_name) = path.file_name().and_then(|n| n.to_str()) {
                    if file_name.ends_with(".jsonl") {
                        // 读取文件元数据
                        if let Ok(metadata) = fs::metadata(&path) {
                            if let Ok(modified) = metadata.modified() {
                                // 尝试读取第一行获取会话标题
                                let title = if let Ok(content) = fs::read_to_string(&path) {
                                    content
                                        .lines()
                                        .next()
                                        .and_then(|line| {
                                            if let Ok(json) = serde_json::from_str::<serde_json::Value>(line) {
                                                json.get("content")
                                                    .and_then(|c| c.as_str())
                                                    .map(|s| {
                                                        // 截取前50个字符作为预览
                                                        let preview: String = s.chars().take(50).collect();
                                                        if s.len() > 50 { format!("{}...", preview) } else { preview }
                                                    })
                                            } else {
                                                None
                                            }
                                        })
                                        .unwrap_or_else(|| file_name.to_string())
                                } else {
                                    file_name.to_string()
                                };

                                sessions.push(json!({
                                    "id": file_name,
                                    "name": file_name.trim_end_matches(".jsonl"),
                                    "title": title,
                                    "path": path.to_string_lossy(),
                                    "modified": modified.duration_since(std::time::UNIX_EPOCH)
                                        .unwrap_or_default()
                                        .as_secs(),
                                    "size": metadata.len()
                                }));
                            }
                        }
                    }
                }
            }
        }
    }

    // 按修改时间倒序排列
    sessions.sort_by(|a, b| {
        let a_time = a["modified"].as_u64().unwrap_or(0);
        let b_time = b["modified"].as_u64().unwrap_or(0);
        b_time.cmp(&a_time)
    });

    Ok(json!({
        "sessions": sessions,
        "total": sessions.len()
    }))
}

/// 获取聊天会话内容并返回结构化消息数据
#[tauri::command]
pub async fn get_chat_session_content(session_id: String) -> Result<serde_json::Value, String> {
    let sessions_path = get_chat_sessions_path().map_err(|e| e.to_string())?;
    let session_path = sessions_path.join(&session_id);

    if !session_path.exists() {
        return Ok(json!({
            "success": false,
            "message": format!("会话 {} 不存在", session_id)
        }));
    }

    let content = fs::read_to_string(&session_path)
        .map_err(|e| format!("读取会话失败: {}", e))?;

    // 将 JSONL 转换为结构化消息数组
    let mut messages = Vec::new();

    for line in content.lines() {
        if line.trim().is_empty() {
            continue;
        }

        if let Ok(json) = serde_json::from_str::<serde_json::Value>(line) {
            // 只处理有效的消息（有 role 字段且内容非空）
            if let Some(role) = json.get("role").and_then(|r| r.as_str()) {
                let msg_content = json.get("content").and_then(|c| c.as_str()).unwrap_or("");

                // 跳过空内容的消息
                if !msg_content.trim().is_empty() {
                    messages.push(json!({
                        "role": role,
                        "content": msg_content
                    }));
                }
            }
        }
    }

    let metadata = fs::metadata(&session_path)
        .map_err(|e| format!("读取会话元数据失败: {}", e))?;

    Ok(json!({
        "success": true,
        "id": session_id,
        "name": session_id.trim_end_matches(".jsonl"),
        "messages": messages,
        "raw_content": content,
        "size": metadata.len(),
        "modified": metadata.modified()
            .map(|t| t.duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_secs())
            .unwrap_or(0)
    }))
}
