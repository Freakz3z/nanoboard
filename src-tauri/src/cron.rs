use anyhow::Context;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use crate::process;

/// 调度类型
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ScheduleKind {
    Cron,
    Every,
    At,
}

/// 调度配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CronSchedule {
    pub kind: ScheduleKind,
    #[serde(rename = "atMs")]
    pub at_ms: Option<i64>,
    #[serde(rename = "everyMs")]
    pub every_ms: Option<i64>,
    pub expr: Option<String>,
    pub tz: Option<String>,
}

/// 任务负载类型
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PayloadKind {
    AgentTurn,
}

/// 任务负载
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CronPayload {
    pub kind: PayloadKind,
    pub message: String,
    pub deliver: bool,
    pub channel: Option<String>,
    pub to: Option<String>,
}

/// 任务状态
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CronState {
    #[serde(rename = "nextRunAtMs")]
    pub next_run_at_ms: Option<i64>,
    #[serde(rename = "lastRunAtMs")]
    pub last_run_at_ms: Option<i64>,
    #[serde(rename = "lastStatus")]
    pub last_status: Option<String>,
    #[serde(rename = "lastError")]
    pub last_error: Option<String>,
}

/// 定时任务
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CronJob {
    pub id: String,
    pub name: String,
    pub enabled: bool,
    pub schedule: CronSchedule,
    pub payload: CronPayload,
    pub state: CronState,
    #[serde(rename = "createdAtMs")]
    pub created_at_ms: i64,
    #[serde(rename = "updatedAtMs")]
    pub updated_at_ms: i64,
    #[serde(rename = "deleteAfterRun")]
    pub delete_after_run: bool,
}

/// 任务列表文件
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CronJobsFile {
    pub version: i32,
    pub jobs: Vec<CronJob>,
}

/// 获取 jobs.json 文件路径
fn get_jobs_file_path() -> PathBuf {
    let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
    home.join(".nanobot").join("cron").join("jobs.json")
}

/// 读取 jobs.json 文件
fn read_jobs_file() -> Result<CronJobsFile, String> {
    let path = get_jobs_file_path();

    if !path.exists() {
        // 文件不存在，返回空列表
        return Ok(CronJobsFile {
            version: 1,
            jobs: vec![],
        });
    }

    let content = fs::read_to_string(&path)
        .context("读取 jobs.json 文件失败")
        .map_err(|e| e.to_string())?;

    let jobs_file: CronJobsFile = serde_json::from_str(&content)
        .context("解析 jobs.json 文件失败")
        .map_err(|e| e.to_string())?;

    Ok(jobs_file)
}

/// 列出所有定时任务 - 直接读取 JSON 文件
#[tauri::command]
pub async fn cron_list() -> Result<serde_json::Value, String> {
    match read_jobs_file() {
        Ok(jobs_file) => {
            // 转换为前端期望的格式
            let jobs: Vec<serde_json::Value> = jobs_file.jobs
                .into_iter()
                .map(|job| {
                    json!({
                        "id": job.id,
                        "name": job.name,
                        "enabled": job.enabled,
                        "schedule": {
                            "kind": match job.schedule.kind {
                                ScheduleKind::Cron => "cron",
                                ScheduleKind::Every => "every",
                                ScheduleKind::At => "at",
                            },
                            "atMs": job.schedule.at_ms,
                            "everyMs": job.schedule.every_ms,
                            "expr": job.schedule.expr,
                            "tz": job.schedule.tz,
                        },
                        "payload": {
                            "kind": match job.payload.kind {
                                PayloadKind::AgentTurn => "agent_turn",
                            },
                            "message": job.payload.message,
                            "deliver": job.payload.deliver,
                            "channel": job.payload.channel,
                            "to": job.payload.to,
                        },
                        "state": {
                            "nextRunAtMs": job.state.next_run_at_ms,
                            "lastRunAtMs": job.state.last_run_at_ms,
                            "lastStatus": job.state.last_status,
                            "lastError": job.state.last_error,
                        },
                        "createdAtMs": job.created_at_ms,
                        "updatedAtMs": job.updated_at_ms,
                        "deleteAfterRun": job.delete_after_run,
                    })
                })
                .collect();

            Ok(json!({
                "success": true,
                "jobs": jobs
            }))
        }
        Err(e) => Ok(json!({
            "success": false,
            "jobs": [],
            "message": e
        }))
    }
}

