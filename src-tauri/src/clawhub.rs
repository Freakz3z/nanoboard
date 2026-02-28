/**
 * ClawHub API 代理模块
 * 用于代理 ClawHub Skills 市场 API 请求，避免 CORS 问题
 */

use serde::{Deserialize, Serialize};
use tauri::command;

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
        .map_err(|e| format!("请求失败: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("API 返回错误状态: {}", response.status()));
    }

    let data = response
        .json::<ClawHubSearchResponse>()
        .await
        .map_err(|e| format!("解析响应失败: {}", e))?;

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
        .map_err(|e| format!("请求失败: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("API 返回错误状态: {}", response.status()));
    }

    let data = response
        .json::<ClawHubSkillsResponse>()
        .await
        .map_err(|e| format!("解析响应失败: {}", e))?;

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
        .map_err(|e| format!("请求失败: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("API 返回错误状态: {}", response.status()));
    }

    let data = response
        .json::<SkillDetailResponse>()
        .await
        .map_err(|e| format!("解析响应失败: {}", e))?;

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
        .map_err(|e| format!("请求失败: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("API 返回错误状态: {}", response.status()));
    }

    let content = response
        .text()
        .await
        .map_err(|e| format!("读取响应失败: {}", e))?;

    Ok(content)
}
