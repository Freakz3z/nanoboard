/**
 * 配置相关类型定义
 */

// Provider 配置
export interface Provider {
  name?: string;
  apiKey?: string;
  apiBase?: string;
  default_model?: string;
  models?: string[];
  [key: string]: any;
}

// Channel 配置
export interface Channel {
  enabled?: boolean;
  allowFrom?: string[] | string;
  [key: string]: any;
}

// MCP Server 配置
export interface McpServer {
  url?: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  [key: string]: any;
}

// Tools 配置
export interface ToolsConfig {
  exec?: {
    timeout?: number;
    pathAppend?: string;
  };
  web?: {
    search?: {
      apiKey?: string;
      maxResults?: number;
    };
  };
  mcpServers?: Record<string, McpServer>;
  restrictToWorkspace?: boolean;
  [key: string]: any;
}

// Agent 默认配置
export interface AgentDefaults {
  provider: string;
  model: string;
  maxTokens?: number;
  maxToolIterations?: number;
  memoryWindow?: number;
  temperature?: number;
  workspace?: string;
}

// Agent 配置
export interface AgentConfig {
  defaults?: AgentDefaults;
  [key: string]: any;
}

// Channels 配置（包含顶层字段）
export interface ChannelsConfig {
  sendProgress?: boolean;
  sendToolHints?: boolean;
  [key: string]: any;
}

// 主配置
export interface Config {
  providers?: Record<string, Provider>;
  channels?: ChannelsConfig;
  tools?: ToolsConfig;
  agents?: AgentConfig;
  [key: string]: any;
}

// Provider Agent 配置（独立存储）
export interface ProviderAgentConfig {
  model: string;
  max_tokens: number;
  max_tool_iterations: number;
  memory_window: number;
  temperature: number;
  workspace: string;
}

// Provider 信息
export interface ProviderInfo {
  id: string;
  nameKey: string;
  icon: string;
  colorClass: string;
  defaultModel: string;
  apiBase?: string;
  apiUrl?: string;
  models?: string[];
  loginCommand?: string;
}

// Channel 信息
export interface ChannelInfo {
  key: string;
  nameKey: string;
  icon?: string;
  colorClass: string;
  fields: ChannelField[];
}

// Channel 字段配置
export interface ChannelField {
  name: string;
  labelKey: string;
  type: "text" | "password" | "number" | "select";
  placeholderKey?: string;
  default?: any;
  options?: string[];
}

// MCP Server（带 UI 状态）
export interface McpServerWithState extends McpServer {
  disabled?: boolean;
  type?: "http" | "stdio";
}

// 配置模板
export interface ConfigTemplate {
  id: string;
  name: string;
  description: string;
  config: Config;
  createdAt: number;
}

// 配置历史版本
export interface ConfigHistoryVersion {
  filename: string;
  timestamp: number;
  size: number;
}

// 编辑 Provider 状态
export interface EditingProvider {
  isOpen: boolean;
  providerId: string;
  providerInfo: ProviderInfo | null;
  activeTab: "api" | "agent";
}

// 编辑 Channel 状态
export interface EditingChannel {
  isOpen: boolean;
  channelKey: string;
  channelInfo: ChannelInfo | null;
}

// 编辑 MCP Server 状态
export interface EditingMcpServer {
  isOpen: boolean;
  serverId: string;
  server: McpServer | null;
  mode: "add" | "edit";
}

// 确认对话框状态
export interface ConfirmDialogState {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
}

// 模板对话框状态
export interface TemplateDialogState {
  isOpen: boolean;
  mode: "save" | "edit";
  template?: ConfigTemplate;
  name: string;
  description: string;
}