/// 执行 nanobot cron 子命令并返回 stdout/stderr
fn run_nanobot_cron(args: &[&str]) -> Result<String, String> {
    let nanobot_cmd = process::find_command("nanobot")
        .ok_or_else(|| "未找到 nanobot 命令，请先安装 nanobot-ai".to_string())?;

    let output = process::apply_hidden_window(Command::new(&nanobot_cmd))
        .arg("cron")
        .args(args)
        .env("PYTHONUTF8", "1")
        .env("PYTHONIOENCODING", "utf-8")
        .output()
        .context("执行 nanobot cron 命令失败")
        .map_err(|e| e.to_string())?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    if output.status.success() {
        Ok(stdout)
    } else {
        let msg = if stderr.trim().is_empty() { &stdout } else { &stderr };
        Err(format!("命令执行失败: {}", msg.trim()))
    }
}

/// 添加定时任务
#[tauri::command]
pub async fn cron_add(
    name: String,
    message: String,
    schedule_type: String,
    schedule_value: String,
    deliver: Option<bool>,
    to: Option<String>,
    channel: Option<String>,
) -> Result<serde_json::Value, String> {
    if name.trim().is_empty() {
        return Ok(json!({
            "success": false,
            "message": "任务名称不能为空"
        }));
    }
    if message.trim().is_empty() {
        return Ok(json!({
            "success": false,
            "message": "消息内容不能为空"
        }));
    }

    let mut args: Vec<String> = vec![
        "add".to_string(),
        "--name".to_string(),
        name.clone(),
        "--message".to_string(),
        message.clone(),
    ];

    match schedule_type.as_str() {
        "cron" => {
            args.push("--cron".to_string());
            args.push(schedule_value.clone());
        }
        "every" => {
            args.push("--every".to_string());
            args.push(schedule_value.clone());
        }
        "at" => {
            args.push("--at".to_string());
            args.push(schedule_value.clone());
        }
        _ => {
            return Ok(json!({
                "success": false,
                "message": format!("未知的调度类型: {}", schedule_type)
            }));
        }
    }

    if deliver.unwrap_or(false) {
        args.push("--deliver".to_string());
    }
    if let Some(ref to_val) = to {
        if !to_val.trim().is_empty() {
            args.push("--to".to_string());
            args.push(to_val.clone());
        }
    }
    if let Some(ref ch) = channel {
        if !ch.trim().is_empty() {
            args.push("--channel".to_string());
            args.push(ch.clone());
        }
    }

    let arg_refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();

    match run_nanobot_cron(&arg_refs) {
        Ok(output) => Ok(json!({
            "success": true,
            "message": output.trim()
        })),
        Err(e) => Ok(json!({
            "success": false,
            "message": e
        }))
    }
}

/// 删除定时任务
#[tauri::command]
pub async fn cron_remove(job_id: String) -> Result<serde_json::Value, String> {
    if job_id.trim().is_empty() {
        return Ok(json!({
            "success": false,
            "message": "任务 ID 不能为空"
        }));
    }

    match run_nanobot_cron(&["remove", &job_id]) {
        Ok(output) => Ok(json!({
            "success": true,
            "message": output.trim()
        })),
        Err(e) => Ok(json!({
            "success": false,
            "message": e
        }))
    }
}

/// 启用或禁用定时任务
#[tauri::command]
pub async fn cron_enable(job_id: String, disable: bool) -> Result<serde_json::Value, String> {
    if job_id.trim().is_empty() {
        return Ok(json!({
            "success": false,
            "message": "任务 ID 不能为空"
        }));
    }

    let mut args = vec!["enable", &job_id];
    if disable {
        args.push("--disable");
    }

    match run_nanobot_cron(&args) {
        Ok(output) => Ok(json!({
            "success": true,
            "message": output.trim()
        })),
        Err(e) => Ok(json!({
            "success": false,
            "message": e
        }))
    }
}

/// 手动运行定时任务
#[tauri::command]
pub async fn cron_run(job_id: String) -> Result<serde_json::Value, String> {
    if job_id.trim().is_empty() {
        return Ok(json!({
            "success": false,
            "message": "任务 ID 不能为空"
        }));
    }

    match run_nanobot_cron(&["run", "--force", &job_id]) {
        Ok(output) => Ok(json!({
            "success": true,
            "message": output.trim()
        })),
        Err(e) => Ok(json!({
            "success": false,
            "message": e
        }))
    }
}

