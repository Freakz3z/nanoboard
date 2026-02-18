/**
 * Dashboard 相关类型定义
 */

export interface Status {
  running: boolean;
  port?: number;
  uptime?: string;
}

export interface SystemInfo {
  cpu: {
    usage: number;
    usage_text: string;
  };
  memory: {
    total: number;
    total_text: string;
    used: number;
    used_text: string;
    available: number;
    available_text: string;
    usage_percent: number;
    usage_text: string;
  };
  swap: {
    total: number;
    total_text: string;
    used: number;
    used_text: string;
    available: number;
    available_text: string;
    usage_percent: number;
    usage_text: string;
  };
}

export interface NanobotVersion {
  installed: boolean;
  version: string | null;
  message: string;
}

export interface LogStatistics {
  total: number;
  debug: number;
  info: number;
  warn: number;
  error: number;
}

export interface NetworkData {
  timestamp: number;
  upload: number;
  download: number;
}

export interface DashboardConfig {
  providers?: Record<string, any>;
  agents?: {
    defaults?: {
      model?: string;
      max_tokens?: number;
      temperature?: number;
      max_tool_iterations?: number;
    };
  };
  channels?: Record<string, any>;
}

export interface DiagnosisCheck {
  key: string;
  name: string;
  status: "ok" | "warning" | "error";
  message: string;
  message_key: string;
  details?: string;
}

export interface DiagnosisResult {
  overall: "passed" | "failed";
  checks: DiagnosisCheck[];
}
