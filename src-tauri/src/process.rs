use anyhow::{Context, Result};
use serde_json::json;
use std::env;
use std::fs::OpenOptions;
use std::path::Path;
use std::process::{Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Instant;
use sysinfo::System;
use tauri::State;

use crate::AppState;

/// 获取用户的 shell PATH
/// 通过加载用户的 shell 配置文件来获取完整的 PATH
fn get_user_path() -> Vec<String> {
    let mut paths = Vec::new();

    // 获取当前用户主目录
    if let Some(home) = env::var("HOME").ok() {
        // 优先添加 conda/miniconda 路径（因为这些通常不在 PATH 中）
        paths.push(format!("{}/miniconda3/bin", home));
        paths.push(format!("{}/miniconda3/condabin", home));
        paths.push(format!("{}/anaconda3/bin", home));
        paths.push(format!("{}/anaconda3/condabin", home));

        // 添加用户本地 bin 目录
        paths.push(format!("{}/.local/bin", home));

        // 尝试从 shell 配置文件中读取 PATH（只处理简单的 export PATH=）
        let config_files = vec![
            format!("{}/.zshenv", home),
            format!("{}/.zshrc", home),
            format!("{}/.bash_profile", home),
            format!("{}/.bashrc", home),
            format!("{}/.profile", home),
        ];

        for config_file in config_files {
            if let Ok(content) = std::fs::read_to_string(&config_file) {
                for line in content.lines() {
                    let line = line.trim();
                    // 只处理简单的 export PATH= 语句
                    if line.starts_with("export PATH=") {
                        if let Some(path_value) = line.split('=').nth(1) {
                            let path_value = path_value.trim().replace('"', "").replace('\'', "");
                            for path in path_value.split(':') {
                                if !path.is_empty() && !paths.contains(&path.to_string()) {
                                    paths.push(path.to_string());
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // 添加系统常见路径
    #[cfg(target_os = "macos")]
    paths.extend(vec![
        "/opt/homebrew/bin".to_string(),
        "/usr/local/bin".to_string(),
        "/home/linuxbrew/.linuxbrew/bin".to_string(),
        "/usr/bin".to_string(),
        "/bin".to_string(),
        "/usr/sbin".to_string(),
        "/sbin".to_string(),
    ]);

    #[cfg(not(target_os = "macos"))]
    paths.extend(vec![
        "/usr/local/bin".to_string(),
        "/usr/bin".to_string(),
        "/bin".to_string(),
    ]);

    paths
}

/// 使用系统 which/where 命令查找命令
/// 这是最可靠的方法，因为它会检查当前激活的 Python 环境
fn find_via_which(command: &str) -> Option<String> {
    #[cfg(unix)]
    let which_cmd = "which";

    #[cfg(windows)]
    let which_cmd = "where";

    let output = Command::new(which_cmd)
        .arg(command)
        .output()
        .ok()?;

    if output.status.success() {
        let path = String::from_utf8_lossy(&output.stdout)
            .lines()
            .next()?
            .trim()
            .to_string();
        if !path.is_empty() {
            log::debug!("通过 {} 找到 {}: {}", which_cmd, command, path);
            return Some(path);
        }
    }
    None
}

/// 专门查找 pip 命令（避免递归调用）
/// 按优先级查找 pip 命令
fn find_command_pip() -> Option<String> {
    // 方法 1: 通过 which/where 查找
    if let Some(pip) = find_via_which("pip3") {
        return Some(pip);
    }
    if let Some(pip) = find_via_which("pip") {
        return Some(pip);
    }

    // 方法 2: 在常见路径中查找
    if let Some(home) = env::var("HOME").ok() {
        for pip_name in &["pip3", "pip"] {
            for bin_dir in &[
                format!("{}/miniconda3/bin", home),
                format!("{}/anaconda3/bin", home),
                format!("{}/.local/bin", home),
                format!("{}/Library/Python/3.*/bin", home),
            ] {
                let full_path = Path::new(bin_dir).join(pip_name);
                if full_path.exists() {
                    return Some(full_path.to_string_lossy().to_string());
                }
            }
        }
    }

    None
}

/// 通过 pip show 查找包的安装位置
/// 适配 conda 虚拟环境、venv 等不同安装方式
fn find_via_pip(package: &str) -> Option<String> {
    let pip_cmd = find_command_pip().unwrap_or_else(|| "pip3".to_string());

    let output = Command::new(&pip_cmd)
        .args(&["show", package])
        .output()
        .ok()?;

    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout);
        for line in stdout.lines() {
            if line.starts_with("Location:") {
                let location = line.trim_start_matches("Location:").trim();

                // 根据平台确定可执行文件目录
                let bin_dir = if cfg!(windows) { "Scripts" } else { "bin" };

                // 尝试找到对应的可执行文件
                // pip show 显示的是 site-packages 目录
                // 可执行文件通常在 site-packages 的上层 bin/Scripts 目录
                let site_packages = Path::new(location);
                let mut bin_path = site_packages.to_path_buf();

                // 如果路径包含 site-packages，找到其父目录的 bin
                if site_packages.ends_with("site-packages") {
                    if let Some(parent) = site_packages.parent() {
                        bin_path = parent.join(bin_dir);
                    }
                }

                // 尝试多种可能的命令名称
                let exe_ext = if cfg!(windows) { ".exe" } else { "" };
                for cmd_name in &["nanobot", "nanobot-ai"] {
                    let cmd_path = bin_path.join(format!("{}{}", cmd_name, exe_ext));
                    if cmd_path.exists() {
                        log::debug!("通过 pip show 找到 {}: {}", cmd_name, cmd_path.display());
                        return Some(cmd_path.to_string_lossy().to_string());
                    }
                }
            }
        }
    }
    log::debug!("通过 pip show 未找到 {}", package);
    None
}

/// 查找命令的完整路径
/// 使用多种方法查找命令，按优先级顺序：
/// 1. 使用系统 which/where 命令（最可靠，会检查当前激活的环境）
/// 2. 通过 pip show 查找（适配 conda/venv 等虚拟环境）
/// 3. 遍历预设的 PATH 列表（兼容旧逻辑）
fn find_command(command: &str) -> Option<String> {
    log::debug!("正在查找命令: {}", command);

    // 方法 1: 使用系统 which/where 命令（最可靠）
    if let Some(path) = find_via_which(command) {
        return Some(path);
    }

    // 方法 2: 通过 pip show 查找（适配 conda/venv 等虚拟环境）
    // 只对 nanobot 相关命令启用此方法
    if command == "nanobot" {
        if let Some(path) = find_via_pip("nanobot-ai") {
            return Some(path);
        }
    }

    // 方法 3: 遍历预设的 PATH 列表（降级方案，兼容旧逻辑）
    let paths = get_user_path();
    log::debug!("尝试在预设路径中查找: {:?}", paths);

    for path_dir in paths {
        let full_path = Path::new(&path_dir).join(command);
        log::debug!("检查路径: {}", full_path.display());
        if full_path.exists() {
            log::debug!("在预设路径中找到: {}", full_path.display());
            return Some(full_path.to_string_lossy().to_string());
        }
    }

    log::warn!("未找到命令: {}", command);
    None
}

pub struct ProcessManager {
    is_running: Arc<AtomicBool>,
    port: u16,
    start_time: Option<Instant>,
    // 存储进程启动时的系统时间（秒），用于检测已运行进程的启动时间
    process_start_timestamp: Option<i64>,
}

impl ProcessManager {
    pub fn new(port: u16) -> Self {
        Self {
            is_running: Arc::new(AtomicBool::new(false)),
            port,
            start_time: None,
            process_start_timestamp: None,
        }
    }

    #[allow(dead_code)]
    pub fn is_running(&self) -> bool {
        self.is_running.load(Ordering::SeqCst)
    }

    pub fn set_running(&self, running: bool) {
        self.is_running.store(running, Ordering::SeqCst);
    }

    pub fn get_port(&self) -> u16 {
        self.port
    }

    pub fn get_start_time(&self) -> Option<Instant> {
        self.start_time
    }

    pub fn set_start_time(&mut self, start_time: Instant) {
        self.start_time = Some(start_time);
    }

    pub fn set_process_start_timestamp(&mut self, timestamp: i64) {
        self.process_start_timestamp = Some(timestamp);
    }
}

/// 检查nanobot进程是否正在运行
fn check_nanobot_running() -> bool {
    let mut sys = System::new_all();
    sys.refresh_all();

    for (_pid, process) in sys.processes() {
        let name = process.name();
        if name.contains("python") || name.contains("nanobot") {
            // 检查命令行参数
            let cmd = process.cmd();
            let cmd_str = cmd.join(" ");
            if cmd_str.contains("nanobot") && cmd_str.contains("gateway") {
                return true;
            }
        }
    }
    false
}

/// 启动nanobot
#[tauri::command]
pub async fn start_nanobot(port: Option<u16>, state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let port = port.unwrap_or(18790);

    // 检查是否已经在运行
    if check_nanobot_running() {
        return Ok(json!({
            "status": "already_running",
            "message": "Nanobot已经在运行中"
        }));
    }

    // 获取日志文件路径
    let log_path = dirs::home_dir()
        .ok_or("无法找到用户主目录".to_string())?
        .join(".nanobot")
        .join("logs")
        .join("nanobot.log");

    // 确保日志目录存在
    if let Some(parent) = log_path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("创建日志目录失败: {}", e))?;
    }

    // 打开日志文件用于追加（如果不存在则创建）
    let log_file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_path)
        .map_err(|e| format!("无法打开日志文件: {}", e))?;

    // 启动nanobot gateway，将输出重定向到日志文件
    let nanobot_cmd = find_command("nanobot")
        .or_else(|| Some("nanobot".to_string()))
        .unwrap();

    let mut child = Command::new(&nanobot_cmd)
        .args(&["gateway", "--port", &port.to_string()])
        .stdout(Stdio::from(log_file.try_clone().unwrap()))
        .stderr(Stdio::from(log_file))
        .spawn()
        .context("启动nanobot失败，请确保已正确安装nanobot")
        .map_err(|e| e.to_string())?;

    // 获取进程ID
    let id = child.id();

    // 立即检查进程是否还在运行
    match child.try_wait() {
        Ok(Some(status)) => {
            // 进程已经退出
            return Ok(json!({
                "status": "failed",
                "message": format!("Nanobot启动后立即退出，退出码: {:?}", status)
            }));
        },
        Ok(None) => {
            // 进程还在运行，这是好的
            log::info!("Nanobot进程 (PID: {}) 启动成功，正在运行中", id);
        },
        Err(e) => {
            // 尝试等待时出错
            log::error!("检查nanobot进程状态时出错: {}", e);
        }
    }

    // 等待一小段时间检查进程是否成功启动
    tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
    if check_nanobot_running() {
        // 保存进程信息到状态
        let mut process_manager = ProcessManager::new(port);
        process_manager.set_running(true);
        process_manager.set_start_time(Instant::now());

        *state.nanobot_process.lock().unwrap() = Some(process_manager);

        Ok(json!({
            "status": "started",
            "message": format!("Nanobot已在端口 {} 启动", port),
            "port": port,
            "pid": id
        }))
    } else {
        Ok(json!({
            "status": "failed",
            "message": "Nanobot启动失败，请检查配置"
        }))
    }
}

/// 停止nanobot
#[tauri::command]
pub async fn stop_nanobot(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    if !check_nanobot_running() {
        return Ok(json!({
            "status": "not_running",
            "message": "Nanobot未运行"
        }));
    }

    let mut sys = System::new_all();
    sys.refresh_all();

    let mut killed = false;
    for (pid, process) in sys.processes() {
        let name = process.name();
        if name.contains("python") || name.contains("nanobot") {
            let cmd = process.cmd();
            let cmd_str = cmd.join(" ");
            if cmd_str.contains("nanobot") && cmd_str.contains("gateway") {
                // 发送SIGTERM信号
                if sys.process(*pid).is_some() {
                    sys.process(*pid).unwrap().kill();
                    killed = true;
                }
            }
        }
    }

    if killed {
        // 更新状态
        if let Some(manager) = state.nanobot_process.lock().unwrap().as_ref() {
            manager.set_running(false);
        }

        Ok(json!({
            "status": "stopped",
            "message": "Nanobot已停止"
        }))
    } else {
        Ok(json!({
            "status": "not_found",
            "message": "未找到运行中的Nanobot进程"
        }))
    }
}

/// 获取nanobot状态
#[tauri::command]
pub async fn get_status(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    // 实时检查进程是否在运行
    let running = check_nanobot_running();

    // 如果进程实际在运行，但状态管理器中没有记录，需要更新状态
    if running {
        let mut process_guard = state.nanobot_process.lock().unwrap();
        if process_guard.is_none() {
            // 尝试从运行的进程中获取端口信息和启动时间
            let port = detect_nanobot_port().unwrap_or(18790);
            let start_timestamp = get_nanobot_start_time();

            let mut process_manager = ProcessManager::new(port);
            process_manager.set_running(true);

            // 如果获取到了进程启动时间戳，记录下来
            if let Some(timestamp) = start_timestamp {
                process_manager.set_process_start_timestamp(timestamp);
                // 设置一个估算的启动时间（当前时间减去进程已运行时间）
                let now = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_secs() as i64;
                let elapsed_secs = now - timestamp;
                // 创建一个"虚拟"的启动时间点
                process_manager.set_start_time(Instant::now() - std::time::Duration::from_secs(elapsed_secs as u64));
            } else {
                // 无法获取启动时间，使用当前时间作为起点
                process_manager.set_start_time(Instant::now());
            }

            *process_guard = Some(process_manager);
        }
    } else {
        // 进程不在运行，清除状态
        let process_guard = state.nanobot_process.lock().unwrap();
        if let Some(manager) = process_guard.as_ref() {
            manager.set_running(false);
        }
    }

    let port = state.nanobot_process.lock().unwrap()
        .as_ref()
        .map(|m| m.get_port());

    // 计算运行时间
    let uptime = if running {
        state.nanobot_process.lock().unwrap()
            .as_ref()
            .and_then(|m| m.get_start_time())
            .map(|start_time| {
                let duration = start_time.elapsed();
                let seconds = duration.as_secs();
                let hours = seconds / 3600;
                let minutes = (seconds % 3600) / 60;
                let secs = seconds % 60;

                if hours > 0 {
                    format!("{}h {}m {}s", hours, minutes, secs)
                } else if minutes > 0 {
                    format!("{}m {}s", minutes, secs)
                } else {
                    format!("{}s", secs)
                }
            })
    } else {
        None
    };

    Ok(json!({
        "running": running,
        "port": port,
        "uptime": uptime
    }))
}

/// 检测nanobot运行的端口
fn detect_nanobot_port() -> Option<u16> {
    let mut sys = System::new_all();
    sys.refresh_all();

    for (_pid, process) in sys.processes() {
        let name = process.name();
        if name.contains("python") || name.contains("nanobot") {
            let cmd = process.cmd();
            let cmd_str = cmd.join(" ");
            if cmd_str.contains("nanobot") && cmd_str.contains("gateway") {
                // 尝试从命令行中提取端口号
                if let Some(pos) = cmd_str.find("--port") {
                    let after_port = &cmd_str[pos + 7..];
                    let port_str: String = after_port
                        .chars()
                        .take_while(|c| c.is_ascii_digit())
                        .collect();
                    if let Ok(port) = port_str.parse::<u16>() {
                        return Some(port);
                    }
                }
                // 默认端口
                return Some(18790);
            }
        }
    }
    None
}

/// 获取nanobot进程的启动时间（Unix时间戳，秒）
fn get_nanobot_start_time() -> Option<i64> {
    let mut sys = System::new_all();
    sys.refresh_all();

    for (_pid, process) in sys.processes() {
        let name = process.name();
        if name.contains("python") || name.contains("nanobot") {
            let cmd = process.cmd();
            let cmd_str = cmd.join(" ");
            if cmd_str.contains("nanobot") && cmd_str.contains("gateway") {
                // 获取进程启动时间并转换为 i64
                return Some(process.start_time() as i64);
            }
        }
    }
    None
}

/// 下载nanobot (使用pip安装)
#[tauri::command]
pub async fn download_nanobot() -> Result<serde_json::Value, String> {
    // 查找 pip 命令
    let pip_cmd = find_command("pip3")
        .or_else(|| find_command("pip"))
        .unwrap_or_else(|| "pip3".to_string());

    // 使用 pip 安装 nanobot
    let output = Command::new(&pip_cmd)
        .args(&["install", "nanobot-ai"])
        .output()
        .context("执行pip install失败")
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok(json!({
            "status": "success",
            "message": "Nanobot下载安装成功"
        }))
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Ok(json!({
            "status": "failed",
            "message": format!("下载安装失败: {}", stderr)
        }))
    }
}

/// 初始化nanobot
#[tauri::command]
pub async fn onboard_nanobot() -> Result<serde_json::Value, String> {
    // 查找 nanobot 命令
    let nanobot_cmd = find_command("nanobot")
        .or_else(|| Some("nanobot".to_string()))
        .unwrap();

    // 使用 nanobot onboard 命令初始化
    let output = Command::new(&nanobot_cmd)
        .args(&["onboard"])
        .output()
        .context("执行nanobot onboard失败")
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok(json!({
            "status": "success",
            "message": "Nanobot初始化成功"
        }))
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Ok(json!({
            "status": "failed",
            "message": format!("初始化失败: {}", stderr)
        }))
    }
}

/// 获取系统资源使用情况
#[tauri::command]
pub async fn get_system_info() -> Result<serde_json::Value, String> {
    let mut sys = System::new_all();
    sys.refresh_all();

    // CPU 使用率
    let cpu_usage = sys.global_cpu_info().cpu_usage();

    // 内存使用情况
    let total_memory = sys.total_memory();
    let used_memory = sys.used_memory();
    let available_memory = sys.available_memory();
    let memory_usage_percent = if total_memory > 0 {
        (used_memory as f64 / total_memory as f64) * 100.0
    } else {
        0.0
    };

    // 格式化内存大小
    fn format_bytes(bytes: u64) -> String {
        if bytes < 1024 {
            format!("{} B", bytes)
        } else if bytes < 1024 * 1024 {
            format!("{:.2} KB", bytes as f64 / 1024.0)
        } else if bytes < 1024 * 1024 * 1024 {
            format!("{:.2} MB", bytes as f64 / (1024.0 * 1024.0))
        } else {
            format!("{:.2} GB", bytes as f64 / (1024.0 * 1024.0 * 1024.0))
        }
    }

    Ok(json!({
        "cpu": {
            "usage": cpu_usage,
            "usage_text": format!("{:.1}%", cpu_usage)
        },
        "memory": {
            "total": total_memory,
            "total_text": format_bytes(total_memory),
            "used": used_memory,
            "used_text": format_bytes(used_memory),
            "available": available_memory,
            "available_text": format_bytes(available_memory),
            "usage_percent": memory_usage_percent,
            "usage_text": format!("{:.1}%", memory_usage_percent)
        }
    }))
}

/// 检查 nanobot 配置是否完整
#[tauri::command]
pub async fn check_nanobot_config() -> Result<serde_json::Value, String> {
    let home_dir = dirs::home_dir()
        .context("无法找到用户主目录")
        .map_err(|e| e.to_string())?;

    let config_path = home_dir.join(".nanobot").join("config.json");

    if !config_path.exists() {
        return Ok(json!({
            "valid": false,
            "issue": "config_missing",
            "message": "配置文件不存在，请运行 'nanobot onboard' 初始化"
        }));
    }

    // 读取配置文件
    let config_content = std::fs::read_to_string(&config_path)
        .context("读取配置文件失败")
        .map_err(|e| e.to_string())?;

    let config: serde_json::Value = serde_json::from_str(&config_content)
        .context("解析配置文件失败")
        .map_err(|e| e.to_string())?;

    // 检查是否有至少一个 API key
    if let Some(providers) = config.get("providers") {
        if let Some(obj) = providers.as_object() {
            let has_api_key = obj.values().any(|provider| {
                provider.get("apiKey")
                    .and_then(|k| k.as_str())
                    .map(|k| !k.is_empty())
                    .unwrap_or(false)
            });

            if !has_api_key {
                return Ok(json!({
                    "valid": false,
                    "issue": "api_key_missing",
                    "message": "未配置 API key，请在配置编辑器中添加至少一个 provider 的 API key"
                }));
            }
        }
    }

    Ok(json!({
        "valid": true,
        "message": "配置检查通过"
    }))
}

/// 获取nanobot版本信息
#[tauri::command]
pub async fn get_nanobot_version() -> Result<serde_json::Value, String> {
    // 查找 nanobot 命令
    let nanobot_cmd = match find_command("nanobot") {
        Some(cmd) => cmd,
        None => {
            return Ok(json!({
                "installed": false,
                "version": null,
                "message": "未找到 nanobot"
            }))
        }
    };

    let output = Command::new(&nanobot_cmd)
        .arg("--version")
        .output()
        .context("执行nanobot --version失败，请确保已正确安装nanobot")
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
        Ok(json!({
            "installed": true,
            "version": version,
            "message": format!("nanobot {}", version)
        }))
    } else {
        Ok(json!({
            "installed": false,
            "version": null,
            "message": "未找到 nanobot"
        }))
    }
}

/// 获取 nanobot 可执行文件的完整路径
#[tauri::command]
pub async fn get_nanobot_path() -> Result<serde_json::Value, String> {
    match find_command("nanobot") {
        Some(path) => Ok(json!({
            "path": path,
            "found": true
        })),
        None => Ok(json!({
            "path": null,
            "found": false,
            "message": "未找到 nanobot"
        })),
    }
}
