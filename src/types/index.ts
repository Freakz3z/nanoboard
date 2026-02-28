/**
 * 类型定义导出
 */

// Config 类型
export type {
  Config,
  Provider,
  Channel,
  McpServer,
  ToolsConfig,
  AgentDefaults,
  AgentConfig,
  ChannelsConfig,
  ProviderAgentConfig,
  ProviderInfo,
  ChannelInfo,
  McpServerWithState,
  ConfigTemplate,
  ConfigHistoryVersion,
  EditingProvider,
  EditingChannel,
  EditingMcpServer,
  ConfirmDialogState,
  TemplateDialogState,
} from "./config";

// Workspace 类型
export type {
  FsItem,
  Breadcrumb,
  FrontmatterData,
  ChatSession,
  ChatMessage,
} from "./workspace";

// Skills 类型
export type { Skill } from "./skills";

// Dashboard 类型
export type {
  Status,
  SystemInfo,
  NanobotVersion,
  LogStatistics,
  NetworkData,
  DashboardConfig,
  DiagnosisCheck,
  DiagnosisResult,
} from "./dashboard";

// ClawHub 类型
export type {
  ClawHubSearchResponse,
  ClawHubSkillsResponse,
  SkillDetailResponse,
  SkillListItem,
  SearchResult,
  ClawHubSearchResult,
} from "./clawhub";

// Tauri 操作结果类型
export interface ConfigCheckResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
  message?: string;
  issue?: string;
}

export interface ConfigValidation {
  valid: boolean;
  errors?: string[];
}

export interface ProcessStartResult {
  success: boolean;
  message?: string;
  status?: string;
}

export interface ProcessStopResult {
  success: boolean;
  message?: string;
}

export interface ProcessStatus {
  running: boolean;
  pid?: number;
  port?: number;
}

export interface DiagnosticResult {
  overall: "passed" | "failed";
  checks: any[];
}

export interface DownloadResult {
  success: boolean;
  message?: string;
  status?: string;
}

export interface NanobotPath {
  path?: string;
  exists: boolean;
}

export interface LogResponse {
  logs: string[];
  total: number;
}

export interface NetworkStats {
  upload: number;
  download: number;
  timestamp: number;
}

export interface SessionListResult {
  sessions: any[];
}

export interface SessionMemory {
  id: string;
  content: string;
}

export interface WorkspaceFiles {
  files: any[];
}

export interface OperationResult {
  success: boolean;
  message?: string;
}

export interface SkillListResult {
  skills: any[];
}

export interface SkillContent {
  content: string;
  success?: boolean;
  message?: string;
}

export interface ToggleResult {
  success: boolean;
  enabled: boolean;
  new_id?: string;
  message?: string;
}

export type Theme = "light" | "dark";

export interface CronListResult {
  jobs: any[];
  success?: boolean;
  message?: string;
}

export interface CronOperationResult {
  success: boolean;
  message?: string;
  job?: any;
}

export interface CronSchedule {
  kind?: "cron" | "every" | "at";
  expr?: string;
  everyMs?: number;
  atMs?: number;
  tz?: string;
}

// Cron Job 类型
export interface CronJob {
  id: string;
  name?: string;
  schedule: {
    kind: "cron" | "every" | "at";
    expr?: string;
    everyMs?: number;
    atMs?: number;
    tz?: string;
  };
  payload: {
    message: string;
  };
  enabled: boolean;
  state?: {
    nextRunAtMs?: number;
    lastRunAtMs?: number;
    lastStatus?: "success" | "failed";
    lastError?: string;
  };
}

// Memory 类型
export interface Memory {
  id: string;
  name: string;
  content?: string;
  size?: number;
  modified?: number;
  updatedAt?: number;
}

// Tab 类型
export type TabType = "files" | "skills" | "memory" | "sessions" | "cron";

// 现有类型 (保持向后兼容 - 避免循环导入)
// Memory 和 CronJob 类型已在上方定义
