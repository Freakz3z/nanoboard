import { useTranslation } from "react-i18next";
import { Bot, ChevronUp, ChevronDown, Settings } from "lucide-react";
import EmptyState from "../../EmptyState";
import { AVAILABLE_PROVIDERS, isProviderConfigured, isOAuthProvider } from "@/config/providers";
import type { Config, ProviderInfo, EditingProvider } from "@/types/config";

interface ProviderSectionProps {
  config: Config;
  expanded: boolean;
  selectedProviderId: string | null;
  oauthTokenStatuses: Record<string, boolean | "expired">;
  onToggle: () => void;
  onEditProvider: (provider: EditingProvider) => void;
  onApplyProviderConfig: (providerId: string) => void;
  getProviderAgentConfig: (providerId: string) => any;
}

// 图标映射组件
const ProviderIcon = ({ name, className }: { name: string; className?: string }) => {
  const icons: Record<string, React.ComponentType<{ className?: string }>> = {
    Bot,
  };

  const IconComponent = icons[name] || Bot;
  return <IconComponent className={className} />;
};

export default function ProviderSection({
  config,
  expanded,
  selectedProviderId,
  oauthTokenStatuses,
  onToggle,
  onEditProvider,
  onApplyProviderConfig,
  getProviderAgentConfig,
}: ProviderSectionProps) {
  const { t, i18n } = useTranslation();

  return (
    <div className="bg-white dark:bg-dark-bg-card rounded-lg border border-gray-200 dark:border-dark-border-subtle overflow-hidden transition-colors duration-200">
      <button
        onClick={onToggle}
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
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-gray-400 dark:text-dark-text-muted" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400 dark:text-dark-text-muted" />
        )}
      </button>

      {expanded && (
        <div className="p-5 pt-0 space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-3">
              {t("config.selectProvider")}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {AVAILABLE_PROVIDERS.map((provider) => {
                const isConfigured = isProviderConfigured(config, provider.id);
                const isCurrentProvider = selectedProviderId === provider.id;
                const isOAuth = isOAuthProvider(provider.id);
                const oauthStatus = isOAuth ? oauthTokenStatuses[provider.id] : undefined;
                const isOAuthLoggedIn = oauthStatus === true;
                const isOAuthExpired = oauthStatus === "expired";
                const providerAgentCfg = getProviderAgentConfig(provider.id);

                return (
                  <div
                    key={provider.id}
                    className={`group rounded-lg border transition-all hover:shadow-md ${
                      isCurrentProvider
                        ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-500/50 ring-2 ring-blue-200 dark:ring-blue-500/30"
                        : isOAuthLoggedIn
                        ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-500/50"
                        : isOAuthExpired
                        ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-500/50"
                        : isConfigured && !isOAuth
                        ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-500/50"
                        : "bg-white dark:bg-dark-bg-card border-gray-200 dark:border-dark-border-subtle hover:border-gray-300 dark:hover:border-dark-border-default"
                    }`}
                  >
                    <div className="w-full p-4 text-left">
                      <div className="flex items-start justify-between">
                        <div
                          className="flex items-center gap-2 flex-1 cursor-pointer"
                          onClick={() => onApplyProviderConfig(provider.id)}
                        >
                          <div className={`p-2 rounded-lg ${provider.colorClass.split(" text-")[0]}`}>
                            <ProviderIcon
                              name={provider.icon}
                              className={`w-5 h-5 ${"text-" + provider.colorClass.split(" text-")[1]}`}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-gray-900 dark:text-dark-text-primary text-sm">
                                {t(provider.nameKey)}
                              </h3>
                              {isCurrentProvider && (
                                <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full font-medium">
                                  {t("config.currentUse")}
                                </span>
                              )}
                              {!isCurrentProvider && isOAuthLoggedIn && (
                                <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded-full">
                                  {t("config.oauthConfigured")}
                                </span>
                              )}
                              {!isCurrentProvider && isOAuthExpired && (
                                <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs rounded-full">
                                  {t("config.tokenExpiredShort")}
                                </span>
                              )}
                              {!isCurrentProvider && !isOAuthLoggedIn && !isOAuthExpired && isConfigured && !isOAuth && (
                                <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs rounded-full">
                                  {t("config.configured")}
                                </span>
                              )}
                              {!isCurrentProvider && !isOAuthLoggedIn && !isOAuthExpired && !isConfigured && (
                                <span className="px-2 py-0.5 bg-gray-100 dark:bg-dark-bg-hover text-gray-600 dark:text-dark-text-muted text-xs rounded-full">
                                  {isOAuth ? t("config.notLoggedIn") : t("config.notConfigured")}
                                </span>
                              )}
                            </div>
                            {providerAgentCfg.model && (
                              <p className="text-xs text-gray-500 dark:text-dark-text-muted mt-1 truncate font-mono">
                                {providerAgentCfg.model}
                              </p>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditProvider({
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
  );
}
