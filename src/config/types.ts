/**
 * ConfigEditor 类型定义
 */

export interface Provider {
  id?: string;
  name: string;
  apiKey?: string;
  apiBase?: string;
  token?: string;  // OAuth provider 使用
  default_model?: string;  // 仅用于 UI 辅助，不保存到配置
  models?: string[];       // 仅用于 UI 辅助，不保存到配置
}

// 每个 Provider 独立的 Agent 配置（存储在 localStorage）
export interface ProviderAgentConfig {
  model?: string;
  max_tokens?: number;
  max_tool_iterations?: number;
  memory_window?: number;
  temperature?: number;
  workspace?: string;
}

export interface AgentDefaults {
  model?: string;
  maxTokens?: number;
  maxToolIterations?: number;
  memoryWindow?: number;
  temperature?: number;
  workspace?: string;
}

export interface Channel {
  enabled?: boolean;
  config?: Record<string, any>;
  // Telegram & Discord
  token?: string;
  allowFrom?: string[];
  // Feishu
  appId?: string;
  appSecret?: string;
  encryptKey?: string;
  verificationToken?: string;
  // DingTalk
  clientId?: string;
  clientSecret?: string;
  // Slack
  botToken?: string;
  appToken?: string;
  groupPolicy?: string;
  dm?: { enabled?: boolean };
  // QQ
  secret?: string;
  // Email
  consentGranted?: boolean;
  imapHost?: string;
  imapPort?: number;
  imapUsername?: string;
  imapPassword?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUsername?: string;
  smtpPassword?: string;
  fromAddress?: string;
  autoReplyEnabled?: boolean;
}

export interface Config {
  providers?: Record<string, Provider>;
  agents?: {
    defaults?: AgentDefaults;
  };
  channels?: Record<string, Channel>;
  tools?: {
    restrictToWorkspace?: boolean;
    mcpServers?: Record<string, McpServer>;
    exec?: {
      timeout?: number;
    };
    web?: {
      search?: {
        apiKey?: string;
        maxResults?: number;
      };
    };
  };
  gateway?: {
    host?: string;
    port?: number;
  };
}

// MCP Server 配置 (支持 stdio 和 HTTP 两种传输模式)
export interface McpServer {
  // Stdio 模式
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  // HTTP 模式
  url?: string;
  // 通用配置
  disabled?: boolean;
}

// MCP Server UI 显示信息
export interface McpServerInfo {
  id: string;
  name: string;
  transport: "stdio" | "http";
  command?: string;
  args?: string[];
  url?: string;
  disabled?: boolean;
}

export interface ConfigTemplate {
  id: string;
  name: string;
  description: string;
  config: Config;
  createdAt: number;
}

export interface ConfigHistoryVersion {
  filename: string;
  timestamp: number;
  size: number;
}

// 消息渠道配置字段
export interface ChannelField {
  name: string;
  labelKey: string;  // 使用翻译 key 而不是硬编码标签
  type: "text" | "password" | "number" | "select";
  placeholderKey?: string;  // 使用翻译 key 而不是硬编码占位符
  default?: any;
  options?: string[];
}

// Provider 配置信息
export interface ProviderInfo {
  id: string;
  nameKey: string;
  icon: string;
  colorClass: string;
  apiBase: string;
  apiUrl: string;
  defaultModel: string;
  models: string[];
  // 认证类型：api_key 或 oauth
  authType?: "api_key" | "oauth";
  // OAuth 登录命令（如 "github-copilot", "openai-codex"）
  loginCommand?: string;
}

// Channel 配置信息
export interface ChannelInfo {
  key: string;
  nameKey: string;
  colorClass: string;
  fields: ChannelField[];
}
