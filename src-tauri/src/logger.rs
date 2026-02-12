use anyhow::{Context, Result};
use dirs::home_dir;
use serde_json::json;
use std::fs::File;
use std::io::{BufRead, BufReader, Seek, SeekFrom};
use std::path::PathBuf;
use std::sync::Arc;
use tauri::Emitter;

/// 文件位置跟踪器
pub struct FileTracker {
    log_path: PathBuf,
    position: u64,
}

impl FileTracker {
    pub fn new() -> Self {
        Self {
            log_path: PathBuf::new(),
            position: 0,
        }
    }
}

/// Watcher 任务句柄，用于取消监控任务
#[derive(Clone)]
pub struct WatcherHandle {
    running: Arc<std::sync::atomic::AtomicBool>,
    task_handle: Arc<tokio::sync::Mutex<Option<tokio::task::JoinHandle<()>>>>,
}

impl WatcherHandle {
    pub fn new() -> Self {
        Self {
            running: Arc::new(std::sync::atomic::AtomicBool::new(false)),
            task_handle: Arc::new(tokio::sync::Mutex::new(None)),
        }
    }

    pub fn is_running(&self) -> bool {
        self.running.load(std::sync::atomic::Ordering::Relaxed)
    }

    pub fn set_running(&self, running: bool) {
        self.running.store(running, std::sync::atomic::Ordering::Relaxed);
    }

    pub async fn set_task_handle(&self, handle: tokio::task::JoinHandle<()>) {
        let mut task = self.task_handle.lock().await;
        *task = Some(handle);
    }

    pub async fn abort(&self) {
        let mut task = self.task_handle.lock().await;
        if let Some(handle) = task.take() {
            handle.abort();
        }
        self.set_running(false);
    }
}

/// 获取日志文件路径
fn get_log_path() -> Result<PathBuf> {
    let home = home_dir().context("无法找到用户主目录")?;
    let log_path = home.join(".nanobot").join("logs").join("nanobot.log");
    Ok(log_path)
}

/// 获取最近的日志
#[tauri::command]
pub async fn get_logs(lines: Option<usize>) -> Result<serde_json::Value, String> {
    let log_path = get_log_path().map_err(|e| e.to_string())?;
    let line_count = lines.unwrap_or(100);

    if !log_path.exists() {
        return Ok(json!({
            "logs": Vec::<String>::new(),
            "message": "日志文件不存在"
        }));
    }

    let file = File::open(&log_path)
        .map_err(|e| format!("打开日志文件失败: {}", e))?;

    let reader = BufReader::new(file);
    let logs: Vec<String> = reader.lines()
        .filter_map(|line| line.ok())
        .collect();

    // 只返回最后N行
    let start = if logs.len() > line_count {
        logs.len() - line_count
    } else {
        0
    };

    Ok(json!({
        "logs": logs[start..].to_vec(),
        "total": logs.len(),
        "showing": logs.len() - start
    }))
}

/// 读取新增的日志行（从上次位置开始）
fn read_new_lines(log_path: &PathBuf, last_pos: &mut u64) -> Result<Vec<String>, String> {
    let mut file = File::open(log_path)
        .map_err(|e| format!("打开日志文件失败: {}", e))?;

    // 获取当前文件大小
    let current_size = file.metadata()
        .map(|m| m.len())
        .unwrap_or(0);

    // 如果文件被截断（例如日志轮转），重置位置
    if current_size < *last_pos {
        *last_pos = 0;
    }

    // 如果没有新内容，返回空
    if current_size == *last_pos {
        return Ok(Vec::new());
    }

    // 定位到上次读取的位置
    file.seek(SeekFrom::Start(*last_pos))
        .map_err(|e| format!("定位文件位置失败: {}", e))?;

    let reader = BufReader::new(file);
    let mut new_lines = Vec::new();

    for line in reader.lines() {
        if let Ok(log_line) = line {
            new_lines.push(log_line);
        }
    }

    // 更新位置为当前文件大小
    *last_pos = current_size;

    Ok(new_lines)
}

