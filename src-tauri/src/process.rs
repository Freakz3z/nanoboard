use anyhow::{Context, Result};
use serde_json::json;
use std::env;
use std::fs::OpenOptions;
use std::path::Path;
use std::process::{Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::{Instant, Duration};
use sysinfo::System;
use tauri::State;
use std::sync::Mutex;

use crate::AppState;

// 进程检查缓存，避免频繁刷新进程列表
struct ProcessCheckCache {
    is_running: Option<bool>,
    last_update: Option<Instant>,
}

impl ProcessCheckCache {
    fn new() -> Self {
        Self {
            is_running: None,
            last_update: None,
        }
    }

    fn get(&mut self) -> bool {
        const CACHE_DURATION: Duration = Duration::from_secs(2);

        if let Some(last_update) = self.last_update {
            if last_update.elapsed() < CACHE_DURATION {
                if let Some(result) = self.is_running {
                    return result;
                }
            }
        }

        // 缓存过期或为空，重新检查
        let result = check_nanobot_running_impl();
        self.is_running = Some(result);
        self.last_update = Some(Instant::now());
        result
    }

    fn invalidate(&mut self) {
        self.is_running = None;
        self.last_update = None;
    }
}

static PROCESS_CACHE: Mutex<Option<ProcessCheckCache>> = Mutex::new(None);

fn get_cached_nanobot_status() -> bool {
    // 使用 lock().unwrap_or_else() 处理 poison 情况
    // 如果锁被 poison（之前的线程 panic），我们恢复并重新创建缓存
    let mut cache = PROCESS_CACHE.lock().unwrap_or_else(|e| {
        log::warn!("进程缓存锁被 poison，正在恢复: {}", e);
        e.into_inner()
    });
    if cache.is_none() {
        *cache = Some(ProcessCheckCache::new());
    }
    cache.as_mut().unwrap().get()
}

fn invalidate_cache() {
    let mut cache = PROCESS_CACHE.lock().unwrap_or_else(|e| {
        log::warn!("进程缓存锁被 poison，正在恢复: {}", e);
        e.into_inner()
    });
    if let Some(c) = cache.as_mut() {
        c.invalidate();
    }
}

/// 检查缓存是否过期（超过 1 秒），如果过期则使其失效
fn invalidate_cache_if_expired() {
    let mut cache = PROCESS_CACHE.lock().unwrap_or_else(|e| {
        log::warn!("进程缓存锁被 poison，正在恢复: {}", e);
        e.into_inner()
    });
    if let Some(c) = cache.as_mut() {
        if let Some(last_update) = c.last_update {
            if last_update.elapsed() > Duration::from_secs(1) {
                c.invalidate();
            }
        }
    }
}

/// 为命令设置隐藏窗口（仅 Windows）
/// 在其他平台上不执行任何操作
pub(crate) fn apply_hidden_window(cmd: Command) -> Command {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        let mut cmd = cmd;
        cmd.creation_flags(CREATE_NO_WINDOW);
        cmd
    }

    #[cfg(not(target_os = "windows"))]
    {
        cmd
    }
}

