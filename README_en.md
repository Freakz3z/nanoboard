<div align="center">

<img src="public/assets/logo_nanoboard.png" alt="Nanoboard Logo">

**An Ultra-lightweight nanobot Management Assistant**

[![Rust](https://img.shields.io/badge/Rust-1.70%2B-orange.svg)](https://www.rust-lang.org/)
[![React](https://img.shields.io/badge/React-18%2B-blue.svg)](https://react.dev/)
[![Tauri](https://img.shields.io/badge/Tauri-2.0-FFC131.svg)](https://tauri.app/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)


English | **[简体中文](README.md)**

</div>

---

## Features

- **Visualization** - Visualize everything about your nanobot! From config files to system resources, from session logs to skills and memory, nanoboard provides an intuitive interface to manage and monitor your nanobot.
- **Convenience** - Say goodbye to complex command-line operations. With nanoboard's user-friendly interface, managing and monitoring your nanobot becomes simple and efficient, allowing you to focus on what matters most!
- **Cross-platform** - Whether you're on Windows, Mac, or Linux, nanoboard has you covered with seamless cross-platform support, ensuring a consistent experience across all your devices!
- **Lightweight** - Built with Rust + Tauri, nanoboard offers excellent performance with minimal resource usage, embodying the nano philosophy in its design!

## Screenshots

<div align="center">

<table>
  <tr>
    <td align="center"><b>Dashboard</b></td>
    <td align="center"><b>Sessions</b></td>
  </tr>
  <tr>
    <td align="center"><img src="public/screenshots/dashboard.png" alt="Dashboard" width="400"/></td>
    <td align="center"><img src="public/screenshots/sessions.png" alt="Sessions" width="400"/></td>
  </tr>
  <tr>
    <td align="center">Status Monitoring·System Resources</td>
    <td align="center">Multi-channel·Markdown Rendering</td>
  </tr>
  <tr>
    <td align="center"><b>Logs</b></td>
    <td align="center"><b>Workspace</b></td>
  </tr>
  <tr>
    <td align="center"><img src="public/screenshots/logs.png" alt="Logs" width="400"/></td>
    <td align="center"><img src="public/screenshots/workspace.png" alt="Workspace" width="400"/></td>
  </tr>
  <tr>
    <td align="center">Real-time Viewing·Log Filtering</td>
    <td align="center">View Sessions·Manage Files</td>
  </tr>
  <tr>
    <td align="center"><b>Skills</b></td>
    <td align="center"><b>Memory</b></td>
  </tr>
  <tr>
    <td align="center"><img src="public/screenshots/skills.png" alt="Skills" width="400"/></td>
    <td align="center"><img src="public/screenshots/memory.png" alt="Memory" width="400"/></td>
  </tr>
  <tr>
    <td align="center">Visual Management·One-Click Toggle</td>
    <td align="center">Memory Management·Edit & Delete</td>
  </tr>
  <tr>
    <td align="center"><b>Cron</b></td>
    <td align="center"><b>Settings</b></td>
  </tr>
  <tr>
    <td align="center"><img src="public/screenshots/cron.png" alt="Cron" width="400"/></td>
    <td align="center"><img src="public/screenshots/settings.png" alt="Settings" width="400"/></td>
  </tr>
  <tr>
    <td align="center">Scheduled Cron Jobs·Auto Execution</td>
    <td align="center">Visual Config·Quick Edit</td>
  </tr>
</table>

</div>

## Quick Start

Download the latest installation package from the [Release](https://github.com/Freakz3z/nanoboard/releases) page:

| Platform          | Architecture | Artifact        |
| --------------- | ----- | -------------- |
| Windows x64     | x64   | exe       |
| Windows aarch64 | ARM64 | exe       |
| MacOS x64       | x64   | dmg            |
| MacOS aarch64   | ARM64 | dmg            |
| Linux x64       | x64   | deb + AppImage |
| Linux aarch64   | ARM64 | deb + AppImage |

## Tech Stack

- **Backend**: Rust + Tauri 2.0
- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **UI Framework**: TailwindCSS
- **Icons**: Lucide React
- **Editor**: Monaco Editor
- **State Management**: React Hooks + Context API
- **Routing**: React Router v6
- **Internationalization**: react-i18next
- **File Monitoring**: notify (Rust)

## Configuration

nanoboard automatically reads the following nanobot configurations:

- **Config File**: `~/.nanobot/config.json`
- **Log File**: `~/.nanobot/logs/nanobot.log`
- **Workspace**: `~/.nanobot/workspace`
- **Sessions Directory**: `~/.nanobot/sessions`
- **Skills Directory**: `~/.nanobot/workspace/skills`
- **Memory Directory**: `~/.nanobot/workspace/memory`
- **Cron Directory**: `~/.nanobot/cron`

## Build

### Requirements

- Node.js 18+
- Rust 1.70+
- pnpm/npm/yarn

### Development Build

```bash
# Install dependencies
npm install

# Start development mode (hot reload)
npm run tauri:dev
```

### Production Build

```bash
# macOS ARM64 (Apple Silicon)
npm run tauri:build -- --target aarch64-apple-darwin

# macOS Intel x64
npm run tauri:build -- --target x86_64-apple-darwin

# Windows
npm run tauri:build

# Build artifacts are in src-tauri/target/release/bundle/
```

## Project Structure

```
nanoboard/
├── src/                    # React frontend source
│   ├── components/         # Reusable components
│   ├── pages/             # Page components
│   ├── config/            # Config types and data
│   ├── types/             # Type definitions
│   ├── lib/               # Utility functions
│   ├── utils/             # Utility functions
│   ├── contexts/          # React Context
│   ├── hooks/             # Custom Hooks
│   ├── i18n/              # Internationalization
│   ├── assets/            # Static assets
│   ├── App.tsx            # Main app component
│   └── main.tsx           # App entry
├── src-tauri/             # Rust backend
│   ├── src/                   # Rust source code
│   ├── Cargo.toml             # Rust dependencies
│   └── tauri.conf.json        # Tauri config
├── public/                # Public assets
├── package.json           # Node.js dependencies
├── vite.config.ts         # Vite build config
├── tailwind.config.js     # TailwindCSS config
├── tsconfig.json          # TypeScript config
└── README.md              # Project documentation
```

## Roadmap

- [x] Basic dashboard features
- [x] Config file editor
- [x] Real-time log monitoring
- [x] Session and file management
- [x] Enhanced config validation and error hints
- [x] Multi-language support (i18n)
- [x] Performance monitoring charts
- [x] Dark theme
- [x] Session viewer (multi-channel messages, Markdown rendering)
- [x] Collapsible sidebar
- [x] Skills management (enable/disable/edit)
- [x] Memory management (view/edit/delete)
- [x] Cron jobs management
- [ ] Auto-update feature

## Acknowledgments

- [nanobot](https://github.com/HKUDS/nanobot)

## Contributors

![Contributors](https://contrib.rocks/image?repo=Freakz3z/nanoboard)

## Star History

<div align="center">
  <a href="https://star-history.com/#Freakz3z/nanoboard&Date">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=Freakz3z/nanoboard&type=Date&theme=dark" />
      <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=Freakz3z/nanoboard&type=Date" />
      <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=Freakz3z/nanoboard&type=Date" style="border-radius: 15px; box-shadow: 0 0 30px rgba(0, 217, 255, 0.3);" />
    </picture>
  </a>
</div>
