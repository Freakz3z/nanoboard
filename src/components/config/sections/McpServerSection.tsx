import { useTranslation } from "react-i18next";
import { Plug, ChevronUp, ChevronDown, Globe, Terminal, Plus } from "lucide-react";
import EmptyState from "../../EmptyState";
import type { McpServerWithState, EditingMcpServer } from "@/types/config";

interface McpServerSectionProps {
  mcpServersConfig: Record<string, McpServerWithState>;
  expanded: boolean;
  onToggle: () => void;
  onAddServer: () => void;
  onEditServer: (server: EditingMcpServer) => void;
  onToggleServer: (serverId: string) => void;
}

export default function McpServerSection({
  mcpServersConfig,
  expanded,
  onToggle,
  onAddServer,
  onEditServer,
  onToggleServer,
}: McpServerSectionProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-white dark:bg-dark-bg-card rounded-lg border border-gray-200 dark:border-dark-border-subtle overflow-hidden transition-colors duration-200">
      <button
        onClick={onToggle}
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
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-gray-400 dark:text-dark-text-muted" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400 dark:text-dark-text-muted" />
        )}
      </button>

      {expanded && (
        <div className="p-5 pt-0 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-600 dark:text-dark-text-secondary">{t("mcp.description")}</p>
              <button
                onClick={onAddServer}
                className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                {t("mcp.addServer")}
              </button>
            </div>

            {Object.keys(mcpServersConfig).length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(mcpServersConfig).map(([serverId, server]) => {
                  const isHttpMode = !!server.url;
                  const isEnabled = !server.disabled;
                  return (
                    <div
                      key={serverId}
                      className={`group rounded-lg border transition-all hover:shadow-md ${
                        isEnabled
                          ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-500/50"
                          : "bg-gray-50 dark:bg-dark-bg-card border-gray-200 dark:border-dark-border-subtle"
                      }`}
                    >
                      <div className="w-full p-4 text-left">
                        <div className="flex items-center justify-between">
                          <div
                            className="flex items-center gap-2 flex-1 cursor-pointer"
                            onClick={() =>
                              onEditServer({
                                isOpen: true,
                                serverId,
                                server,
                                mode: "edit",
                              })
                            }
                          >
                            <div
                              className={`p-2 rounded-lg ${
                                isEnabled
                                  ? "bg-emerald-100 dark:bg-emerald-900/30"
                                  : "bg-gray-100 dark:bg-dark-bg-hover"
                              }`}
                            >
                              {isHttpMode ? (
                                <Globe
                                  className={`w-5 h-5 ${
                                    isEnabled
                                      ? "text-emerald-600 dark:text-emerald-400"
                                      : "text-gray-400 dark:text-dark-text-muted"
                                  }`}
                                />
                              ) : (
                                <Terminal
                                  className={`w-5 h-5 ${
                                    isEnabled
                                      ? "text-emerald-600 dark:text-emerald-400"
                                      : "text-gray-400 dark:text-dark-text-muted"
                                  }`}
                                />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3
                                className="font-semibold text-gray-900 dark:text-dark-text-primary text-sm truncate"
                                title={serverId}
                              >
                                {serverId}
                              </h3>
                              <div className="flex items-center gap-2 mt-0.5">
                                <p className="text-xs text-gray-500 dark:text-dark-text-muted">
                                  {isHttpMode ? t("mcp.http") : t("mcp.stdio")}
                                </p>
                                {isEnabled ? (
                                  <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs rounded-full whitespace-nowrap">
                                    {t("config.enabled")}
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 bg-gray-100 dark:bg-dark-bg-hover text-gray-600 dark:text-dark-text-muted text-xs rounded-full whitespace-nowrap">
                                    {t("config.notEnabled")}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleServer(serverId);
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
              <EmptyState icon={Plug} title={t("mcp.noServers")} description={t("mcp.noServersDesc")} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
