# 跨平台兼容性说明

本文档说明 Nanoboard 在 Ubuntu (Linux) 和 Windows 系统上的功能支持情况。

## 支持的平台

- **macOS** (开发平台)
- **Linux/Ubuntu**
- **Windows**

## 功能模块兼容性

### 1. 进程管理 (process.rs)

#### 跨平台实现
✅ **命令查找** (`find_command`)
- macOS/Linux: 使用 `which` 命令
- Windows: 使用 `where` 命令
- 通过 `find_via_pip()` 支持虚拟环境查找

✅ **路径处理**
- Windows: 使用 `Path::to_string_lossy()` 处理路径字符串转换
- Unix: 直接使用 `Path::to_string_lossy()`

✅ **窗口控制**
- Windows: 使用 `CREATE_NO_WINDOW` 标志避免控制台窗口
- Unix/macOS: 不需要特殊处理

✅ **进程管理**
- 使用 `std::process::Command` (跨平台)
- 重定向 stdin/stdout/stderr (跨平台)
- 进程检测使用 `sysinfo` 库 (跨平台)

#### 功能说明
- ✅ 启动 nanobot 进程
- ✅ 停止 nanobot 进程
- ✅ 检测进程运行状态
- ✅ 获取进程 PID 和运行时间
- ✅ 跨平台日志重定向

### 2. 网络监控 (network.rs)

#### 平台特定实现

✅ **macOS** (`target_os = "macos"`)
```rust
// 使用 netstat 命令获取网络接口统计
Command::new("netstat")
    .args(["-b", "-I", "en0"])  // 或 en1
    .output()
```
- 读取上行/下行字节数 (Ibytes/Obytes)
- 计算每秒速度（差值）

✅ **Linux** (`target_os = "linux"`)
```rust
// 读取 /proc/net/dev 文件
std::fs::read_to_string("/proc/net/dev")
```
- 解析所有网络接口（除回环 lo）
- 提取接收/发送字节数
- 计算每秒速度（差值）

✅ **Windows** (`target_os = "windows"`)
```rust
// 使用 PowerShell 获取网络统计
Command::new("powershell")
    .args(&[
        "-Command",
        "Get-NetTCPStatistics | Select-Object -Property BytesReceived,BytesSent"
    ])
    .output()
```
- 获取累计接收/发送字节数
- 需要进一步优化为实时速度（当前返回累计值）

#### 功能状态
| 平台 | 实时速度 | 总流量 | 状态 |
|--------|---------|--------|------|
| macOS | ✅ | ✅ | ✅ |
| Linux | ✅ | ✅ | ✅ |
| Windows | ⚠️ | ⚠️ ⚠️ |

**注意**: Windows 需要实现真实的实时网络速度监控，当前返回累计值。

### 3. 磁盘监控 (process.rs - `get_disk_usage`)

#### 平台特定实现

✅ **macOS** (`target_os = "macos"`)
```rust
// 使用 df 命令获取根分区信息
Command::new("df")
    .args(["-k", "/"])
    .output()
```
- 返回总空间和可用空间（KB 单位）
- 转换为字节（×1024）
- 计算使用百分比

✅ **Linux** (`target_os = "linux"`)
```rust
// 使用 df 命令获取根分区信息
Command::new("df")
    .args(["-k", "/"])
    .output()
```
- 与 macOS 相同的实现

✅ **Windows** (`target_os = "windows"`)
```rust
// 使用 PowerShell 获取磁盘信息
Command::new("powershell")
    .args(&[
        "-Command",
        "Get-PSDrive C | Where-Object {$_.DriveType -eq 3} | Select-Object -Property Size,FreeSpace"
    ])
    .output()
```
- 获取总字节数和可用字节数
- 计算使用百分比

#### 功能状态
| 平台 | 磁盘信息 | 使用率 | 状态 |
|--------|---------|--------|------|
| macOS | ✅ | ✅ | ✅ |
| Linux | ✅ | ✅ | ✅ |
| Windows | ✅ | ✅ | ✅ |

### 4. 系统监控 (process.rs - `get_system_info`)

#### 跨平台功能
使用 `sysinfo` 库获取系统信息，该库支持：
- ✅ CPU 使用率 (所有平台)
- ✅ 内存使用情况 (所有平台)
- ⚠️ 磁盘列表 (sysinfo 0.30 不支持 `disks()` 方法)
  - 已通过平台特定的 df/PowerShell 实现
- ✅ 系统负载 (Unix-like 系统)

#### 功能状态
| 指标 | macOS | Linux | Windows |
|--------|-------|-------|--------|
| CPU 使用率 | ✅ | ✅ | ✅ |
| 内存使用率 | ✅ | ✅ | ✅ |
| 磁盘使用率 | ✅ | ✅ | ✅ |
| 系统负载 | ✅ | ✅ | ❌ |

### 5. 日志监控 (logger.rs)

#### 跨平台功能
- ✅ 文件监控 (使用 `notify` 库，跨平台)
- ✅ 文件读取 (`std::fs::read_to_string`)
- ✅ 流式传输 (Tauri events，跨平台)
- ✅ 日志解析 (正则表达式，跨平台)

### 6. 配置管理 (config.rs)

#### 跨平台功能
- ✅ 配置文件读写 (`std::fs`, 跨平台)
- ✅ JSON 解析/序列化 (`serde_json`, 跨平台)
- ✅ 配置验证 (JSON Schema, 跨平台)
- ✅ 历史版本管理 (文件操作，跨平台)

## 测试建议

### Ubuntu/Linux 测试
1. 验证进程管理：启动、停止、重启 nanobot
2. 验证网络监控：检查 netstat 输出
3. 验证磁盘监控：检查 df 命令输出
4. 验证日志监控：检查日志文件监控
5. 验证配置管理：读写配置文件

### Windows 测试
1. 验证进程管理：启动、停止、重启 nanobot
2. 验证网络监控：检查 PowerShell 输出
3. 验证磁盘监控：检查 PowerShell Get-PSDrive 输出
4. 验证日志监控：检查日志文件监控
5. 验证配置管理：读写配置文件

### 模拟器测试
由于开发在 macOS，建议：
- 使用 Windows 虚拟机测试
- 使用 Linux 虚拟机 (VMware/VirtualBox) 测试
- 或使用 GitHub Actions/CI 在多个平台上构建

## 已知问题

### Windows 平台
1. **网络监控**: PowerShell `Get-NetTCPStatistics` 返回累计值，不是实时速度
   - 建议: 实现定时器，记录上一次的值，计算差值
   - 或者使用性能计数器 API

2. **系统负载**: Windows 不支持 Unix 风格的负载平均值
   - 建议: 使用 WMI 或性能计数器

3. **路径分隔符**: Windows 使用 `\`，Unix 使用 `/`
   - 当前代码已使用 `Path::to_string_lossy()` 正确处理

## 改进建议

### 短期 (v0.1.6)
1. ✅ 完善 Windows 网络监控的实时速度计算
2. ✅ 添加 Windows 系统负载监控 (WMI)
3. ✅ 优化 Windows 性能和兼容性测试

### 中期 (v0.2.0)
1. 添加完整的 Windows 自动化测试
2. 添加更多系统监控指标（GPU 温度、电池等）
3. 实现 Windows 服务安装和更新机制

## 版本兼容性

当前版本：v0.1.5

测试通过的平台：
- ✅ macOS (原生开发环境)
- ⏳ Ubuntu/Linux (需要测试)
- ⏳ Windows (需要测试)

建议用户在部署前进行目标平台的完整测试。
