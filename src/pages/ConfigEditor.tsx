import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { configApi } from "../lib/tauri";
import { useToast } from "../contexts/ToastContext";
import {
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
  Code,
  Shield,
  Plug,
  Terminal,
  Globe,
} from "lucide-react";
import EmptyState from "../components/EmptyState";
import ConfirmDialog from "../components/ConfirmDialog";
import { DEFAULT_CONFIG } from "../lib/defaultConfig";

// 导入模块化的类型和数据
import type {
  Config,
  ConfigTemplate,
  ConfigHistoryVersion,
  ProviderAgentConfig,
  ProviderInfo,
  ChannelInfo,
  Provider,
  McpServer,
} from "@/config/types";
import { AVAILABLE_PROVIDERS } from "@/config/providers";
import { CHANNELS_CONFIG } from "@/config/channels";
import { formatTimestamp } from "@/utils/format";
import ProviderEditModal from "@/components/config/ProviderEditModal";
import ChannelEditModal from "@/components/config/ChannelEditModal";
import McpServerEditModal from "@/components/config/McpServerEditModal";
import HistoryPanel from "@/components/config/HistoryPanel";
import CodeEditorView from "@/components/config/CodeEditorView";

const TEMPLATES_STORAGE_KEY = "nanobot_config_templates";
const PROVIDER_AGENT_CONFIGS_KEY = "nanoboard_provider_agent_configs";

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

