import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
// Config API
export const configApi = {
    load: () => invoke("load_config"),
    save: (config) => invoke("save_config", { config }),
    getPath: () => invoke("get_config_path"),
    validate: (config) => invoke("validate_config", { config }),
    getHistory: () => invoke("get_config_history"),
    restoreVersion: (filename) => invoke("restore_config_version", { filename }),
    deleteVersion: (filename) => invoke("delete_config_version", { filename }),
};
// Process API
export const processApi = {
    start: (port) => invoke("start_nanobot", { port }),
    stop: () => invoke("stop_nanobot"),
    getStatus: () => invoke("get_status"),
    getDashboardData: () => invoke("get_dashboard_data"),
    download: () => invoke("download_nanobot"),
    downloadWithUv: () => invoke("download_nanobot_with_uv"),
    onboard: () => invoke("onboard_nanobot"),
    getSystemInfo: () => invoke("get_system_info"),
    getVersion: () => invoke("get_nanobot_version"),
    getNanobotPath: () => invoke("get_nanobot_path"),
    providerLogin: (provider) => invoke("provider_login", { provider }),
    checkOAuthToken: (provider) => invoke("check_oauth_token", { provider }),
    checkConfig: () => invoke("check_nanobot_config"),
    diagnose: () => invoke("diagnose_nanobot"),
    setCustomPaths: (pythonPath, nanobotPath) => invoke("set_custom_paths", { pythonPath, nanobotPath }),
    getCustomPaths: () => invoke("get_custom_paths"),
    getPythonPath: () => invoke("get_python_path"),
};
// Logger API
export const loggerApi = {
    getLogs: (lines) => invoke("get_logs", { lines }),
    getStatistics: () => invoke("get_log_statistics"),
    startStream: () => invoke("start_log_stream"),
    stopStream: () => invoke("stop_log_stream"),
    isStreamRunning: () => invoke("is_log_stream_running"),
};
// Network API
export const networkApi = {
    initMonitor: () => invoke("init_network_monitor"),
    getStats: () => invoke("get_network_stats"),
};
// Session API
export const sessionApi = {
    list: () => invoke("list_sessions"),
    getMemory: (sessionId) => invoke("get_session_memory", { sessionId }),
    getWorkspaceFiles: () => invoke("get_workspace_files"),
    delete: (sessionId) => invoke("delete_session", { sessionId }),
    rename: (sessionId, newName) => invoke("rename_session", { sessionId, newName }),
    saveMemory: (sessionId, content) => invoke("save_session_memory", { sessionId, content }),
    saveWorkspaceFile: (fileName, content) => invoke("save_workspace_file", { fileName, content }),
};
// Chat Session API
export const chatSessionApi = {
    list: () => invoke("list_chat_sessions"),
    getContent: (sessionId) => invoke("get_chat_session_content", { sessionId }),
};
// Skill API
export const skillApi = {
    list: () => invoke("list_skills"),
    getContent: (skillId) => invoke("get_skill_content", { skillId }),
    save: (skillId, content) => invoke("save_skill", { skillId, content }),
    delete: (skillId) => invoke("delete_skill", { skillId }),
    toggle: (skillId, enabled) => invoke("toggle_skill", { skillId, enabled }),
};
// File System API
export const fsApi = {
    getDirectoryTree: (relativePath) => invoke("get_directory_tree", { relativePath }),
    getFileContent: (relativePath) => invoke("get_file_content", { relativePath }),
    createFolder: (relativePath, folderName) => invoke("create_folder", { relativePath, folderName }),
    deleteFolder: (relativePath) => invoke("delete_folder", { relativePath }),
    deleteFile: (relativePath) => invoke("delete_file", { relativePath }),
    renameItem: (relativePath, newName) => invoke("rename_item", { relativePath, newName }),
};
// Event listeners
export const events = {
    onLogUpdate: (callback) => listen("log-update", (event) => callback(event.payload)),
};
// Theme API
export const themeApi = {
    getTheme: () => invoke("get_theme"),
    setTheme: (theme) => invoke("set_theme", { theme }),
    toggleTheme: () => invoke("toggle_theme"),
};
// Cron API
export const cronApi = {
    list: () => invoke("cron_list"),
    add: (name, message, scheduleType, scheduleValue, tz) => invoke("cron_add", { name, message, scheduleType, scheduleValue, tz }),
    update: (jobId, name, message, scheduleType, scheduleValue, enabled, tz) => invoke("cron_update", { jobId, name, message, scheduleType, scheduleValue, enabled, tz }),
    remove: (jobId) => invoke("cron_remove", { jobId }),
    enable: (jobId, disable) => invoke("cron_enable", { jobId, disable }),
    run: (jobId) => invoke("cron_run", { jobId }),
};
export const clawhubApi = {
    search: (query, limit) => invoke("search_clawhub_skills", { query, limit }),
    getSkills: (sort, limit, cursor) => invoke("get_clawhub_skills", { sort, limit, cursor }),
    getSkillDetail: (slug) => invoke("get_clawhub_skill_detail", { slug }),
    getSkillFile: (slug, path, version) => invoke("get_clawhub_skill_file", { slug, path, version }),
};
