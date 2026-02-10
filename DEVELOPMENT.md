# 开发指南

欢迎加入 Nanoboard 的开发！本文档将帮助你快速上手开发环境。

## 📚 目录

- [开发环境设置](#开发环境设置)
- [项目架构](#项目架构)
- [开发工作流](#开发工作流)
- [前端开发](#前端开发)
- [后端开发](#后端开发)
- [调试技巧](#调试技巧)
- [测试](#测试)
- [构建和发布](#构建和发布)
- [常见问题](#常见问题)
- [资源链接](#资源链接)

## 🔧 开发环境设置

### 前置要求

确保你已经安装了以下工具：

1. **Rust** (1.70+)
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```

2. **Node.js** (20+)
   ```bash
   # 推荐使用 nvm
   nvm install 20
   nvm use 20
   ```

3. **系统依赖**

   **macOS**:
   ```bash
   xcode-select --install
   ```

   **Ubuntu/Debian**:
   ```bash
   sudo apt update
   sudo apt install libwebkit2gtk-4.0-dev build-essential \
     curl wget file libxdo-dev libssl-dev \
     libayatana-appindicator3-dev librsvg2-dev
   ```

   **Windows**:
   - 安装 [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
   - 安装 [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/)

### 克隆仓库

```bash
git clone https://github.com/Freakz3z/nanoboard.git
cd nanoboard
```

### 安装依赖

```bash
# 安装 Node.js 依赖
npm install

# Rust 依赖会在构建时自动安装
```

### 启动开发服务器

```bash
npm run tauri:dev
```

这将：
- 启动 Vite 开发服务器（支持热重载）
- 编译 Rust 后端
- 打开 Tauri 应用窗口

## 🏗️ 项目架构

### 技术栈

**前端：**
- React 18 - UI 框架
- TypeScript - 类型安全
- Vite - 构建工具
- TailwindCSS - 样式框架
- React Router v6 - 路由管理
- Monaco Editor - 代码编辑器

**后端：**
- Rust - 系统语言
- Tauri 2.0 - 桌面应用框架
- Tokio - 异步运行时
- notify - 文件系统监控

### 目录结构

```
nanoboard/
├── src/                          # React 前端源码
│   ├── components/               # 可复用组件
│   │   ├── Layout.tsx           # 主布局
│   │   ├── ConfirmDialog.tsx    # 确认对话框
│   │   ├── EmptyState.tsx       # 空状态提示
│   │   ├── Toast.tsx            # 消息提示
│   │   └── KeyboardShortcutsHelp.tsx  # 快捷键帮助
│   ├── pages/                   # 页面组件
│   │   ├── Dashboard.tsx        # 仪表盘
│   │   ├── ConfigEditor.tsx     # 配置编辑器
│   │   ├── CodeEditor.tsx       # 代码编辑器
│   │   ├── Logs.tsx             # 日志监控
│   │   └── Sessions.tsx         # 会话管理
│   ├── lib/                     # 工具库
│   │   ├── tauri.ts            # Tauri API 封装
│   │   └── defaultConfig.ts    # 默认配置
│   ├── contexts/                # React Context
│   │   └── ToastContext.tsx    # Toast 状态管理
│   ├── hooks/                   # 自定义 Hooks
│   │   └── useToast.ts        # Toast Hook
│   ├── assets/                  # 静态资源
│   ├── App.tsx                  # 根组件
│   └── main.tsx                 # 应用入口
├── src-tauri/                   # Rust 后端
│   ├── src/
│   │   ├── main.rs             # 主入口
│   │   ├── config.rs           # 配置管理
│   │   ├── process.rs          # 进程控制
│   │   ├── logger.rs           # 日志读取与监控
│   │   └── session.rs          # 会话管理
│   ├── Cargo.toml              # Rust 依赖
│   └── tauri.conf.json         # Tauri 配置
├── public/                      # 公共资源
├── package.json                 # Node.js 配置
├── vite.config.ts              # Vite 配置
├── tailwind.config.js          # TailwindCSS 配置
└── tsconfig.json               # TypeScript 配置
```

## 💻 开发工作流

### 日常开发流程

1. **创建功能分支**
   ```bash
   git checkout -b feature/your-feature
   ```

2. **进行开发**
   - 前端代码会自动热重载
   - Rust 代码修改后会自动重新编译

3. **测试更改**
   ```bash
   # 运行类型检查
   tsc --noEmit

   # 运行 linter
   npm run lint
   ```

4. **提交代码**
   ```bash
   git add .
   git commit -m "feat: add your feature"
   ```

## 🎨 前端开发

### 添加新页面

1. 在 `src/pages/` 创建新组件：

```tsx
// src/pages/NewPage.tsx
import { useState } from "react";

export default function NewPage() {
  const [data, setData] = useState("");

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">新页面</h1>
      {/* 页面内容 */}
    </div>
  );
}
```

2. 在 `App.tsx` 中添加路由：

```tsx
import NewPage from "./pages/NewPage";

// 在路由配置中添加
<Route path="/new-page" element={<NewPage />} />
```

3. 在 `Layout.tsx` 中添加导航（如需要）：

```tsx
const navItems = [
  // ... 其他导航项
  { path: "/new-page", label: "新页面", icon: YourIcon },
];
```

### 添加新组件

在 `src/components/` 创建可复用组件：

```tsx
// src/components/MyComponent.tsx
interface MyComponentProps {
  title: string;
  onClick?: () => void;
}

export default function MyComponent({ title, onClick }: MyComponentProps) {
  return (
    <div className="p-4 bg-white rounded-lg">
      <h2 className="text-lg font-semibold">{title}</h2>
      {onClick && (
        <button onClick={onClick} className="mt-2 px-4 py-2 bg-blue-500 text-white rounded">
          点击
        </button>
      )}
    </div>
  );
}
```

### 调用 Tauri API

1. 在 `src/lib/tauri.ts` 中定义 API：

```typescript
export const myApi = {
  doSomething: (param: string) =>
    invoke<{ result: string }>("my_command", { param }),
};
```

2. 在组件中使用：

```tsx
import { myApi } from "../lib/tauri";

const handleClick = async () => {
  try {
    const result = await myApi.doSomething("hello");
    console.log(result);
  } catch (error) {
    console.error(error);
  }
};
```

### 状态管理

我们使用 React Context 进行状态管理：

```tsx
// src/contexts/MyContext.tsx
import { createContext, useContext, useState } from "react";

interface MyContextType {
  value: string;
  setValue: (val: string) => void;
}

const MyContext = createContext<MyContextType | undefined>(undefined);

export function MyProvider({ children }: { children: React.ReactNode }) {
  const [value, setValue] = useState("");

  return (
    <MyContext.Provider value={{ value, setValue }}>
      {children}
    </MyContext.Provider>
  );
}

export function useMyContext() {
  const context = useContext(MyContext);
  if (!context) {
    throw new Error("useMyContext must be used within MyProvider");
  }
  return context;
}
```

## 🦀 后端开发

### 添加新的 Tauri 命令

1. **在 Rust 模块中定义命令**（例如 `src-tauri/src/my_module.rs`）：

```rust
use serde::Serialize;

#[derive(Serialize)]
pub struct MyResponse {
    result: String,
}

#[tauri::command]
pub async fn my_command(param: String) -> Result<MyResponse, String> {
    Ok(MyResponse {
        result: format!("Hello, {}!", param)
    })
}
```

2. **在 main.rs 中注册模块和命令**：

```rust
mod my_module;  // 声明模块

.invoke_handler(tauri::generate_handler![
    // ... 其他命令
    my_module::my_command,
])
```

3. **在前端调用**（参考前面的"调用 Tauri API"部分）

### 错误处理

使用 `Result` 类型进行错误处理：

```rust
#[tauri::command]
pub async fn do_something() -> Result<String, String> {
    match some_operation() {
        Ok(data) => Ok(data),
        Err(e) => Err(format!("操作失败: {}", e)),
    }
}
```

### 异步操作

使用 `async/await`：

```rust
#[tauri::command]
pub async fn async_operation() -> Result<String, String> {
    tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
    Ok("完成".to_string())
}
```

### 访问文件系统

```rust
use std::fs;
use std::path::PathBuf;

#[tauri::command]
pub async fn read_file(path: PathBuf) -> Result<String, String> {
    fs::read_to_string(&path)
        .map_err(|e| format!("无法读取文件: {}", e))
}
```

## 🐛 调试技巧

### 前端调试

**打开开发者工具：**
- macOS: `Cmd + Option + I`
- Windows/Linux: `Ctrl + Shift + I`

**React DevTools：**
- 安装 React DevTools 浏览器扩展
- 在 Tauri 中也可以使用

**Console 日志：**

```tsx
console.log("普通日志");
console.warn("警告");
console.error("错误");
console.table({ name: "Nanoboard", version: "0.1.0" });
```

### 后端调试

**Rust 日志：**

```rust
use log::{info, warn, error};

info!("信息日志");
warn!("警告日志");
error!("错误日志");
```

**启用环境变量：**

```bash
# macOS/Linux
RUST_LOG=debug npm run tauri:dev

# Windows
set RUST_LOG=debug && npm run tauri:dev
```

**调试宏：**

```rust
eprintln!("调试输出: {:?}", variable);
```

### 常见调试场景

**1. 日志监控不工作**
- 检查文件路径是否正确
- 确认文件有读取权限
- 查看 Rust 日志输出

**2. 进程启动失败**
- 检查命令是否正确
- 确认程序已安装
- 查看错误信息

**3. 状态更新不生效**
- 检查依赖数组
- 确认状态更新方式
- 使用 React DevTools 查看状态

## 🧪 测试

### TypeScript 类型检查

```bash
# 不生成文件，只检查类型
tsc --noEmit
```

### Lint 检查

```bash
# 运行 ESLint
npm run lint

# 自动修复
npm run lint -- --fix
```

### 构建测试

```bash
# 前端构建
npm run build

# 完整构建
npm run tauri:build
```

### Rust 检查

```bash
cd src-tauri

# 格式化
cargo fmt

# Linter
cargo clippy -- -D warnings

# 编译检查
cargo check
```

## 📦 构建和发布

### 开发构建

```bash
npm run tauri:dev
```

### 生产构建

```bash
npm run tauri:build
```

构建产物位于 `src-tauri/target/release/bundle/`：

- **macOS**: `.dmg` 或 `.app`
- **Windows**: `.msi` 或 `.exe`
- **Linux**: `.deb`, `.AppImage` 等

### 版本发布流程

1. **更新版本号**
   - `package.json`
   - `src-tauri/Cargo.toml`
   - `src-tauri/tauri.conf.json`

2. **创建 Git 标签**
   ```bash
   git tag -a v0.2.0 -m "Release v0.2.0"
   git push origin v0.2.0
   ```

3. **构建 Release**
   ```bash
   npm run tauri:build
   ```

4. **上传到 GitHub Releases**

## ❓ 常见问题

### Q: 修改 Rust 代码后应用没有更新？

**A:** 尝试以下步骤：

```bash
# 清理并重新编译
cd src-tauri
cargo clean
cargo build

# 或完全重启
npm run tauri:dev
```

### Q: 前端热重载不工作？

**A:** 检查 Vite 开发服务器是否运行：

```bash
# 重启开发服务器
# 先停止当前服务器 (Ctrl+C)
npm run tauri:dev
```

### Q: 端口被占用？

**A:** 查找并杀死占用端口的进程：

```bash
# 查找进程
lsof -i :5173

# 杀死进程（替换 PID）
kill <PID>
```

### Q: 无法连接到 Nanobot？

**A:** 确保 Nanobot 已正确安装：

```bash
nanobot --version
```

### Q: TypeScript 类型错误？

**A:** 运行类型检查查看详细错误：

```bash
tsc --noEmit
```

### Q: 构建失败？

**A:** 确保所有依赖已安装：

```bash
# 重新安装 Node.js 依赖
rm -rf node_modules
npm install

# 清理 Rust 构建缓存
cd src-tauri
cargo clean
```

## 📚 资源链接

### 官方文档

- [Tauri 文档](https://tauri.app/v2/guides/)
- [React 文档](https://react.dev/)
- [TypeScript 文档](https://www.typescriptlang.org/docs/)
- [Vite 文档](https://vitejs.dev/)
- [TailwindCSS 文档](https://tailwindcss.com/docs)

### 学习资源

- [Rust 学习](https://www.rust-lang.org/learn)
- [React 教程](https://react.dev/learn)
- [Tauri 示例](https://tauri.app/v2/guides/)
- [Tauri Awesome](https://github.com/tauri-apps/awesome-tauri)

### 社区

- [Tauri Discord](https://discord.gg/tauri)
- [Rust 用户论坛](https://users.rust-lang.org/)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/tauri)

## 🆘 获取帮助

如有问题，请：

1. 查看 [README](README.md)
2. 阅读 [贡献指南](CONTRIBUTING.md)
3. 搜索 [Issues](https://github.com/Freakz3z/nanoboard/issues)
4. 创建新的 Issue 描述你的问题

---

Happy coding! 🚀

有问题？[创建 Issue](https://github.com/Freakz3z/nanoboard/issues)
