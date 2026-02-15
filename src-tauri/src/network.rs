use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::State;

#[derive(Clone, serde::Serialize)]
pub struct NetworkStats {
    pub upload_speed: u64,
    pub download_speed: u64,
    pub total_upload: u64,
    pub total_download: u64,
}

// 平台特定的网络统计获取
#[cfg(target_os = "linux")]
fn get_network_stats_impl() -> (u64, u64) {
    use std::fs;
    // 读取 /proc/net/dev 获取网络统计
    if let Ok(content) = fs::read_to_string("/proc/net/dev") {
        let mut total_received = 0u64;
        let mut total_transmitted = 0u64;

        for line in content.lines().skip(2) {
            // 跳过标题行
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() >= 10 {
                // 排除回环接口 (lo)
                if !parts[0].starts_with("lo:") {
                    if let Ok(rx) = parts[1].parse::<u64>() {
                        total_received += rx;
                    }
                    if let Ok(tx) = parts[9].parse::<u64>() {
                        total_transmitted += tx;
                    }
                }
            }
        }
        (total_received, total_transmitted)
    } else {
        (0, 0)
    }
}

#[cfg(target_os = "macos")]
fn get_network_stats_impl() -> (u64, u64) {
    use std::process::Command;
    // 使用 netstat 命令获取网络统计
    // 尝试常见的网络接口：en0, en1
    let interfaces = ["en0", "en1"];

    for iface in interfaces {
        if let Ok(output) = Command::new("netstat")
            .args(["-b", "-I", iface])
            .output()
        {
            let content = String::from_utf8_lossy(&output.stdout);
            let lines: Vec<&str> = content.lines().collect();
            // 跳过标题行（第一行），读取数据行（第二行）
            if lines.len() > 1 {
                if let Some(line) = lines.get(1) {
                    let parts: Vec<&str> = line.split_whitespace().collect();
                    // Ibytes 在索引 6，Obytes 在索引 9
                    if parts.len() >= 10 {
                        let rx: u64 = parts.get(6).and_then(|s| s.parse().ok()).unwrap_or(0);
                        let tx: u64 = parts.get(9).and_then(|s| s.parse().ok()).unwrap_or(0);
                        return (rx, tx);
                    }
                }
            }
        }
    }
    (0, 0)
}

#[cfg(target_os = "windows")]
fn get_network_stats_impl() -> (u64, u64) {
    use std::os::windows::process::CommandExt;

    // 使用 PowerShell 获取网络统计，使用 CREATE_NO_WINDOW 避免终端弹窗
    let mut total_received = 0u64;
    let mut total_transmitted = 0u64;

    // 获取所有网络适配器的统计信息
    match std::process::Command::new("powershell")
        .args([
            "-NoProfile",
            "-Command",
            "Get-NetAdapterStatistics | Select-Object ReceivedBytes,SentBytes"
        ])
        .creation_flags(0x08000000) // CREATE_NO_WINDOW
        .output()
    {
        Ok(output) => {
            if !output.status.success() {
                let stderr = String::from_utf8_lossy(&output.stderr);
                log::warn!("PowerShell 网络统计命令执行失败: {}", stderr);
            } else {
                let content = String::from_utf8_lossy(&output.stdout);
                for line in content.lines() {
                    let parts: Vec<&str> = line.split_whitespace().collect();
                    if parts.len() >= 2 {
                        if let Ok(rx) = parts[0].parse::<u64>() {
                            total_received += rx;
                        }
                        if let Ok(tx) = parts[1].parse::<u64>() {
                            total_transmitted += tx;
                        }
                    }
                }
            }
        }
        Err(e) => {
            log::warn!("无法执行 PowerShell 获取网络统计: {}", e);
        }
    }

    (total_received, total_transmitted)
}

pub struct NetworkMonitor {
    last_received: u64,
    last_transmitted: u64,
    last_update: Option<Instant>,
}

impl NetworkMonitor {
    // 最小更新间隔，避免频繁调用 PowerShell
    const MIN_UPDATE_INTERVAL: Duration = Duration::from_millis(1000);

    pub fn new() -> Self {
        let (total_received, total_transmitted) = get_network_stats_impl();

        Self {
            last_received: total_received,
            last_transmitted: total_transmitted,
            last_update: Some(Instant::now()),
        }
    }

    pub fn get_stats(&mut self) -> NetworkStats {
        // 检查是否到了更新时间
        let should_update = match self.last_update {
            Some(last) => last.elapsed() >= Self::MIN_UPDATE_INTERVAL,
            None => true,
        };

        if !should_update {
            // 返回速度为 0 的统计数据（使用缓存的总量）
            return NetworkStats {
                upload_speed: 0,
                download_speed: 0,
                total_upload: self.last_transmitted,
                total_download: self.last_received,
            };
        }

        let (total_received, total_transmitted) = get_network_stats_impl();

        // 计算差值得到速度（字节/秒）
        let download_speed = total_received.saturating_sub(self.last_received);
        let upload_speed = total_transmitted.saturating_sub(self.last_transmitted);

        // 更新上次值和时间
        self.last_received = total_received;
        self.last_transmitted = total_transmitted;
        self.last_update = Some(Instant::now());

        NetworkStats {
            upload_speed,
            download_speed,
            total_upload: total_transmitted,
            total_download: total_received,
        }
    }
}

// Tauri 命令：初始化网络监控器
#[tauri::command]
pub fn init_network_monitor(_state: State<Mutex<NetworkMonitor>>) {
    // 监控器已在 main.rs 中初始化，这里无需额外操作
}

// Tauri 命令：获取网络统计数据
#[tauri::command]
pub fn get_network_stats(state: State<Mutex<NetworkMonitor>>) -> NetworkStats {
    let mut monitor = state.lock().unwrap();
    monitor.get_stats()
}
