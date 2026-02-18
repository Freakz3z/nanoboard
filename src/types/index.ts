/**
 * Nanoboard 类型定义
 * 集中管理前后端通信的数据类型
 */

// ============ 配置相关 ============

export interface ConfigHistoryVersion {
  filename: string;
  timestamp: number;
  size: number;
}

export interface ConfigCheckResult {
  valid: boolean;
  issue?: 'config_missing' | 'api_key_missing' | 'invalid_json';
  message?: string;
}

export interface ConfigValidation {
  valid: boolean;
  errors?: string[];
}

// ============ 进程相关 ============

export interface ProcessStartResult {
  status: 'started' | 'already_running' | 'failed';
  message?: string;
  pid?: number;
  port?: number;
}

export interface ProcessStopResult {
  status: 'stopped' | 'not_running' | 'failed';
  message?: string;
}

export interface ProcessStatus {
  running: boolean;
  pid?: number;
  port?: number;
  started_at?: number;
}

export interface SystemInfo {
  os: string;
  arch: string;
  python_version?: string;
  nanobot_version?: string;
}

export interface DiagnosticCheck {
  key: string;
  name: string;
  status: 'ok' | 'warning' | 'error';
  message: string;
  message_key: string;
  details?: string;
  has_issue: boolean;
}

export interface DiagnosticResult {
  overall: 'passed' | 'failed';
  checks: DiagnosticCheck[];
}

export interface DownloadResult {
  status: 'success' | 'failed';
  message: string;
}

export interface NanobotPath {
  found: boolean;
  path?: string;
  message?: string;
}

// ============ 日志相关 ============

export interface LogResponse {
  logs: string[];
  total: number;
  showing: number;
}

export interface LogStatistics {
  total_lines: number;
  error_count: number;
  warning_count: number;
  info_count: number;
  file_size: number;
}

// ============ 网络相关 ============

export interface NetworkStats {
  upload_speed: number;
  download_speed: number;
  total_upload: number;
  total_download: number;
}

// ============ 会话/记忆相关 ============

export interface Session {
  id: string;
  name: string;
  modified?: number;
  size?: number;
}

// Memory 类型别名，用于记忆管理页面
export type Memory = Session;

export interface SessionListResult {
  sessions: Session[];
  message?: string;
}

export interface SessionMemory {
  id: string;
  content: string;
  last_modified?: number;
}

export interface WorkspaceFiles {
  success: boolean;
  items?: WorkspaceFile[];
  message?: string;
}

export interface WorkspaceFile {
  name: string;
  path: string;
  is_dir: boolean;
  size?: number;
  modified?: number;
}

export interface DirectoryTree {
  name: string;
  path: string;
  is_dir: boolean;
  children?: DirectoryTree[];
}

export interface FileContent {
  success: boolean;
  content?: string;
  message?: string;
}

export interface OperationResult {
  success: boolean;
  message?: string;
}

// ============ Skill 相关 ============

export interface Skill {
  id: string;
  name: string;
  title?: string;
  enabled: boolean;
  modified?: number;
}

export interface SkillContent {
  success: boolean;
  content?: string;
  name?: string;
  id?: string;
  message?: string;
}

export interface SkillListResult {
  skills: Skill[];
  message?: string;
}

export interface ToggleResult {
  success: boolean;
  enabled: boolean;
  new_id?: string;
  message?: string;
}

// ============ 主题相关 ============

export type Theme = 'light' | 'dark' | 'system';

// ============ 定时任务相关 ============

/** 调度类型 */
export type ScheduleKind = "cron" | "every" | "at";

/** 调度配置 */
export interface CronSchedule {
  kind: ScheduleKind;
  atMs: number | null;
  everyMs: number | null;
  expr: string | null;
  tz: string | null;
}

/** 任务负载类型 */
export type PayloadKind = "agent_turn";

/** 任务负载 */
export interface CronPayload {
  kind: PayloadKind;
  message: string;
  deliver: boolean;
  channel: string | null;
  to: string | null;
}

/** 任务状态 */
export interface CronState {
  nextRunAtMs: number | null;
  lastRunAtMs: number | null;
  lastStatus: "success" | "failed" | "running" | null;
  lastError: string | null;
}

/** 定时任务完整结构 */
export interface CronJob {
  id: string;
  name: string;
  enabled: boolean;
  schedule: CronSchedule;
  payload: CronPayload;
  state: CronState;
  createdAtMs: number;
  updatedAtMs: number;
  deleteAfterRun: boolean;
}

/** 任务列表文件结构 */
export interface CronJobsFile {
  version: number;
  jobs: CronJob[];
}

export interface CronListResult {
  success: boolean;
  jobs: CronJob[];
  message?: string;
}

export interface CronOperationResult {
  success: boolean;
  message?: string;
}

// ============ 通用响应 ============

export interface ApiResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}
