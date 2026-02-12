import { invoke } from "@tauri-apps/api/core";

// Config API
export const configApi = {
  load: () => invoke<any>("load_config"),
  save: (config: any) => invoke<void>("save_config", { config }),
  getPath: () => invoke<string>("get_config_path"),
  validate: (config: any) => invoke<any>("validate_config", { config }),
  getHistory: () => invoke<ConfigHistoryVersion[]>("get_config_history"),
  restoreVersion: (filename: string) => invoke<void>("restore_config_version", { filename }),
  deleteVersion: (filename: string) => invoke<void>("delete_config_version", { filename }),
};

interface ConfigHistoryVersion {
  filename: string;
  timestamp: number;
  size: number;
}

// Process API
export const processApi = {
  start: (port?: number) => invoke<any>("start_nanobot", { port }),
  stop: () => invoke<any>("stop_nanobot"),
  getStatus: () => invoke<any>("get_status"),
  download: () => invoke<any>("download_nanobot"),
  onboard: () => invoke<any>("onboard_nanobot"),
  getSystemInfo: () => invoke<any>("get_system_info"),
  getVersion: () => invoke<any>("get_nanobot_version"),
  getNanobotPath: () => invoke<any>("get_nanobot_path"),
  checkConfig: () => invoke<any>("check_nanobot_config"),
};

// Logger API
export const loggerApi = {
  getLogs: (lines?: number) => invoke<any>("get_logs", { lines }),
  getStatistics: () => invoke<any>("get_log_statistics"),
  startStream: () => invoke<void>("start_log_stream"),
  stopStream: () => invoke<void>("stop_log_stream"),
};

// Network API
export const networkApi = {
  initMonitor: () => invoke<void>("init_network_monitor"),
  getStats: () => invoke<any>("get_network_stats"),
};

// Session API
export const sessionApi = {
  list: () => invoke<any>("list_sessions"),
  getMemory: (sessionId: string) =>
    invoke<any>("get_session_memory", { sessionId }),
  getWorkspaceFiles: () => invoke<any>("get_workspace_files"),
  delete: (sessionId: string) =>
    invoke<any>("delete_session", { sessionId }),
  rename: (sessionId: string, newName: string) =>
    invoke<any>("rename_session", { sessionId, newName }),
  saveMemory: (sessionId: string, content: string) =>
    invoke<any>("save_session_memory", { sessionId, content }),
  saveWorkspaceFile: (fileName: string, content: string) =>
    invoke<any>("save_workspace_file", { fileName, content }),
};

// Skill API
export const skillApi = {
  list: () => invoke<any>("list_skills"),
  getContent: (skillId: string) =>
    invoke<any>("get_skill_content", { skillId }),
  delete: (skillId: string) =>
    invoke<any>("delete_skill", { skillId }),
};

// File System API
export const fsApi = {
  getDirectoryTree: (relativePath?: string) =>
    invoke<any>("get_directory_tree", { relativePath }),
  getFileContent: (relativePath: string) =>
    invoke<any>("get_file_content", { relativePath }),
  createFolder: (relativePath: string, folderName: string) =>
    invoke<any>("create_folder", { relativePath, folderName }),
  deleteFolder: (relativePath: string) =>
    invoke<any>("delete_folder", { relativePath }),
  deleteFile: (relativePath: string) =>
    invoke<any>("delete_file", { relativePath }),
  renameItem: (relativePath: string, newName: string) =>
    invoke<any>("rename_item", { relativePath, newName }),
};

// Event listeners
import { listen } from "@tauri-apps/api/event";

export const events = {
  onLogUpdate: (callback: (data: string[]) => void) =>
    listen<string[]>("log-update", (event) => callback(event.payload)),
};

