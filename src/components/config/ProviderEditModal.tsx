/**
 * Provider 编辑模态框组件
 */

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Trash2, LogIn, ExternalLink, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import {
  Bot,
  Brain,
  Search,
  Network,
  Zap,
  Target,
  Cpu,
  Server,
} from "lucide-react";
import type { ProviderInfo, ProviderAgentConfig, Config } from "@/config/types";
import { processApi } from "@/lib/tauri";
import { useToast } from "@/contexts/ToastContext";

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

interface OAuthTokenStatus {
  has_token: boolean;
  is_expired?: boolean;
  message: string;
}

interface ProviderEditModalProps {
  isOpen: boolean;
  providerId: string;
  providerInfo: ProviderInfo | null;
  activeTab: "api" | "agent";
  config: Config;
  providerAgentConfig: ProviderAgentConfig;
  onClose: () => void;
  onSave: () => void;
  onTabChange: (tab: "api" | "agent") => void;
  onUpdateProvider: (name: string, field: keyof import("@/config/types").Provider, value: unknown) => void;
  onRemoveProvider: (name: string) => void;
  onUpdateProviderAgentConfig: (providerId: string, field: keyof ProviderAgentConfig, value: unknown) => void;
}

export default function ProviderEditModal({
  isOpen,
  providerId,
  providerInfo,
  activeTab,
  config,
  providerAgentConfig,
  onClose,
  onSave,
  onTabChange,
  onUpdateProvider,
  onRemoveProvider,
  onUpdateProviderAgentConfig,
}: ProviderEditModalProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [oauthTokenStatus, setOauthTokenStatus] = useState<OAuthTokenStatus | null>(null);
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
    if (!providerInfo?.loginCommand) return;

    setIsCheckingToken(true);
    try {
      const result = await processApi.checkOAuthToken(providerInfo.loginCommand);
      setOauthTokenStatus(result);
    } catch (error) {
      console.error("检查OAuth token失败:", error);
      setOauthTokenStatus({
        has_token: false,
        message: "检查token状态失败",
      });
    } finally {
      setIsCheckingToken(false);
    }
  };

  // 处理 OAuth 登录
  const handleOAuthLogin = async () => {
    if (!providerInfo?.loginCommand) return;

    setIsLoggingIn(true);
    try {
      const result = await processApi.providerLogin(providerInfo.loginCommand);
      if (result.success) {
        showToast(result.message || "登录流程已启动，请在终端中完成授权", "info");
      } else {
        showToast(result.message || "登录失败", "error");
      }
    } catch (error) {
      showToast(`登录失败: ${error}`, "error");
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (!isOpen || !providerInfo) return null;

  // 渲染OAuth token状态
  const renderOAuthStatus = () => {
    if (isCheckingToken) {
      return (
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-dark-text-muted">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>{t("config.checkingToken")}</span>
        </div>
      );
    }

    if (!oauthTokenStatus) {
      return (
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-dark-text-muted">
          <AlertCircle className="w-4 h-4" />
          <span>{t("config.tokenStatusUnknown")}</span>
        </div>
      );
    }

    if (oauthTokenStatus.has_token && !oauthTokenStatus.is_expired) {
      return (
        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
          <CheckCircle className="w-4 h-4" />
          <span>{t("config.oauthLoggedIn")}</span>
        </div>
      );
    }

    if (oauthTokenStatus.has_token && oauthTokenStatus.is_expired) {
      return (
        <div className="flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-400">
          <AlertCircle className="w-4 h-4" />
          <span>{t("config.tokenExpired")}</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-dark-text-muted">
        <AlertCircle className="w-4 h-4" />
        <span>{t("config.notLoggedIn")}</span>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div
        className="bg-white dark:bg-dark-bg-card rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col transition-colors duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="p-6 border-b border-gray-200 dark:border-dark-border-subtle">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${providerInfo.colorClass.split(" text-")[0]}`}>
              <ProviderIcon
                name={providerInfo.icon}
                className={`w-6 h-6 ${"text-" + providerInfo.colorClass.split(" text-")[1]}`}
              />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">
                {t("config.editProvider", { name: t(providerInfo.nameKey) })}
              </h3>
            </div>
          </div>

          {/* 选项卡切换 */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => onTabChange("api")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "api"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-dark-bg-hover text-gray-700 dark:text-dark-text-primary hover:bg-gray-200 dark:hover:bg-dark-bg-active"
              }`}
            >
              {t("config.apiConfig")}
            </button>
            <button
              onClick={() => onTabChange("agent")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "agent"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-dark-bg-hover text-gray-700 dark:text-dark-text-primary hover:bg-gray-200 dark:hover:bg-dark-bg-active"
              }`}
            >
              {t("config.agentConfig")}
            </button>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "api" ? (
            <div className="space-y-4">
              {/* OAuth Provider 显示登录按钮 */}
              {isOAuth ? (
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-500/30">
                    <div className="flex items-center gap-3 mb-3">
                      <LogIn className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <span className="font-medium text-blue-900 dark:text-blue-100">
                        {t("config.oauthLogin")}
                      </span>
                    </div>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
                      {t("config.oauthLoginDesc")}
                    </p>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleOAuthLogin}
                        disabled={isLoggingIn}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm font-medium"
                      >
                        {isLoggingIn ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            {t("config.loggingIn")}
                          </>
                        ) : (
                          <>
                            <LogIn className="w-4 h-4" />
                            {t("config.login")}
                          </>
                        )}
                      </button>
                      <button
                        onClick={checkOAuthTokenStatus}
                        disabled={isCheckingToken}
                        className="flex items-center gap-2 px-3 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 text-gray-700 dark:text-gray-200 rounded-lg transition-colors text-sm"
                        title={t("config.refreshTokenStatus")}
                      >
                        <RefreshCw className={`w-4 h-4 ${isCheckingToken ? "animate-spin" : ""}`} />
                      </button>
                    </div>
                    {/* Token状态显示 */}
                    <div className="mt-4 pt-3 border-t border-blue-200 dark:border-blue-500/30">
                      {renderOAuthStatus()}
                    </div>
                  </div>
                  {providerInfo.apiUrl && (
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-dark-text-muted">
                      <ExternalLink className="w-4 h-4" />
                      <a
                        href={providerInfo.apiUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-blue-600 dark:hover:text-blue-400"
                      >
                        {providerInfo.apiUrl}
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                /* 普通 Provider 显示 API Key 输入框 */
                <>
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-dark-text-secondary mb-1">
                      {t("config.apiKey")}
                    </label>
                    <input
                      type="password"
                      value={config.providers?.[providerId]?.apiKey || ""}
                      onChange={(e) => onUpdateProvider(providerId, "apiKey", e.target.value)}
                      placeholder={t("config.apiKeyPlaceholder")}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-dark-bg-sidebar border border-gray-200 dark:border-dark-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900 dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-dark-text-muted"
                    />
                    {providerInfo.apiUrl && (
                      <p className="text-xs text-gray-400 dark:text-dark-text-muted mt-1">
                        {t("config.getApiKeyAt", { url: providerInfo.apiUrl })}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm text-gray-600 dark:text-dark-text-secondary mb-1">
                      {t("config.apiBaseUrl")}
                    </label>
                    <input
                      type="text"
                      value={config.providers?.[providerId]?.apiBase || ""}
                      onChange={(e) => onUpdateProvider(providerId, "apiBase", e.target.value)}
                      placeholder={t("config.apiBaseUrlPlaceholder")}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-dark-bg-sidebar border border-gray-200 dark:border-dark-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900 dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-dark-text-muted"
                    />
                    {providerInfo.apiBase && (
                      <p className="text-xs text-gray-400 dark:text-dark-text-muted mt-1">
                        {t("config.apiBaseUrlDefault", { url: providerInfo.apiBase })}
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 dark:text-dark-text-secondary mb-1">
                  {t("config.model")}
                </label>
                <input
                  type="text"
                  value={providerAgentConfig.model || ""}
                  onChange={(e) => onUpdateProviderAgentConfig(providerId, "model", e.target.value)}
                  placeholder={t("config.modelPlaceholder")}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-dark-bg-sidebar border border-gray-200 dark:border-dark-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm text-gray-900 dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-dark-text-muted"
                />
                <p className="text-xs text-gray-500 dark:text-dark-text-muted mt-1">{t("config.modelDesc")}</p>
              </div>

              <div>
                <label className="block text-sm text-gray-600 dark:text-dark-text-secondary mb-1">
                  {t("config.maxTokens")}
                </label>
                <input
                  type="number"
                  value={providerAgentConfig.max_tokens || 8192}
                  onChange={(e) => onUpdateProviderAgentConfig(providerId, "max_tokens", parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-dark-bg-sidebar border border-gray-200 dark:border-dark-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm text-gray-900 dark:text-dark-text-primary"
                />
                <p className="text-xs text-gray-500 dark:text-dark-text-muted mt-1">{t("config.maxTokensDesc")}</p>
              </div>

              <div>
                <label className="block text-sm text-gray-600 dark:text-dark-text-secondary mb-1">
                  {t("config.maxToolIterations")}
                </label>
                <input
                  type="number"
                  value={providerAgentConfig.max_tool_iterations ?? 20}
                  onChange={(e) => onUpdateProviderAgentConfig(providerId, "max_tool_iterations", parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-dark-bg-sidebar border border-gray-200 dark:border-dark-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm text-gray-900 dark:text-dark-text-primary"
                />
                <p className="text-xs text-gray-500 dark:text-dark-text-muted mt-1">{t("config.maxToolIterationsDesc")}</p>
              </div>

              <div>
                <label className="block text-sm text-gray-600 dark:text-dark-text-secondary mb-1">
                  {t("config.workspace")}
                </label>
                <input
                  type="text"
                  value={providerAgentConfig.workspace || "~/.nanobot/workspace"}
                  onChange={(e) => onUpdateProviderAgentConfig(providerId, "workspace", e.target.value)}
                  placeholder={t("config.workspacePlaceholder")}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-dark-bg-sidebar border border-gray-200 dark:border-dark-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm text-gray-900 dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-dark-text-muted"
                />
                <p className="text-xs text-gray-500 dark:text-dark-text-muted mt-1">{t("config.workspaceDesc")}</p>
              </div>

              <div>
                <label className="block text-sm text-gray-600 dark:text-dark-text-secondary mb-1">
                  {t("config.memoryWindow")}
                </label>
                <input
                  type="number"
                  value={providerAgentConfig.memory_window ?? 50}
                  onChange={(e) => onUpdateProviderAgentConfig(providerId, "memory_window", parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-dark-bg-sidebar border border-gray-200 dark:border-dark-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm text-gray-900 dark:text-dark-text-primary"
                />
                <p className="text-xs text-gray-500 dark:text-dark-text-muted mt-1">{t("config.memoryWindowDesc")}</p>
              </div>

              <div>
                <label className="block text-sm text-gray-600 dark:text-dark-text-secondary mb-1">
                  {t("config.temperature")}
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="2"
                  value={providerAgentConfig.temperature ?? 0.7}
                  onChange={(e) => onUpdateProviderAgentConfig(providerId, "temperature", parseFloat(e.target.value))}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-dark-bg-sidebar border border-gray-200 dark:border-dark-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm text-gray-900 dark:text-dark-text-primary"
                />
                <p className="text-xs text-gray-500 dark:text-dark-text-muted mt-1">{t("config.temperatureDesc")}</p>
              </div>
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="p-6 border-t border-gray-200 dark:border-dark-border-subtle flex items-center justify-between gap-3">
          {/* 左侧：删除按钮 */}
          <div>
            {config.providers?.[providerId] && activeTab === "api" && (
              <button
                onClick={() => {
                  onRemoveProvider(providerId);
                  onClose();
                }}
                className="flex items-center gap-1 px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors text-sm font-medium"
              >
                <Trash2 className="w-4 h-4" />
                {t("config.deleteConfig")}
              </button>
            )}
          </div>
          {/* 右侧：取消和完成按钮 */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 dark:bg-dark-bg-hover hover:bg-gray-200 dark:hover:bg-dark-bg-active text-gray-700 dark:text-dark-text-primary rounded-lg transition-colors text-sm font-medium"
            >
              {t("config.cancel")}
            </button>
            <button
              onClick={() => {
                onSave();
                onClose();
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
            >
              {t("config.done")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
