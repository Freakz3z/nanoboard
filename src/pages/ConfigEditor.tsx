import { useEffect, useState } from "react";
import { configApi } from "../lib/tauri";
import { useToast } from "../contexts/ToastContext";
import {
  Save,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Settings,
  Bot,
  Brain,
  Search,
  Network,
  Zap,
  Target,
  Cpu,
  Server,
  MessageSquare,
  Inbox,
  History,
  RotateCcw,
  Copy,
  FolderOpen,
} from "lucide-react";
import EmptyState from "../components/EmptyState";
import ConfirmDialog from "../components/ConfirmDialog";
import { DEFAULT_CONFIG } from "../lib/defaultConfig";

interface Provider {
  id?: string;
  name: string;
  apiKey?: string;
  apiBase?: string;
  default_model?: string;  // 仅用于 UI 辅助，不保存到配置
  models?: string[];       // 仅用于 UI 辅助，不保存到配置
}

interface AgentDefaults {
  model?: string;
  max_tokens?: number;
  max_tool_iterations?: number;
  temperature?: number;
  workspace?: string;
}

interface Channel {
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

interface Config {
  providers?: Record<string, Provider>;
  agents?: {
    defaults?: AgentDefaults;
  };
  channels?: Record<string, Channel>;
}

interface ConfigTemplate {
  id: string;
  name: string;
  description: string;
  config: Config;
  createdAt: number;
}

const TEMPLATES_STORAGE_KEY = "nanobot_config_templates";

// 图标映射组件
const ProviderIcon = ({ name, className }: { name: string; className?: string }) => {
  const icons: Record<string, React.ComponentType<{ className?: string }>> = {
    Bot,
    Brain,
    Search,
    Network,
    Zap,
    Target,
    Cpu,
    Server,
  };

  const IconComponent = icons[name] || Bot;
  return <IconComponent className={className} />;
};

// 预定义的常用 AI Provider 列表（根据 nanobot 官方文档）
const AVAILABLE_PROVIDERS = [
  {
    id: "openrouter",
    name: "OpenRouter",
    description: "推荐，可访问所有模型",
    icon: "Network",
    colorClass: "bg-purple-50 text-purple-600",
    apiBase: "https://openrouter.ai/api/v1",
    apiUrl: "https://openrouter.ai",
    defaultModel: "anthropic/claude-sonnet-4-5",
    models: ["anthropic/claude-sonnet-4-5", "openai/gpt-4o", "google/gemini-pro-1.5"],
  },
  {
    id: "anthropic",
    name: "Anthropic",
    description: "Claude 系列 AI 模型",
    icon: "Bot",
    colorClass: "bg-orange-50 text-orange-600",
    apiBase: "https://api.anthropic.com",
    apiUrl: "https://console.anthropic.com",
    defaultModel: "claude-sonnet-4-5",
    models: ["claude-opus-4-5", "claude-sonnet-4-5", "claude-haiku-4-5"],
  },
  {
    id: "openai",
    name: "OpenAI",
    description: "GPT 系列 AI 模型",
    icon: "Brain",
    colorClass: "bg-green-50 text-green-600",
    apiBase: "https://api.openai.com/v1",
    apiUrl: "https://platform.openai.com",
    defaultModel: "gpt-4o",
    models: ["gpt-4o", "gpt-4-turbo", "gpt-4o-mini"],
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    description: "深度求索 AI 模型",
    icon: "Search",
    colorClass: "bg-blue-50 text-blue-600",
    apiBase: "https://api.deepseek.com",
    apiUrl: "https://platform.deepseek.com",
    defaultModel: "deepseek-chat",
    models: ["deepseek-chat", "deepseek-reasoner", "deepseek-coder"],
  },
  {
    id: "groq",
    name: "Groq",
    description: "超快速 AI 推理 + 语音转录",
    icon: "Zap",
    colorClass: "bg-red-50 text-red-600",
    apiBase: "https://api.groq.com/openai/v1",
    apiUrl: "https://console.groq.com",
    defaultModel: "llama-3.3-70b-versatile",
    models: ["llama-3.3-70b-versatile", "mixtral-8x7b-32768", "gemma2-9b-it"],
  },
  {
    id: "gemini",
    name: "Gemini",
    description: "Google Gemini 系列",
    icon: "Target",
    colorClass: "bg-yellow-50 text-yellow-600",
    apiBase: "https://generativelanguage.googleapis.com",
    apiUrl: "https://aistudio.google.com",
    defaultModel: "gemini-2.0-flash-exp",
    models: ["gemini-2.0-flash-exp", "gemini-pro", "gemini-1.5-pro"],
  },
  {
    id: "aihubmix",
    name: "AiHubMix",
    description: "API 网关，访问所有模型",
    icon: "Server",
    colorClass: "bg-indigo-50 text-indigo-600",
    apiBase: "https://aihubmix.com",
    apiUrl: "https://aihubmix.com",
    defaultModel: "anthropic/claude-sonnet-4-5",
    models: ["anthropic/claude-sonnet-4-5", "openai/gpt-4o"],
  },
  {
    id: "dashscope",
    name: "DashScope",
    description: "阿里云 Qwen 系列",
    icon: "Cpu",
    colorClass: "bg-cyan-50 text-cyan-600",
    apiBase: "https://dashscope.console.aliyun.com",
    apiUrl: "https://dashscope.console.aliyun.com",
    defaultModel: "qwen-turbo",
    models: ["qwen-turbo", "qwen-plus", "qwen-max"],
  },
  {
    id: "moonshot",
    name: "Moonshot",
    description: "Moonshot/Kimi 系列",
    icon: "Target",
    colorClass: "bg-pink-50 text-pink-600",
    apiBase: "https://api.moonshot.cn",
    apiUrl: "https://platform.moonshot.cn",
    defaultModel: "moonshot-v1-8k",
    models: ["moonshot-v1-8k", "moonshot-v1-32k", "moonshot-v1-128k"],
  },
  {
    id: "zhipu",
    name: "Zhipu",
    description: "智谱 GLM 系列",
    icon: "Search",
    colorClass: "bg-teal-50 text-teal-600",
    apiBase: "https://open.bigmodel.cn/api/paas/v4",
    apiUrl: "https://open.bigmodel.cn",
    defaultModel: "glm-4-flash",
    models: ["glm-4-flash", "glm-4-plus", "glm-4-air"],
  },
  {
    id: "vllm",
    name: "vLLM",
    description: "本地模型（OpenAI 兼容）",
    icon: "Server",
    colorClass: "bg-gray-50 text-gray-600",
    apiBase: "http://localhost:8000/v1",
    apiUrl: "",
    defaultModel: "",
    models: [],
  },
];

// 消息渠道配置信息
interface ChannelField {
  name: string;
  label: string;
  type: "text" | "password" | "number" | "select";
  placeholder?: string;
  default?: any;
  options?: string[];
}

const CHANNELS_CONFIG: Array<{
  key: string;
  name: string;
  difficulty: string;
  description: string;
  colorClass: string;
  fields: ChannelField[];
}> = [
  {
    key: "telegram",
    name: "Telegram",
    difficulty: "简单",
    description: "推荐，只需要 bot token",
    colorClass: "bg-blue-50 text-blue-600",
    fields: [
      { name: "token", label: "Bot Token", type: "password", placeholder: "从 @BotFather 获取" },
      { name: "allowFrom", label: "允许的用户 ID", type: "text", placeholder: "留空允许所有人，或输入用户ID，用逗号分隔" },
    ],
  },
  {
    key: "discord",
    name: "Discord",
    difficulty: "简单",
    description: "需要 bot token 和 intents",
    colorClass: "bg-indigo-50 text-indigo-600",
    fields: [
      { name: "token", label: "Bot Token", type: "password", placeholder: "从 Discord Developer Portal 获取" },
      { name: "allowFrom", label: "允许的用户 ID", type: "text", placeholder: "留空允许所有人，或输入用户ID，用逗号分隔" },
    ],
  },
  {
    key: "whatsapp",
    name: "WhatsApp",
    difficulty: "中等",
    description: "需要扫描 QR 码链接",
    colorClass: "bg-green-50 text-green-600",
    fields: [
      { name: "allowFrom", label: "允许的手机号", type: "text", placeholder: "留空允许所有人，或输入手机号，用逗号分隔" },
    ],
  },
  {
    key: "feishu",
    name: "飞书",
    difficulty: "中等",
    description: "需要应用凭证",
    colorClass: "bg-cyan-50 text-cyan-600",
    fields: [
      { name: "appId", label: "App ID", type: "text", placeholder: "cli_xxx" },
      { name: "appSecret", label: "App Secret", type: "password", placeholder: "从飞书开放平台获取" },
      { name: "encryptKey", label: "Encrypt Key (可选)", type: "text", placeholder: "长连接模式可留空" },
      { name: "verificationToken", label: "Verification Token (可选)", type: "text", placeholder: "长连接模式可留空" },
      { name: "allowFrom", label: "允许的用户 ID", type: "text", placeholder: "留空允许所有人，或输入 ou_xxx，用逗号分隔" },
    ],
  },
  {
    key: "dingtalk",
    name: "钉钉",
    difficulty: "中等",
    description: "需要应用凭证",
    colorClass: "bg-red-50 text-red-600",
    fields: [
      { name: "clientId", label: "App Key (Client ID)", type: "text", placeholder: "从钉钉开放平台获取" },
      { name: "clientSecret", label: "App Secret (Client Secret)", type: "password", placeholder: "从钉钉开放平台获取" },
      { name: "allowFrom", label: "允许的员工 ID", type: "text", placeholder: "留空允许所有人，或输入 staffId，用逗号分隔" },
    ],
  },
  {
    key: "slack",
    name: "Slack",
    difficulty: "中等",
    description: "需要 bot 和 app tokens",
    colorClass: "bg-purple-50 text-purple-600",
    fields: [
      { name: "botToken", label: "Bot Token", type: "password", placeholder: "xoxb-..." },
      { name: "appToken", label: "App-Level Token", type: "password", placeholder: "xapp-..." },
      { name: "groupPolicy", label: "群组策略", type: "select", options: ["mention", "open", "allowlist"], default: "mention" },
      { name: "allowFrom", label: "允许的频道 ID (仅 allowlist 模式)", type: "text", placeholder: "输入频道 ID，用逗号分隔" },
    ],
  },
  {
    key: "qq",
    name: "QQ",
    difficulty: "简单",
    description: "QQ 私聊",
    colorClass: "bg-orange-50 text-orange-600",
    fields: [
      { name: "appId", label: "App ID", type: "text", placeholder: "从 QQ 开放平台获取" },
      { name: "secret", label: "App Secret", type: "password", placeholder: "从 QQ 开放平台获取" },
      { name: "allowFrom", label: "允许的用户 openid", type: "text", placeholder: "留空允许所有人，或输入用户 openid，用逗号分隔" },
    ],
  },
  {
    key: "email",
    name: "邮件",
    difficulty: "中等",
    description: "需要 IMAP/SMTP 凭证",
    colorClass: "bg-yellow-50 text-yellow-600",
    fields: [
      { name: "imapHost", label: "IMAP 服务器", type: "text", placeholder: "imap.gmail.com" },
      { name: "imapPort", label: "IMAP 端口", type: "number", default: 993 },
      { name: "imapUsername", label: "IMAP 用户名", type: "text", placeholder: "your-email@gmail.com" },
      { name: "imapPassword", label: "IMAP 密码", type: "password", placeholder: "应用专用密码" },
      { name: "smtpHost", label: "SMTP 服务器", type: "text", placeholder: "smtp.gmail.com" },
      { name: "smtpPort", label: "SMTP 端口", type: "number", default: 587 },
      { name: "smtpUsername", label: "SMTP 用户名", type: "text", placeholder: "your-email@gmail.com" },
      { name: "smtpPassword", label: "SMTP 密码", type: "password", placeholder: "应用专用密码" },
      { name: "fromAddress", label: "发件人地址", type: "text", placeholder: "your-email@gmail.com" },
      { name: "allowFrom", label: "允许的发件人", type: "text", placeholder: "留空允许所有人，或输入邮箱，用逗号分隔" },
    ],
  },
];

export default function ConfigEditor() {
  const [config, setConfig] = useState<Config>({});
  const [originalConfig, setOriginalConfig] = useState<Config>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["providers"])
  );
  const [editingProvider, setEditingProvider] = useState<{
    isOpen: boolean;
    providerId: string;
    providerInfo: typeof AVAILABLE_PROVIDERS[0] | null;
  }>({ isOpen: false, providerId: "", providerInfo: null });
  const [showHistory, setShowHistory] = useState(false);
  const [historyVersions, setHistoryVersions] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: "", message: "", onConfirm: () => {} });
  const [showTemplates, setShowTemplates] = useState(false);
  const [templates, setTemplates] = useState<ConfigTemplate[]>([]);
  const [templateDialog, setTemplateDialog] = useState<{
    isOpen: boolean;
    mode: "save" | "edit";
    template?: ConfigTemplate;
    name: string;
    description: string;
  }>({ isOpen: false, mode: "save", name: "", description: "" });
  const [editingChannel, setEditingChannel] = useState<{
    isOpen: boolean;
    channelKey: string;
    channelInfo: typeof CHANNELS_CONFIG[0] | null;
  }>({ isOpen: false, channelKey: "", channelInfo: null });
  const toast = useToast();

  useEffect(() => {
    loadConfig();

    // 从 localStorage 加载展开状态
    const savedExpanded = localStorage.getItem("configEditorExpandedSections");
    if (savedExpanded) {
      try {
        const parsed = JSON.parse(savedExpanded);
        setExpandedSections(new Set(parsed));
      } catch (e) {
        console.error("加载展开状态失败:", e);
      }
    }
  }, []);

  // 监听展开状态变化并保存到 localStorage
  useEffect(() => {
    localStorage.setItem("configEditorExpandedSections", JSON.stringify([...expandedSections]));
  }, [expandedSections]);

  async function loadConfig() {
    setLoading(true);
    try {
      const result = await configApi.load();
      if (result.error) {
        toast.showError(result.message);
        setConfig({});
      } else {
        setConfig(result as Config);
        setOriginalConfig(result as Config);
      }
    } catch (error) {
      toast.showError("加载配置失败");
    } finally {
      setLoading(false);
    }
  }

  // 清理配置，移除仅用于 UI 的辅助字段
  function cleanConfigForSave(config: Config): any {
    const cleaned: any = {
      ...config,
    };

    // 清理 providers - 移除 UI 辅助字段、name 字段
    if (config.providers) {
      cleaned.providers = {};
      for (const [key, provider] of Object.entries(config.providers)) {
        const { default_model, models, name, ...rest } = provider;

        // 获取该提供商的默认 apiBase
        const providerInfo = AVAILABLE_PROVIDERS.find(p => p.id === key);
        const defaultApiBase = providerInfo?.apiBase;

        // 如果配置了 apiKey 但没有配置 apiBase，自动填充默认值并保存
        if (rest.apiKey && !rest.apiBase && defaultApiBase) {
          rest.apiBase = defaultApiBase;
        }

        cleaned.providers[key] = rest;
      }
    }

    // 清理 channels - 将 allowFrom 字符串转换为列表
    if (config.channels) {
      cleaned.channels = {};
      for (const [key, channel] of Object.entries(config.channels)) {
        const cleanedChannel: any = { ...channel };

        // 将 allowFrom 字符串转换为列表
        if (cleanedChannel.allowFrom !== undefined) {
          if (typeof cleanedChannel.allowFrom === 'string') {
            // 如果是空字符串或只有空白字符，设置为 [""]
            if (cleanedChannel.allowFrom.trim() === '') {
              cleanedChannel.allowFrom = [''];
            } else {
              // 否则按逗号分割成数组，并去除空白字符
              cleanedChannel.allowFrom = cleanedChannel.allowFrom
                .split(',')
                .map((s: string) => s.trim())
                .filter((s: string) => s.length > 0);
            }
          }
          // 如果已经是数组，保持不变
        }

        cleaned.channels[key] = cleanedChannel;
      }
    }

    return cleaned;
  }

  async function saveConfig() {
    setSaving(true);
    try {
      // 清理 UI 辅助字段
      const configToSave = cleanConfigForSave(config);

      const validation = await configApi.validate(configToSave);

      if (!validation.valid && validation.errors.length > 0) {
        toast.showError(`配置验证失败: ${validation.errors.join(", ")}`);
        return;
      }

      await configApi.save(configToSave);
      setOriginalConfig(configToSave);
      setConfig(configToSave);
      toast.showSuccess("配置已保存");
    } catch (error) {
      toast.showError("保存配置失败");
    } finally {
      setSaving(false);
    }
  }

  const hasChanges = JSON.stringify(config) !== JSON.stringify(originalConfig);

  function toggleSection(section: string) {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  }

  function updateProvider(name: string, field: keyof Provider, value: any) {
    const currentProvider = config.providers?.[name] || { name };
    setConfig({
      ...config,
      providers: {
        ...config.providers,
        [name]: {
          ...currentProvider,
          [field]: value,
        },
      },
    });
  }

  function removeProvider(name: string) {
    const newProviders = { ...config.providers };
    delete newProviders[name];
    setConfig({ ...config, providers: newProviders });
  }

  function updateAgentDefaults(field: keyof AgentDefaults, value: any) {
    setConfig({
      ...config,
      agents: {
        ...config.agents,
        defaults: {
          ...config.agents?.defaults,
          [field]: value,
        },
      },
    });
  }

  function updateChannel(name: string, enabled: boolean) {
    setConfig({
      ...config,
      channels: {
        ...config.channels,
        [name]: {
          ...config.channels?.[name],
          enabled,
        },
      },
    });
  }

  function updateChannelField(channelKey: string, field: string, value: any) {
    const currentChannel = config.channels?.[channelKey] || {};
    setConfig({
      ...config,
      channels: {
        ...config.channels,
        [channelKey]: {
          ...currentChannel,
          [field]: value,
        },
      },
    });
  }

  async function loadHistory() {
    setLoadingHistory(true);
    try {
      const versions = await configApi.getHistory();
      setHistoryVersions(versions);
    } catch (error) {
      toast.showError("加载历史记录失败");
    } finally {
      setLoadingHistory(false);
    }
  }

  function formatTimestamp(timestamp: number): string {
    return new Date(timestamp * 1000).toLocaleString("zh-CN");
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  function restoreVersion(version: any) {
    setConfirmDialog({
      isOpen: true,
      title: "确认恢复",
      message: `确定要恢复到 ${formatTimestamp(version.timestamp)} 的版本吗？当前配置将被覆盖。`,
      onConfirm: async () => {
        try {
          await configApi.restoreVersion(version.filename);
          await loadConfig();
          await loadHistory();
          toast.showSuccess("配置已恢复");
        } catch (error) {
          toast.showError("恢复配置失败");
        } finally {
          setConfirmDialog({ isOpen: false, title: "", message: "", onConfirm: () => {} });
        }
      },
    });
  }

  async function deleteVersion(version: any) {
    try {
      await configApi.deleteVersion(version.filename);
      await loadHistory();
      toast.showSuccess("历史版本已删除");
    } catch (error) {
      toast.showError("删除历史版本失败");
    }
  }

  // 打开历史记录面板时加载历史
  useEffect(() => {
    if (showHistory) {
      loadHistory();
    }
  }, [showHistory]);

  // 打开模板面板时加载模板
  useEffect(() => {
    if (showTemplates) {
      loadTemplates();
    }
  }, [showTemplates]);

  function loadTemplates() {
    try {
      const stored = localStorage.getItem(TEMPLATES_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setTemplates(parsed);
      }
    } catch (error) {
      console.error("加载模板失败:", error);
    }
  }

  function saveTemplates() {
    try {
      localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
    } catch (error) {
      console.error("保存模板失败:", error);
    }
  }

  function openSaveTemplateDialog() {
    setTemplateDialog({
      isOpen: true,
      mode: "save",
      name: "",
      description: "",
    });
  }

  function applyTemplate(template: ConfigTemplate) {
    setConfig(template.config);
    toast.showSuccess(`已加载模板 "${template.name}"`);
    setShowTemplates(false);
  }

  function deleteTemplate(template: ConfigTemplate) {
    setConfirmDialog({
      isOpen: true,
      title: "确认删除",
      message: `确定要删除模板 "${template.name}" 吗？`,
      onConfirm: () => {
        const updated = templates.filter((t) => t.id !== template.id);
        setTemplates(updated);
        saveTemplates();
        toast.showSuccess("模板已删除");
        setConfirmDialog({ isOpen: false, title: "", message: "", onConfirm: () => {} });
      },
    });
  }

  function confirmSaveTemplate() {
    if (!templateDialog.name.trim()) {
      toast.showError("请输入模板名称");
      return;
    }

    const newTemplate: ConfigTemplate = {
      id: Date.now().toString(),
      name: templateDialog.name.trim(),
      description: templateDialog.description.trim(),
      config: config,
      createdAt: Date.now(),
    };

    const updated = [...templates, newTemplate];
    setTemplates(updated);
    saveTemplates();
    toast.showSuccess("模板已保存");
    setTemplateDialog({ isOpen: false, mode: "save", name: "", description: "" });
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      {/* 页面头部 */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold text-gray-900">配置编辑</h1>

              {/* 状态指示器 */}
              {hasChanges && (
                <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 text-sm font-medium">
                  <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                  <span>未保存</span>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setConfirmDialog({
                    isOpen: true,
                    title: "恢复默认配置",
                    message: "确定要恢复到默认配置吗？这将清空所有当前配置。",
                    onConfirm: async () => {
                      try {
                        // 恢复到默认配置并直接保存到文件
                        await configApi.save(DEFAULT_CONFIG);
                        setConfig(DEFAULT_CONFIG);
                        setOriginalConfig(DEFAULT_CONFIG);
                        toast.showSuccess("已恢复默认配置");
                      } catch (error) {
                        toast.showError("恢复默认配置失败");
                      } finally {
                        setConfirmDialog({ isOpen: false, title: "", message: "", onConfirm: () => {} });
                      }
                    },
                  });
                }}
                className="flex items-center gap-2 px-3 py-2 bg-amber-100 hover:bg-amber-200 rounded-lg font-medium text-amber-700 transition-colors text-sm"
                >
                <RotateCcw className="w-4 h-4" />
                恢复默认
              </button>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors text-sm ${
                  showHistory
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
                title="查看历史版本"
              >
                <History className="w-4 h-4" />
                历史记录
              </button>
              {!hasChanges && (
                <div className="flex items-center gap-1.5 text-green-600 bg-green-50 px-3 py-2 rounded-lg border border-green-200 text-sm font-medium">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span>已保存</span>
                </div>
              )}
              <button
                onClick={saveConfig}
                disabled={saving || !hasChanges}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg font-medium text-white transition-colors text-sm"
                title={hasChanges ? "保存更改到配置文件" : "没有需要保存的更改"}
              >
                <Save className="w-4 h-4" />
                {saving ? "保存中..." : "保存配置"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="p-8">
        <div className="max-w-6xl mx-auto space-y-6">

        {/* 历史记录模态框 */}
        {showHistory && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
              {/* 头部 */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-50 rounded-lg">
                      <History className="w-5 h-5 text-amber-600" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      配置历史记录
                    </h2>
                  </div>
                  <button
                    onClick={() => setShowHistory(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* 内容 */}
              <div className="flex-1 overflow-y-auto p-6">
                {loadingHistory ? (
                  <div className="flex items-center justify-center py-8 text-gray-500 text-sm">
                    加载中...
                  </div>
                ) : historyVersions.length === 0 ? (
                  <EmptyState
                    icon={Inbox}
                    title="暂无历史记录"
                    description="保存配置时会自动创建历史备份（最多保留10份）"
                  />
                ) : (
                  <div className="space-y-2">
                    {historyVersions.map((version) => (
                      <div
                        key={version.filename}
                        className="group p-4 rounded-lg bg-gray-50 border border-gray-200 hover:border-blue-200 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                              <span className="text-sm font-medium text-gray-900">
                                {formatTimestamp(version.timestamp)}
                              </span>
                              <span className="text-xs text-gray-500">
                                {formatSize(version.size)}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => restoreVersion(version)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                            >
                              <RotateCcw className="w-4 h-4" />
                              恢复
                            </button>
                            <button
                              onClick={() => deleteVersion(version)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="删除此版本"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 模板面板 */}
        {showTemplates && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <Copy className="w-5 h-5 text-purple-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">
                  配置模板
                </h2>
              </div>
              <button
                onClick={openSaveTemplateDialog}
                className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                保存当前配置为模板
              </button>
            </div>

            <div className="p-5">
              {templates.length === 0 ? (
                <EmptyState
                  icon={FolderOpen}
                  title="暂无配置模板"
                  description="保存常用配置为模板，方便快速加载"
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className="group p-4 rounded-lg bg-gray-50 border border-gray-200 hover:border-purple-200 hover:bg-purple-50 transition-all"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 text-sm mb-1">
                            {template.name}
                          </h4>
                          {template.description && (
                            <p className="text-xs text-gray-500 line-clamp-2">
                              {template.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button
                            onClick={() => applyTemplate(template)}
                            className="p-1.5 text-purple-600 hover:bg-purple-100 rounded-lg transition-colors"
                            title="应用此模板"
                          >
                            <FolderOpen className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteTemplate(template)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="删除模板"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="text-xs text-gray-400">
                        创建于 {new Date(template.createdAt).toLocaleString("zh-CN")}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Providers 配置 */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <button
            onClick={() => toggleSection("providers")}
            className="w-full p-5 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Bot className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">
                LLM 提供商
              </h2>
            </div>
            {expandedSections.has("providers") ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {expandedSections.has("providers") && (
            <div className="p-5 pt-0 space-y-4">
              {/* 可用的 Provider 列表 */}
              <div className="space-y-2">
                <p className="text-sm text-gray-600 mb-3">选择要配置的 AI 提供商：</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {AVAILABLE_PROVIDERS.map((provider) => {
                    const providerConfig = config.providers?.[provider.id];
                    const isConfigured = providerConfig && providerConfig.apiKey && providerConfig.apiKey.trim() !== "";

                    return (
                      <div
                        key={provider.id}
                        className={`group rounded-lg border transition-all cursor-pointer hover:shadow-md ${
                          isConfigured
                            ? "bg-green-50 border-green-200"
                            : "bg-white border-gray-200 hover:border-gray-300"
                        }`}
                        onClick={() => {
                          setEditingProvider({
                            isOpen: true,
                            providerId: provider.id,
                            providerInfo: provider,
                          });
                        }}
                      >
                        <div className="w-full p-4 text-left">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <div className={`p-2 rounded-lg ${provider.colorClass.split(' ')[0]}`}>
                                <ProviderIcon name={provider.icon} className={`w-5 h-5 ${provider.colorClass.split(' ')[1]}`} />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold text-gray-900 text-sm">
                                    {provider.name}
                                  </h3>
                                  {isConfigured && (
                                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                                      已配置
                                    </span>
                                  )}
                                  {!isConfigured && (
                                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                                      未配置
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {provider.description}
                                </p>
                              </div>
                            </div>
                            <div className="p-1.5 bg-white rounded-lg border border-gray-200 group-hover:border-blue-200 transition-colors">
                              <Settings className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {Object.keys(config.providers || {}).length === 0 && (
                <EmptyState
                  icon={Bot}
                  title="暂无提供商配置"
                  description="选择上方的 AI 提供商开始配置"
                />
              )}
            </div>
          )}
        </div>

        {/* Agents 配置 */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <button
            onClick={() => toggleSection("agents")}
            className="w-full p-5 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 rounded-lg">
                <Settings className="w-5 h-5 text-purple-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">
                Agent配置
              </h2>
            </div>
            {expandedSections.has("agents") ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {expandedSections.has("agents") && (
            <div className="p-5 pt-0 space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  默认模型 (model)
                </label>
                <input
                  type="text"
                  value={config.agents?.defaults?.model || ""}
                  onChange={(e) =>
                    updateAgentDefaults("model", e.target.value)
                  }
                  placeholder="例如: anthropic/claude-opus-4-5"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">agent 使用的默认 LLM 模型</p>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  最大 Token 数 (max_tokens)
                </label>
                <input
                  type="number"
                  value={config.agents?.defaults?.max_tokens || 8192}
                  onChange={(e) =>
                    updateAgentDefaults("max_tokens", parseInt(e.target.value))
                  }
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">单次请求的最大 token 数量</p>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  最大工具迭代次数 (max_tool_iterations)
                </label>
                <input
                  type="number"
                  value={config.agents?.defaults?.max_tool_iterations ?? 20}
                  onChange={(e) =>
                    updateAgentDefaults("max_tool_iterations", parseInt(e.target.value))
                  }
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">agent 执行工具的最大迭代次数</p>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  工作区路径 (workspace)
                </label>
                <input
                  type="text"
                  value={config.agents?.defaults?.workspace || "~/.nanobot/workspace"}
                  onChange={(e) =>
                    updateAgentDefaults("workspace", e.target.value)
                  }
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">agent 工作区的默认路径</p>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  温度 (temperature) (0.0 - 2.0)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="2"
                  value={config.agents?.defaults?.temperature ?? 0.7}
                  onChange={(e) =>
                    updateAgentDefaults("temperature", parseFloat(e.target.value))
                  }
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">控制生成文本的随机性，越高越随机</p>
              </div>
            </div>
          )}
        </div>

        {/* Channels 配置 */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <button
            onClick={() => toggleSection("channels")}
            className="w-full p-5 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <MessageSquare className="w-5 h-5 text-green-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">
                消息渠道
              </h2>
            </div>
            {expandedSections.has("channels") ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {expandedSections.has("channels") && (
            <div className="p-5 pt-0 space-y-2">
              {CHANNELS_CONFIG.filter(channel => channel.key !== "terminal").map((channel) => {
                const isEnabled = config.channels?.[channel.key]?.enabled || false;
                return (
                  <div
                    key={channel.key}
                    className={`group p-3 rounded-lg border transition-all ${
                      isEnabled
                        ? "bg-green-50 border-green-200"
                        : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div
                        className="flex-1 cursor-pointer"
                        onClick={() =>
                          setEditingChannel({
                            isOpen: true,
                            channelKey: channel.key,
                            channelInfo: channel,
                          })
                        }
                      >
                        <div className="flex items-center gap-3">
                          <MessageSquare className={`w-4 h-4 ${isEnabled ? "text-green-600" : "text-gray-500"}`} />
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-gray-700">{channel.name}</span>
                            <span className="text-xs text-gray-400">{channel.description} · 配置难度: {channel.difficulty}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingChannel({
                              isOpen: true,
                              channelKey: channel.key,
                              channelInfo: channel,
                            });
                          }}
                          className="p-1.5 bg-white rounded-lg border border-gray-200 group-hover:border-blue-200 transition-colors opacity-0 group-hover:opacity-100"
                          title="编辑配置"
                        >
                          <Settings className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateChannel(channel.key, !isEnabled);
                          }}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                            isEnabled ? "bg-blue-600" : "bg-gray-300"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${
                              isEnabled ? "translate-x-5" : "translate-x-0.5"
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {Object.keys(config.channels || {}).length === 0 && (
                <EmptyState
                  icon={Inbox}
                  title="暂无渠道配置"
                  description="点击渠道卡片开始配置"
                />
              )}
            </div>
          )}
        </div>

        </div>
      </div>

      {/* 确认对话框 */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type="warning"
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ isOpen: false, title: "", message: "", onConfirm: () => {} })}
      />

      {/* 保存模板对话框 */}
      {templateDialog.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {templateDialog.mode === "save" ? "保存配置模板" : "编辑模板"}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  模板名称
                </label>
                <input
                  type="text"
                  value={templateDialog.name}
                  onChange={(e) => setTemplateDialog({ ...templateDialog, name: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      confirmSaveTemplate();
                    } else if (e.key === "Escape") {
                      setTemplateDialog({ isOpen: false, mode: "save", name: "", description: "" });
                    }
                  }}
                  placeholder="例如: OpenAI 配置、开发环境配置"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  描述（可选）
                </label>
                <textarea
                  value={templateDialog.description}
                  onChange={(e) => setTemplateDialog({ ...templateDialog, description: e.target.value })}
                  placeholder="描述此模板的用途..."
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setTemplateDialog({ isOpen: false, mode: "save", name: "", description: "" })}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm font-medium"
              >
                取消
              </button>
              <button
                onClick={confirmSaveTemplate}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm font-medium"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 提供商编辑模态框 */}
      {editingProvider.isOpen && editingProvider.providerInfo && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setEditingProvider({ isOpen: false, providerId: "", providerInfo: null })}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2 rounded-lg ${editingProvider.providerInfo.colorClass.split(' ')[0]}`}>
                <ProviderIcon
                  name={editingProvider.providerInfo.icon}
                  className={`w-6 h-6 ${editingProvider.providerInfo.colorClass.split(' ')[1]}`}
                />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  编辑 {editingProvider.providerInfo.name} 配置
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {editingProvider.providerInfo.description}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  API Key
                </label>
                <input
                  type="password"
                  value={config.providers?.[editingProvider.providerId]?.apiKey || ""}
                  onChange={(e) =>
                    updateProvider(editingProvider.providerId, "apiKey", e.target.value)
                  }
                  placeholder="sk-..."
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
                {editingProvider.providerInfo.apiUrl && (
                  <p className="text-xs text-gray-400 mt-1">
                    在 <a
                      href={editingProvider.providerInfo.apiUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline"
                    >
                      {editingProvider.providerInfo.apiUrl}
                    </a>{" "}
                    获取 API Key
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  API Base URL
                </label>
                <input
                  type="text"
                  value={config.providers?.[editingProvider.providerId]?.apiBase || ""}
                  onChange={(e) =>
                    updateProvider(editingProvider.providerId, "apiBase", e.target.value)
                  }
                  placeholder={editingProvider.providerInfo.apiBase || "https://api.example.com/v1"}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
                {editingProvider.providerInfo.apiBase && (
                  <p className="text-xs text-gray-400 mt-1">
                    默认值: {editingProvider.providerInfo.apiBase}
                  </p>
                )}
              </div>

              {config.providers?.[editingProvider.providerId] && (
                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => {
                      removeProvider(editingProvider.providerId);
                      setEditingProvider({ isOpen: false, providerId: "", providerInfo: null });
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    删除配置
                  </button>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setEditingProvider({ isOpen: false, providerId: "", providerInfo: null })}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm font-medium"
              >
                取消
              </button>
              <button
                onClick={async () => {
                  setEditingProvider({ isOpen: false, providerId: "", providerInfo: null });
                  await saveConfig();
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
              >
                完成
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 渠道编辑模态框 */}
      {editingChannel.isOpen && editingChannel.channelInfo && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setEditingChannel({ isOpen: false, channelKey: "", channelInfo: null })}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2 rounded-lg ${editingChannel.channelInfo.colorClass.split(' ')[0]}`}>
                <MessageSquare className={`w-6 h-6 ${editingChannel.channelInfo.colorClass.split(' ')[1]}`} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  编辑 {editingChannel.channelInfo.name} 配置
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {editingChannel.channelInfo.description}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {editingChannel.channelInfo.fields.map((field) => {
                const currentValue = (config.channels?.[editingChannel.channelKey] as any)?.[field.name];
                const fieldValue = currentValue !== undefined ? currentValue : (field.default ?? "");

                return (
                  <div key={field.name}>
                    <label className="block text-sm text-gray-600 mb-1">
                      {field.label}
                    </label>
                    {field.type === "select" ? (
                      <select
                        value={fieldValue as string}
                        onChange={(e) =>
                          updateChannelField(editingChannel.channelKey, field.name, e.target.value)
                        }
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      >
                        {("options" in field) && field.options?.map((option: string) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : field.type === "number" ? (
                      <input
                        type="number"
                        value={fieldValue as number}
                        onChange={(e) =>
                          updateChannelField(editingChannel.channelKey, field.name, parseInt(e.target.value))
                        }
                        placeholder={field.placeholder}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    ) : (
                      <input
                        type={field.type === "password" ? "password" : "text"}
                        value={fieldValue as string}
                        onChange={(e) =>
                          updateChannelField(editingChannel.channelKey, field.name, e.target.value)
                        }
                        placeholder={field.placeholder}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setEditingChannel({ isOpen: false, channelKey: "", channelInfo: null })}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm font-medium"
              >
                取消
              </button>
              <button
                onClick={async () => {
                  setEditingChannel({ isOpen: false, channelKey: "", channelInfo: null });
                  await saveConfig();
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
              >
                完成
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
