# Session.rs 安全修复补丁

## 已完成的修复
✅ 已添加 `validate_identifier()` 函数

## 需要应用的修复

### 1. 修复 `get_session_memory()` (约第 147 行)
```rust
/// 获取会话记忆内容
#[tauri::command]
pub async fn get_session_memory(session_id: String) -> Result<serde_json::Value, String> {
    // 验证 session_id 格式
    if let Err(e) = validate_identifier(&session_id) {
        return Ok(json!({
            "error": "invalid_id",
            "message": e
        }));
    }
    
    let workspace_path = get_workspace_path().map_err(|e| e.to_string())?;
    
    // 使用安全验证函数获取 memory 目录
    let memory_path = match validate_and_canonicalize_path("memory", &workspace_path) {
        Ok(path) => path,
        Err(e) => {
            return Ok(json!({
                "error": "access_denied",
                "message": e
            }));
        }
    };
    
    let session_path = memory_path.join(&session_id);

    if !session_path.exists() {
        return Ok(json!({
            "error": "not_found",
            "message": format!("会话 {} 不存在", session_id)
        }));
    }

    let content = fs::read_to_string(&session_path)
        .map_err(|e| format!("读取会话内容失败：{}", e))?;

    Ok(json!({
        "id": session_id,
        "content": content,
        "size": content.len()
    }))
}
```

### 2. 修复 `delete_session()` (约第 196 行)
```rust
/// 删除会话
#[tauri::command]
pub async fn delete_session(session_id: String) -> Result<serde_json::Value, String> {
    // 验证 session_id 格式
    if let Err(e) = validate_identifier(&session_id) {
        return Ok(json!({
            "success": false,
            "message": e
        }));
    }
    
    let workspace_path = get_workspace_path().map_err(|e| e.to_string())?;
    
    // 使用安全验证函数获取 memory 目录
    let memory_path = match validate_and_canonicalize_path("memory", &workspace_path) {
        Ok(path) => path,
        Err(e) => {
            return Ok(json!({
                "success": false,
                "message": e
            }));
        }
    };
    
    let session_path = memory_path.join(&session_id);

    if !session_path.exists() {
        return Ok(json!({
            "success": false,
            "message": format!("会话 {} 不存在", session_id)
        }));
    }

    fs::remove_file(&session_path)
        .map_err(|e| format!("删除会话失败：{}", e))?;

    Ok(json!({
        "success": true,
        "message": format!("会话 {} 已删除", session_id)
    }))
}
```

### 3. 修复 `rename_session()` (约第 220 行)
```rust
/// 重命名会话
#[tauri::command]
pub async fn rename_session(session_id: String, new_name: String) -> Result<serde_json::Value, String> {
    // 验证 session_id 格式
    if let Err(e) = validate_identifier(&session_id) {
        return Ok(json!({
            "success": false,
            "message": e
        }));
    }
    
    // 验证 new_name 格式（允许更宽松的字符，但不允许路径遍历）
    if new_name.contains('/') || new_name.contains('\\') || new_name == ".." {
        return Ok(json!({
            "success": false,
            "message": "无效的会话名称"
        }));
    }
    
    let workspace_path = get_workspace_path().map_err(|e| e.to_string())?;
    
    // 使用安全验证函数获取 memory 目录
    let memory_path = match validate_and_canonicalize_path("memory", &workspace_path) {
        Ok(path) => path,
        Err(e) => {
            return Ok(json!({
                "success": false,
                "message": e
            }));
        }
    };
    
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
        .map_err(|e| format!("重命名会话失败：{}", e))?;

    Ok(json!({
        "success": true,
        "message": format!("会话已重命名为 {}", new_name),
        "old_id": session_id,
        "new_id": new_filename
    }))
}
```

### 4. 修复 `save_session_memory()` (约第 257 行)
```rust
/// 保存会话记忆内容
#[tauri::command]
pub async fn save_session_memory(session_id: String, content: String) -> Result<serde_json::Value, String> {
    // 验证 session_id 格式
    if let Err(e) = validate_identifier(&session_id) {
        return Ok(json!({
            "success": false,
            "message": e
        }));
    }
    
    let workspace_path = get_workspace_path().map_err(|e| e.to_string())?;
    
    // 使用安全验证函数获取 memory 目录
    let memory_path = match validate_and_canonicalize_path("memory", &workspace_path) {
        Ok(path) => path,
        Err(e) => {
            return Ok(json!({
                "success": false,
                "message": e
            }));
        }
    };

    let file_path = memory_path.join(&session_id);

    // 写入文件
    fs::write(&file_path, content)
        .map_err(|e| format!("保存会话内容失败：{}", e))?;

    Ok(json!({
        "success": true,
        "message": format!("会话 {} 已保存", session_id)
    }))
}
```

