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

- **Visual Dashboard** - Real-time monitoring of Nanobot status and system resources
- **Config Editor** - Visual configuration file editing with Monaco Editor
- **Quick Launch** - One-click start/stop Nanobot Gateway
- **Log Monitor** - Real-time viewing and filtering of application logs
- **File Manager** - View, edit, and manage workspace files
- **Multi-language Support** - Chinese and English interface switching
- **Lightweight** - Built with Tauri for superior performance and super low resource usage

## Screenshots

<div align="center">

<table>
  <tr>
    <td align="center">
      <img src="public/screenshots/dashboard.png" alt="Dashboard"/>
      <br/>
      Status Monitoring·System Resources
    </td>
    <td align="center">
      <img src="public/screenshots/logs.png" alt="Log Monitor"/>
      <br/>
      Real-time Viewing·Log Filtering
    </td>
  </tr>
  <tr>
    <td align="center">
      <img src="public/screenshots/file-manager.png" alt="File Manager"/>
      <br/>
      View Sessions·Manage Files
    </td>
    <td align="center">
      <img src="public/screenshots/config.png" alt="Config Editor"/>
      <br/>
      Visual Config·Quick Edit
    </td>
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
│   │   ├── index.ts               # Component exports
│   │   ├── Layout.tsx             # Main layout component
│   │   ├── ConfirmDialog.tsx      # Confirmation dialog
│   │   ├── EmptyState.tsx         # Empty state hint
│   │   ├── Toast.tsx              # Toast notification
│   │   ├── NetworkMonitor.tsx     # Network monitoring chart
│   │   ├── ErrorBoundary.tsx      # Error boundary
│   │   ├── KeyboardShortcutsHelp.tsx  # Keyboard shortcuts help
│   │   ├── config/                # Config-related components
│   │   │   ├── ProviderEditModal.tsx  # Provider edit modal
│   │   │   ├── ChannelEditModal.tsx   # Channel edit modal
│   │   │   ├── HistoryPanel.tsx       # History panel
│   │   │   └── CodeEditorView.tsx     # Code editor view
│   │   └── dashboard/             # Dashboard components
│   │       ├── StatusCards.tsx        # Status cards
│   │       ├── ConfigOverviewCards.tsx # Config overview cards
│   │       ├── SystemResourceCards.tsx # System resource cards
│   │       └── SystemInfoSection.tsx  # System info section
│   ├── pages/             # Page components
│   │   ├── Dashboard.tsx          # Dashboard
│   │   ├── ConfigEditor.tsx       # Config editor
│   │   ├── Logs.tsx               # Log monitor
│   │   └── FileManager.tsx        # File manager
│   ├── config/            # Config types and data
│   │   ├── index.ts               # Exports
│   │   ├── types.ts               # Config type definitions
│   │   ├── providers.ts           # Provider config data
│   │   └── channels.ts            # Channel config data
│   ├── types/             # Type definitions
│   │   ├── index.ts               # Common types
│   │   └── dashboard.ts           # Dashboard types
│   ├── lib/               # Utility functions
│   │   ├── tauri.ts               # Tauri API wrapper
│   │   ├── defaultConfig.ts       # Default config
│   │   └── utils.ts               # Utility functions
│   ├── utils/             # Utility functions
│   │   └── format.ts              # Format utilities
│   ├── contexts/          # React Context
│   │   ├── ToastContext.tsx       # Toast context
│   │   └── ThemeContext.tsx       # Theme context
│   ├── hooks/             # Custom Hooks
│   │   └── useKeyboardShortcuts.ts # Keyboard shortcuts hook
│   ├── i18n/              # Internationalization
│   │   └── locales/
│   │       ├── zh-CN.json         # Simplified Chinese
│   │       └── en-US.json         # English
│   ├── assets/            # Static assets
│   ├── App.tsx            # Main app component
│   └── main.tsx           # App entry
├── src-tauri/             # Rust backend
│   ├── src/
│   │   ├── main.rs            # Main entry
│   │   ├── config.rs          # Config management
│   │   ├── process.rs         # Process control
│   │   ├── logger.rs          # Log reading & monitoring
│   │   └── session.rs         # Session management
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