/// 获取用户的 shell PATH
/// 通过加载用户的 shell 配置文件来获取完整的 PATH
fn get_user_path() -> Vec<String> {
    let mut paths = Vec::new();

    // 获取当前用户主目录
    if let Ok(home) = env::var("HOME") {
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
                            let path_value = path_value.trim().replace(['"', '\''], "");
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

    let output = apply_hidden_window(Command::new(which_cmd))
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
    if let Ok(home) = env::var("HOME") {
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

    let output = apply_hidden_window(Command::new(&pip_cmd))
        .args(["show", package])
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
pub(crate) fn find_command(command: &str) -> Option<String> {
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

            #[cfg(target_os = "windows")]
            {
                return Some(full_path.to_string_lossy().to_string());
            }

            #[cfg(not(target_os = "windows"))]
            {
                return Some(full_path.to_string_lossy().to_string());
            }
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

/// 检查nanobot进程是否正在运行（内部实现）
fn check_nanobot_running_impl() -> bool {
    let mut sys = System::new_all();
    sys.refresh_all();

    for process in sys.processes().values() {
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

/// 检查nanobot进程是否正在运行（带缓存）
fn check_nanobot_running() -> bool {
    get_cached_nanobot_status()
}

/// 启动nanobot
#[tauri::command]
pub async fn start_nanobot(port: Option<u16>, state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let port = port.unwrap_or(18790);

    // 使缓存失效，重新检查状态
    invalidate_cache();

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

    // 查找 nanobot 命令
    let nanobot_cmd = match find_command("nanobot") {
        Some(cmd) => cmd,
        None => {
            return Ok(json!({
                "status": "failed",
                "message": "未找到 nanobot 命令，请先安装 nanobot-ai"
            }));
        }
    };

    log::info!("找到 nanobot 命令: {}", nanobot_cmd);

    // 先用测试模式运行来捕获错误信息
    let test_output = apply_hidden_window(Command::new(&nanobot_cmd))
        .args(["--help"])
        .env("PYTHONUTF8", "1")
        .env("PYTHONIOENCODING", "utf-8")
        .output();

    match test_output {
        Ok(output) => {
            if !output.status.success() {
                let stderr = String::from_utf8_lossy(&output.stderr);
                return Ok(json!({
                    "status": "failed",
                    "message": format!("nanobot 命令执行失败: {}", stderr)
                }));
            }
        }
        Err(e) => {
            return Ok(json!({
                "status": "failed",
                "message": format!("无法执行 nanobot 命令: {}", e)
            }));
        }
    }

    // 打开日志文件用于追加（如果不存在则创建）
    let log_file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_path)
        .map_err(|e| format!("无法打开日志文件: {}", e))?;

    // 记录启动前的日志文件大小，用于后续读取新产生的日志
    let log_size_before = log_path.metadata()
        .map(|m| m.len())
        .unwrap_or(0);

    // 启动 nanobot gateway，直接将 stdout 和 stderr 都重定向到日志文件
    let mut child = match apply_hidden_window(Command::new(&nanobot_cmd))
        .args(["gateway", "--port", &port.to_string()])
        .env("PYTHONUTF8", "1")
        .env("PYTHONIOENCODING", "utf-8")
        .stdout(Stdio::from(log_file.try_clone().map_err(|e| format!("复制文件句柄失败: {}", e))?))
        .stderr(Stdio::from(log_file))
        .spawn()
    {
        Ok(c) => c,
        Err(e) => {
            return Ok(json!({
                "status": "failed",
                "message": format!("启动 nanobot 失败: {}", e)
            }));
        }
    };

    // 获取进程ID
    let id = child.id();
    log::info!("Nanobot进程已启动 (PID: {})，等待初始化...", id);

    // 等待进程初始化（从 2 秒减少到 1.5 秒，因为不需要重启了）
    tokio::time::sleep(tokio::time::Duration::from_millis(1500)).await;

    // 检查进程状态
    match child.try_wait() {
        Ok(Some(status)) => {
            // 进程已经退出，从日志文件读取错误信息
            let error_msg = read_new_log_content(&log_path, log_size_before);

            return Ok(json!({
                "status": "failed",
                "message": format!("Nanobot启动后立即退出: {}", error_msg.trim()),
                "exit_code": status.code(),
                "log_path": log_path.to_string_lossy().to_string()
            }));
        },
        Ok(None) => {
            // 进程还在运行，检查是否真正启动成功
            if check_nanobot_running() {
                // 保存进程信息到状态
                let mut process_manager = ProcessManager::new(port);
                process_manager.set_running(true);
                process_manager.set_start_time(Instant::now());

                *state.nanobot_process.lock().unwrap() = Some(process_manager);

                log::info!("Nanobot进程 (PID: {}) 启动成功，端口: {}", id, port);

                Ok(json!({
                    "status": "started",
                    "message": format!("Nanobot已在端口 {} 启动", port),
                    "port": port,
                    "pid": id,
                    "log_path": log_path.to_string_lossy().to_string()
                }))
            } else {
                // 进程在运行但 check_nanobot_running 返回 false
                // 可能是进程正在启动中但还未完全就绪
                // 再等待一小段时间
                tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;

                if check_nanobot_running() {
                    let mut process_manager = ProcessManager::new(port);
                    process_manager.set_running(true);
                    process_manager.set_start_time(Instant::now());

                    *state.nanobot_process.lock().unwrap() = Some(process_manager);

                    Ok(json!({
                        "status": "started",
                        "message": format!("Nanobot已在端口 {} 启动", port),
                        "port": port,
                        "pid": id,
                        "log_path": log_path.to_string_lossy().to_string()
                    }))
                } else {
                    Ok(json!({
                        "status": "failed",
                        "message": "Nanobot进程启动但未能正常运行，请检查日志文件",
                        "log_path": log_path.to_string_lossy().to_string()
                    }))
                }
            }
        },
        Err(e) => {
            log::error!("检查nanobot进程状态时出错: {}", e);
            Ok(json!({
                "status": "failed",
                "message": format!("检查进程状态失败: {}", e),
                "log_path": log_path.to_string_lossy().to_string()
            }))
        }
    }
}

/// 从日志文件读取新增的内容（从指定位置开始）
fn read_new_log_content(log_path: &std::path::Path, start_pos: u64) -> String {
    use std::io::{Read, Seek, SeekFrom};

    match std::fs::File::open(log_path) {
        Ok(mut file) => {
            if let Err(e) = file.seek(SeekFrom::Start(start_pos)) {
                return format!("无法定位日志文件: {}", e);
            }

            let mut content = String::new();
            if let Err(e) = file.read_to_string(&mut content) {
                return format!("无法读取日志文件: {}", e);
            }

            // 只返回最后 1000 个字符，避免过长
            if content.len() > 1000 {
                format!("...{}", &content[content.len() - 1000..])
            } else {
                content
            }
        },
        Err(e) => format!("无法打开日志文件: {}", e)
    }
}

/// 停止nanobot
#[tauri::command]
pub async fn stop_nanobot(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    // 使缓存失效
    invalidate_cache();

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
    // 实时检查进程是否在运行（不需要缓存，因为需要准确状态）
    // 但我们可以使用较短的有效期来减少刷新
    invalidate_cache_if_expired();

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

    for process in sys.processes().values() {
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

    for process in sys.processes().values() {
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

    log::info!("使用 pip 安装: {}", pip_cmd);

    // 步骤 1: 检查并升级 pip
    log::info!("检查 pip 版本...");
    let upgrade_output = apply_hidden_window(Command::new(&pip_cmd))
        .args(["install", "--upgrade", "pip"])
        .output();

    if let Ok(upgrade_out) = upgrade_output {
        if upgrade_out.status.success() {
            log::info!("pip 升级成功");
        } else {
            log::warn!("pip 升级失败，继续尝试安装");
        }
    }

    // 步骤 2: 尝试多种方式安装 nanobot-ai
    let install_methods = [
        // 方法 1: 使用官方 PyPI 源
        vec!["install", "--index-url", "https://pypi.org/simple", "nanobot-ai"],
        // 方法 2: 使用清华镜像源（国内更快）
        vec!["install", "-i", "https://pypi.tuna.tsinghua.edu.cn/simple", "nanobot-ai"],
        // 方法 3: 不指定源，使用默认
        vec!["install", "nanobot-ai"],
    ];

    let mut last_error = String::new();

    for (idx, args) in install_methods.iter().enumerate() {
        log::info!("尝试安装方法 {}: {:?}", idx + 1, args);

        let output = apply_hidden_window(Command::new(&pip_cmd))
            .args(args)
            .output()
            .context("执行pip install失败")
            .map_err(|e| e.to_string())?;

        if output.status.success() {
            return Ok(json!({
                "status": "success",
                "message": "Nanobot下载安装成功"
            }));
        }

        let stderr = String::from_utf8_lossy(&output.stderr);
        last_error = format!("安装失败: {}", stderr);

        // 如果不是"找不到包"的错误，可能是网络问题，尝试下一个方法
        if !stderr.contains("Could not find a version") && !stderr.contains("No matching distribution") {
            log::warn!("安装方法 {} 失败，尝试下一个方法", idx + 1);
            continue;
        }

        // 如果是"找不到包"的错误，所有方法都会失败，直接返回
        break;
    }

    // 所有方法都失败，返回详细错误信息
    let suggestion = if last_error.contains("Could not find a version") || last_error.contains("No matching distribution") {
        // 检查是否是 Python 版本问题
        if last_error.contains("Requires-Python") || last_error.contains("Requires-Python >=3.11") || last_error.contains("python version") {
            "\n\n❌ Python 版本问题！\n\nnanobot-ai 需要 **Python 3.11 或更高版本**\n\n请先升级 Python：\nmacOS:\n  brew install python@3.12\n  或\n  pyenv install 3.12.0 && pyenv global 3.12.0\n\n\nWindows:\n  访问 https://www.python.org/downloads/\n  下载并安装 Python 3.11+\n\n升级后请重启应用再试"
        } else {
            "\n\n可能原因：\n1. nanobot-ai 包名称可能已变更\n2. PyPI 服务暂时不可用\n3. 需要使用其他安装方式\n\n\n建议：\n- 访问 https://pypi.org 搜索 nanobot-ai\n- 或在终端手动运行: pip3 install nanobot-ai\n- 检查是否需要使用 uv 工具安装"
        }
    } else if last_error.contains("pip version") {
        "\n\n可能原因：pip 版本过低\n\n建议：\n- 在终端运行: python3 -m pip install --upgrade pip\n- 然后重新尝试安装"
    } else if last_error.contains("SSL") || last_error.contains("certificate") {
        "\n\n可能原因：SSL 证书验证失败\n\n建议：\n- 检查系统时间是否正确\n- 尝试使用国内镜像源"
    } else {
        "\n\n请检查：\n- 网络连接是否正常\n- Python 环境是否正确配置\n- 是否有足够的权限安装包"
    };

    Ok(json!({
        "status": "failed",
        "message": last_error + suggestion
    }))
}

/// 下载nanobot (使用uv安装，更快更可靠)
#[tauri::command]
pub async fn download_nanobot_with_uv() -> Result<serde_json::Value, String> {
    // 查找 uv 命令
    let uv_cmd = find_command("uv");

    let uv_cmd = match uv_cmd {
        Some(cmd) => cmd,
        None => {
            return Ok(json!({
                "status": "failed",
                "message": "未找到 uv 命令\n\n请先安装 uv：\nmacOS/Linux: curl -LsSf https://astral.sh/uv/install.sh | sh\nWindows: powershell -c \"irm https://astral.sh/uv/install.ps1 | iex\"\n\n或使用 pip 按钮代替"
            }));
        }
    };

    log::info!("使用 uv 安装: {}", uv_cmd);

    // 使用 uv tool install 安装（更快更可靠）
    let output = apply_hidden_window(Command::new(&uv_cmd))
        .args(["tool", "install", "nanobot-ai"])
        .output()
        .context("执行 uv install 失败")
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok(json!({
            "status": "success",
            "message": "Nanobot下载安装成功（使用 uv）"
        }))
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let error_msg = format!("安装失败: {}", stderr);

        let suggestion = if stderr.contains("Could not find a version") || stderr.contains("No matching distribution") {
            if stderr.contains("Requires-Python") || stderr.contains("python") {
                "\n\n❌ Python 版本问题！\n\nnanobot-ai 需要 **Python 3.11 或更高版本**\n\n请先升级 Python：\nmacOS:\n  brew install python@3.12\n  或\n  pyenv install 3.12.0 && pyenv global 3.12.0\n\nWindows:\n  访问 https://www.python.org/downloads/\n  下载并安装 Python 3.11+"
            } else {
                "\n\n可能原因：\n1. nanobot-ai 包名称可能已变更\n2. PyPI 服务暂时不可用\n\n建议：\n- 使用 pip 按钮代替\n- 访问 https://pypi.org 搜索 nanobot-ai"
            }
        } else if stderr.contains("SSL") || stderr.contains("certificate") {
            "\n\n可能原因：SSL 证书验证失败\n\n建议：\n- 检查系统时间是否正确"
        } else {
            "\n\n请检查网络连接和 uv 安装状态"
        };

        Ok(json!({
            "status": "failed",
            "message": error_msg + suggestion
        }))
    }
}

/// 初始化nanobot
#[tauri::command]
pub async fn onboard_nanobot() -> Result<serde_json::Value, String> {
    // 在 Windows 上，需要使用 Python 来运行 nanobot 模块，并强制 UTF-8 模式
    #[cfg(target_os = "windows")]
    let output = {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;

        // 查找 Python 可执行文件
        let python_cmd = find_via_which("python")
            .or_else(|| find_via_which("python3"))
            .or_else(|| find_via_which("py"))
            .unwrap_or_else(|| "python".to_string());

        log::info!("使用 Python 执行 onboard: {}", python_cmd);

        // 使用 -X utf8 强制 Python 使用 UTF-8 模式
        // 这样可以避免 Rich 库检测到 Windows 控制台后使用 GBK 编码
        Command::new(&python_cmd)
            .creation_flags(CREATE_NO_WINDOW)
            .args(&["-X", "utf8", "-m", "nanobot", "onboard"])
            .env("PYTHONUTF8", "1")
            .env("PYTHONIOENCODING", "utf-8")
            .output()
            .context("执行 nanobot onboard 失败")
            .map_err(|e| e.to_string())?
    };

    #[cfg(not(target_os = "windows"))]
    let output = {
        let nanobot_cmd = find_command("nanobot")
            .or_else(|| Some("nanobot".to_string()))
            .unwrap();

        apply_hidden_window(Command::new(&nanobot_cmd))
            .args(["onboard"])
            .env("PYTHONIOENCODING", "utf-8")
            .output()
            .context("执行 nanobot onboard 失败")
            .map_err(|e| e.to_string())?
    };

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

    // 获取操作系统信息
    let os_name = System::name().unwrap_or_else(|| "Unknown".to_string());
    let os_version = System::os_version().unwrap_or_else(|| "Unknown".to_string());
    let arch = std::env::consts::ARCH.to_string();

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

    // 获取交换空间使用情况
    let total_swap = sys.total_swap();
    let used_swap = sys.used_swap();
    let available_swap = total_swap.saturating_sub(used_swap);
    let swap_usage_percent = if total_swap > 0 {
        (used_swap as f64 / total_swap as f64) * 100.0
    } else {
        0.0
    };

    Ok(json!({
        "os": os_name,
        "os_version": os_version,
        "arch": arch,
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
        },
        "swap": {
            "total": total_swap,
            "total_text": format_bytes(total_swap),
            "used": used_swap,
            "used_text": format_bytes(used_swap),
            "available": available_swap,
            "available_text": format_bytes(available_swap),
            "usage_percent": swap_usage_percent,
            "usage_text": format!("{:.1}%", swap_usage_percent)
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
    // 统一通过 nanobot -v 获取版本
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

    let output = apply_hidden_window(Command::new(&nanobot_cmd))
        .arg("-v")
        .env("PYTHONUTF8", "1")
        .env("PYTHONIOENCODING", "utf-8")
        .output()
        .context("执行 nanobot -v 失败，请确保已正确安装 nanobot")
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

/// 检查 OAuth Provider 的 token 是否存在
/// OAuth token 存储在系统应用数据目录中，由 oauth-cli-kit 管理
#[tauri::command]
pub async fn check_oauth_token(provider: String) -> Result<serde_json::Value, String> {
    // OAuth token 由 oauth-cli-kit 库管理
    // 存储位置：
    // - macOS: ~/Library/Application Support/oauth-cli-kit/auth/{provider}.json
    // - Linux: ~/.local/share/oauth-cli-kit/auth/{provider}.json
    // - Windows: %APPDATA%/oauth-cli-kit/auth/{provider}.json
    // 也可以从 ~/.codex/auth.json 导入（针对 openai-codex）

    let home_dir = match dirs::home_dir() {
        Some(dir) => dir,
        None => {
            return Ok(json!({
                "has_token": false,
                "message": "无法找到用户主目录"
            }));
        }
    };

    // 检查多个可能的 token 位置
    let token_paths = get_oauth_token_paths(&home_dir, &provider);

    for token_path in token_paths {
        if token_path.exists() {
            // 尝试读取并验证 token 文件
            if let Ok(content) = std::fs::read_to_string(&token_path) {
                if let Ok(token_data) = serde_json::from_str::<serde_json::Value>(&content) {
                    // 检查是否有 access token（支持 "access" 和 "token" 两种字段名）
                    let has_access = token_data.get("access")
                        .or_else(|| token_data.get("token"))
                        .and_then(|v| v.as_str())
                        .map(|s| !s.is_empty())
                        .unwrap_or(false);

                    if has_access {
                        // 检查 token 是否过期
                        // 支持 "expires"（毫秒）和 "expires_at"（秒，litellm 格式）
                        let now_secs = std::time::SystemTime::now()
                            .duration_since(std::time::UNIX_EPOCH)
                            .unwrap()
                            .as_secs() as i64;
                        let is_expired = if let Some(expires_at) = token_data.get("expires_at").and_then(|v| v.as_i64()) {
                            expires_at < now_secs
                        } else if let Some(expires_ms) = token_data.get("expires").and_then(|v| v.as_i64()) {
                            expires_ms < (now_secs * 1000)
                        } else {
                            false
                        };

                        return Ok(json!({
                            "has_token": true,
                            "is_expired": is_expired,
                            "message": if is_expired { "Token 已过期，请重新登录" } else { "Token 有效" },
                            "provider": provider
                        }));
                    }
                }
            }
        }
    }

    // 对于 openai-codex，也检查 ~/.codex/auth.json
    if provider == "openai-codex" {
        let codex_auth_path = home_dir.join(".codex").join("auth.json");
        if codex_auth_path.exists() {
            if let Ok(content) = std::fs::read_to_string(&codex_auth_path) {
                if let Ok(auth_data) = serde_json::from_str::<serde_json::Value>(&content) {
                    let tokens = auth_data.get("tokens");
                    if let Some(tokens_obj) = tokens {
                        let has_access = tokens_obj.get("access_token")
                            .and_then(|v| v.as_str())
                            .map(|s| !s.is_empty())
                            .unwrap_or(false);

                        if has_access {
                            return Ok(json!({
                                "has_token": true,
                                "is_expired": false,
                                "message": "从 Codex CLI 导入的 token",
                                "provider": provider,
                                "source": "codex_cli"
                            }));
                        }
                    }
                }
            }
        }
    }

    Ok(json!({
        "has_token": false,
        "message": "未找到 OAuth token，请先登录",
        "provider": provider
    }))
}

/// 获取 OAuth token 可能的存储路径
fn get_oauth_token_paths(home_dir: &std::path::Path, provider: &str) -> Vec<std::path::PathBuf> {
    let mut paths = Vec::new();

    // 将 provider 名称转换为文件名格式
    // 例如: "openai-codex" -> "openai_codex_oauth.json" 或 "oauth.json"
    let provider_filename = provider.replace("-", "_");

    // macOS: ~/Library/Application Support/oauth-cli-kit/auth/
    #[cfg(target_os = "macos")]
    {
        let macos_path = home_dir
            .join("Library")
            .join("Application Support")
            .join("oauth-cli-kit")
            .join("auth")
            .join(format!("{}_oauth.json", provider_filename));
        paths.push(macos_path);

        // 也检查默认的 oauth.json
        let default_path = home_dir
            .join("Library")
            .join("Application Support")
            .join("oauth-cli-kit")
            .join("auth")
            .join("oauth.json");
        paths.push(default_path);
    }

    // Linux: ~/.local/share/oauth-cli-kit/auth/
    #[cfg(target_os = "linux")]
    {
        let linux_path = home_dir
            .join(".local")
            .join("share")
            .join("oauth-cli-kit")
            .join("auth")
            .join(format!("{}_oauth.json", provider_filename));
        paths.push(linux_path);

        let default_path = home_dir
            .join(".local")
            .join("share")
            .join("oauth-cli-kit")
            .join("auth")
            .join("oauth.json");
        paths.push(default_path);
    }

    // Windows: %APPDATA%/oauth-cli-kit/auth/
    #[cfg(target_os = "windows")]
    {
        if let Ok(appdata) = std::env::var("APPDATA") {
            let win_path = std::path::PathBuf::from(&appdata)
                .join("oauth-cli-kit")
                .join("auth")
                .join(format!("{}_oauth.json", provider_filename));
            paths.push(win_path);

            let default_path = std::path::PathBuf::from(&appdata)
                .join("oauth-cli-kit")
                .join("auth")
                .join("oauth.json");
            paths.push(default_path);
        }
    }

    // ~/.config/litellm/{provider_filename}/api-key.json（nanobot 实际使用的存储格式）
    {
        let litellm_path = home_dir
            .join(".config")
            .join("litellm")
            .join(&provider_filename)
            .join("api-key.json");
        paths.insert(0, litellm_path);
    }

    // 环境变量覆盖
    if let Ok(custom_path) = std::env::var("OAUTH_CLI_KIT_TOKEN_PATH") {
        paths.insert(0, std::path::PathBuf::from(custom_path));
    }

    paths
}

/// OAuth Provider 登录
/// 通过打开终端运行 nanobot provider login 命令
#[tauri::command]
pub async fn provider_login(provider: String) -> Result<serde_json::Value, String> {
    let nanobot_cmd = match find_command("nanobot") {
        Some(cmd) => cmd,
        None => {
            return Ok(json!({
                "success": false,
                "message": "未找到 nanobot 命令，请先安装 nanobot"
            }));
        }
    };

    // 构建登录命令
    let login_command = format!("{} provider login {}", nanobot_cmd, provider);
    log::info!("执行 OAuth 登录: {}", login_command);

    // 在 macOS 上使用 Terminal.app 打开终端
    #[cfg(target_os = "macos")]
    {
        let script = format!(
            r#"tell application "Terminal"
                do script "{}"
                activate
            end tell"#,
            login_command
        );
        match Command::new("osascript")
            .args(["-e", &script])
            .spawn()
        {
            Ok(_) => Ok(json!({
                "success": true,
                "message": "已在终端中打开登录流程，请在终端中完成授权"
            })),
            Err(e) => Ok(json!({
                "success": false,
                "message": format!("打开终端失败: {}", e)
            })),
        }
    }

    // 在 Linux 上尝试使用常见终端模拟器
    #[cfg(target_os = "linux")]
    {
        let terminals = ["gnome-terminal", "konsole", "xterm", "alacritty", "kitty"];
        let mut success = false;

        for terminal in terminals {
            let result = Command::new(terminal)
                .args(["-e", &login_command])
                .spawn();

            if result.is_ok() {
                success = true;
                break;
            }
        }

        if success {
            Ok(json!({
                "success": true,
                "message": "已在终端中打开登录流程，请在终端中完成授权"
            }))
        } else {
            Ok(json!({
                "success": false,
                "message": "无法打开终端，请手动运行: nanobot provider login {}".replace("{}", &provider)
            }))
        }
    }

    // 在 Windows 上使用 cmd
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NEW_CONSOLE: u32 = 0x00000010;

        match Command::new("cmd")
            .args(["/C", "start", "cmd", "/K", &login_command])
            .creation_flags(CREATE_NEW_CONSOLE)
            .spawn()
        {
            Ok(_) => Ok(json!({
                "success": true,
                "message": "已在命令提示符中打开登录流程，请在命令提示符中完成授权"
            })),
            Err(e) => Ok(json!({
                "success": false,
                "message": format!("打开命令提示符失败: {}", e)
            })),
        }
    }
}

/// 诊断 nanobot 环境，帮助用户排查问题
#[tauri::command]
pub async fn diagnose_nanobot() -> Result<serde_json::Value, String> {
    let mut diagnostics = Vec::new();
    let mut has_issues = false;

    // 1. 检查 Python 环境
    let mut python_check = check_python_environment();
    diagnostics.push(python_check.clone());
    if python_check.has_issue {
        has_issues = true;
    }

    // 2. 检查 pip 命令
    let pip_check = check_pip_command();
    diagnostics.push(pip_check.clone());
    if pip_check.has_issue {
        has_issues = true;
    }

    // 3. 检查 nanobot 安装
    let nanobot_check = check_nanobot_installation();
    diagnostics.push(nanobot_check.clone());
    if nanobot_check.has_issue {
        has_issues = true;
    }

    // 4. 检查配置文件
    let config_check = check_config_file();
    diagnostics.push(config_check.clone());
    if config_check.has_issue {
        has_issues = true;
    }

    // 5. 检查 nanobot 依赖
    let deps_check = check_nanobot_dependencies();
    diagnostics.push(deps_check.clone());
    if deps_check.has_issue {
        has_issues = true;
    }

    // 6. 新增：检查 nanobot 实际可用性
    // 如果 nanobot 已安装且可运行，说明环境实际上可以工作
    // 此时即使 Python 版本显示"过低"，也应该视为警告而非错误
    let nanobot_usable_check = check_nanobot_usable();
    diagnostics.push(nanobot_usable_check.clone());

    // 如果 nanobot 可用，调整 Python 版本检查的状态
    if nanobot_usable_check.status == "ok" {
        // nanobot 可用，说明 Python 版本实际满足要求
        // 将 Python 检查改为 warning 或 ok
        if python_check.status == "error" {
            python_check.status = "warning".to_string();
            python_check.message = format!("{} (但 nanobot 可用)", python_check.message);
            // 如果只有 Python 版本问题且 nanobot 可用，则不算错误
            if diagnostics.iter().filter(|d| d.name == "Python 环境").count() == 1
                && diagnostics.iter().filter(|d| d.name == "nanobot 安装" || d.name == "nanobot 可用性").count() > 0 {
                has_issues = false; // nanobot 可用，整体通过
            }
        }
    }

    Ok(json!({
        "overall": if has_issues { "failed" } else { "passed" },
        "checks": diagnostics
    }))
}

#[derive(Clone, serde::Serialize)]
struct DiagnosticCheck {
    key: String,
    name: String,
    status: String,
    message: String,
    message_key: String,
    details: Option<String>,
    has_issue: bool,
}

fn check_python_environment() -> DiagnosticCheck {
    #[cfg(windows)]
    let python_commands = &["python", "python3", "py"];
    #[cfg(not(windows))]
    let python_commands = &["python3", "python"];

    for cmd in python_commands {
        if let Some(path) = find_via_which(cmd) {
            // 检查版本
            let output = apply_hidden_window(Command::new(cmd))
                .arg("--version")
                .output();

            if let Ok(out) = output {
                if out.status.success() {
                    let version_str = String::from_utf8_lossy(&out.stdout).trim().to_string();

                    // 解析版本号并检查是否 >= 3.11
                    let version_check = parse_python_version(&version_str);
                    if let Some((major, minor, _)) = version_check {
                        if major > 3 || (major == 3 && minor >= 11) {
                            return DiagnosticCheck {
                                key: "pythonEnv".to_string(),
                                name: "Python 环境".to_string(),
                                status: "ok".to_string(),
                                message: format!("找到 Python: {}", version_str),
                                message_key: "found".to_string(),
                                details: Some(path),
                                has_issue: false,
                            };
                        } else {
                            // Python 版本过低
                            return DiagnosticCheck {
                                key: "pythonEnv".to_string(),
                                name: "Python 环境".to_string(),
                                status: "error".to_string(),
                                message: format!("Python 版本过低: {} (需要 >= 3.11)", version_str),
                                message_key: "versionLow".to_string(),
                                details: Some(format!("{}|{}", major, minor)),
                                has_issue: true,
                            };
                        }
                    }
                }
            }
        }
    }

    DiagnosticCheck {
        key: "pythonEnv".to_string(),
        name: "Python 环境".to_string(),
        status: "error".to_string(),
        message: "未找到 Python 3.11+".to_string(),
        message_key: "notFound".to_string(),
        details: None,
        has_issue: true,
    }
}

/// 解析 Python 版本字符串，返回 (major, minor, patch)
/// 例如 "Python 3.11.0" -> (3, 11, 0)
fn parse_python_version(version_str: &str) -> Option<(u32, u32, u32)> {
    // 提取版本号，格式如 "Python 3.11.0" 或 "Python 3.12"
    let version_part = version_str
        .strip_prefix("Python ")
        .or(Some(version_str))
        .unwrap_or(version_str);

    let parts: Vec<&str> = version_part.split('.').collect();
    if parts.len() >= 2 {
        let major = parts[0].parse::<u32>().ok()?;
        let minor = parts[1].parse::<u32>().ok()?;
        let patch = if parts.len() >= 3 {
            parts[2].parse::<u32>().ok()
        } else {
            Some(0)
        };
        Some((major, minor, patch.unwrap_or(0)))
    } else {
        None
    }
}

fn check_pip_command() -> DiagnosticCheck {
    if let Some(pip_path) = find_command_pip() {
        // 检查 pip 版本
        let output = apply_hidden_window(Command::new(&pip_path))
            .arg("--version")
            .output();

        if let Ok(out) = output {
            if out.status.success() {
                let version = String::from_utf8_lossy(&out.stdout).trim().to_string();
                return DiagnosticCheck {
                    key: "pipCommand".to_string(),
                    name: "pip 命令".to_string(),
                    status: "ok".to_string(),
                    message: format!("找到 pip: {}", version),
                    message_key: "found".to_string(),
                    details: Some(pip_path),
                    has_issue: false,
                };
            }
        }
    }

    DiagnosticCheck {
        key: "pipCommand".to_string(),
        name: "pip 命令".to_string(),
        status: "warning".to_string(),
        message: "未找到 pip 命令".to_string(),
        message_key: "notFound".to_string(),
        details: None,
        has_issue: false,
    }
}

fn check_nanobot_installation() -> DiagnosticCheck {
    let nanobot_path = find_command("nanobot");

    if let Some(path) = nanobot_path {
        // 尝试运行 --version
        let output = apply_hidden_window(Command::new(&path))
            .arg("--version")
            .env("PYTHONUTF8", "1")
            .env("PYTHONIOENCODING", "utf-8")
            .output();

        match output {
            Ok(out) if out.status.success() => {
                let version = String::from_utf8_lossy(&out.stdout).trim().to_string();
                DiagnosticCheck {
                    key: "nanobotInstall".to_string(),
                    name: "nanobot 安装".to_string(),
                    status: "ok".to_string(),
                    message: format!("nanobot 已安装: {}", version),
                    message_key: "installed".to_string(),
                    details: Some(path),
                    has_issue: false,
                }
            }
            Ok(out) => {
                let stderr = String::from_utf8_lossy(&out.stderr);
                DiagnosticCheck {
                    key: "nanobotInstall".to_string(),
                    name: "nanobot 安装".to_string(),
                    status: "error".to_string(),
                    message: "nanobot 命令存在但执行失败".to_string(),
                    message_key: "execFailed".to_string(),
                    details: Some(format!("{}\n{}", stderr.trim(), path)),
                    has_issue: true,
                }
            }
            Err(e) => {
                DiagnosticCheck {
                    key: "nanobotInstall".to_string(),
                    name: "nanobot 安装".to_string(),
                    status: "error".to_string(),
                    message: "nanobot 命令存在但无法执行".to_string(),
                    message_key: "cannotExec".to_string(),
                    details: Some(e.to_string()),
                    has_issue: true,
                }
            }
        }
    } else {
        DiagnosticCheck {
            key: "nanobotInstall".to_string(),
            name: "nanobot 安装".to_string(),
            status: "error".to_string(),
            message: "未安装 nanobot-ai".to_string(),
            message_key: "notInstalled".to_string(),
            details: None,
            has_issue: true,
        }
    }
}

/// 检查 nanobot 是否实际可用（已安装且可正常运行）
/// 如果 nanobot 可用，说明环境实际上满足要求
fn check_nanobot_usable() -> DiagnosticCheck {
    // 首先检查 nanobot 是否已安装
    let nanobot_path = find_command("nanobot");

    if let Some(path) = nanobot_path {
        // 尝试运行 --version 来验证可用性
        let output = apply_hidden_window(Command::new(&path))
            .arg("--version")
            .env("PYTHONUTF8", "1")
            .env("PYTHONIOENCODING", "utf-8")
            .output();

        match output {
            Ok(out) if out.status.success() => {
                let version = String::from_utf8_lossy(&out.stdout).trim().to_string();
                DiagnosticCheck {
                    key: "nanobotUsable".to_string(),
                    name: "nanobot 可用性".to_string(),
                    status: "ok".to_string(),
                    message: format!("nanobot 可正常运行 (版本: {})", version),
                    message_key: "usable".to_string(),
                    details: Some(path),
                    has_issue: false,
                }
            }
            Ok(out) => {
                // 命令执行失败
                DiagnosticCheck {
                    key: "nanobotUsable".to_string(),
                    name: "nanobot 可用性".to_string(),
                    status: "warning".to_string(),
                    message: "nanobot 已安装但执行异常".to_string(),
                    message_key: "abnormal".to_string(),
                    details: Some(format!("{}\n{}", String::from_utf8_lossy(&out.stderr).trim(), path)),
                    has_issue: true,
                }
            }
            Err(e) => {
                DiagnosticCheck {
                    key: "nanobotUsable".to_string(),
                    name: "nanobot 可用性".to_string(),
                    status: "error".to_string(),
                    message: "nanobot 命令存在但无法执行".to_string(),
                    message_key: "cannotExec".to_string(),
                    details: Some(e.to_string()),
                    has_issue: true,
                }
            }
        }
    } else {
        // nanobot 未安装
        DiagnosticCheck {
            key: "nanobotUsable".to_string(),
            name: "nanobot 可用性".to_string(),
            status: "error".to_string(),
            message: "nanobot 未安装".to_string(),
            message_key: "notInstalled".to_string(),
            details: None,
            has_issue: true,
        }
    }
}

fn check_config_file() -> DiagnosticCheck {
    let home_dir = match dirs::home_dir() {
        Some(dir) => dir,
        None => {
            return DiagnosticCheck {
                key: "configFile".to_string(),
                name: "配置文件".to_string(),
                status: "error".to_string(),
                message: "无法找到用户主目录".to_string(),
                message_key: "homeNotFound".to_string(),
                details: None,
                has_issue: true,
            };
        }
    };

    let config_path = home_dir.join(".nanobot").join("config.json");

    if !config_path.exists() {
        return DiagnosticCheck {
            key: "configFile".to_string(),
            name: "配置文件".to_string(),
            status: "warning".to_string(),
            message: "配置文件不存在".to_string(),
            message_key: "notExist".to_string(),
            details: None,
            has_issue: false,
        };
    }

    // 检查配置文件是否有效
    let config_content = match std::fs::read_to_string(&config_path) {
        Ok(content) => content,
        Err(e) => {
            return DiagnosticCheck {
                key: "configFile".to_string(),
                name: "配置文件".to_string(),
                status: "error".to_string(),
                message: "无法读取配置文件".to_string(),
                message_key: "cannotRead".to_string(),
                details: Some(e.to_string()),
                has_issue: true,
            };
        }
    };

    match serde_json::from_str::<serde_json::Value>(&config_content) {
        Ok(_) => DiagnosticCheck {
            key: "configFile".to_string(),
            name: "配置文件".to_string(),
            status: "ok".to_string(),
            message: "配置文件存在且有效".to_string(),
            message_key: "valid".to_string(),
            details: Some(config_path.to_string_lossy().to_string()),
            has_issue: false,
        },
        Err(e) => DiagnosticCheck {
            key: "configFile".to_string(),
            name: "配置文件".to_string(),
            status: "error".to_string(),
            message: "配置文件格式无效".to_string(),
            message_key: "invalidFormat".to_string(),
            details: Some(e.to_string()),
            has_issue: true,
        },
    }
}

fn check_nanobot_dependencies() -> DiagnosticCheck {
    // 检查一些常见的依赖
    let mut missing_deps = Vec::new();

    // 检查 fastapi
    if apply_hidden_window(Command::new("python"))
        .args(["-c", "import fastapi"])
        .output()
        .is_err()
    {
        missing_deps.push("fastapi");
    }

    // 检查 openai
    if apply_hidden_window(Command::new("python"))
        .args(["-c", "import openai"])
        .output()
        .is_err()
    {
        missing_deps.push("openai");
    }

    if missing_deps.is_empty() {
        DiagnosticCheck {
            key: "dependencies".to_string(),
            name: "依赖检查".to_string(),
            status: "ok".to_string(),
            message: "核心依赖已安装".to_string(),
            message_key: "installed".to_string(),
            details: None,
            has_issue: false,
        }
    } else {
        DiagnosticCheck {
            key: "dependencies".to_string(),
            name: "依赖检查".to_string(),
            status: "warning".to_string(),
            message: format!("部分依赖可能缺失: {}", missing_deps.join(", ")),
            message_key: "missing".to_string(),
            details: Some(missing_deps.join(", ")),
            has_issue: false,
        }
    }
}

/// 获取 Dashboard 所需的所有数据（合并 API，减少调用次数）
#[tauri::command]
pub async fn get_dashboard_data(
    state: State<'_, AppState>,
    network_state: State<'_, std::sync::Mutex<crate::network::NetworkMonitor>>,
) -> Result<serde_json::Value, String> {
    // 并行获取各项数据
    let status_future = get_status_internal(&state);
    let system_info_future = get_system_info_internal();

    // 获取配置
    let config_result = crate::config::load_config_internal();

    // 获取日志统计
    let log_stats_result = crate::logger::get_log_statistics_internal();

    // 获取网络统计
    let network_stats = {
        let mut monitor = network_state.lock().unwrap();
        monitor.get_stats()
    };

    // 等待所有异步操作完成
    let (status, system_info) = tokio::join!(status_future, system_info_future);

    Ok(json!({
        "status": status?,
        "systemInfo": system_info?,
        "config": config_result.unwrap_or(json!({"error": "无法加载配置"})),
        "logStatistics": log_stats_result.unwrap_or(json!({
            "total": 0,
            "debug": 0,
            "info": 0,
            "warn": 0,
            "error": 0,
        })),
        "networkStats": network_stats,
    }))
}

/// 内部函数：获取进程状态（不带 #[tauri::command]）
async fn get_status_internal(state: &AppState) -> Result<serde_json::Value, String> {
    // 实时检查进程是否在运行
    invalidate_cache_if_expired();

    let running = check_nanobot_running();

    // 如果进程实际在运行，但状态管理器中没有记录，需要更新状态
    if running {
        let mut process_guard = state.nanobot_process.lock().unwrap();
        if process_guard.is_none() {
            let port = detect_nanobot_port().unwrap_or(18790);
            let start_timestamp = get_nanobot_start_time();

            let mut process_manager = ProcessManager::new(port);
            process_manager.set_running(true);

            if let Some(timestamp) = start_timestamp {
                process_manager.set_process_start_timestamp(timestamp);
                let now = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_secs() as i64;
                let elapsed_secs = now - timestamp;
                process_manager.set_start_time(Instant::now() - std::time::Duration::from_secs(elapsed_secs as u64));
            } else {
                process_manager.set_start_time(Instant::now());
            }

            *process_guard = Some(process_manager);
        }
    } else {
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

/// 内部函数：获取系统信息（不带 #[tauri::command]）
async fn get_system_info_internal() -> Result<serde_json::Value, String> {
    let mut sys = System::new_all();
    sys.refresh_all();

    // 获取操作系统信息
    let os_name = System::name().unwrap_or_else(|| "Unknown".to_string());
    let os_version = System::os_version().unwrap_or_else(|| "Unknown".to_string());
    let arch = std::env::consts::ARCH.to_string();

    let cpu_usage = sys.global_cpu_info().cpu_usage();
    let total_memory = sys.total_memory();
    let used_memory = sys.used_memory();
    let available_memory = sys.available_memory();
    let memory_usage_percent = if total_memory > 0 {
        (used_memory as f64 / total_memory as f64) * 100.0
    } else {
        0.0
    };

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

    let total_swap = sys.total_swap();
    let used_swap = sys.used_swap();
    let available_swap = total_swap.saturating_sub(used_swap);
    let swap_usage_percent = if total_swap > 0 {
        (used_swap as f64 / total_swap as f64) * 100.0
    } else {
        0.0
    };

    Ok(json!({
        "os": os_name,
        "os_version": os_version,
        "arch": arch,
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
        },
        "swap": {
            "total": total_swap,
            "total_text": format_bytes(total_swap),
            "used": used_swap,
            "used_text": format_bytes(used_swap),
            "available": available_swap,
            "available_text": format_bytes(available_swap),
            "usage_percent": swap_usage_percent,
            "usage_text": format!("{:.1}%", swap_usage_percent)
        }
    }))
}

// 全局自定义路径状态

// 自定义路径存储（使用静态变量存储在内存中）
static CUSTOM_PYTHON_PATH: std::sync::OnceLock<std::sync::Mutex<Option<String>>> = std::sync::OnceLock::new();
static CUSTOM_NANOBOT_PATH: std::sync::OnceLock<std::sync::Mutex<Option<String>>> = std::sync::OnceLock::new();

fn get_custom_python_path_internal() -> Option<String> {
    CUSTOM_PYTHON_PATH
        .get_or_init(|| std::sync::Mutex::new(None))
        .lock()
        .ok()
        .and_then(|p| p.clone())
}

fn set_custom_python_path_internal(path: Option<String>) {
    if let Ok(mut storage) = CUSTOM_PYTHON_PATH
        .get_or_init(|| std::sync::Mutex::new(None))
        .lock()
    {
        *storage = path;
    }
}

fn get_custom_nanobot_path_internal() -> Option<String> {
    CUSTOM_NANOBOT_PATH
        .get_or_init(|| std::sync::Mutex::new(None))
        .lock()
        .ok()
        .and_then(|p| p.clone())
}

fn set_custom_nanobot_path_internal(path: Option<String>) {
    if let Ok(mut storage) = CUSTOM_NANOBOT_PATH
        .get_or_init(|| std::sync::Mutex::new(None))
        .lock()
    {
        *storage = path;
    }
}

/// 设置自定义路径
#[tauri::command]
pub async fn set_custom_paths(
    python_path: Option<String>,
    nanobot_path: Option<String>,
) -> Result<serde_json::Value, String> {
    set_custom_python_path_internal(python_path.clone());
    set_custom_nanobot_path_internal(nanobot_path.clone());

    log::info!("自定义路径已更新: python={:?}, nanobot={:?}", python_path, nanobot_path);

    Ok(json!({
        "status": "success",
        "message": "自定义路径已保存"
    }))
}

/// 获取自定义路径
#[tauri::command]
pub async fn get_custom_paths() -> Result<serde_json::Value, String> {
    let python_path = get_custom_python_path_internal();
    let nanobot_path = get_custom_nanobot_path_internal();

    Ok(json!({
        "pythonPath": python_path,
        "nanobotPath": nanobot_path
    }))
}

/// 获取 Python 可执行文件路径
#[tauri::command]
pub async fn get_python_path() -> Result<serde_json::Value, String> {
    // 优先使用自定义路径
    if let Some(custom) = get_custom_python_path_internal() {
        if !custom.is_empty() {
            return Ok(json!({
                "path": custom,
                "found": true,
                "source": "custom"
            }));
        }
    }

    // 自动检测
    #[cfg(windows)]
    let python_commands = &["python", "python3", "py"];
    #[cfg(not(windows))]
    let python_commands = &["python3", "python"];

    for cmd in python_commands {
        if let Some(path) = find_via_which(cmd) {
            return Ok(json!({
                "path": path,
                "found": true,
                "source": "auto"
            }));
        }
    }

    Ok(json!({
        "path": null,
        "found": false,
        "source": "auto",
        "message": "未找到 Python"
    }))
}