### 5. 修复 `get_skill_content()` (约第 466 行)
```rust
/// 获取 Skill 内容
#[tauri::command]
pub async fn get_skill_content(skill_id: String) -> Result<serde_json::Value, String> {
    // 验证 skill_id 格式（允许 / 用于目录型技能）
    if skill_id.contains("..") || skill_id.starts_with('/') || skill_id.starts_with('\\') {
        return Ok(json!({
            "success": false,
            "message": "无效的 Skill ID 格式"
        }));
    }
    
    let skills_path = get_skills_path().map_err(|e| e.to_string())?;
    
    // 对于目录型技能，验证路径
    let skill_path = if skill_id.contains('/') {
        // 目录型技能：使用 validate_and_canonicalize_path
        match validate_and_canonicalize_path(&format!("skills/{}", skill_id), &get_workspace_path().map_err(|e| e.to_string())?) {
            Ok(path) => path,
            Err(e) => {
                return Ok(json!({
                    "success": false,
                    "message": e
                }));
            }
        }
    } else {
        // 文件型技能：直接拼接
        skills_path.join(&skill_id)
    };

    if !skill_path.exists() {
        return Ok(json!({
            "success": false,
            "message": format!("Skill {} 不存在", skill_id)
        }));
    }

    let content = fs::read_to_string(&skill_path)
        .map_err(|e| format!("读取 Skill 失败：{}", e))?;

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
```

### 6. 修复 `delete_skill()` (约第 497 行)
```rust
/// 删除 Skill
#[tauri::command]
pub async fn delete_skill(skill_id: String) -> Result<serde_json::Value, String> {
    // 验证 skill_id 格式（允许 / 用于目录型技能）
    if skill_id.contains("..") || skill_id.starts_with('/') || skill_id.starts_with('\\') {
        return Ok(json!({
            "success": false,
            "message": "无效的 Skill ID 格式"
        }));
    }
    
    let skills_path = get_skills_path().map_err(|e| e.to_string())?;
    
    // 解析 skill_id: 格式为 "dir_name/filename" 或 "filename"
    let skill_dir_name = if skill_id.contains('/') {
        // 目录型技能：提取目录名
        skill_id.split('/').next().unwrap_or(&skill_id)
    } else {
        // 文件型技能：直接使用 skill_id（不包含扩展名）
        skill_id.trim_end_matches(".md").trim_end_matches(".md.disabled")
    };
    
    // 验证目录名
    if let Err(e) = validate_identifier(skill_dir_name) {
        return Ok(json!({
            "success": false,
            "message": format!("无效的技能名称：{}", e)
        }));
    }
    
    let skill_dir_path = skills_path.join(skill_dir_name);

    if !skill_dir_path.exists() {
        return Ok(json!({
            "success": false,
            "message": format!("Skill {} 不存在", skill_dir_name)
        }));
    }

    // 删除整个技能目录
    if skill_dir_path.is_dir() {
        fs::remove_dir_all(&skill_dir_path)
            .map_err(|e| format!("删除 Skill 目录失败：{}", e))?;
    } else {
        // 兼容旧格式：如果是文件，直接删除
        fs::remove_file(&skill_dir_path)
            .map_err(|e| format!("删除 Skill 文件失败：{}", e))?;
    }

    Ok(json!({
        "success": true,
        "message": format!("Skill {} 已删除", skill_dir_name)
    }))
}
```

### 7. 修复 `get_chat_session_content()` (约第 868 行)
```rust
/// 获取聊天会话内容并返回结构化消息数据
#[tauri::command]
pub async fn get_chat_session_content(session_id: String) -> Result<serde_json::Value, String> {
    // 验证 session_id 格式（只允许 .jsonl 文件名）
    if session_id.contains('/') || session_id.contains('\\') || session_id == ".." {
        return Ok(json!({
            "success": false,
            "message": "无效的会话 ID 格式"
        }));
    }
    
    // 确保以 .jsonl 结尾
    if !session_id.ends_with(".jsonl") {
        return Ok(json!({
            "success": false,
            "message": "会话 ID 必须以 .jsonl 结尾"
        }));
    }
    
    let sessions_path = get_chat_sessions_path().map_err(|e| e.to_string())?;
    let session_path = sessions_path.join(&session_id);

    if !session_path.exists() {
        return Ok(json!({
            "success": false,
            "message": format!("会话 {} 不存在", session_id)
        }));
    }

    let content = fs::read_to_string(&session_path)
        .map_err(|e| format!("读取会话失败：{}", e))?;

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
        .map_err(|e| format!("读取会话元数据失败：{}", e))?;

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
```

## 修复总结

| 函数 | 修复内容 | 优先级 |
|------|---------|--------|
| `get_session_memory()` | 添加 ID 验证 + 路径验证 | 🔴 高 |
| `delete_session()` | 添加 ID 验证 + 路径验证 | 🔴 高 |
| `rename_session()` | 添加 ID 验证 + 路径验证 | 🔴 高 |
| `save_session_memory()` | 添加 ID 验证 + 路径验证 | 🔴 高 |
| `get_skill_content()` | 添加 ID 验证 + 路径验证 | 🟡 中 |
| `delete_skill()` | 添加 ID 验证 + 路径验证 | 🟡 中 |
| `get_chat_session_content()` | 添加 ID 验证 | 🟢 低 |

所有修复都遵循相同的安全模式：
1. 验证输入 ID 格式（防止路径遍历）
2. 使用 `validate_and_canonicalize_path()` 获取安全的目录路径
3. 在安全的目录内拼接文件名