export default function ConfigEditor() {
  const { t, i18n } = useTranslation();
  const [config, setConfig] = useState<Config>({});
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => {
    // 从 localStorage 加载展开状态，如果没有则使用默认值
    const savedExpanded = localStorage.getItem("configEditorExpandedSections");
    if (savedExpanded) {
      try {
        const parsed = JSON.parse(savedExpanded);
        return new Set(parsed);
      } catch (e) {
        console.error("Failed to load expanded sections:", e);
      }
    }
    return new Set(["providers", "channels", "mcp", "security"]);
  });
  const [editingProvider, setEditingProvider] = useState<{
    isOpen: boolean;
    providerId: string;
    providerInfo: ProviderInfo | null;
    activeTab: "api" | "agent";
  }>({ isOpen: false, providerId: "", providerInfo: null, activeTab: "api" });
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(() => {
    return localStorage.getItem("selectedProviderId");
  });
  const [providerAgentConfigs, setProviderAgentConfigs] = useState<Record<string, ProviderAgentConfig>>({});


  const [showHistory, setShowHistory] = useState(false);
  const [historyVersions, setHistoryVersions] = useState<ConfigHistoryVersion[]>([]);
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
    channelInfo: ChannelInfo | null;
  }>({ isOpen: false, channelKey: "", channelInfo: null });
  const [editingMcpServer, setEditingMcpServer] = useState<{
    isOpen: boolean;
    serverId: string;
    server: McpServer | null;
    mode: "add" | "edit";
  }>({ isOpen: false, serverId: "", server: null, mode: "add" });
  const toast = useToast();

  // 代码编辑器模式状态
  const [viewMode, setViewMode] = useState<"visual" | "code">("visual");
  const [originalConfig, setOriginalConfig] = useState<Config>({});
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [savingCode, setSavingCode] = useState(false);

  useEffect(() => {
    loadConfig();
    loadProviderAgentConfigs();
  }, []);

  // 监听展开状态变化并保存到 localStorage
  useEffect(() => {
    localStorage.setItem("configEditorExpandedSections", JSON.stringify([...expandedSections]));
  }, [expandedSections]);

  // 监听选中的 Provider 并保存到 localStorage
  useEffect(() => {
    if (selectedProviderId) {
      localStorage.setItem("selectedProviderId", selectedProviderId);
    } else {
      localStorage.removeItem("selectedProviderId");
    }
  }, [selectedProviderId]);

  async function loadConfig() {
    setLoading(true);
    try {
      const result = await configApi.load();
      if (result.error) {
        toast.showError(result.message);
        setConfig({});
      } else {
        const loadedConfig = result as Config;
        setConfig(loadedConfig);
        // 同步更新代码编辑器状态
        setOriginalConfig(loadedConfig);
        setCode(JSON.stringify(loadedConfig, null, 2));
        }
    } catch (error) {
      toast.showError(t("config.loadConfigFailed"));
    } finally {
      setLoading(false);
    }
  }

  function loadProviderAgentConfigs() {
    try {
      const stored = localStorage.getItem(PROVIDER_AGENT_CONFIGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setProviderAgentConfigs(parsed);
      }
    } catch (error) {
      console.error(t("config.loadProviderAgentConfigFailed"), error);
    }
  }

  function saveProviderAgentConfigs(data?: Record<string, ProviderAgentConfig>) {
    try {
      localStorage.setItem(PROVIDER_AGENT_CONFIGS_KEY, JSON.stringify(data ?? providerAgentConfigs));
    } catch (error) {
      console.error(t("config.saveProviderAgentConfigFailed"), error);
    }
  }

  // 代码编辑器相关函数
  async function saveCodeConfig() {
    setSavingCode(true);
    try {
      const parsed = JSON.parse(code);
      setCodeError(null);

      const validation = await configApi.validate(parsed);
      if (!validation.valid && validation.errors && validation.errors.length > 0) {
        toast.showError(`${t("config.validationFailed")}: ${validation.errors.join(", ")}`);
        return;
      }

      await configApi.save(parsed);
      setOriginalConfig(parsed);
      setConfig(parsed as Config);
      // 更新代码状态为保存后的内容
      setCode(JSON.stringify(parsed, null, 2));
      toast.showSuccess(t("config.saveSuccess"));
    } catch (error) {
      if (typeof error === "object" && error !== null && "message" in error) {
        const jsonError = error as { message: string };
        if (jsonError.message.includes("JSON")) {
          setCodeError(`${t("config.jsonSyntaxError")}: ${jsonError.message}`);
          toast.showError(t("config.jsonSyntaxError"));
          return;
        }
      }
      toast.showError(t("config.saveFailed"));
    } finally {
      setSavingCode(false);
    }
  }

  function formatCode() {
    try {
      const parsed = JSON.parse(code);
      const formatted = JSON.stringify(parsed, null, 2);
      setCode(formatted);
      setCodeError(null);
      toast.showSuccess(t("config.codeFormatted"));
    } catch (error) {
      setCodeError(`${t("config.formatFailed")}: ${t("config.jsonSyntaxError")}`);
      toast.showError(`${t("config.formatFailed")}: ${t("config.jsonSyntaxError")}`);
    }
  }

  function handleCodeChange(newCode: string) {
    setCode(newCode);
    try {
      JSON.parse(newCode);
      setCodeError(null);
    } catch (error) {
      if (typeof error === "object" && error !== null && "message" in error) {
        setCodeError(`${t("config.jsonSyntaxError")} ${(error as { message: string }).message}`);
      } else {
        setCodeError(t("config.jsonSyntaxError"));
      }
    }
  }

  function getProviderAgentConfig(providerId: string): ProviderAgentConfig {
    return providerAgentConfigs[providerId] || {};
  }

  function updateProviderAgentConfig(providerId: string, field: keyof ProviderAgentConfig, value: any) {
    const currentConfig = getProviderAgentConfig(providerId);
    const updatedConfig = {
      ...providerAgentConfigs,
      [providerId]: {
        ...currentConfig,
        [field]: value,
      },
    };
    setProviderAgentConfigs(updatedConfig);
    saveProviderAgentConfigs(updatedConfig);
  }

  async function applyProviderAgentConfig(providerId: string) {
    const agentConfig = getProviderAgentConfig(providerId);
    if (Object.keys(agentConfig).length === 0) {
      toast.showInfo(t("config.noProviderAgentConfig"));
      return;
    }

    // 更新 config.agents.defaults
    const updatedConfig = {
      ...config,
      agents: {
        ...config.agents,
        defaults: {
          ...config.agents?.defaults,
          ...agentConfig,
        },
      },
    };
    setConfig(updatedConfig);
    setSelectedProviderId(providerId); // 标记为已选择
    const providerName = AVAILABLE_PROVIDERS.find(p => p.id === providerId)?.id || providerId;
    toast.showSuccess(t("config.applyProviderConfig", { name: providerName }));

    // 自动保存
    try {
      const configToSave = cleanConfigForSave(updatedConfig);
      await configApi.save(configToSave);
      // 同步更新代码编辑器状态
      setOriginalConfig(updatedConfig);
      setCode(JSON.stringify(updatedConfig, null, 2));
    } catch (error) {
      toast.showError(t("config.autoSaveFailed"));
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
            // 如果是空字符串或只有空白字符，设置为空数组（允许所有人）
            if (cleanedChannel.allowFrom.trim() === '') {
              cleanedChannel.allowFrom = [];
            } else {
              // 否则按逗号分割成数组，并去除空白字符
              cleanedChannel.allowFrom = cleanedChannel.allowFrom
                .split(',')
                .map((s: string) => s.trim())
                .filter((s: string) => s.length > 0);
            }
          } else if (Array.isArray(cleanedChannel.allowFrom)) {
            // 如果是数组，过滤掉空字符串
            cleanedChannel.allowFrom = cleanedChannel.allowFrom.filter((s: string) => s.trim().length > 0);
          }
        }

        cleaned.channels[key] = cleanedChannel;
      }
    }

    return cleaned;
  }

  function toggleSection(section: string) {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  }

  async function updateProvider(name: string, field: keyof Provider, value: any) {
    const currentProvider = config.providers?.[name] || { name };
    const updatedConfig = {
      ...config,
      providers: {
        ...config.providers,
        [name]: {
          ...currentProvider,
          [field]: value,
        },
      },
    };
    setConfig(updatedConfig);

    // 自动保存
    try {
      const configToSave = cleanConfigForSave(updatedConfig);
      await configApi.save(configToSave);
      // 同步更新代码编辑器状态
      setOriginalConfig(updatedConfig);
      setCode(JSON.stringify(updatedConfig, null, 2));
    } catch (error) {
      toast.showError(t("config.autoSaveFailed"));
    }
  }

  async function removeProvider(name: string) {
    const newProviders = { ...config.providers };
    delete newProviders[name];
    const updatedConfig = { ...config, providers: newProviders };
    setConfig(updatedConfig);

    // 自动保存
    try {
      const configToSave = cleanConfigForSave(updatedConfig);
      await configApi.save(configToSave);
      // 同步更新代码编辑器状态
      setOriginalConfig(updatedConfig);
      setCode(JSON.stringify(updatedConfig, null, 2));
    } catch (error) {
      toast.showError(t("config.autoSaveFailed"));
    }
  }

  async function updateChannel(name: string, enabled: boolean) {
    const updatedConfig = {
      ...config,
      channels: {
        ...config.channels,
        [name]: {
          ...config.channels?.[name],
          enabled,
        },
      },
    };
    setConfig(updatedConfig);

    // 自动保存
    try {
      const configToSave = cleanConfigForSave(updatedConfig);
      await configApi.save(configToSave);
      // 同步更新代码编辑器状态
      setOriginalConfig(updatedConfig);
      setCode(JSON.stringify(updatedConfig, null, 2));
    } catch (error) {
      toast.showError(t("config.autoSaveFailed"));
    }
  }

  async function updateChannelField(channelKey: string, field: string, value: any) {
    const currentChannel = config.channels?.[channelKey] || {};
    const updatedConfig = {
      ...config,
      channels: {
        ...config.channels,
        [channelKey]: {
          ...currentChannel,
          [field]: value,
        },
      },
    };
    setConfig(updatedConfig);

    // 自动保存
    try {
      const configToSave = cleanConfigForSave(updatedConfig);
      await configApi.save(configToSave);
      // 同步更新代码编辑器状态
      setOriginalConfig(updatedConfig);
      setCode(JSON.stringify(updatedConfig, null, 2));
    } catch (error) {
      toast.showError(t("config.autoSaveFailed"));
    }
  }

  async function updateToolsConfig(field: string, value: any) {
    const updatedConfig = {
      ...config,
      tools: {
        ...config.tools,
        [field]: value,
      },
    };
    setConfig(updatedConfig);

    // 自动保存
    try {
      const configToSave = cleanConfigForSave(updatedConfig);
      await configApi.save(configToSave);
      setOriginalConfig(updatedConfig);
      setCode(JSON.stringify(updatedConfig, null, 2));
      toast.showSuccess(value ? t("config.restrictEnabled") : t("config.restrictDisabled"));
    } catch (error) {
      toast.showError(t("config.autoSaveFailed"));
    }
  }

  // MCP Server 相关函数
  async function saveMcpServer(serverId: string, server: McpServer) {
    const updatedConfig = {
      ...config,
      tools: {
        ...config.tools,
        mcpServers: {
          ...config.tools?.mcpServers,
          [serverId]: server,
        },
      },
    };
    setConfig(updatedConfig);

    try {
      const configToSave = cleanConfigForSave(updatedConfig);
      await configApi.save(configToSave);
      setOriginalConfig(updatedConfig);
      setCode(JSON.stringify(updatedConfig, null, 2));
      toast.showSuccess(t("mcp.serverSaved"));
    } catch (error) {
      toast.showError(t("mcp.serverSaveFailed"));
    }
  }

  async function deleteMcpServer(serverId: string) {
    const currentServers = { ...config.tools?.mcpServers };
    delete currentServers[serverId];

    const updatedConfig = {
      ...config,
      tools: {
        ...config.tools,
        mcpServers: currentServers,
      },
    };
    setConfig(updatedConfig);

    try {
      const configToSave = cleanConfigForSave(updatedConfig);
      await configApi.save(configToSave);
      setOriginalConfig(updatedConfig);
      setCode(JSON.stringify(updatedConfig, null, 2));
      toast.showSuccess(t("mcp.serverDeleted"));
    } catch (error) {
      toast.showError(t("mcp.serverDeleteFailed"));
    }
  }

  async function loadHistory() {
    setLoadingHistory(true);
    try {
      const versions = await configApi.getHistory();
      setHistoryVersions(versions);
    } catch (error) {
      toast.showError(t("config.loadHistoryFailed"));
    } finally {
      setLoadingHistory(false);
    }
  }

  function restoreVersion(version: ConfigHistoryVersion) {
    setConfirmDialog({
      isOpen: true,
      title: t("config.confirmRestore"),
      message: t("config.confirmRestoreMsg", { time: formatTimestamp(version.timestamp, i18n.language) }),
      onConfirm: async () => {
        try {
          await configApi.restoreVersion(version.filename);
          await loadConfig();
          await loadHistory();
          toast.showSuccess(t("config.versionRestored"));
        } catch (error) {
          toast.showError(t("config.restoreVersionFailed"));
        } finally {
          setConfirmDialog({ isOpen: false, title: "", message: "", onConfirm: () => {} });
        }
      },
    });
  }

  async function deleteVersion(version: ConfigHistoryVersion) {
    try {
      await configApi.deleteVersion(version.filename);
      await loadHistory();
      toast.showSuccess(t("config.versionDeleted"));
    } catch (error) {
      toast.showError(t("config.deleteVersionFailed"));
    }
  }

  // 打开{t("config.history")}面板时加载历史
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
      console.error(t("config.loadTemplateFailed"), error);
    }
  }

  function saveTemplates(data?: ConfigTemplate[]) {
    try {
      localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(data ?? templates));
    } catch (error) {
      console.error(t("config.saveTemplateFailed"), error);
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
    // 同步更新代码编辑器状态
    setOriginalConfig(template.config);
    setCode(JSON.stringify(template.config, null, 2));
    toast.showSuccess(t("config.templateLoaded", { name: template.name }));
    setShowTemplates(false);
  }

  function deleteTemplate(template: ConfigTemplate) {
    setConfirmDialog({
      isOpen: true,
      title: t("config.confirmDeleteTemplate"),
      message: t("config.confirmDeleteTemplateMsg", { name: template.name }),
      onConfirm: () => {
        const updated = templates.filter((t) => t.id !== template.id);
        setTemplates(updated);
        saveTemplates(updated);
        toast.showSuccess(t("config.templateDeleted"));
        setConfirmDialog({ isOpen: false, title: "", message: "", onConfirm: () => {} });
      },
    });
  }

  function confirmSaveTemplate() {
    if (!templateDialog.name.trim()) {
      toast.showError(t("config.enterTemplateName"));
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
    saveTemplates(updated);
    toast.showSuccess(t("config.templateSaved"));
    setTemplateDialog({ isOpen: false, mode: "save", name: "", description: "" });
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white dark:bg-dark-bg-base transition-colors duration-200">
        <div className="text-gray-500 dark:text-dark-text-muted">{t("config.loading")}</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-dark-bg-base transition-colors duration-200">
      {/* 页面头部 */}
      <div className="bg-white dark:bg-dark-bg-card border-b border-gray-200 dark:border-dark-border-subtle px-6 py-4 flex-shrink-0 transition-colors duration-200">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary">{t("config.title")}</h1>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  if (viewMode === "visual") {
                    // 切换到代码模式，加载当前配置
                    setOriginalConfig(config);
                    setCode(JSON.stringify(config, null, 2));
                    setCodeError(null);
                    setViewMode("code");
                  } else {
                    // 切换回可视模式前，检查是否有未保存的修改
                    if (code !== JSON.stringify(originalConfig, null, 2)) {
                      setConfirmDialog({
                        isOpen: true,
                        title: t("config.unsavedChanges"),
                        message: t("config.unsavedChangesMsg"),
                        onConfirm: async () => {
                          // 用户选择放弃修改，直接切换
                          setViewMode("visual");
                          setConfirmDialog({ isOpen: false, title: "", message: "", onConfirm: () => {} });
                        },
                      });
                    } else {
                      setViewMode("visual");
                    }
                  }
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors text-sm ${
                  viewMode === "code"
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-gray-100 dark:bg-dark-bg-hover text-gray-700 dark:text-dark-text-primary hover:bg-gray-200 dark:hover:bg-dark-bg-active"
                }`}
              >
                <Code className="w-4 h-4" />
                {t("config.codeConfig")}
              </button>
              <button
                onClick={() => {
                  setConfirmDialog({
                    isOpen: true,
                    title: t("config.restoreDefaultConfig"),
                    message: t("config.restoreDefaultConfirm"),
                    onConfirm: async () => {
                      try {
                        // 恢复到默认配置并直接保存到文件
                        await configApi.save(DEFAULT_CONFIG);
                        setConfig(DEFAULT_CONFIG);
                        setOriginalConfig(DEFAULT_CONFIG);
                        setCode(JSON.stringify(DEFAULT_CONFIG, null, 2));
                        toast.showSuccess(t("config.restoredDefault"));
                      } catch (error) {
                        toast.showError(t("config.restoreDefaultFailed"));
                      } finally {
                        setConfirmDialog({ isOpen: false, title: "", message: "", onConfirm: () => {} });
                      }
                    },
                  });
                }}
                className="flex items-center gap-2 px-3 py-2 bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-900/50 rounded-lg font-medium text-amber-700 dark:text-amber-400 transition-colors text-sm"
              >
                <RotateCcw className="w-4 h-4" />
                {t("config.restoreDefault")}
              </button>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors text-sm ${
                  showHistory
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-gray-100 dark:bg-dark-bg-hover text-gray-700 dark:text-dark-text-primary hover:bg-gray-200 dark:hover:bg-dark-bg-active"
                }`}
                title={t("config.history")}
              >
                <History className="w-4 h-4" />
                {t("config.history")}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 主内容区域 - 带滚动条 */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin bg-white dark:bg-dark-bg-base">
        {viewMode === "visual" ? (
          <div className="p-8">
            <div className="max-w-6xl mx-auto space-y-6">

            {/* {t("config.history")}模态框 */}
        <HistoryPanel
          isOpen={showHistory}
          loading={loadingHistory}
          versions={historyVersions}
          onClose={() => setShowHistory(false)}
          onRestore={restoreVersion}
          onDelete={deleteVersion}
        />

        {/* 模板面板 */}
        {showTemplates && (
          <div className="bg-white dark:bg-dark-bg-card rounded-lg border border-gray-200 dark:border-dark-border-subtle overflow-hidden transition-colors duration-200">
            <div className="p-5 border-b border-gray-200 dark:border-dark-border-subtle flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                  <Copy className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">
                  {t("config.configTemplates")}
                </h2>
              </div>
              <button
                onClick={openSaveTemplateDialog}
                className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                {t("config.saveAsTemplate")}
              </button>
            </div>

            <div className="p-5">
              {templates.length === 0 ? (
                <EmptyState
                  icon={FolderOpen}
                  title={t("config.noTemplates")}
                  description={t("config.noTemplatesDesc")}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className="group p-4 rounded-lg bg-gray-50 dark:bg-dark-bg-sidebar border border-gray-200 dark:border-dark-border-subtle hover:border-purple-200 dark:hover:border-purple-500/50 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 dark:text-dark-text-primary text-sm mb-1">
                            {template.name}
                          </h4>
                          {template.description && (
                            <p className="text-xs text-gray-500 dark:text-dark-text-muted line-clamp-2">
                              {template.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button
                            onClick={() => applyTemplate(template)}
                            className="p-1.5 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-lg transition-colors"
                            title={t("config.applyTemplate")}
                          >
                            <FolderOpen className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteTemplate(template)}
                            className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                            title={t("config.delete")}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 dark:text-dark-text-muted">
                        {new Date(template.createdAt).toLocaleString(i18n.language === "en" ? "en-US" : "zh-CN")}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Providers 配置 */}
        <div className="bg-white dark:bg-dark-bg-card rounded-lg border border-gray-200 dark:border-dark-border-subtle overflow-hidden transition-colors duration-200">
          <button
            onClick={() => toggleSection("providers")}
            className="w-full p-5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-dark-bg-hover transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                <Bot className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">
                {t("config.llmProviders")}
              </h2>
            </div>
            {expandedSections.has("providers") ? (
              <ChevronUp className="w-5 h-5 text-gray-400 dark:text-dark-text-muted" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400 dark:text-dark-text-muted" />
            )}
          </button>

          {expandedSections.has("providers") && (
            <div className="p-5 pt-0 space-y-4">
              {/* 可用的 Provider 列表 */}
              <div className="space-y-2">
                <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-3">{t("config.selectProvider")}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {AVAILABLE_PROVIDERS.map((provider) => {
                    const providerConfig = config.providers?.[provider.id];
                    const isConfigured = providerConfig && providerConfig.apiKey && providerConfig.apiKey.trim() !== "";
                    const isCurrentProvider = selectedProviderId === provider.id;

                    return (
                      <div
                        key={provider.id}
                        className={`group rounded-lg border transition-all hover:shadow-md ${
                          isCurrentProvider
                            ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-500/50 ring-2 ring-blue-200 dark:ring-blue-500/30"
                            : isConfigured
                            ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-500/50"
                            : "bg-white dark:bg-dark-bg-card border-gray-200 dark:border-dark-border-subtle hover:border-gray-300 dark:hover:border-dark-border-default"
                        }`}
                      >
                        <div className="w-full p-4 text-left">
                          <div className="flex items-start justify-between">
                            <div
                              className="flex items-center gap-2 flex-1 cursor-pointer"
                              onClick={() => {
                                // 应用该提供商的 Agent 配置
                                applyProviderAgentConfig(provider.id);
                              }}
                            >
                              <div className={`p-2 rounded-lg ${provider.colorClass.split(' text-')[0]}`}>
                                <ProviderIcon name={provider.icon} className={`w-5 h-5 ${'text-' + provider.colorClass.split(' text-')[1]}`} />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold text-gray-900 dark:text-dark-text-primary text-sm">
                                    {t(provider.nameKey)}
                                  </h3>
                                  {isCurrentProvider && (
                                    <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full font-medium">
                                      {t("config.currentUse")}
                                    </span>
                                  )}
                                  {!isCurrentProvider && isConfigured && (
                                    <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs rounded-full">
                                      {t("config.configured")}
                                    </span>
                                  )}
                                  {!isConfigured && (
                                    <span className="px-2 py-0.5 bg-gray-100 dark:bg-dark-bg-hover text-gray-600 dark:text-dark-text-muted text-xs rounded-full">
                                      {t("config.notConfigured")}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingProvider({
                                  isOpen: true,
                                  providerId: provider.id,
                                  providerInfo: provider,
                                  activeTab: "api",
                                });
                              }}
                              className="p-2 bg-white dark:bg-dark-bg-card rounded-lg border border-gray-200 dark:border-dark-border-subtle group-hover:border-blue-200 dark:group-hover:border-blue-500/50 transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/30"
                              title={`${t("config.apiConfig")} & ${t("config.agentConfig")}`}
                            >
                              <Settings className="w-5 h-5 text-gray-400 dark:text-dark-text-muted group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                            </button>
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
                  title={t("config.noProvidersConfigured")}
                  description={t("config.noProvidersDesc")}
                />
              )}
            </div>
          )}
        </div>

        {/* Channels 配置 */}
        <div className="bg-white dark:bg-dark-bg-card rounded-lg border border-gray-200 dark:border-dark-border-subtle overflow-hidden transition-colors duration-200">
          <button
            onClick={() => toggleSection("channels")}
            className="w-full p-5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-dark-bg-hover transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 dark:bg-green-900/30 rounded-lg">
                <MessageSquare className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">
                {t("config.messageChannels")}
              </h2>
            </div>
            {expandedSections.has("channels") ? (
              <ChevronUp className="w-5 h-5 text-gray-400 dark:text-dark-text-muted" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400 dark:text-dark-text-muted" />
            )}
          </button>

          {expandedSections.has("channels") && (
            <div className="p-5 pt-0 space-y-4">
              {/* 可用的渠道列表 */}
              <div className="space-y-2">
                <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-3">{t("config.selectChannel")}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {CHANNELS_CONFIG.map((channel) => {
                    const isEnabled = config.channels?.[channel.key]?.enabled || false;
                    return (
                      <div
                        key={channel.key}
                        className={`group rounded-lg border transition-all hover:shadow-md ${
                          isEnabled
                            ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-500/50"
                            : "bg-white dark:bg-dark-bg-card border-gray-200 dark:border-dark-border-subtle hover:border-gray-300 dark:hover:border-dark-border-default"
                        }`}
                      >
                        <div className="w-full p-4 text-left">
                          <div className="flex items-center justify-between">
                            <div
                              className="flex items-center gap-2 flex-1 cursor-pointer"
                              onClick={() =>
                                setEditingChannel({
                                  isOpen: true,
                                  channelKey: channel.key,
                                  channelInfo: channel,
                                })
                              }
                            >
                              <div className={`p-2 rounded-lg ${channel.colorClass.split(' text-')[0]}`}>
                                <MessageSquare className={`w-5 h-5 ${'text-' + channel.colorClass.split(' text-')[1]}`} />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold text-gray-900 dark:text-dark-text-primary text-sm">
                                    {t(channel.nameKey)}
                                  </h3>
                                  {isEnabled && (
                                    <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded-full">
                                      {t("config.enabled")}
                                    </span>
                                  )}
                                  {!isEnabled && (
                                    <span className="px-2 py-0.5 bg-gray-100 dark:bg-dark-bg-hover text-gray-600 dark:text-dark-text-muted text-xs rounded-full">
                                      {t("config.notEnabled")}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                updateChannel(channel.key, !isEnabled);
                              }}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                isEnabled ? "bg-blue-600" : "bg-gray-300 dark:bg-dark-border-default"
                              }`}
                              title={isEnabled ? t("config.clickToDisable") : t("config.clickToEnable")}
                            >
                              <span
                                className={`inline-block h-5 w-5 transform rounded-full bg-white dark:bg-dark-text-primary transition-transform shadow ${
                                  isEnabled ? "translate-x-5" : "translate-x-0.5"
                                }`}
                              />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {Object.keys(config.channels || {}).length === 0 && (
                <EmptyState
                  icon={Inbox}
                  title={t("config.noChannelsConfigured")}
                  description={t("dashboard.clickToStartConfig")}
                />
              )}
            </div>
          )}
        </div>

        {/* MCP Servers 配置 */}
        <div className="bg-white dark:bg-dark-bg-card rounded-lg border border-gray-200 dark:border-dark-border-subtle overflow-hidden transition-colors duration-200">
          <button
            onClick={() => toggleSection("mcp")}
            className="w-full p-5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-dark-bg-hover transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg">
                <Plug className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">
                {t("mcp.title")}
              </h2>
            </div>
            {expandedSections.has("mcp") ? (
              <ChevronUp className="w-5 h-5 text-gray-400 dark:text-dark-text-muted" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400 dark:text-dark-text-muted" />
            )}
          </button>

          {expandedSections.has("mcp") && (
            <div className="p-5 pt-0 space-y-4">
              {/* MCP Server 列表 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-gray-600 dark:text-dark-text-secondary">{t("mcp.description")}</p>
                  <button
                    onClick={() =>
                      setEditingMcpServer({
                        isOpen: true,
                        serverId: "",
                        server: null,
                        mode: "add",
                      })
                    }
                    className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors text-sm font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    {t("mcp.addServer")}
                  </button>
                </div>

                {config.tools?.mcpServers && Object.keys(config.tools.mcpServers).length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {Object.entries(config.tools.mcpServers).map(([serverId, server]) => {
                      const isEnabled = !server.disabled;
                      const isHttpMode = !!server.url;
                      return (
                        <div
                          key={serverId}
                          className={`group rounded-lg border transition-all hover:shadow-md ${
                            isEnabled
                              ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-500/50"
                              : "bg-white dark:bg-dark-bg-card border-gray-200 dark:border-dark-border-subtle hover:border-gray-300 dark:hover:border-dark-border-default"
                          }`}
                        >
                          <div className="w-full p-4 text-left">
                            <div className="flex items-center justify-between">
                              <div
                                className="flex items-center gap-2 flex-1 cursor-pointer"
                                onClick={() =>
                                  setEditingMcpServer({
                                    isOpen: true,
                                    serverId,
                                    server,
                                    mode: "edit",
                                  })
                                }
                              >
                                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                                  {isHttpMode ? (
                                    <Globe className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                  ) : (
                                    <Terminal className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                  )}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h3 className="font-semibold text-gray-900 dark:text-dark-text-primary text-sm">
                                      {serverId}
                                    </h3>
                                    {isEnabled && (
                                      <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs rounded-full">
                                        {t("config.enabled")}
                                      </span>
                                    )}
                                    {!isEnabled && (
                                      <span className="px-2 py-0.5 bg-gray-100 dark:bg-dark-bg-hover text-gray-600 dark:text-dark-text-muted text-xs rounded-full">
                                        {t("config.notEnabled")}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-500 dark:text-dark-text-muted mt-0.5">
                                    {isHttpMode ? t("mcp.http") : t("mcp.stdio")}
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // 切换 disabled 状态
                                  const updatedServer = { ...server, disabled: isEnabled };
                                  saveMcpServer(serverId, updatedServer);
                                }}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                  isEnabled ? "bg-blue-600" : "bg-gray-300 dark:bg-dark-border-default"
                                }`}
                                title={isEnabled ? t("config.clickToDisable") : t("config.clickToEnable")}
                              >
                                <span
                                  className={`inline-block h-5 w-5 transform rounded-full bg-white dark:bg-dark-text-primary transition-transform shadow ${
                                    isEnabled ? "translate-x-5" : "translate-x-0.5"
                                  }`}
                                />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState
                    icon={Plug}
                    title={t("mcp.noServers")}
                    description={t("mcp.noServersDesc")}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Security 配置 */}
        <div className="bg-white dark:bg-dark-bg-card rounded-lg border border-gray-200 dark:border-dark-border-subtle overflow-hidden transition-colors duration-200">
          <button
            onClick={() => toggleSection("security")}
            className="w-full p-5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-dark-bg-hover transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-50 dark:bg-amber-900/30 rounded-lg">
                <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">
                {t("config.security")}
              </h2>
            </div>
            {expandedSections.has("security") ? (
              <ChevronUp className="w-5 h-5 text-gray-400 dark:text-dark-text-muted" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400 dark:text-dark-text-muted" />
            )}
          </button>

          {expandedSections.has("security") && (
            <div className="p-5 pt-0 space-y-4">
              <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
                {t("config.securityDesc")}
              </p>

              <div className="space-y-3">
                {/* restrictToWorkspace */}
                <div className={`rounded-lg border p-4 transition-all ${
                  config.tools?.restrictToWorkspace
                    ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-500/50"
                    : "bg-white dark:bg-dark-bg-card border-gray-200 dark:border-dark-border-subtle"
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1 mr-4">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 dark:text-dark-text-primary text-sm">
                          {t("config.restrictToWorkspace")}
                        </h3>
                        {config.tools?.restrictToWorkspace && (
                          <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs rounded-full">
                            {t("config.enabled")}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-dark-text-muted">
                        {t("config.restrictToWorkspaceDesc")}
                      </p>
                    </div>
                    <button
                      onClick={() => updateToolsConfig("restrictToWorkspace", !config.tools?.restrictToWorkspace)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                        config.tools?.restrictToWorkspace ? "bg-amber-500" : "bg-gray-300 dark:bg-dark-border-default"
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white dark:bg-dark-text-primary transition-transform shadow ${
                          config.tools?.restrictToWorkspace ? "translate-x-5" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

          </div>
        </div>
      ) : (
        <CodeEditorView
          code={code}
          codeError={codeError}
          savingCode={savingCode}
          hasChanges={code !== JSON.stringify(originalConfig, null, 2)}
          onCodeChange={handleCodeChange}
          onFormat={formatCode}
          onSave={saveCodeConfig}
        />
      )}
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
          <div className="bg-white dark:bg-dark-bg-card rounded-xl shadow-xl max-w-md w-full p-6 transition-colors duration-200">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-4">
              {templateDialog.mode === "save" ? t("config.saveTemplateTitle", { saveConfig: t("config.saveConfig") }) : t("config.editTemplate")}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 dark:text-dark-text-secondary mb-1">
                  {t("config.templateName")}
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
                  placeholder={t("config.forExample") + " OpenAI 配置、开发环境配置"}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-dark-bg-sidebar border border-gray-200 dark:border-dark-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm text-gray-900 dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-dark-text-muted"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-dark-text-secondary mb-1">
                  {t("config.templateDesc")}
                </label>
                <textarea
                  value={templateDialog.description}
                  onChange={(e) => setTemplateDialog({ ...templateDialog, description: e.target.value })}
                  placeholder={t("config.templateDescPlaceholder")}
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-dark-bg-sidebar border border-gray-200 dark:border-dark-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm resize-none text-gray-900 dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-dark-text-muted"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setTemplateDialog({ isOpen: false, mode: "save", name: "", description: "" })}
                className="px-4 py-2 bg-gray-100 dark:bg-dark-bg-hover hover:bg-gray-200 dark:hover:bg-dark-bg-active text-gray-700 dark:text-dark-text-primary rounded-lg transition-colors text-sm font-medium"
              >
                {t("config.cancel")}
              </button>
              <button
                onClick={confirmSaveTemplate}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm font-medium"
              >
                {t("config.save")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 提供商编辑模态框 */}
      <ProviderEditModal
        isOpen={editingProvider.isOpen}
        providerId={editingProvider.providerId}
        providerInfo={editingProvider.providerInfo}
        activeTab={editingProvider.activeTab}
        config={config}
        providerAgentConfig={getProviderAgentConfig(editingProvider.providerId)}
        onClose={() => setEditingProvider({ isOpen: false, providerId: "", providerInfo: null, activeTab: "api" })}
        onSave={() => applyProviderAgentConfig(editingProvider.providerId)}
        onTabChange={(tab) => setEditingProvider({ ...editingProvider, activeTab: tab })}
        onUpdateProvider={updateProvider}
        onRemoveProvider={removeProvider}
        onUpdateProviderAgentConfig={updateProviderAgentConfig}
      />

      {/* 渠道编辑模态框 */}
      <ChannelEditModal
        isOpen={editingChannel.isOpen}
        channelKey={editingChannel.channelKey}
        channelInfo={editingChannel.channelInfo}
        config={config}
        onClose={() => setEditingChannel({ isOpen: false, channelKey: "", channelInfo: null })}
        onUpdateField={updateChannelField}
      />

      {/* MCP Server 编辑模态框 */}
      <McpServerEditModal
        isOpen={editingMcpServer.isOpen}
        serverId={editingMcpServer.serverId}
        server={editingMcpServer.server}
        mode={editingMcpServer.mode}
        onClose={() =>
          setEditingMcpServer({ isOpen: false, serverId: "", server: null, mode: "add" })
        }
        onSave={saveMcpServer}
        onDelete={deleteMcpServer}
      />
    </div>
  );
}
