# 贡献指南

感谢你有兴趣为 Nanoboard 做出贡献！我们欢迎所有形式的贡献。

## 🤝 如何贡献

### 报告 Bug

请通过 [GitHub Issues](https://github.com/Freakz3z/nanoboard/issues) 报告 bug，并提供以下信息：

- **清晰的标题和描述** - 简明扼要地说明问题
- **复现步骤** - 详细的步骤列表
- **预期行为** - 你期望发生什么
- **实际行为** - 实际发生了什么
- **系统信息**
  - 操作系统和版本（如 macOS 14.0、Windows 11、Ubuntu 22.04）
  - Nanoboard 版本
  - Nanobot 版本（如适用）
- **截图或录屏** - 如果是 UI 问题
- **日志** - 相关的错误日志

**Bug 报告模板：**

```markdown
### 问题描述
简要描述遇到的问题

### 复现步骤
1. 步骤一
2. 步骤二
3. 步骤三

### 预期行为
描述你期望发生的行为

### 实际行为
描述实际发生的行为

### 环境信息
- 操作系统: [如 macOS 14.0]
- Nanoboard 版本: [如 v0.1.0]
- Nanobot 版本: [如 v1.0.0]

### 附加信息
其他相关信息（截图、日志等）
```

### 提出功能建议

欢迎提出功能建议！请在 Issue 中：

- 清晰地描述建议的功能
- 说明这个功能的用例和价值
- 如果可能，提供实现思路或示例
- 考虑是否可以用现有功能替代

**功能建议模板：**

```markdown
### 功能描述
简要描述你建议的功能

### 用例场景
说明在什么场景下需要这个功能

### 预期效果
描述这个功能应该实现什么效果

### 可能的实现方案
如果有想法，可以提供实现思路
```

### 提交代码

#### 1. Fork 仓库

在 GitHub 上点击右上角的 Fork 按钮，将项目 fork 到你的账号下。

#### 2. 克隆你的 fork

```bash
git clone https://github.com/你的用户名/nanoboard.git
cd nanoboard
```

#### 3. 添加上游远程仓库

```bash
git remote add upstream https://github.com/Freakz3z/nanoboard.git
```

#### 4. 创建特性分支

```bash
git checkout -b feature/你的特性名称
# 或修复 bug
git checkout -b fix/你修复的问题
```

分支命名规范：
- `feature/` - 新功能
- `fix/` - Bug 修复
- `docs/` - 文档更新
- `refactor/` - 代码重构
- `style/` - 代码格式调整
- `test/` - 测试相关
- `chore/` - 构建/工具相关

#### 5. 进行更改

- 遵循现有代码风格
- 添加必要的测试
- 更新相关文档
- 确保所有检查通过

#### 6. 提交更改

使用约定式提交规范：

```bash
git add .
git commit -m "feat: 添加配置文件导入功能"
# 或
git commit -m "fix: 修复日志监控不更新的问题"
```

提交类型：
- `feat:` - 新功能
- `fix:` - 修复 bug
- `docs:` - 文档更新
- `style:` - 代码格式（不影响功能）
- `refactor:` - 代码重构
- `test:` - 测试相关
- `chore:` - 构建/工具相关

#### 7. 同步上游更新

在提交 PR 前，确保你的分支是最新的：

```bash
git fetch upstream
git rebase upstream/main
```

#### 8. 推送到你的 fork

```bash
git push origin feature/你的特性名称
```

#### 9. 创建 Pull Request

- 在 GitHub 上创建 PR
- 使用清晰的 PR 标题
- 在描述中详细说明你的更改
- 引用相关的 Issue（如 `Fixes #123`）
- 等待代码审查

**PR 模板：**

```markdown
## 更改说明
简要描述这个 PR 做了什么

## 更改类型
- [ ] Bug 修复
- [ ] 新功能
- [ ] 代码重构
- [ ] 文档更新
- [ ] 其他

## 相关 Issue
Closes #(issue number)

## 测试
描述你如何测试这些更改

## 截图
如果适用，添加截图
```

## 📋 开发规范

### 代码风格

#### Rust 代码

使用标准格式化工具：

```bash
cd src-tauri
cargo fmt
```

运行 linter：

```bash
cargo clippy -- -D warnings
```

#### TypeScript/React 代码

我们使用 ESLint 和 Prettier：

```bash
# 格式化代码
npm run format

# 运行 linter
npm run lint
```

### 代码审查要点

在提交 PR 前，请确保：

- [ ] 代码通过所有格式检查
- [ ] 代码通过 TypeScript 类型检查
- [ ] 没有编译警告或错误
- [ ] 功能在主流操作系统上测试通过（如可能）
- [ ] 添加了必要的注释
- [ ] 更新了相关文档

### 测试要求

在提交 PR 前：

1. **本地测试**
   ```bash
   # 运行开发服务器
   npm run tauri:dev

   # 运行类型检查
   tsc --noEmit

   # 尝试构建
   npm run build
   ```

2. **功能测试**
   - 测试你修改的功能
   - 测试相关功能确保没有破坏
   - 测试边界情况

3. **跨平台测试**（如可能）
   - 在你使用的平台上充分测试
   - 如果可以，在其他平台上测试

## 🎨 UI/UX 指南

### 设计原则

- **简洁一致** - 保持界面简洁，与现有风格一致
- **响应式** - 确保在不同窗口大小下正常工作
- **可访问性** - 使用适当的 ARIA 标签和语义化 HTML
- **用户友好** - 提供清晰的反馈和错误提示

### 组件开发

- 优先复用现有组件
- 遵循 TailwindCSS 的设计系统
- 使用 TypeScript 严格模式
- 添加适当的 PropTypes 或类型定义

## 📖 文档

### 代码注释

- 为复杂逻辑添加注释
- 使用 JSDoc 格式为公共函数添加文档
- 保持注释与代码同步

### README 更新

如果添加了新功能：
- 在 README 的特性部分添加描述
- 更新使用说明
- 添加截图（如适用）

## 🆘 获取帮助

如果你有任何问题：

1. 查看 [README](README.md)
2. 阅读 [开发指南](DEVELOPMENT.md)
3. 搜索 [已有 Issues](https://github.com/Freakz3z/nanoboard/issues)
4. 创建新的 Issue 进行讨论

## 📜 行为准则

### 我们的承诺

为了营造开放和友好的环境，我们承诺让每个人都能参与项目，不论经验水平、性别、性别认同和表达、性取向、残疾、个人外貌、体型、种族、民族、年龄、宗教或国籍。

### 我们的标准

积极行为包括：
- 使用友好和包容的语言
- 尊重不同的观点和经验
- 优雅地接受建设性批评
- 关注对社区最有利的事情
- 对其他社区成员表示同理心

不可接受的行为包括：
- 使用性别化语言或图像，以及不受欢迎的性关注或暗示
- 挑衅、侮辱/贬损的评论，以及人身或政治攻击
- 公开或私下骚扰
- 未经明确许可发布他人的私人信息
- 其他在专业场合可能被合理认为不恰当的行为

### 责任

项目维护者负责阐明可接受行为的标准，并应对任何不可接受的行为采取适当和公平的纠正措施。

## 📄 许可证

通过贡献代码，你同意你的贡献将在与项目相同的 [MIT 许可证](LICENSE) 下发布。

## 🙏 致谢

感谢你考虑为 Nanoboard 做出贡献！每一个贡献都让这个项目变得更好。

---

有问题？[创建一个 Issue](https://github.com/Freakz3z/nanoboard/issues)
