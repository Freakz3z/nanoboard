import { useTranslation } from "react-i18next";
import { Wrench, ChevronUp, ChevronDown, Terminal, Globe, Shield } from "lucide-react";
import type { Config } from "@/types/config";

interface ToolsSectionProps {
  config: Config;
  expanded: boolean;
  onToggle: () => void;
  onUpdateToolsExec: (field: string, value: any) => void;
  onUpdateToolsWebSearch: (field: string, value: any) => void;
  onUpdateToolsConfig: (field: string, value: any) => void;
}

export default function ToolsSection({
  config,
  expanded,
  onToggle,
  onUpdateToolsExec,
  onUpdateToolsWebSearch,
  onUpdateToolsConfig,
}: ToolsSectionProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-white dark:bg-dark-bg-card rounded-lg border border-gray-200 dark:border-dark-border-subtle overflow-hidden transition-colors duration-200">
      <button
        onClick={onToggle}
        className="w-full p-5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-dark-bg-hover transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
            <Wrench className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">
            {t("config.toolsConfig")}
          </h2>
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-gray-400 dark:text-dark-text-muted" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400 dark:text-dark-text-muted" />
        )}
      </button>

      {expanded && (
        <div className="p-5 pt-0 space-y-6">
          {/* Exec 配置 */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-dark-text-secondary flex items-center gap-2">
              <Terminal className="w-4 h-4" />
              {t("config.execConfig")}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 dark:text-dark-text-secondary mb-1">
                  {t("config.execTimeout")}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    value={config.tools?.exec?.timeout ?? 60}
                    onChange={(e) => onUpdateToolsExec("timeout", parseInt(e.target.value) || 60)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-dark-bg-sidebar border border-gray-200 dark:border-dark-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm text-gray-900 dark:text-dark-text-primary"
                  />
                  <span className="text-sm text-gray-500 dark:text-dark-text-muted whitespace-nowrap">
                    {t("config.seconds")}
                  </span>
                </div>
                <p className="text-xs text-gray-400 dark:text-dark-text-muted mt-1">
                  {t("config.execTimeoutDesc")}
                </p>
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-dark-text-secondary mb-1">
                  {t("config.pathAppendLabel")}
                </label>
                <input
                  type="text"
                  value={config.tools?.exec?.pathAppend ?? ""}
                  onChange={(e) => onUpdateToolsExec("pathAppend", e.target.value)}
                  placeholder={t("config.pathAppendPlaceholder")}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-dark-bg-sidebar border border-gray-200 dark:border-dark-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm text-gray-900 dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-dark-text-muted"
                />
                <p className="text-xs text-gray-400 dark:text-dark-text-muted mt-1">
                  {t("config.pathAppendDesc")}
                </p>
              </div>
            </div>
          </div>

          {/* Web Search 配置 */}
          <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-dark-border-subtle">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-dark-text-secondary flex items-center gap-2">
              <Globe className="w-4 h-4" />
              {t("config.webSearchConfig")}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 dark:text-dark-text-secondary mb-1">
                  {t("config.webSearchApiKey")}
                </label>
                <input
                  type="password"
                  value={config.tools?.web?.search?.apiKey || ""}
                  onChange={(e) => onUpdateToolsWebSearch("apiKey", e.target.value)}
                  placeholder={t("config.apiKeyPlaceholder")}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-dark-bg-sidebar border border-gray-200 dark:border-dark-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm text-gray-900 dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-dark-text-muted"
                />
                <p className="text-xs text-gray-400 dark:text-dark-text-muted mt-1">
                  {t("config.webSearchApiKeyDesc")}
                </p>
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-dark-text-secondary mb-1">
                  {t("config.webSearchMaxResults")}
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={config.tools?.web?.search?.maxResults ?? 5}
                  onChange={(e) => onUpdateToolsWebSearch("maxResults", parseInt(e.target.value) || 5)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-dark-bg-sidebar border border-gray-200 dark:border-dark-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm text-gray-900 dark:text-dark-text-primary"
                />
                <p className="text-xs text-gray-400 dark:text-dark-text-muted mt-1">
                  {t("config.webSearchMaxResultsDesc")}
                </p>
              </div>
            </div>
          </div>

          {/* Security 配置 */}
          <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-dark-border-subtle">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <Shield className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-dark-text-secondary">
                {t("config.security")}
              </h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-dark-text-secondary">{t("config.securityDesc")}</p>

            <div
              className={`rounded-lg border p-4 transition-all ${
                config.tools?.restrictToWorkspace
                  ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-500/50"
                  : "bg-white dark:bg-dark-bg-card border-gray-200 dark:border-dark-border-subtle"
              }`}
            >
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
                  onClick={() => onUpdateToolsConfig("restrictToWorkspace", !config.tools?.restrictToWorkspace)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                    config.tools?.restrictToWorkspace
                      ? "bg-amber-500"
                      : "bg-gray-300 dark:bg-dark-border-default"
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
  );
}
