import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useTranslation } from "react-i18next";
import { Bot, ChevronUp, ChevronDown, Settings } from "lucide-react";
import EmptyState from "../../EmptyState";
import { AVAILABLE_PROVIDERS, isProviderConfigured, isOAuthProvider } from "@/config/providers";
// 图标映射组件
const ProviderIcon = ({ name, className }) => {
    const icons = {
        Bot,
    };
    const IconComponent = icons[name] || Bot;
    return _jsx(IconComponent, { className: className });
};
export default function ProviderSection({ config, expanded, selectedProviderId, oauthTokenStatuses, onToggle, onEditProvider, onApplyProviderConfig, getProviderAgentConfig, }) {
    const { t, i18n } = useTranslation();
    return (_jsxs("div", { className: "bg-white dark:bg-dark-bg-card rounded-lg border border-gray-200 dark:border-dark-border-subtle overflow-hidden transition-colors duration-200", children: [_jsxs("button", { onClick: onToggle, className: "w-full p-5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-dark-bg-hover transition-colors", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg", children: _jsx(Bot, { className: "w-5 h-5 text-blue-600 dark:text-blue-400" }) }), _jsx("h2", { className: "text-lg font-semibold text-gray-900 dark:text-dark-text-primary", children: t("config.llmProviders") })] }), expanded ? (_jsx(ChevronUp, { className: "w-5 h-5 text-gray-400 dark:text-dark-text-muted" })) : (_jsx(ChevronDown, { className: "w-5 h-5 text-gray-400 dark:text-dark-text-muted" }))] }), expanded && (_jsxs("div", { className: "p-5 pt-0 space-y-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx("p", { className: "text-sm text-gray-600 dark:text-dark-text-secondary mb-3", children: t("config.selectProvider") }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3", children: AVAILABLE_PROVIDERS.map((provider) => {
                                    const isConfigured = isProviderConfigured(config, provider.id);
                                    const isCurrentProvider = selectedProviderId === provider.id;
                                    const isOAuth = isOAuthProvider(provider.id);
                                    const oauthStatus = isOAuth ? oauthTokenStatuses[provider.id] : undefined;
                                    const isOAuthLoggedIn = oauthStatus === true;
                                    const isOAuthExpired = oauthStatus === "expired";
                                    const providerAgentCfg = getProviderAgentConfig(provider.id);
                                    return (_jsx("div", { className: `group rounded-lg border transition-all hover:shadow-md ${isCurrentProvider
                                            ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-500/50 ring-2 ring-blue-200 dark:ring-blue-500/30"
                                            : isOAuthLoggedIn
                                                ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-500/50"
                                                : isOAuthExpired
                                                    ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-500/50"
                                                    : isConfigured && !isOAuth
                                                        ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-500/50"
                                                        : "bg-white dark:bg-dark-bg-card border-gray-200 dark:border-dark-border-subtle hover:border-gray-300 dark:hover:border-dark-border-default"}`, children: _jsx("div", { className: "w-full p-4 text-left", children: _jsxs("div", { className: "flex items-start justify-between", children: [_jsxs("div", { className: "flex items-center gap-2 flex-1 cursor-pointer", onClick: () => onApplyProviderConfig(provider.id), children: [_jsx("div", { className: `p-2 rounded-lg ${provider.colorClass.split(" text-")[0]}`, children: _jsx(ProviderIcon, { name: provider.icon, className: `w-5 h-5 ${"text-" + provider.colorClass.split(" text-")[1]}` }) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [_jsx("h3", { className: "font-semibold text-gray-900 dark:text-dark-text-primary text-sm", children: t(provider.nameKey) }), isCurrentProvider && (_jsx("span", { className: "px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full font-medium", children: t("config.currentUse") })), !isCurrentProvider && isOAuthLoggedIn && (_jsx("span", { className: "px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded-full", children: t("config.oauthConfigured") })), !isCurrentProvider && isOAuthExpired && (_jsx("span", { className: "px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs rounded-full", children: t("config.tokenExpiredShort") })), !isCurrentProvider && !isOAuthLoggedIn && !isOAuthExpired && isConfigured && !isOAuth && (_jsx("span", { className: "px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs rounded-full", children: t("config.configured") })), !isCurrentProvider && !isOAuthLoggedIn && !isOAuthExpired && !isConfigured && (_jsx("span", { className: "px-2 py-0.5 bg-gray-100 dark:bg-dark-bg-hover text-gray-600 dark:text-dark-text-muted text-xs rounded-full", children: isOAuth ? t("config.notLoggedIn") : t("config.notConfigured") }))] }), providerAgentCfg.model && (_jsx("p", { className: "text-xs text-gray-500 dark:text-dark-text-muted mt-1 truncate font-mono", children: providerAgentCfg.model }))] })] }), _jsx("button", { onClick: (e) => {
                                                            e.stopPropagation();
                                                            onEditProvider({
                                                                isOpen: true,
                                                                providerId: provider.id,
                                                                providerInfo: provider,
                                                                activeTab: "api",
                                                            });
                                                        }, className: "p-2 bg-white dark:bg-dark-bg-card rounded-lg border border-gray-200 dark:border-dark-border-subtle group-hover:border-blue-200 dark:group-hover:border-blue-500/50 transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/30", title: `${t("config.apiConfig")} & ${t("config.agentConfig")}`, children: _jsx(Settings, { className: "w-5 h-5 text-gray-400 dark:text-dark-text-muted group-hover:text-blue-600 dark:group-hover:text-blue-400" }) })] }) }) }, provider.id));
                                }) })] }), Object.keys(config.providers || {}).length === 0 && (_jsx(EmptyState, { icon: Bot, title: t("config.noProvidersConfigured"), description: t("config.noProvidersDesc") }))] }))] }));
}
