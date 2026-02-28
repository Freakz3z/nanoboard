import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { FileText, History, Code, Plus, FolderOpen, Trash2 } from "lucide-react";
import { configApi } from "../lib/tauri";
import { useToast } from "../contexts/ToastContext";
import { DEFAULT_CONFIG } from "../lib/defaultConfig";
import { AVAILABLE_PROVIDERS } from "@/config/providers";
import { processApi } from "@/lib/tauri";
import { formatTimestamp } from "@/utils/format";
import EmptyState from "../components/EmptyState";
import ConfirmDialog from "../components/ConfirmDialog";
import ProviderEditModal from "@/components/config/ProviderEditModal";
import ChannelEditModal from "@/components/config/ChannelEditModal";
import McpServerEditModal from "@/components/config/McpServerEditModal";
import HistoryPanel from "@/components/config/HistoryPanel";
import CodeEditorView from "@/components/config/CodeEditorView";
import ProviderSection from "@/components/config/sections/ProviderSection";
import ChannelSection from "@/components/config/sections/ChannelSection";
import McpServerSection from "@/components/config/sections/McpServerSection";
import ToolsSection from "@/components/config/sections/ToolsSection";
import { useProviderAgentConfig } from "@/components/config/hooks/useProviderAgentConfig";
import { useMcpServersConfig } from "@/components/config/hooks/useMcpServersConfig";
import { useAutoSave } from "@/hooks/useAutoSave";
import { cleanConfigForSave } from "@/components/config/utils/cleanConfig";
const TEMPLATES_STORAGE_KEY = "nanobot_config_templates";
export default function ConfigEditor() {
    const { t, i18n } = useTranslation();
    const toast = useToast();
    // 状态
    const [config, setConfig] = useState({});
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState("visual");
    const [originalConfig, setOriginalConfig] = useState({});
    const [code, setCode] = useState("");
    const [codeError, setCodeError] = useState(null);
    const [savingCode, setSavingCode] = useState(false);
    // 展开状态
    const [expandedSections, setExpandedSections] = useState(() => {
        const saved = localStorage.getItem("configEditorExpandedSections");
        if (saved) {
            try {
                return new Set(JSON.parse(saved));
            }
            catch (e) {
                console.error("Failed to load expanded sections:", e);
            }
        }
        return new Set(["providers", "channels", "mcp", "tools"]);
    });
    // 选中的 Provider
    const [selectedProviderId, setSelectedProviderId] = useState(() => {
        return localStorage.getItem("selectedProviderId");
    });
    // OAuth 状态
    const [oauthTokenStatuses, setOauthTokenStatuses] = useState({});
    // MCP Servers 配置
    const [mcpServersConfig, setMcpServersConfig] = useState({});
    // 对话框状态
    const [showHistory, setShowHistory] = useState(false);
    const [historyVersions, setHistoryVersions] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [showTemplates, setShowTemplates] = useState(false);
    const [templates, setTemplates] = useState([]);
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: "", message: "", onConfirm: () => { } });
    const [templateDialog, setTemplateDialog] = useState({ isOpen: false, mode: "save", name: "", description: "" });
    const [editingProvider, setEditingProvider] = useState({ isOpen: false, providerId: "", providerInfo: null, activeTab: "api" });
    const [editingChannel, setEditingChannel] = useState({ isOpen: false, channelKey: "", channelInfo: null });
    const [editingMcpServer, setEditingMcpServer] = useState({ isOpen: false, serverId: "", server: null, mode: "add" });
    // Hooks
    const { getProviderAgentConfig, updateProviderAgentConfig, buildAgentDefaults } = useProviderAgentConfig();
    const { loadMcpServersConfig, saveMcpServersConfig, mergeMcpConfig } = useMcpServersConfig();
    // 自动保存
    const handleSave = useCallback(async (updatedConfig) => {
        try {
            const configToSave = cleanConfigForSave(updatedConfig, mcpServersConfig);
            await configApi.save(configToSave);
            setOriginalConfig(updatedConfig);
            setCode(JSON.stringify(updatedConfig, null, 2));
            console.log("[AutoSave] Configuration saved successfully");
        }
        catch (error) {
            console.error("[AutoSave] Failed to save:", error);
        }
    }, [mcpServersConfig]);
    const debouncedAutoSave = useAutoSave({ onSave: handleSave, delay: 500 });
    // 加载配置
    useEffect(() => {
        loadConfig();
        checkAllOAuthStatuses();
    }, []);
    // 保存展开状态
    useEffect(() => {
        localStorage.setItem("configEditorExpandedSections", JSON.stringify([...expandedSections]));
    }, [expandedSections]);
    // 保存选中的 Provider
    useEffect(() => {
        if (selectedProviderId) {
            localStorage.setItem("selectedProviderId", selectedProviderId);
        }
        else {
            localStorage.removeItem("selectedProviderId");
        }
    }, [selectedProviderId]);
    // 加载历史时
    useEffect(() => {
        if (showHistory) {
            loadHistory();
        }
    }, [showHistory]);
    // 加载模板时
    useEffect(() => {
        if (showTemplates) {
            loadTemplates();
        }
    }, [showTemplates]);
    async function loadConfig() {
        setLoading(true);
        try {
            const result = await configApi.load();
            if (result.error) {
                toast.showError(result.message);
                setConfig({});
            }
            else {
                const loadedConfig = result;
                setConfig(loadedConfig);
                setOriginalConfig(loadedConfig);
                setCode(JSON.stringify(loadedConfig, null, 2));
                // 合并 MCP 配置
                const savedMcpConfig = loadMcpServersConfig();
                const configMcpServers = loadedConfig.tools?.mcpServers || {};
                const merged = mergeMcpConfig(savedMcpConfig, configMcpServers);
                setMcpServersConfig(merged);
            }
        }
        catch (error) {
            toast.showError(t("config.loadConfigFailed"));
        }
        finally {
            setLoading(false);
        }
    }
    async function checkAllOAuthStatuses() {
        const oauthProviders = AVAILABLE_PROVIDERS.filter((p) => p.loginCommand);
        const statuses = {};
        await Promise.all(oauthProviders.map(async (provider) => {
            if (!provider.loginCommand)
                return;
            try {
                const result = await processApi.checkOAuthToken(provider.loginCommand);
                statuses[provider.id] = result.has_token ? (result.is_expired ? "expired" : true) : false;
            }
            catch {
                statuses[provider.id] = false;
            }
        }));
        setOauthTokenStatuses(statuses);
    }
    function toggleSection(section) {
        const newExpanded = new Set(expandedSections);
        if (newExpanded.has(section)) {
            newExpanded.delete(section);
        }
        else {
            newExpanded.add(section);
        }
        setExpandedSections(newExpanded);
    }
    async function updateProvider(name, field, value) {
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
        debouncedAutoSave(updatedConfig);
    }
    async function removeProvider(name) {
        const newProviders = { ...config.providers };
        delete newProviders[name];
        const updatedConfig = { ...config, providers: newProviders };
        setConfig(updatedConfig);
        debouncedAutoSave(updatedConfig);
    }
    async function updateChannel(name, enabled) {
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
        debouncedAutoSave(updatedConfig);
    }
    async function updateChannelField(channelKey, field, value) {
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
        debouncedAutoSave(updatedConfig);
    }
    async function updateChannelsTopLevel(field, value) {
        const updatedConfig = {
            ...config,
            channels: {
                ...config.channels,
                [field]: value,
            },
        };
        setConfig(updatedConfig);
        debouncedAutoSave(updatedConfig);
    }
    async function updateToolsExecConfig(field, value) {
        const updatedConfig = {
            ...config,
            tools: {
                ...config.tools,
                exec: {
                    ...config.tools?.exec,
                    [field]: value,
                },
            },
        };
        setConfig(updatedConfig);
        debouncedAutoSave(updatedConfig);
    }
    async function updateToolsWebSearchConfig(field, value) {
        const updatedConfig = {
            ...config,
            tools: {
                ...config.tools,
                web: {
                    ...config.tools?.web,
                    search: {
                        ...config.tools?.web?.search,
                        [field]: value,
                    },
                },
            },
        };
        setConfig(updatedConfig);
        debouncedAutoSave(updatedConfig);
    }
    async function updateToolsConfig(field, value) {
        const updatedConfig = {
            ...config,
            tools: {
                ...config.tools,
                [field]: value,
            },
        };
        setConfig(updatedConfig);
        debouncedAutoSave(updatedConfig);
        toast.showSuccess(value ? t("config.restrictEnabled") : t("config.restrictDisabled"));
    }
    async function saveMcpServer(serverId, server) {
        const serverWithState = { ...server, disabled: false };
        const updatedMcpConfig = {
            ...mcpServersConfig,
            [serverId]: serverWithState,
        };
        setMcpServersConfig(updatedMcpConfig);
        saveMcpServersConfig(updatedMcpConfig);
        const updatedConfig = {
            ...config,
            tools: {
                ...config.tools,
                mcpServers: {
                    ...config.tools?.mcpServers,
                    [serverId]: serverWithState,
                },
            },
        };
        setConfig(updatedConfig);
        debouncedAutoSave(updatedConfig);
        toast.showSuccess(t("mcp.serverSaved"));
    }
    async function toggleMcpServer(serverId) {
        const currentServer = mcpServersConfig[serverId];
        if (!currentServer)
            return;
        const newDisabled = !currentServer.disabled;
        const updatedServer = { ...currentServer, disabled: newDisabled };
        const updatedMcpConfig = {
            ...mcpServersConfig,
            [serverId]: updatedServer,
        };
        setMcpServersConfig(updatedMcpConfig);
        saveMcpServersConfig(updatedMcpConfig);
        const updatedConfig = {
            ...config,
            tools: {
                ...config.tools,
                mcpServers: {
                    ...config.tools?.mcpServers,
                    [serverId]: updatedServer,
                },
            },
        };
        setConfig(updatedConfig);
        debouncedAutoSave(updatedConfig);
        toast.showSuccess(newDisabled ? t("mcp.serverDisabled") : t("mcp.serverEnabled"));
    }
    async function deleteMcpServer(serverId) {
        const updatedMcpConfig = { ...mcpServersConfig };
        delete updatedMcpConfig[serverId];
        setMcpServersConfig(updatedMcpConfig);
        saveMcpServersConfig(updatedMcpConfig);
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
        debouncedAutoSave(updatedConfig);
        toast.showSuccess(t("mcp.serverDeleted"));
    }
    async function loadHistory() {
        setLoadingHistory(true);
        try {
            const versions = await configApi.getHistory();
            setHistoryVersions(versions);
        }
        catch (error) {
            toast.showError(t("config.loadHistoryFailed"));
        }
        finally {
            setLoadingHistory(false);
        }
    }
    function restoreVersion(version) {
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
                }
                catch (error) {
                    toast.showError(t("config.restoreVersionFailed"));
                }
                finally {
                    setConfirmDialog({ isOpen: false, title: "", message: "", onConfirm: () => { } });
                }
            },
        });
    }
    async function deleteVersion(version) {
        try {
            await configApi.deleteVersion(version.filename);
            await loadHistory();
            toast.showSuccess(t("config.versionDeleted"));
        }
        catch (error) {
            toast.showError(t("config.deleteVersionFailed"));
        }
    }
    function loadTemplates() {
        try {
            const stored = localStorage.getItem(TEMPLATES_STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                setTemplates(parsed);
            }
        }
        catch (error) {
            console.error(t("config.loadTemplateFailed"), error);
        }
    }
    function saveTemplates(data) {
        try {
            localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(data ?? templates));
        }
        catch (error) {
            console.error(t("config.saveTemplateFailed"), error);
        }
    }
    function applyTemplate(template) {
        setConfig(template.config);
        setOriginalConfig(template.config);
        setCode(JSON.stringify(template.config, null, 2));
        toast.showSuccess(t("config.templateLoaded", { name: template.name }));
        setShowTemplates(false);
        debouncedAutoSave(template.config);
    }
    function deleteTemplate(template) {
        setConfirmDialog({
            isOpen: true,
            title: t("config.confirmDeleteTemplate"),
            message: t("config.confirmDeleteTemplateMsg", { name: template.name }),
            onConfirm: () => {
                const updated = templates.filter((t) => t.id !== template.id);
                setTemplates(updated);
                saveTemplates(updated);
                toast.showSuccess(t("config.templateDeleted"));
                setConfirmDialog({ isOpen: false, title: "", message: "", onConfirm: () => { } });
            },
        });
    }
    function confirmSaveTemplate() {
        if (!templateDialog.name.trim()) {
            toast.showError(t("config.enterTemplateName"));
            return;
        }
        const newTemplate = {
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
            setConfig(parsed);
            const configMcpServers = parsed.tools?.mcpServers || {};
            const updatedMcpConfig = {};
            for (const [serverId, server] of Object.entries(mcpServersConfig)) {
                if (configMcpServers[serverId]) {
                    updatedMcpConfig[serverId] = {
                        ...configMcpServers[serverId],
                        disabled: server.disabled,
                    };
                }
            }
            for (const [serverId, server] of Object.entries(configMcpServers)) {
                if (!updatedMcpConfig[serverId]) {
                    updatedMcpConfig[serverId] = { ...server, disabled: false };
                }
            }
            setMcpServersConfig(updatedMcpConfig);
            const agentDefaults = parsed.agents?.defaults;
            if (agentDefaults?.provider && agentDefaults.provider !== "auto") {
                setSelectedProviderId(agentDefaults.provider);
            }
            setCode(JSON.stringify(parsed, null, 2));
            toast.showSuccess(t("config.saveSuccess"));
        }
        catch (error) {
            if (typeof error === "object" && error !== null && "message" in error) {
                const jsonError = error;
                if (jsonError.message.includes("JSON")) {
                    setCodeError(`${t("config.jsonSyntaxError")}: ${jsonError.message}`);
                    toast.showError(t("config.jsonSyntaxError"));
                    return;
                }
            }
            toast.showError(t("config.saveFailed"));
        }
        finally {
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
        }
        catch (error) {
            setCodeError(`${t("config.formatFailed")}: ${t("config.jsonSyntaxError")}`);
            toast.showError(`${t("config.formatFailed")}: ${t("config.jsonSyntaxError")}`);
        }
    }
    function handleCodeChange(newCode) {
        setCode(newCode);
        try {
            JSON.parse(newCode);
            setCodeError(null);
        }
        catch (error) {
            if (typeof error === "object" && error !== null && "message" in error) {
                setCodeError(`${t("config.jsonSyntaxError")} ${error.message}`);
            }
            else {
                setCodeError(t("config.jsonSyntaxError"));
            }
        }
    }
    async function applyProviderAgentConfig(providerId) {
        const providerAgentCfg = getProviderAgentConfig(providerId);
        const mergedConfig = buildAgentDefaults(providerId, providerAgentCfg);
        const updatedConfig = {
            ...config,
            agents: {
                ...config.agents,
                defaults: mergedConfig,
            },
        };
        setConfig(updatedConfig);
        setSelectedProviderId(providerId);
        toast.showSuccess(t("config.applyProviderConfig", { name: providerId }));
        debouncedAutoSave(updatedConfig);
    }
    if (loading) {
        return (_jsx("div", { className: "flex-1 flex items-center justify-center bg-white dark:bg-dark-bg-base transition-colors duration-200", children: _jsx("div", { className: "text-gray-500 dark:text-dark-text-muted", children: t("config.loading") }) }));
    }
    return (_jsxs("div", { className: "flex-1 flex flex-col overflow-hidden bg-white dark:bg-dark-bg-base transition-colors duration-200", children: [_jsx("div", { className: "bg-white dark:bg-dark-bg-card border-b border-gray-200 dark:border-dark-border-subtle px-6 py-4 flex-shrink-0 transition-colors duration-200", children: _jsx("div", { className: "max-w-6xl mx-auto", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h1", { className: "text-xl font-semibold text-gray-900 dark:text-dark-text-primary", children: t("config.title") }), _jsxs("div", { className: "flex gap-2", children: [_jsxs("button", { onClick: () => {
                                            if (viewMode === "visual") {
                                                setOriginalConfig(config);
                                                setCode(JSON.stringify(config, null, 2));
                                                setCodeError(null);
                                                setViewMode("code");
                                            }
                                            else {
                                                if (code !== JSON.stringify(originalConfig, null, 2)) {
                                                    setConfirmDialog({
                                                        isOpen: true,
                                                        title: t("config.unsavedChanges"),
                                                        message: t("config.unsavedChangesMsg"),
                                                        onConfirm: () => {
                                                            setViewMode("visual");
                                                            setConfirmDialog({ isOpen: false, title: "", message: "", onConfirm: () => { } });
                                                        },
                                                    });
                                                }
                                                else {
                                                    setViewMode("visual");
                                                }
                                            }
                                        }, className: `flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors text-sm ${viewMode === "code"
                                            ? "bg-blue-600 text-white hover:bg-blue-700"
                                            : "bg-gray-100 dark:bg-dark-bg-hover text-gray-700 dark:text-dark-text-primary hover:bg-gray-200 dark:hover:bg-dark-bg-active"}`, children: [_jsx(Code, { className: "w-4 h-4" }), t("config.codeConfig")] }), _jsxs("button", { onClick: () => {
                                            setConfirmDialog({
                                                isOpen: true,
                                                title: t("config.initConfigTitle"),
                                                message: t("config.initConfigConfirm"),
                                                onConfirm: async () => {
                                                    try {
                                                        await configApi.save(DEFAULT_CONFIG);
                                                        const initConfig = DEFAULT_CONFIG;
                                                        setConfig(initConfig);
                                                        setOriginalConfig(initConfig);
                                                        setCode(JSON.stringify(DEFAULT_CONFIG, null, 2));
                                                        toast.showSuccess(t("config.initConfigSuccess"));
                                                    }
                                                    catch (error) {
                                                        toast.showError(t("config.initConfigFailed"));
                                                    }
                                                    finally {
                                                        setConfirmDialog({ isOpen: false, title: "", message: "", onConfirm: () => { } });
                                                    }
                                                },
                                            });
                                        }, className: "flex items-center gap-2 px-3 py-2 bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-900/50 rounded-lg font-medium text-amber-700 dark:text-amber-400 transition-colors text-sm", children: [_jsx(FileText, { className: "w-4 h-4" }), t("config.initConfig")] }), _jsxs("button", { onClick: () => setShowHistory(!showHistory), className: `flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors text-sm ${showHistory
                                            ? "bg-blue-600 text-white hover:bg-blue-700"
                                            : "bg-gray-100 dark:bg-dark-bg-hover text-gray-700 dark:text-dark-text-primary hover:bg-gray-200 dark:hover:bg-dark-bg-active"}`, title: t("config.history"), children: [_jsx(History, { className: "w-4 h-4" }), t("config.history")] })] })] }) }) }), _jsx("div", { className: "flex-1 min-h-0 overflow-y-auto scrollbar-thin bg-white dark:bg-dark-bg-base", children: viewMode === "visual" ? (_jsx("div", { className: "p-8", children: _jsxs("div", { className: "max-w-6xl mx-auto space-y-6", children: [_jsx(HistoryPanel, { isOpen: showHistory, loading: loadingHistory, versions: historyVersions, onClose: () => setShowHistory(false), onRestore: restoreVersion, onDelete: deleteVersion }), showTemplates && (_jsxs("div", { className: "bg-white dark:bg-dark-bg-card rounded-lg border border-gray-200 dark:border-dark-border-subtle overflow-hidden transition-colors duration-200", children: [_jsxs("div", { className: "p-5 border-b border-gray-200 dark:border-dark-border-subtle flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "p-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg", children: _jsx(FileText, { className: "w-5 h-5 text-purple-600 dark:text-purple-400" }) }), _jsx("h2", { className: "text-lg font-semibold text-gray-900 dark:text-dark-text-primary", children: t("config.configTemplates") })] }), _jsxs("button", { onClick: () => setTemplateDialog({ isOpen: true, mode: "save", name: "", description: "" }), className: "flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm font-medium", children: [_jsx(Plus, { className: "w-4 h-4" }), t("config.saveAsTemplate")] })] }), _jsx("div", { className: "p-5", children: templates.length === 0 ? (_jsx(EmptyState, { icon: FolderOpen, title: t("config.noTemplates"), description: t("config.noTemplatesDesc") })) : (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: templates.map((template) => (_jsxs("div", { className: "group p-4 rounded-lg bg-gray-50 dark:bg-dark-bg-sidebar border border-gray-200 dark:border-dark-border-subtle hover:border-purple-200 dark:hover:border-purple-500/50 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all", children: [_jsxs("div", { className: "flex items-start justify-between mb-2", children: [_jsxs("div", { className: "flex-1", children: [_jsx("h4", { className: "font-semibold text-gray-900 dark:text-dark-text-primary text-sm mb-1", children: template.name }), template.description && (_jsx("p", { className: "text-xs text-gray-500 dark:text-dark-text-muted line-clamp-2", children: template.description }))] }), _jsxs("div", { className: "flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all", children: [_jsx("button", { onClick: () => applyTemplate(template), className: "p-1.5 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-lg transition-colors", title: t("config.applyTemplate"), children: _jsx(FolderOpen, { className: "w-4 h-4" }) }), _jsx("button", { onClick: () => deleteTemplate(template), className: "p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors", title: t("config.delete"), children: _jsx(Trash2, { className: "w-4 h-4" }) })] })] }), _jsx("div", { className: "text-xs text-gray-400 dark:text-dark-text-muted", children: new Date(template.createdAt).toLocaleString(i18n.language === "en" ? "en-US" : "zh-CN") })] }, template.id))) })) })] })), _jsx(ProviderSection, { config: config, expanded: expandedSections.has("providers"), selectedProviderId: selectedProviderId, oauthTokenStatuses: oauthTokenStatuses, onToggle: () => toggleSection("providers"), onEditProvider: setEditingProvider, onApplyProviderConfig: applyProviderAgentConfig, getProviderAgentConfig: getProviderAgentConfig }), _jsx(ChannelSection, { config: config, expanded: expandedSections.has("channels"), onToggle: () => toggleSection("channels"), onEditChannel: setEditingChannel, onUpdateChannel: updateChannel, onUpdateChannelsTopLevel: updateChannelsTopLevel }), _jsx(McpServerSection, { mcpServersConfig: mcpServersConfig, expanded: expandedSections.has("mcp"), onToggle: () => toggleSection("mcp"), onAddServer: () => setEditingMcpServer({ isOpen: true, serverId: "", server: null, mode: "add" }), onEditServer: setEditingMcpServer, onToggleServer: toggleMcpServer }), _jsx(ToolsSection, { config: config, expanded: expandedSections.has("tools"), onToggle: () => toggleSection("tools"), onUpdateToolsExec: updateToolsExecConfig, onUpdateToolsWebSearch: updateToolsWebSearchConfig, onUpdateToolsConfig: updateToolsConfig })] }) })) : (_jsx(CodeEditorView, { code: code, codeError: codeError, savingCode: savingCode, hasChanges: code !== JSON.stringify(originalConfig, null, 2), onCodeChange: handleCodeChange, onFormat: formatCode, onSave: saveCodeConfig })) }), _jsx(ConfirmDialog, { isOpen: confirmDialog.isOpen, title: confirmDialog.title, message: confirmDialog.message, type: "warning", onConfirm: confirmDialog.onConfirm, onCancel: () => setConfirmDialog({ isOpen: false, title: "", message: "", onConfirm: () => { } }) }), templateDialog.isOpen && (_jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50", children: _jsxs("div", { className: "bg-white dark:bg-dark-bg-card rounded-xl shadow-xl max-w-md w-full p-6 transition-colors duration-200", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-4", children: t("config.saveTemplateTitle") }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm text-gray-600 dark:text-dark-text-secondary mb-1", children: t("config.templateName") }), _jsx("input", { type: "text", value: templateDialog.name, onChange: (e) => setTemplateDialog({ ...templateDialog, name: e.target.value }), onKeyDown: (e) => {
                                                if (e.key === "Enter")
                                                    confirmSaveTemplate();
                                                else if (e.key === "Escape")
                                                    setTemplateDialog({ isOpen: false, mode: "save", name: "", description: "" });
                                            }, placeholder: t("config.forExample"), className: "w-full px-3 py-2 bg-gray-50 dark:bg-dark-bg-sidebar border border-gray-200 dark:border-dark-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm", autoFocus: true })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm text-gray-600 dark:text-dark-text-secondary mb-1", children: t("config.templateDesc") }), _jsx("textarea", { value: templateDialog.description, onChange: (e) => setTemplateDialog({ ...templateDialog, description: e.target.value }), rows: 3, className: "w-full px-3 py-2 bg-gray-50 dark:bg-dark-bg-sidebar border border-gray-200 dark:border-dark-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm resize-none" })] })] }), _jsxs("div", { className: "flex justify-end gap-3 mt-6", children: [_jsx("button", { onClick: () => setTemplateDialog({ isOpen: false, mode: "save", name: "", description: "" }), className: "px-4 py-2 bg-gray-100 dark:bg-dark-bg-hover hover:bg-gray-200 dark:hover:bg-dark-bg-active text-gray-700 dark:text-dark-text-primary rounded-lg transition-colors text-sm font-medium", children: t("config.cancel") }), _jsx("button", { onClick: confirmSaveTemplate, className: "px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm font-medium", children: t("config.save") })] })] }) })), _jsx(ProviderEditModal, { isOpen: editingProvider.isOpen, providerId: editingProvider.providerId, providerInfo: editingProvider.providerInfo, activeTab: editingProvider.activeTab, config: config, providerAgentConfig: getProviderAgentConfig(editingProvider.providerId), onClose: () => setEditingProvider({ isOpen: false, providerId: "", providerInfo: null, activeTab: "api" }), onSave: () => applyProviderAgentConfig(editingProvider.providerId), onTabChange: (tab) => setEditingProvider({ ...editingProvider, activeTab: tab }), onUpdateProvider: updateProvider, onRemoveProvider: removeProvider, onUpdateProviderAgentConfig: updateProviderAgentConfig, onOAuthStatusChange: (pid, hasToken, isExpired) => {
                    setOauthTokenStatuses((prev) => ({
                        ...prev,
                        [pid]: hasToken ? (isExpired ? "expired" : true) : false,
                    }));
                } }), _jsx(ChannelEditModal, { isOpen: editingChannel.isOpen, channelKey: editingChannel.channelKey, channelInfo: editingChannel.channelInfo, config: config, onClose: () => setEditingChannel({ isOpen: false, channelKey: "", channelInfo: null }), onUpdateField: updateChannelField }), _jsx(McpServerEditModal, { isOpen: editingMcpServer.isOpen, serverId: editingMcpServer.serverId, server: editingMcpServer.server, mode: editingMcpServer.mode, onClose: () => setEditingMcpServer({ isOpen: false, serverId: "", server: null, mode: "add" }), onSave: saveMcpServer, onDelete: deleteMcpServer })] }));
}
