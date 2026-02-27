# 首次运行指南

## 🚨 重要提示

由于项目是从其他位置复制过来的，`node_modules` 和 `package-lock.json` 可能需要重新生成。

## 快速开始

### 1. 清理旧的依赖

```bash
# macOS/Linux
rm -rf node_modules package-lock.json

# Windows (PowerShell)
Remove-Item -Recurse -Force node_modules, package-lock.json
```

### 2. 重新安装依赖

```bash
npm install
```

### 3. 启动开发模式

```bash
npm run tauri:dev
```

### 4. 生产构建

```bash
# macOS ARM64 (Apple Silicon)
npm run tauri:build -- --target aarch64-apple-darwin

# macOS Intel x64
npm run tauri:build -- --target x86_64-apple-darwin

# Windows/Linux
npm run tauri:build
```

## 环境要求

- **Node.js**: 18+ 
- **Rust**: 1.70+
- **操作系统**: macOS / Windows / Linux

### 检查环境

```bash
# 检查 Node.js
node -v  # 应该 >= 18.0.0

# 检查 npm
npm -v

# 检查 Rust
rustc --version  # 应该 >= 1.70.0
```

## 常见问题

### Q: 遇到 `Cannot find module '../lib/tsc.js'` 错误

**解决方案**:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Q: Tauri 构建失败

**解决方案**:
1. 确保 Rust 已正确安装：`curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
2. 安装系统依赖：
   - **macOS**: 安装 Xcode Command Line Tools
   - **Windows**: 安装 Visual Studio C++ Build Tools
   - **Linux**: `sudo apt install build-essential libwebkit2gtk-4.0-dev libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev`

### Q: 开发模式启动慢

**解决方案**:
- 第一次启动会编译 Rust 后端，可能需要几分钟
- 后续启动会使用缓存，速度会快很多
- 可以删除 `src-tauri/target` 目录重新编译

## 项目位置

- **工作区**: `/Users/freakk/.nanobot/workspace/2026-02/nanoboard`
- **源代码**: `src/` (前端) + `src-tauri/` (后端)
- **文档**: `DEVELOPMENT.md`, `OPTIMIZATION_SUMMARY.md`

## 最近更新

### 2026-02-28 性能优化

- ✅ 日志组件性能提升 10 倍
- ✅ 支持 10000+ 条日志流畅渲染
- ✅ 添加虚拟滚动（react-virtuoso）
- ✅ 使用 useMemo 优化过滤逻辑
- ✅ 添加完整开发文档

详见 `OPTIMIZATION_SUMMARY.md`

---

**如有问题，请查看**:
- [DEVELOPMENT.md](DEVELOPMENT.md) - 完整开发文档
- [OPTIMIZATION_SUMMARY.md](OPTIMIZATION_SUMMARY.md) - 优化总结
- [README.md](README.md) - 项目说明