/// 保存 jobs.json 文件
fn save_jobs_file(jobs_file: &CronJobsFile) -> Result<(), String> {
    let path = get_jobs_file_path();

    // 确保目录存在
    if let Some(parent) = path.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent)
                .context("创建 cron 目录失败")
                .map_err(|e| e.to_string())?;
        }
    }

    let content = serde_json::to_string_pretty(jobs_file)
        .context("序列化 jobs.json 失败")
        .map_err(|e| e.to_string())?;

    fs::write(&path, content)
        .context("写入 jobs.json 失败")
        .map_err(|e| e.to_string())?;

    Ok(())
}

/// 更新定时任务 - 直接修改 JSON 文件
#[tauri::command]
pub async fn cron_update(
    job_id: String,
    name: String,
    message: String,
    schedule_type: String,
    schedule_value: String,
    enabled: Option<bool>,
    deliver: Option<bool>,
    to: Option<String>,
    channel: Option<String>,
) -> Result<serde_json::Value, String> {
    if job_id.trim().is_empty() {
        return Ok(json!({
            "success": false,
            "message": "任务 ID 不能为空"
        }));
    }
    if name.trim().is_empty() {
        return Ok(json!({
            "success": false,
            "message": "任务名称不能为空"
        }));
    }
    if message.trim().is_empty() {
        return Ok(json!({
            "success": false,
            "message": "消息内容不能为空"
        }));
    }

    // 读取现有文件
    let mut jobs_file = read_jobs_file()?;

    // 查找并更新任务
    let job_index = jobs_file.jobs.iter().position(|j| j.id == job_id);
    let job = match job_index {
        Some(idx) => &mut jobs_file.jobs[idx],
        None => {
            return Ok(json!({
                "success": false,
                "message": format!("未找到任务: {}", job_id)
            }));
        }
    };

    // 更新任务信息
    job.name = name.trim().to_string();
    job.updated_at_ms = chrono::Utc::now().timestamp_millis();

    // 更新 enabled 状态
    if let Some(e) = enabled {
        job.enabled = e;
    }

    // 更新调度配置
    match schedule_type.as_str() {
        "cron" => {
            job.schedule.kind = ScheduleKind::Cron;
            job.schedule.expr = Some(schedule_value.clone());
            job.schedule.every_ms = None;
            job.schedule.at_ms = None;
        }
        "every" => {
            job.schedule.kind = ScheduleKind::Every;
            // schedule_value 是秒数，转换为毫秒
            let seconds: i64 = schedule_value.parse().unwrap_or(3600);
            job.schedule.every_ms = Some(seconds * 1000);
            job.schedule.expr = None;
            job.schedule.at_ms = None;
        }
        "at" => {
            job.schedule.kind = ScheduleKind::At;
            // schedule_value 是 ISO 格式时间字符串
            if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(&format!("{}:00Z", schedule_value.replace(" ", "T"))) {
                job.schedule.at_ms = Some(dt.timestamp_millis());
            } else if let Ok(dt) = chrono::NaiveDateTime::parse_from_str(&schedule_value, "%Y-%m-%dT%H:%M") {
                job.schedule.at_ms = Some(dt.and_utc().timestamp_millis());
            } else {
                // 尝试直接解析为毫秒时间戳
                job.schedule.at_ms = schedule_value.parse().ok();
            }
            job.schedule.expr = None;
            job.schedule.every_ms = None;
        }
        _ => {
            return Ok(json!({
                "success": false,
                "message": format!("未知的调度类型: {}", schedule_type)
            }));
        }
    }

    // 更新 payload
    job.payload.message = message.trim().to_string();
    if let Some(d) = deliver {
        job.payload.deliver = d;
    }
    if let Some(ref c) = channel {
        job.payload.channel = if c.trim().is_empty() { None } else { Some(c.trim().to_string()) };
    }
    if let Some(ref t) = to {
        job.payload.to = if t.trim().is_empty() { None } else { Some(t.trim().to_string()) };
    }

    // 保存文件
    match save_jobs_file(&jobs_file) {
        Ok(_) => Ok(json!({
            "success": true,
            "message": "任务已更新"
        })),
        Err(e) => Ok(json!({
            "success": false,
            "message": e
        }))
    }
}
