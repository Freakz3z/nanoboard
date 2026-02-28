/**
 * ConfigEditor 类型定义
 * 基于 nanobot 官方配置格式：https://github.com/HKUDS/nanobot/blob/master/nanobot/config/schema.py
 *
 * 注意：所有字段名使用 camelCase 格式（与 nanobot 的 Pydantic alias_generator 一致）
 */

// ============ Provider 配置 ============

export interface Provider {
  apiKey?: string;
  apiBase?: string | null;
  extraHeaders?: Record<string, string> | null;
  // 以下字段仅用于 UI 显示，不保存到 config.json
  name?: string;
  default_model?: string;
  models?: string[];
}

// ============ Agent 配置 ============

export interface AgentDefaults {
  workspace?: string;
  model?: string;
  provider?: string;  // 显式指定 provider，"auto" 为自动检测
  maxTokens?: number;
  temperature?: number;
  maxToolIterations?: number;
  memoryWindow?: number;
}

export interface AgentsConfig {
  defaults?: AgentDefaults;
}

// ============ Channel 配置 ============

// 每个具体 Channel 的配置
export interface TelegramConfig {
  enabled?: boolean;
  token?: string;
  allowFrom?: string[];
  proxy?: string | null;
  replyToMessage?: boolean;
}

export interface DiscordConfig {
  enabled?: boolean;
  token?: string;
  allowFrom?: string[];
  gatewayUrl?: string;
  intents?: number;
}

export interface WhatsAppConfig {
  enabled?: boolean;
  bridgeUrl?: string;
  bridgeToken?: string;
  allowFrom?: string[];
}

export interface FeishuConfig {
  enabled?: boolean;
  appId?: string;
  appSecret?: string;
  encryptKey?: string;
  verificationToken?: string;
  allowFrom?: string[];
}

export interface DingTalkConfig {
  enabled?: boolean;
  clientId?: string;
  clientSecret?: string;
  allowFrom?: string[];
}

export interface SlackDMConfig {
  enabled?: boolean;
  policy?: string;
  allowFrom?: string[];
}

export interface SlackConfig {
  enabled?: boolean;
  mode?: string;
  webhookPath?: string;
  botToken?: string;
  appToken?: string;
  userTokenReadOnly?: boolean;
  replyInThread?: boolean;
  reactEmoji?: string;
  groupPolicy?: string;
  groupAllowFrom?: string[];
  dm?: SlackDMConfig;
}

export interface QQConfig {
  enabled?: boolean;
  appId?: string;
  secret?: string;
  allowFrom?: string[];
}

export interface MatrixConfig {
  enabled?: boolean;
  homeserver?: string;
  accessToken?: string;
  userId?: string;
  deviceId?: string;
  e2eeEnabled?: boolean;
  syncStopGraceSeconds?: number;
  maxMediaBytes?: number;
  allowFrom?: string[];
  groupPolicy?: string;
  groupAllowFrom?: string[];
  allowRoomMentions?: boolean;
}

export interface EmailConfig {
  enabled?: boolean;
  consentGranted?: boolean;
  imapHost?: string;
  imapPort?: number;
  imapUsername?: string;
  imapPassword?: string;
  imapMailbox?: string;
  imapUseSsl?: boolean;
  smtpHost?: string;
  smtpPort?: number;
  smtpUsername?: string;
  smtpPassword?: string;
  smtpUseTls?: boolean;
  smtpUseSsl?: boolean;
  fromAddress?: string;
  autoReplyEnabled?: boolean;
  pollIntervalSeconds?: number;
  markSeen?: boolean;
  maxBodyChars?: number;
  subjectPrefix?: string;
  allowFrom?: string[];
}

export interface MochatConfig {
  enabled?: boolean;
  baseUrl?: string;
  socketUrl?: string;
  socketPath?: string;
  allowFrom?: string[];
}