/// 启动日志流
#[tauri::command]
pub async fn start_log_stream(
    window: tauri::Window,
    file_tracker: tauri::State<'_, Arc<tokio::sync::Mutex<FileTracker>>>,
    watcher_handle: tauri::State<'_, Arc<WatcherHandle>>,
) -> Result<(), String> {
    // 检查是否已经在运行
    if watcher_handle.is_running() {
        return Ok(()); // 已经在运行，直接返回
    }

    watcher_handle.set_running(true);
    let log_path = get_log_path().map_err(|e| e.to_string())?;

    // 如果日志文件不存在，创建它
    if !log_path.exists() {
        // 确保目录存在
        if let Some(parent) = log_path.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|e| format!("创建日志目录失败: {}", e))?;
        }
        // 创建空日志文件
        std::fs::File::create(&log_path)
            .map_err(|e| format!("创建日志文件失败: {}", e))?;
    }

    // 获取当前文件大小作为起始位置
    let file_size = std::fs::metadata(&log_path)
        .map(|m| m.len())
        .unwrap_or(0);

    // 初始化文件位置跟踪
    {
        let mut tracker = file_tracker.lock().await;
        tracker.log_path = log_path.clone();
        tracker.position = file_size;
    }

    // 使用notify监控日志文件变化
    let log_path_clone = log_path.clone();
    let window_clone = window.clone();

    // 克隆 file_tracker 的 Arc，这样可以在闭包中使用
    let file_tracker_arc = file_tracker.inner().clone();

    let task = tokio::spawn(async move {
        use notify::{Watcher, RecursiveMode, EventKind, Result as NotifyResult, recommended_watcher};
        use std::time::Duration;

        let log_path_for_watch = log_path_clone.clone();
        // 为轮询再克隆一次变量
        let log_path_for_poll = log_path_clone.clone();
        let file_tracker_for_poll = file_tracker_arc.clone();
        let window_for_poll = window_clone.clone();

        // 创建 watcher，同时使用轮询作为备选方案
        let watcher_result = recommended_watcher(move |res: NotifyResult<notify::Event>| {
            match res {
                Ok(event) => {
                    if matches!(event.kind, EventKind::Modify(_)) {
                        // 使用 try_lock
                        let mut tracker = match file_tracker_arc.try_lock() {
                            Ok(guard) => guard,
                            Err(_) => {
                                eprintln!("无法获取锁，跳过此次更新");
                                return;
                            }
                        };

                        let last_pos = &mut tracker.position;
                        match read_new_lines(&log_path_clone, last_pos) {
                            Ok(new_lines) => {
                                if !new_lines.is_empty() {
                                    eprintln!("读取到 {} 行新日志", new_lines.len());
                                    match window_clone.emit("log-update", new_lines) {
                                        Ok(_) => {
                                            eprintln!("成功发送日志更新事件");
                                        }
                                        Err(e) => {
                                            eprintln!("发送事件失败: {:?}", e);
                                        }
                                    }
                                }
                            }
                            Err(e) => {
                                eprintln!("读取新行失败: {}", e);
                            }
                        }
                    }
                }
                Err(e) => {
                    eprintln!("监控错误: {:?}", e);
                }
            }
        }).map_err(|e| format!("创建文件监控器失败: {}", e));

        if let Err(ref e) = watcher_result {
            eprintln!("Watcher 创建失败: {}", e);
            return;
        }

        let mut watcher = watcher_result.unwrap();

        // 开始监控
        if let Err(e) = watcher.watch(&log_path_for_watch, RecursiveMode::NonRecursive) {
            eprintln!("监控日志文件失败: {}", e);
            return;
        }

        // 开始监控
        if let Err(e) = watcher.watch(&log_path_for_watch, RecursiveMode::NonRecursive) {
            eprintln!("监控日志文件失败: {}", e);
            return;
        }

        // 同时使用轮询作为备选方案，防止 watcher 漏掉某些事件
        loop {
            tokio::time::sleep(Duration::from_millis(500)).await;

            // 定期检查文件大小是否有变化
            if let Ok(metadata) = std::fs::metadata(&log_path_for_poll) {
                let current_size = metadata.len();

                // 尝试获取 tracker 检查是否有新内容
                if let Ok(mut tracker) = file_tracker_for_poll.try_lock() {
                    if current_size > tracker.position {
                        // 有新内容，读取新行
                        let last_pos = &mut tracker.position;
                        match read_new_lines(&log_path_for_poll, last_pos) {
                            Ok(new_lines) => {
                                if !new_lines.is_empty() {
                                    match window_for_poll.emit("log-update", new_lines) {
                                        Ok(_) => {}
                                        Err(e) => {
                                            eprintln!("轮询发送事件失败: {:?}", e);
                                        }
                                    }
                                }
                            }
                            Err(e) => {
                                eprintln!("轮询读取新行失败: {}", e);
                            }
                        }
                    }
                }
            }
        }
    });

    // 保存任务句柄
    watcher_handle.set_task_handle(task).await;

    Ok(())
}

/// 停止日志流
#[tauri::command]
pub async fn stop_log_stream(
    watcher_handle: tauri::State<'_, Arc<WatcherHandle>>,
) -> Result<(), String> {
    if watcher_handle.is_running() {
        watcher_handle.abort().await;
        Ok(())
    } else {
        Err("没有正在运行的日志监控".to_string())
    }
}

/// 获取日志统计信息
#[tauri::command]
pub async fn get_log_statistics() -> Result<serde_json::Value, String> {
    let log_path = get_log_path().map_err(|e| e.to_string())?;

    if !log_path.exists() {
        return Ok(json!({
            "total": 0,
            "debug": 0,
            "info": 0,
            "warn": 0,
            "error": 0,
        }));
    }

    let file = File::open(&log_path)
        .map_err(|e| format!("打开日志文件失败: {}", e))?;

    let reader = BufReader::new(file);
    let logs: Vec<String> = reader.lines()
        .filter_map(|line| line.ok())
        .collect();

    let mut debug = 0usize;
    let mut info = 0usize;
    let mut warn = 0usize;
    let mut error = 0usize;

    for log in &logs {
        let log_upper = log.to_uppercase();
        // 匹配 "| DEBUG |" 格式（前后可能有空格）
        if log_upper.contains("DEBUG") {
            debug += 1;
        } else if log_upper.contains("INFO") {
            info += 1;
        } else if log_upper.contains("WARNING") || log_upper.contains("WARN") {
            warn += 1;
        } else if log_upper.contains("ERROR") {
            error += 1;
        }
    }

    let total = logs.len();

    Ok(json!({
        "total": total,
        "debug": debug,
        "info": info,
        "warn": warn,
        "error": error,
    }))
}
