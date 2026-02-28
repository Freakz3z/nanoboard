/**
 * ClawHub API 代理模块
 * 用于代理 ClawHub Skills 市场 API 请求，避免 CORS 问题
 */

use serde::{Deserialize, Serialize};
use tauri::command;
use std::process::Command;

const CLAWHUB_API_BASE: &str = "https://clawhub.ai";

#[derive(Debug, Serialize, Deserialize)]
pub struct ClawHubSearchResult {
    pub score: f64,
    pub slug: String,
    #[serde(rename = "displayName")]
    pub display_name: String,
    pub summary: String,
    pub version: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ClawHubSearchResponse {
    pub results: Vec<ClawHubSearchResult>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SkillStats {
    #[serde(rename = "downloads", skip_serializing_if = "Option::is_none")]
    pub downloads: Option<i64>,
    #[serde(rename = "stars", skip_serializing_if = "Option::is_none")]
    pub stars: Option<i64>,
    #[serde(rename = "installsCurrent", skip_serializing_if = "Option::is_none")]
    pub installs_current: Option<i64>,
    #[serde(rename = "installsAllTime", skip_serializing_if = "Option::is_none")]
    pub installs_all_time: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SkillVersion {
    pub version: String,
    #[serde(rename = "createdAt")]
    pub created_at: i64,
    #[serde(rename = "changelog", skip_serializing_if = "Option::is_none")]
    pub changelog: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SkillListItem {
    pub slug: String,
    #[serde(rename = "displayName")]
    pub display_name: String,
    pub summary: String,
    pub tags: std::collections::HashMap<String, String>,
    pub stats: SkillStats,
    #[serde(rename = "createdAt")]
    pub created_at: i64,
    #[serde(rename = "updatedAt")]
    pub updated_at: i64,
    #[serde(rename = "latestVersion", skip_serializing_if = "Option::is_none")]
    pub latest_version: Option<SkillVersion>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ClawHubSkillsResponse {
    pub items: Vec<SkillListItem>,
    #[serde(rename = "nextCursor", skip_serializing_if = "Option::is_none")]
    pub next_cursor: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SkillOwner {
    pub handle: String,
    #[serde(rename = "displayName")]
    pub display_name: Option<String>,
    pub image: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SkillInfo {
    pub slug: String,
    #[serde(rename = "displayName")]
    pub display_name: String,
    pub summary: String,
    pub tags: std::collections::HashMap<String, String>,
    pub stats: SkillStats,
    #[serde(rename = "createdAt")]
    pub created_at: i64,
    #[serde(rename = "updatedAt")]
    pub updated_at: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SkillDetailResponse {
    pub skill: SkillInfo,
    #[serde(rename = "latestVersion")]
    pub latest_version: SkillVersion,
    pub owner: SkillOwner,
}

/// 搜索 ClawHub Skills
#[command]
pub async fn search_clawhub_skills(
    query: String,
    limit: Option<i32>,
) -> Result<ClawHubSearchResponse, String> {
    let limit = limit.unwrap_or(20);
    let url = format!(
        "{}/api/v1/search?q={}&limit={}",
        CLAWHUB_API_BASE,
        urlencoding::encode(&query),
        limit
    );

    let client = reqwest::Client::new();
    let response = client
        .get(&url)
        .header("Accept", "application/json")
        .header("User-Agent", "Nanoboard/1.0")
        .send()
        .await
        .map_err(|e| format!("请求失败：{}", e))?;

    if !response.status().is_success() {
        return Err(format!("API 返回错误状态：{}", response.status()));
    }

    let data = response
        .json::<ClawHubSearchResponse>()
        .await
        .map_err(|e| format!("解析响应失败：{}", e))?;

    Ok(data)
}

/// 获取 ClawHub Skills 列表
#[command]
pub async fn get_clawhub_skills(
    sort: Option<String>,
    limit: Option<i32>,
    cursor: Option<String>,
) -> Result<ClawHubSkillsResponse, String> {
    let sort = sort.unwrap_or_else(|| "trending".to_string());
    let limit = limit.unwrap_or(20);
    let mut url = format!(
        "{}/api/v1/skills?sort={}&limit={}",
        CLAWHUB_API_BASE, sort, limit
    );

    if let Some(c) = cursor {
        url.push_str(&format!("&cursor={}", urlencoding::encode(&c)));
    }

    let client = reqwest::Client::new();
    let response = client
        .get(&url)
        .header("Accept", "application/json")
        .header("User-Agent", "Nanoboard/1.0")
        .send()
        .await
        .map_err(|e| format!("请求失败：{}", e))?;

    if !response.status().is_success() {
        return Err(format!("API 返回错误状态：{}", response.status()));
    }

    let data = response
        .json::<ClawHubSkillsResponse>()
        .await
        .map_err(|e| format!("解析响应失败：{}", e))?;

    Ok(data)
}

/// 获取 ClawHub Skill 详情
#[command]
pub async fn get_clawhub_skill_detail(slug: String) -> Result<SkillDetailResponse, String> {
    let url = format!("{}/api/v1/skills/{}", CLAWHUB_API_BASE, slug);

    let client = reqwest::Client::new();
    let response = client
        .get(&url)
        .header("Accept", "application/json")
        .header("User-Agent", "Nanoboard/1.0")
        .send()
        .await
        .map_err(|e| format!("请求失败：{}", e))?;

    if !response.status().is_success() {
        return Err(format!("API 返回错误状态：{}", response.status()));
    }

    let data = response
        .json::<SkillDetailResponse>()
        .await
        .map_err(|e| format!("解析响应失败：{}", e))?;

    Ok(data)
}

/// 获取 ClawHub Skill 文件内容
#[command]
pub async fn get_clawhub_skill_file(
    slug: String,
    path: String,
    version: Option<String>,
) -> Result<String, String> {
    let mut url = format!(
        "{}/api/v1/skills/{}/file?path={}",
        CLAWHUB_API_BASE,
        slug,
        urlencoding::encode(&path)
    );

    if let Some(v) = version {
        url.push_str(&format!("&version={}", v));
    }

    let client = reqwest::Client::new();
    let response = client
        .get(&url)
        .header("Accept", "text/plain")
        .header("User-Agent", "Nanoboard/1.0")
        .send()
        .await
        .map_err(|e| format!("请求失败：{}", e))?;

    if !response.status().is_success() {
        return Err(format!("API 返回错误状态：{}", response.status()));
    }

    let content = response
        .text()
        .await
        .map_err(|e| format!("读取响应失败：{}", e))?;

    Ok(content)
}

/// 安装 ClawHub Skill
#[command]
pub async fn install_clawhub_skill(slug: String) -> Result<serde_json::Value, String> {
    use std::fs;

    // 获取用户主目录
    let home = dirs::home_dir()
        .ok_or_else(|| "无法找到用户主目录".to_string())?;

    // 构建命令
    let output = Command::new("npx")
        .args(["clawhub@latest", "install", &slug])
        .current_dir(&home)
        .output()
        .map_err(|e| format!("执行安装命令失败：{}. 请确保已安装 Node.js 和 npm。", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    if output.status.success() {
        // ClawHub 默认安装到 ~/skills/{slug}，需要移动到 ~/.nanobot/workspace/skills/{slug}
        let source_dir = home.join("skills").join(&slug);
        let nanobot_workspace = home.join(".nanobot").join("workspace");
        let target_dir = nanobot_workspace.join("skills").join(&slug);

        // 确保目标目录存在
        if let Err(e) = fs::create_dir_all(&nanobot_workspace.join("skills")) {
            return Err(format!("创建目标目录失败：{}", e));
        }

        // 如果目标已存在，先删除
        if target_dir.exists() {
            if let Err(e) = fs::remove_dir_all(&target_dir) {
                return Err(format!("删除旧技能目录失败：{}", e));
            }
        }

        // 移动技能目录
        if source_dir.exists() {
            if let Err(e) = fs::rename(&source_dir, &target_dir) {
                // 如果 rename 失败（可能是跨文件系统），尝试复制
                if let Err(copy_e) = copy_dir_recursive(&source_dir, &target_dir) {
                    return Err(format!("移动技能目录失败：{}，复制也失败：{}", e, copy_e));
                }
                // 复制成功后删除源目录
                let _ = fs::remove_dir_all(&source_dir);
            }
        }

        Ok(serde_json::json!({
            "success": true,
            "message": format!("技能 {} 安装成功", slug),
            "output": stdout,
            "slug": slug
        }))
    } else {
        // 检查是否是因为 skill 已存在
        if stdout.contains("already exists") || stderr.contains("already exists") {
            Ok(serde_json::json!({
                "success": true,
                "message": format!("技能 {} 已安装", slug),
                "output": stdout,
                "slug": slug
            }))
        } else {
            Err(format!("安装失败：{}{}", stdout, stderr))
        }
    }
}

/// 递归复制目录
fn copy_dir_recursive(src: &std::path::Path, dst: &std::path::Path) -> std::io::Result<()> {
    use std::fs;

    fs::create_dir_all(dst)?;
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let ty = entry.file_type()?;
        if ty.is_dir() {
            copy_dir_recursive(&entry.path(), &dst.join(entry.file_name()))?;
        } else {
            fs::copy(entry.path(), dst.join(entry.file_name()))?;
        }
    }
    Ok(())
}

/// 卸载 ClawHub Skill
#[command]
pub async fn uninstall_clawhub_skill(slug: String) -> Result<serde_json::Value, String> {
    use std::fs;

    // 获取用户主目录
    let home = dirs::home_dir()
        .ok_or_else(|| "无法找到用户主目录".to_string())?;

    // 首先尝试从 nanobot workspace 删除
    let nanobot_workspace = home.join(".nanobot").join("workspace");
    let target_dir = nanobot_workspace.join("skills").join(&slug);

    if target_dir.exists() {
        if let Err(e) = fs::remove_dir_all(&target_dir) {
            return Err(format!("删除技能目录失败：{}", e));
        }
    }

    // 然后调用 clawhub CLI 卸载（清理 ~/skills/ 中的残留）
    let output = Command::new("npx")
        .args(["clawhub@latest", "uninstall", &slug])
        .current_dir(&home)
        .output()
        .map_err(|e| format!("执行卸载命令失败：{}. 请确保已安装 Node.js 和 npm。", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    if output.status.success() {
        Ok(serde_json::json!({
            "success": true,
            "message": format!("技能 {} 卸载成功", slug),
            "output": stdout,
            "slug": slug
        }))
    } else {
        // 即使 clawhub CLI 失败，只要我们从 workspace 删除了也视为成功
        if !target_dir.exists() {
            Ok(serde_json::json!({
                "success": true,
                "message": format!("技能 {} 已从 workspace 移除", slug),
                "output": stdout,
                "slug": slug
            }))
        } else {
            Err(format!("卸载失败：{}{}", stdout, stderr))
        }
    }
}