// Channels 顶层配置（包含 sendProgress 和 sendToolHints）
export interface ChannelsConfig {
  sendProgress?: boolean;    // 流式传输 agent 的文本进度到 channel
  sendToolHints?: boolean;   // 流式传输工具调用提示
  // 各个 channel 配置
  telegram?: TelegramConfig;
  discord?: DiscordConfig;
  whatsapp?: WhatsAppConfig;
  feishu?: FeishuConfig;
  dingtalk?: DingTalkConfig;
  slack?: SlackConfig;
  qq?: QQConfig;
  matrix?: MatrixConfig;
  email?: EmailConfig;
  mochat?: MochatConfig;
  // 索引签名，用于动态访问
  [key: string]: any;
}

// ============ Gateway 配置 ============

export interface HeartbeatConfig {
  enabled?: boolean;
  intervalS?: number;
}

export interface GatewayConfig {
  host?: string;
  port?: number;
  heartbeat?: HeartbeatConfig;
}

// ============ Tools 配置 ============

export interface WebSearchConfig {
  apiKey?: string;
  maxResults?: number;
}

export interface WebToolsConfig {
  search?: WebSearchConfig;
}

export interface ExecToolConfig {
  timeout?: number;
  pathAppend?: string;
}

// MCP Server 配置 (支持 stdio 和 HTTP 两种传输模式)
export interface McpServer {
  // Stdio 模式
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  // HTTP 模式
  url?: string;
  headers?: Record<string, string>;
  // 通用配置
  toolTimeout?: number;
}

export interface ToolsConfig {
  web?: WebToolsConfig;
  exec?: ExecToolConfig;
  restrictToWorkspace?: boolean;
  mcpServers?: Record<string, McpServer>;
}

// ============ 根配置 ============

export interface Config {
  agents?: AgentsConfig;
  channels?: ChannelsConfig;
  providers?: Record<string, Provider>;
  gateway?: GatewayConfig;
  tools?: ToolsConfig;
}

// ============ UI 辅助类型 ============

// Provider Agent 配置（存储在 localStorage，用于 UI 状态管理）
// 注意：这个配置用于 UI 显示，实际保存到 config.json 时会转换为 AgentDefaults 格式
// 字段使用 snake_case 以与旧版 localStorage 数据兼容
export interface ProviderAgentConfig {
  model?: string;
  max_tokens?: number;
  max_tool_iterations?: number;
  memory_window?: number;
  temperature?: number;
  workspace?: string;
}

// Provider 配置信息（用于 UI 显示）
export interface ProviderInfo {
  id: string;
  nameKey: string;
  icon: string;
  colorClass: string;
  apiBase?: string;
  apiUrl?: string;
  defaultModel: string;
  models?: string[];
  authType?: "api_key" | "oauth";
  loginCommand?: string;
}

// 消息渠道配置字段
export interface ChannelField {
  name: string;
  labelKey: string;
  type: "text" | "password" | "number" | "select";
  placeholderKey?: string;
  default?: any;
  options?: string[];
}

// Channel 配置信息（用于 UI 显示）
export interface ChannelInfo {
  key: string;
  nameKey: string;
  colorClass: string;
  fields: ChannelField[];
}

// MCP Server UI 显示信息
export interface McpServerInfo {
  id: string;
  name: string;
  transport: "stdio" | "http";
  command?: string;
  args?: string[];
  url?: string;
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

// ============ 兼容性类型（用于迁移旧配置）============

// 旧版 Channel 类型（用于兼容旧配置）
export interface LegacyChannel {
  enabled?: boolean;
  token?: string;
  allowFrom?: string[];
  proxy?: string;
  appId?: string;
  appSecret?: string;
  encryptKey?: string;
  verificationToken?: string;
  clientId?: string;
  clientSecret?: string;
  botToken?: string;
  appToken?: string;
  groupPolicy?: string;
  dm?: { enabled?: boolean };
  secret?: string;
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
  homeserver?: string;
  accessToken?: string;
  userId?: string;
  deviceId?: string;
  e2eeEnabled?: boolean;
  syncStopGraceSeconds?: number;
  maxMediaBytes?: number;
  groupAllowFrom?: string[];
  allowRoomMentions?: boolean;
}
