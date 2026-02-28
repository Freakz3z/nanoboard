import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * Provider 编辑模态框组件
 */
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Trash2, LogIn, LogOut, ExternalLink, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { Bot, Brain, Search, Network, Zap, Target, Cpu, Server, } from "lucide-react";
import { processApi } from "@/lib/tauri";
import { useToast } from "@/contexts/ToastContext";
// 图标映射组件
const ProviderIcon = ({ name, className }) => {
    const icons = {
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
    return _jsx(IconComponent, { className: className });
};
export default function ProviderEditModal({ isOpen, providerId, providerInfo, activeTab, config, providerAgentConfig, onClose, onSave, onTabChange, onUpdateProvider, onRemoveProvider, onUpdateProviderAgentConfig, onOAuthStatusChange, }) {
    const { t } = useTranslation();
    const { showToast } = useToast();
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [oauthTokenStatus, setOauthTokenStatus] = useState(null);
    const [isCheckingToken, setIsCheckingToken] = useState(false);
    // 检查是否为 OAuth Provider
    const isOAuth = providerInfo?.authType === "oauth";
    // 当模态框打开且是OAuth provider时，检查token状态
    useEffect(() => {
        if (isOpen && isOAuth && providerInfo?.loginCommand) {
            checkOAuthTokenStatus();
        }
    }, [isOpen, isOAuth, providerInfo?.loginCommand]);
    // 检查OAuth token状态
    const checkOAuthTokenStatus = async () => {
        if (!providerInfo?.loginCommand)
            return;
        setIsCheckingToken(true);
        try {
            const result = await processApi.checkOAuthToken(providerInfo.loginCommand);
            setOauthTokenStatus(result);
            onOAuthStatusChange?.(providerId, result.has_token, result.is_expired ?? false);
        }
        catch (error) {
            console.error("检查OAuth token失败:", error);
            setOauthTokenStatus({
                has_token: false,
                message: "检查token状态失败",
            });
        }
        finally {
            setIsCheckingToken(false);
        }
    };
    // 处理 OAuth 登录
    const handleOAuthLogin = async () => {
        if (!providerInfo?.loginCommand)
            return;
        setIsLoggingIn(true);
        try {
            const result = await processApi.providerLogin(providerInfo.loginCommand);
            if (result.success) {
                showToast(result.message || "登录流程已启动，请在终端中完成授权", "info");
            }
            else {
                showToast(result.message || "登录失败", "error");
            }
        }
        catch (error) {
            showToast(`登录失败: ${error}`, "error");
        }
        finally {
            setIsLoggingIn(false);
        }
    };
    if (!isOpen || !providerInfo)
        return null;
    // 渲染OAuth token状态
    const renderOAuthStatus = () => {
        if (isCheckingToken) {
            return (_jsxs("div", { className: "flex items-center gap-2 text-sm text-gray-500 dark:text-dark-text-muted", children: [_jsx(RefreshCw, { className: "w-4 h-4 animate-spin" }), _jsx("span", { children: t("config.checkingToken") })] }));
        }
        if (!oauthTokenStatus) {
            return (_jsxs("div", { className: "flex items-center gap-2 text-sm text-gray-500 dark:text-dark-text-muted", children: [_jsx(AlertCircle, { className: "w-4 h-4" }), _jsx("span", { children: t("config.tokenStatusUnknown") })] }));
        }
        if (oauthTokenStatus.has_token && !oauthTokenStatus.is_expired) {
            return (_jsxs("div", { className: "flex items-center gap-2 text-sm text-green-600 dark:text-green-400", children: [_jsx(CheckCircle, { className: "w-4 h-4" }), _jsx("span", { children: t("config.oauthLoggedIn") })] }));
        }
        if (oauthTokenStatus.has_token && oauthTokenStatus.is_expired) {
            return (_jsxs("div", { className: "flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-400", children: [_jsx(AlertCircle, { className: "w-4 h-4" }), _jsx("span", { children: t("config.tokenExpired") })] }));
        }
        return (_jsxs("div", { className: "flex items-center gap-2 text-sm text-gray-500 dark:text-dark-text-muted", children: [_jsx(AlertCircle, { className: "w-4 h-4" }), _jsx("span", { children: t("config.notLoggedIn") })] }));
    };
    return (_jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50", children: _jsxs("div", { className: "bg-white dark:bg-dark-bg-card rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col transition-colors duration-200", onClick: (e) => e.stopPropagation(), children: [_jsxs("div", { className: "p-6 border-b border-gray-200 dark:border-dark-border-subtle", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: `p-2 rounded-lg ${providerInfo.colorClass.split(" text-")[0]}`, children: _jsx(ProviderIcon, { name: providerInfo.icon, className: `w-6 h-6 ${"text-" + providerInfo.colorClass.split(" text-")[1]}` }) }), _jsx("div", { children: _jsx("h3", { className: "text-lg font-semibold text-gray-900 dark:text-dark-text-primary", children: t("config.editProvider", { name: t(providerInfo.nameKey) }) }) })] }), _jsxs("div", { className: "flex gap-2 mt-4", children: [_jsx("button", { onClick: () => onTabChange("api"), className: `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "api"
                                        ? "bg-blue-600 text-white"
                                        : "bg-gray-100 dark:bg-dark-bg-hover text-gray-700 dark:text-dark-text-primary hover:bg-gray-200 dark:hover:bg-dark-bg-active"}`, children: t("config.apiConfig") }), _jsx("button", { onClick: () => onTabChange("agent"), className: `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "agent"
                                        ? "bg-blue-600 text-white"
                                        : "bg-gray-100 dark:bg-dark-bg-hover text-gray-700 dark:text-dark-text-primary hover:bg-gray-200 dark:hover:bg-dark-bg-active"}`, children: t("config.agentConfig") })] })] }), _jsx("div", { className: "flex-1 overflow-y-auto p-6", children: activeTab === "api" ? (_jsx("div", { className: "space-y-4", children: isOAuth ? (_jsxs("div", { className: "space-y-4", children: [oauthTokenStatus?.has_token && !oauthTokenStatus?.is_expired ? (_jsx("div", { className: "p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-500/30", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx(CheckCircle, { className: "w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" }), _jsxs("div", { children: [_jsx("span", { className: "font-medium text-green-900 dark:text-green-100", children: t("config.oauthLoggedIn") }), _jsx("p", { className: "text-xs text-green-700 dark:text-green-400 mt-0.5", children: t("config.oauthLoginDesc") })] })] }), _jsxs("div", { className: "flex items-center gap-2 ml-3 flex-shrink-0", children: [_jsxs("button", { onClick: handleOAuthLogin, disabled: isLoggingIn, className: "flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50", children: [isLoggingIn ? (_jsx("div", { className: "w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" })) : (_jsx(LogOut, { className: "w-3.5 h-3.5" })), t("config.relogin")] }), _jsx("button", { onClick: checkOAuthTokenStatus, disabled: isCheckingToken, className: "p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg transition-colors disabled:opacity-50", title: t("config.refreshTokenStatus"), children: _jsx(RefreshCw, { className: `w-4 h-4 ${isCheckingToken ? "animate-spin" : ""}` }) })] })] }) })) : (
                                /* 未登录或已过期：蓝色/黄色卡片 */
                                _jsxs("div", { className: `p-4 rounded-lg border ${oauthTokenStatus?.is_expired
                                        ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-500/30"
                                        : "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-500/30"}`, children: [_jsxs("div", { className: "flex items-center gap-3 mb-3", children: [_jsx(LogIn, { className: `w-5 h-5 ${oauthTokenStatus?.is_expired ? "text-yellow-600 dark:text-yellow-400" : "text-blue-600 dark:text-blue-400"}` }), _jsx("span", { className: `font-medium ${oauthTokenStatus?.is_expired ? "text-yellow-900 dark:text-yellow-100" : "text-blue-900 dark:text-blue-100"}`, children: oauthTokenStatus?.is_expired ? t("config.tokenExpired") : t("config.oauthLogin") })] }), _jsx("p", { className: `text-sm mb-4 ${oauthTokenStatus?.is_expired ? "text-yellow-700 dark:text-yellow-300" : "text-blue-700 dark:text-blue-300"}`, children: t("config.oauthLoginDesc") }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("button", { onClick: handleOAuthLogin, disabled: isLoggingIn, className: `flex items-center gap-2 px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm font-medium ${oauthTokenStatus?.is_expired
                                                        ? "bg-yellow-600 hover:bg-yellow-700"
                                                        : "bg-blue-600 hover:bg-blue-700"}`, children: isLoggingIn ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" }), t("config.loggingIn")] })) : (_jsxs(_Fragment, { children: [_jsx(LogIn, { className: "w-4 h-4" }), oauthTokenStatus?.is_expired ? t("config.relogin") : t("config.login")] })) }), _jsx("button", { onClick: checkOAuthTokenStatus, disabled: isCheckingToken, className: "flex items-center gap-2 px-3 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 text-gray-700 dark:text-gray-200 rounded-lg transition-colors text-sm", title: t("config.refreshTokenStatus"), children: _jsx(RefreshCw, { className: `w-4 h-4 ${isCheckingToken ? "animate-spin" : ""}` }) })] }), (isCheckingToken || oauthTokenStatus === null) && (_jsx("div", { className: "mt-3 pt-3 border-t border-blue-200 dark:border-blue-500/30", children: renderOAuthStatus() }))] })), providerInfo.apiUrl && (_jsxs("div", { className: "flex items-center gap-2 text-sm text-gray-500 dark:text-dark-text-muted", children: [_jsx(ExternalLink, { className: "w-4 h-4" }), _jsx("a", { href: providerInfo.apiUrl, target: "_blank", rel: "noopener noreferrer", className: "hover:text-blue-600 dark:hover:text-blue-400", children: providerInfo.apiUrl })] }))] })) : (
                        /* 普通 Provider 显示 API Key 输入框 */
                        _jsxs(_Fragment, { children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm text-gray-600 dark:text-dark-text-secondary mb-1", children: t("config.apiKey") }), _jsx("input", { type: "password", value: config.providers?.[providerId]?.apiKey || "", onChange: (e) => onUpdateProvider(providerId, "apiKey", e.target.value), placeholder: t("config.apiKeyPlaceholder"), className: "w-full px-3 py-2 bg-gray-50 dark:bg-dark-bg-sidebar border border-gray-200 dark:border-dark-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900 dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-dark-text-muted" }), providerInfo.apiUrl && (_jsx("p", { className: "text-xs text-gray-400 dark:text-dark-text-muted mt-1", children: t("config.getApiKeyAt", { url: providerInfo.apiUrl }) }))] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm text-gray-600 dark:text-dark-text-secondary mb-1", children: t("config.apiBaseUrl") }), _jsx("input", { type: "text", value: config.providers?.[providerId]?.apiBase || "", onChange: (e) => onUpdateProvider(providerId, "apiBase", e.target.value), placeholder: t("config.apiBaseUrlPlaceholder"), className: "w-full px-3 py-2 bg-gray-50 dark:bg-dark-bg-sidebar border border-gray-200 dark:border-dark-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900 dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-dark-text-muted" }), providerInfo.apiBase && (_jsx("p", { className: "text-xs text-gray-400 dark:text-dark-text-muted mt-1", children: t("config.apiBaseUrlDefault", { url: providerInfo.apiBase }) }))] })] })) })) : (_jsxs("div", { className: "space-y-4", children: [_jsx("div", { className: "p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-500/30", children: _jsx("p", { className: "text-xs text-purple-700 dark:text-purple-300", children: t("config.independentAgentConfigHint") }) }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm text-gray-600 dark:text-dark-text-secondary mb-1", children: t("config.model") }), _jsx("input", { type: "text", value: providerAgentConfig.model || "", onChange: (e) => onUpdateProviderAgentConfig(providerId, "model", e.target.value), placeholder: t("config.modelPlaceholder"), className: "w-full px-3 py-2 bg-gray-50 dark:bg-dark-bg-sidebar border border-gray-200 dark:border-dark-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm text-gray-900 dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-dark-text-muted" }), _jsx("p", { className: "text-xs text-gray-500 dark:text-dark-text-muted mt-1", children: t("config.modelDesc") })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm text-gray-600 dark:text-dark-text-secondary mb-1", children: t("config.maxTokens") }), _jsx("input", { type: "number", value: providerAgentConfig.max_tokens || 8192, onChange: (e) => onUpdateProviderAgentConfig(providerId, "max_tokens", parseInt(e.target.value)), className: "w-full px-3 py-2 bg-gray-50 dark:bg-dark-bg-sidebar border border-gray-200 dark:border-dark-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm text-gray-900 dark:text-dark-text-primary" }), _jsx("p", { className: "text-xs text-gray-500 dark:text-dark-text-muted mt-1", children: t("config.maxTokensDesc") })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm text-gray-600 dark:text-dark-text-secondary mb-1", children: t("config.maxToolIterations") }), _jsx("input", { type: "number", value: providerAgentConfig.max_tool_iterations ?? 20, onChange: (e) => onUpdateProviderAgentConfig(providerId, "max_tool_iterations", parseInt(e.target.value)), className: "w-full px-3 py-2 bg-gray-50 dark:bg-dark-bg-sidebar border border-gray-200 dark:border-dark-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm text-gray-900 dark:text-dark-text-primary" }), _jsx("p", { className: "text-xs text-gray-500 dark:text-dark-text-muted mt-1", children: t("config.maxToolIterationsDesc") })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm text-gray-600 dark:text-dark-text-secondary mb-1", children: t("config.workspace") }), _jsx("input", { type: "text", value: providerAgentConfig.workspace || "~/.nanobot/workspace", onChange: (e) => onUpdateProviderAgentConfig(providerId, "workspace", e.target.value), placeholder: t("config.workspacePlaceholder"), className: "w-full px-3 py-2 bg-gray-50 dark:bg-dark-bg-sidebar border border-gray-200 dark:border-dark-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm text-gray-900 dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-dark-text-muted" }), _jsx("p", { className: "text-xs text-gray-500 dark:text-dark-text-muted mt-1", children: t("config.workspaceDesc") })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm text-gray-600 dark:text-dark-text-secondary mb-1", children: t("config.memoryWindow") }), _jsx("input", { type: "number", value: providerAgentConfig.memory_window ?? 50, onChange: (e) => onUpdateProviderAgentConfig(providerId, "memory_window", parseInt(e.target.value)), className: "w-full px-3 py-2 bg-gray-50 dark:bg-dark-bg-sidebar border border-gray-200 dark:border-dark-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm text-gray-900 dark:text-dark-text-primary" }), _jsx("p", { className: "text-xs text-gray-500 dark:text-dark-text-muted mt-1", children: t("config.memoryWindowDesc") })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm text-gray-600 dark:text-dark-text-secondary mb-1", children: t("config.temperature") }), _jsx("input", { type: "number", step: "0.1", min: "0", max: "2", value: providerAgentConfig.temperature ?? 0.7, onChange: (e) => onUpdateProviderAgentConfig(providerId, "temperature", parseFloat(e.target.value)), className: "w-full px-3 py-2 bg-gray-50 dark:bg-dark-bg-sidebar border border-gray-200 dark:border-dark-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm text-gray-900 dark:text-dark-text-primary" }), _jsx("p", { className: "text-xs text-gray-500 dark:text-dark-text-muted mt-1", children: t("config.temperatureDesc") })] })] })) }), _jsxs("div", { className: "p-6 border-t border-gray-200 dark:border-dark-border-subtle flex items-center justify-between gap-3", children: [_jsx("div", { children: config.providers?.[providerId] && activeTab === "api" && (_jsxs("button", { onClick: () => {
                                    onRemoveProvider(providerId);
                                    onClose();
                                }, className: "flex items-center gap-1 px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors text-sm font-medium", children: [_jsx(Trash2, { className: "w-4 h-4" }), t("config.deleteConfig")] })) }), _jsxs("div", { className: "flex gap-3", children: [_jsx("button", { onClick: onClose, className: "px-4 py-2 bg-gray-100 dark:bg-dark-bg-hover hover:bg-gray-200 dark:hover:bg-dark-bg-active text-gray-700 dark:text-dark-text-primary rounded-lg transition-colors text-sm font-medium", children: t("config.cancel") }), _jsx("button", { onClick: () => {
                                        onSave();
                                        onClose();
                                    }, className: "px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium", children: t("config.done") })] })] })] }) }));
}
