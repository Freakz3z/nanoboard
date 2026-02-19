/**
 * Provider 配置数据
 * 预定义的常用 AI Provider 列表（根据 nanobot 官方文档）
 */

import type { ProviderInfo } from "./types";

// 图标映射
export const PROVIDER_ICONS: Record<string, string> = {
  Bot: "Bot",
  Brain: "Brain",
  Search: "Search",
  Network: "Network",
  Zap: "Zap",
  Target: "Target",
  Cpu: "Cpu",
  Server: "Server",
};

// 预定义的常用 AI Provider 列表
export const AVAILABLE_PROVIDERS: ProviderInfo[] = [
  {
    id: "custom",
    nameKey: "providers.custom",
    icon: "Server",
    colorClass: "bg-slate-50 dark:bg-slate-900/30 text-slate-600 dark:text-slate-400",
    apiBase: "",
    apiUrl: "",
    defaultModel: "",
    models: [],
  },
  {
    id: "openrouter",
    nameKey: "providers.openrouter",
    icon: "Network",
    colorClass: "bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400",
    apiBase: "https://openrouter.ai/api/v1",
    apiUrl: "https://openrouter.ai",
    defaultModel: "anthropic/claude-sonnet-4-5",
    models: ["anthropic/claude-sonnet-4-5", "openai/gpt-4o", "google/gemini-pro-1.5"],
  },
  {
    id: "anthropic",
    nameKey: "providers.anthropic",
    icon: "Bot",
    colorClass: "bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400",
    apiBase: "https://api.anthropic.com",
    apiUrl: "https://console.anthropic.com",
    defaultModel: "claude-sonnet-4-5",
    models: ["claude-opus-4-5", "claude-sonnet-4-5", "claude-haiku-4-5"],
  },
  {
    id: "openai",
    nameKey: "providers.openai",
    icon: "Brain",
    colorClass: "bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400",
    apiBase: "https://api.openai.com/v1",
    apiUrl: "https://platform.openai.com",
    defaultModel: "gpt-4o",
    models: ["gpt-4o", "gpt-4-turbo", "gpt-4o-mini"],
  },
  {
    id: "deepseek",
    nameKey: "providers.deepseek",
    icon: "Search",
    colorClass: "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
    apiBase: "https://api.deepseek.com",
    apiUrl: "https://platform.deepseek.com",
    defaultModel: "deepseek-chat",
    models: ["deepseek-chat", "deepseek-reasoner", "deepseek-coder"],
  },
  {
    id: "groq",
    nameKey: "providers.groq",
    icon: "Zap",
    colorClass: "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400",
    apiBase: "https://api.groq.com/openai/v1",
    apiUrl: "https://console.groq.com",
    defaultModel: "llama-3.3-70b-versatile",
    models: ["llama-3.3-70b-versatile", "mixtral-8x7b-32768", "gemma2-9b-it"],
  },
  {
    id: "gemini",
    nameKey: "providers.gemini",
    icon: "Target",
    colorClass: "bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400",
    apiBase: "https://generativelanguage.googleapis.com",
    apiUrl: "https://aistudio.google.com",
    defaultModel: "gemini-2.0-flash-exp",
    models: ["gemini-2.0-flash-exp", "gemini-pro", "gemini-1.5-pro"],
  },
  {
    id: "minimax",
    nameKey: "providers.minimax",
    icon: "Cpu",
    colorClass: "bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400",
    apiBase: "https://api.minimax.chat/v1",
    apiUrl: "https://platform.minimax.io",
    defaultModel: "MiniMax-Text-01",
    models: ["MiniMax-Text-01", "abab6.5s-chat", "abab6.5-chat"],
  },
  {
    id: "aihubmix",
    nameKey: "providers.aihubmix",
    icon: "Server",
    colorClass: "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400",
    apiBase: "https://aihubmix.com",
    apiUrl: "https://aihubmix.com",
    defaultModel: "anthropic/claude-sonnet-4-5",
    models: ["anthropic/claude-sonnet-4-5", "openai/gpt-4o"],
  },
  {
    id: "dashscope",
    nameKey: "providers.dashscope",
    icon: "Cpu",
    colorClass: "bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400",
    apiBase: "https://dashscope.console.aliyun.com",
    apiUrl: "https://dashscope.console.aliyun.com",
    defaultModel: "qwen-turbo",
    models: ["qwen-turbo", "qwen-plus", "qwen-max"],
  },
  {
    id: "moonshot",
    nameKey: "providers.moonshot",
    icon: "Target",
    colorClass: "bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400",
    apiBase: "https://api.moonshot.cn",
    apiUrl: "https://platform.moonshot.cn",
    defaultModel: "moonshot-v1-8k",
    models: ["moonshot-v1-8k", "moonshot-v1-32k", "moonshot-v1-128k"],
  },
  {
    id: "zhipu",
    nameKey: "providers.zhipu",
    icon: "Search",
    colorClass: "bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400",
    apiBase: "https://open.bigmodel.cn/api/paas/v4",
    apiUrl: "https://open.bigmodel.cn",
    defaultModel: "glm-4-flash",
    models: ["glm-4-flash", "glm-4-plus", "glm-4-air"],
  },
  {
    id: "vllm",
    nameKey: "providers.vllm",
    icon: "Server",
    colorClass: "bg-gray-50 dark:bg-gray-900/30 text-gray-600 dark:text-gray-400",
    apiBase: "http://localhost:8000/v1",
    apiUrl: "",
    defaultModel: "",
    models: [],
  },
  {
    id: "siliconflow",
    nameKey: "providers.siliconflow",
    icon: "Cpu",
    colorClass: "bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400",
    apiBase: "https://api.siliconflow.cn/v1",
    apiUrl: "https://cloud.siliconflow.cn",
    defaultModel: "Qwen/Qwen2.5-72B-Instruct",
    models: [
      "Qwen/Qwen2.5-72B-Instruct",
      "Qwen/Qwen2.5-32B-Instruct",
      "deepseek-ai/DeepSeek-V3",
      "deepseek-ai/DeepSeek-R1",
    ],
  },
  {
    id: "github",
    nameKey: "providers.github",
    icon: "Network",
    colorClass: "bg-slate-50 dark:bg-slate-900/30 text-slate-600 dark:text-slate-400",
    apiBase: "https://api.githubcopilot.com",
    apiUrl: "https://github.com/features/copilot",
    defaultModel: "gpt-4o",
    models: ["gpt-4o", "gpt-4-turbo", "claude-3.5-sonnet"],
  },
];

// 根据 ID 获取 Provider 信息
export function getProviderInfo(providerId: string): ProviderInfo | undefined {
  return AVAILABLE_PROVIDERS.find(p => p.id === providerId);
}

// 检查 Provider 是否已配置
export function isProviderConfigured(
  config: { providers?: Record<string, { apiKey?: string }> },
  providerId: string
): boolean {
  const providerConfig = config.providers?.[providerId];
  return !!providerConfig && !!providerConfig.apiKey && providerConfig.apiKey.trim() !== "";
}
