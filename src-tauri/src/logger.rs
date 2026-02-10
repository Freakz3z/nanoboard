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
    state: tauri::State<'_, Arc<tokio::sync::Mutex<FileTracker>>>,
) -> Result<(), String> {
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
        let mut tracker = state.lock().await;
        tracker.log_path = log_path.clone();
        tracker.position = file_size;
    }

    // 使用notify监控日志文件变化
    let log_path_clone = log_path.clone();
    let window_clone = window.clone();

    // 克隆 state 的 Arc，这样可以在闭包中使用
    let state_arc = state.inner().clone();

    tokio::spawn(async move {
        use notify::{Watcher, RecursiveMode, EventKind, Result as NotifyResult, recommended_watcher};
        use std::time::Duration;

        let log_path_for_watch = log_path_clone.clone();

        // 创建 watcher
        let watcher = recommended_watcher(move |res: NotifyResult<notify::Event>| {
            match res {
                Ok(event) => {
                    if matches!(event.kind, EventKind::Modify(_)) {
                        // 使用 try_lock
                        let mut tracker = match state_arc.try_lock() {
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

        if let Err(ref e) = watcher {
            eprintln!("Watcher 创建失败: {}", e);
            return;
        }

        let mut watcher = watcher.unwrap();

        // 开始监控
        if let Err(e) = watcher.watch(&log_path_for_watch, RecursiveMode::NonRecursive) {
            eprintln!("监控日志文件失败: {}", e);
            return;
        }

        // 保持任务运行
        loop {
            tokio::time::sleep(Duration::from_secs(1)).await;
        }
    });

    Ok(())
}

/// 停止日志流
#[tauri::command]
pub async fn stop_log_stream() -> Result<(), String> {
    // 在实际实现中，这里应该停止监控任务
    // 目前只是占位符
    Ok(())
}
