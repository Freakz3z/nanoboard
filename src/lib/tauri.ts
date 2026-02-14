import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type {
  ConfigHistoryVersion,
  ConfigCheckResult,
  ConfigValidation,
  ProcessStartResult,
  ProcessStopResult,
  ProcessStatus,
  DiagnosticResult,
  DownloadResult,
  NanobotPath,
  LogResponse,
  NetworkStats,
  SessionListResult,
  SessionMemory,
  WorkspaceFiles,
  OperationResult,
  SkillListResult,
  SkillContent,
  ToggleResult,
  Theme,
  CronListResult,
  CronOperationResult,
} from "@/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyResponse = any; // 保持向后兼容，组件自己处理类型

// Config API
export const configApi = {
  load: () => invoke<AnyResponse>("load_config"),
  save: (config: Record<string, unknown>) => invoke<void>("save_config", { config }),
  getPath: () => invoke<string>("get_config_path"),
  validate: (config: Record<string, unknown>) => invoke<ConfigValidation>("validate_config", { config }),
  getHistory: () => invoke<ConfigHistoryVersion[]>("get_config_history"),
  restoreVersion: (filename: string) => invoke<void>("restore_config_version", { filename }),
  deleteVersion: (filename: string) => invoke<void>("delete_config_version", { filename }),
};

// Process API
export const processApi = {
  start: (port?: number) => invoke<ProcessStartResult>("start_nanobot", { port }),
  stop: () => invoke<ProcessStopResult>("stop_nanobot"),
  getStatus: () => invoke<ProcessStatus>("get_status"),
  download: () => invoke<DownloadResult>("download_nanobot"),
  downloadWithUv: () => invoke<DownloadResult>("download_nanobot_with_uv"),
  onboard: () => invoke<DownloadResult>("onboard_nanobot"),
  getSystemInfo: () => invoke<AnyResponse>("get_system_info"),
  getVersion: () => invoke<AnyResponse>("get_nanobot_version"),
  getNanobotPath: () => invoke<NanobotPath>("get_nanobot_path"),
  checkConfig: () => invoke<ConfigCheckResult>("check_nanobot_config"),
  diagnose: () => invoke<DiagnosticResult>("diagnose_nanobot"),
};

// Logger API
export const loggerApi = {
  getLogs: (lines?: number) => invoke<LogResponse>("get_logs", { lines }),
  getStatistics: () => invoke<AnyResponse>("get_log_statistics"),
  startStream: () => invoke<void>("start_log_stream"),
  stopStream: () => invoke<void>("stop_log_stream"),
};

// Network API
export const networkApi = {
  initMonitor: () => invoke<void>("init_network_monitor"),
  getStats: () => invoke<NetworkStats>("get_network_stats"),
};

// Session API
export const sessionApi = {
  list: () => invoke<SessionListResult>("list_sessions"),
  getMemory: (sessionId: string) => invoke<SessionMemory>("get_session_memory", { sessionId }),
  getWorkspaceFiles: () => invoke<WorkspaceFiles>("get_workspace_files"),
  delete: (sessionId: string) => invoke<OperationResult>("delete_session", { sessionId }),
  rename: (sessionId: string, newName: string) => invoke<OperationResult>("rename_session", { sessionId, newName }),
  saveMemory: (sessionId: string, content: string) => invoke<OperationResult>("save_session_memory", { sessionId, content }),
  saveWorkspaceFile: (fileName: string, content: string) => invoke<OperationResult>("save_workspace_file", { fileName, content }),
};

// Chat Session API
export const chatSessionApi = {
  list: () => invoke<AnyResponse>("list_chat_sessions"),
  getContent: (sessionId: string) => invoke<AnyResponse>("get_chat_session_content", { sessionId }),
};

// Skill API
export const skillApi = {
  list: () => invoke<SkillListResult>("list_skills"),
  getContent: (skillId: string) => invoke<SkillContent>("get_skill_content", { skillId }),
  save: (skillId: string, content: string) => invoke<OperationResult>("save_skill", { skillId, content }),
  delete: (skillId: string) => invoke<OperationResult>("delete_skill", { skillId }),
  toggle: (skillId: string, enabled: boolean) => invoke<ToggleResult>("toggle_skill", { skillId, enabled }),
};

// File System API
export const fsApi = {
  getDirectoryTree: (relativePath?: string) => invoke<AnyResponse>("get_directory_tree", { relativePath }),
  getFileContent: (relativePath: string) => invoke<AnyResponse>("get_file_content", { relativePath }),
  createFolder: (relativePath: string, folderName: string) => invoke<OperationResult>("create_folder", { relativePath, folderName }),
  deleteFolder: (relativePath: string) => invoke<OperationResult>("delete_folder", { relativePath }),
  deleteFile: (relativePath: string) => invoke<OperationResult>("delete_file", { relativePath }),
  renameItem: (relativePath: string, newName: string) => invoke<OperationResult>("rename_item", { relativePath, newName }),
};

// Event listeners
export const events = {
  onLogUpdate: (callback: (data: string[]) => void) =>
    listen<string[]>("log-update", (event) => callback(event.payload)),
};

// Theme API
export const themeApi = {
  getTheme: () => invoke<Theme>("get_theme"),
  setTheme: (theme: Theme) => invoke<Theme>("set_theme", { theme }),
  toggleTheme: () => invoke<Theme>("toggle_theme"),
};

// Cron API
export const cronApi = {
  list: () => invoke<CronListResult>("cron_list"),
  add: (name: string, message: string, scheduleType: string, scheduleValue: string, deliver?: boolean, to?: string, channel?: string) =>
    invoke<CronOperationResult>("cron_add", { name, message, scheduleType, scheduleValue, deliver, to, channel }),
  remove: (jobId: string) => invoke<CronOperationResult>("cron_remove", { jobId }),
  enable: (jobId: string, disable: boolean) => invoke<CronOperationResult>("cron_enable", { jobId, disable }),
  run: (jobId: string) => invoke<CronOperationResult>("cron_run", { jobId }),
};
