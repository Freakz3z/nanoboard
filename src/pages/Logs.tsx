import { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { loggerApi, events } from "../lib/tauri";
import { useToast } from "../contexts/ToastContext";
import { Play, Square, Search, X, Inbox, Download, BarChart3, Regex } from "lucide-react";
import EmptyState from "../components/EmptyState";

interface LogStatistics {
  total: number;
  debug: number;
  info: number;
  warn: number;
  error: number;
  debugPercent: number;
  infoPercent: number;
  warnPercent: number;
  errorPercent: number;
}

// 日志级别匹配模式（统一管理避免重复）
const LOG_LEVEL_PATTERNS = {
  debug: /\|\s*DEBUG\s*\|/i,
  info: /\|\s*INFO\s*\|/i,
  warn: /\|\s*WARNING\s*\|/i,
  error: /\|\s*ERROR\s*\|/i,
} as const;

// 日志级别颜色映射
function getLogLevelColor(log: string): string {
  // 检测日志级别并返回对应的颜色类名
  if (LOG_LEVEL_PATTERNS.debug.test(log)) {
    // DEBUG: 灰色
    return "text-gray-500 dark:text-gray-400";
  } else if (LOG_LEVEL_PATTERNS.info.test(log)) {
    // INFO: 蓝色
    return "text-blue-600 dark:text-blue-400";
  } else if (LOG_LEVEL_PATTERNS.warn.test(log)) {
    // WARN: 琥珀色/黄色
    return "text-amber-600 dark:text-amber-400";
  } else if (LOG_LEVEL_PATTERNS.error.test(log)) {
    // ERROR: 红色
    return "text-red-600 dark:text-red-400";
  }
  // 默认颜色
  return "text-gray-700 dark:text-dark-text-secondary";
}

export default function Logs() {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<string[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  // 从 localStorage 初始化 streaming 状态，避免切换页面时状态不一致
  const [streaming, setStreaming] = useState(() => localStorage.getItem("logStreaming") === "true");
  const [searchQuery, setSearchQuery] = useState("");
  const [useRegex, setUseRegex] = useState(false);
  const [regexError, setRegexError] = useState<string | null>(null);
  const [logLevel, setLogLevel] = useState<"all" | "debug" | "info" | "warn" | "error">("all");
  const [showStatistics, setShowStatistics] = useState(false);
  const [statistics, setStatistics] = useState<LogStatistics>({
    total: 0,
    debug: 0,
    info: 0,
    warn: 0,
    error: 0,
    debugPercent: 0,
    infoPercent: 0,
    warnPercent: 0,
    errorPercent: 0,
  });
  const logContainerRef = useRef<HTMLDivElement>(null);
  // 使用 useRef 存储取消监听函数，避免内存泄漏
  const unlistenRef = useRef<(() => void) | null>(null);
  const toast = useToast();

  useEffect(() => {
    loadLogs();

    // 检查是否需要自动开始监控
    const shouldAutoStart = localStorage.getItem("autoStartLogMonitor");
    if (shouldAutoStart === "true") {
      // 清除标志
      localStorage.removeItem("autoStartLogMonitor");
      // 延迟启动，确保页面已加载
      setTimeout(() => {
        toggleStream();
      }, 500);
    } else {
      // 检查之前是否正在监控
      const wasStreaming = localStorage.getItem("logStreaming") === "true";
      if (wasStreaming) {
        // 重新启动监控（包括后端 watcher 和前端事件监听）
        setTimeout(async () => {
          try {
            // 首先重新启动后端 watcher
            await loggerApi.startStream();

            // 监听日志更新 - 只负责添加日志，不应用过滤
            const unlisten = await events.onLogUpdate((newLogs) => {
              setLogs((prev) => {
                const updated = [...prev, ...newLogs];
                return updated;
              });
            });

            // 使用 useRef 存储取消监听函数
            unlistenRef.current = unlisten;
            setStreaming(true);
          } catch (error) {
            console.error("恢复监控失败:", error);
            // 如果恢复失败，清除状态
            localStorage.setItem("logStreaming", "false");
            setStreaming(false);
          }
        }, 100);
      }
    }

    // 组件卸载时清理事件监听器
    return () => {
      if (unlistenRef.current) {
        try {
          unlistenRef.current();
        } catch (e: unknown) {
          console.error("取消监听失败:", e);
        }
        unlistenRef.current = null;
      }
    };
  }, []);

  // 应用过滤 - 当日志、搜索条件或级别改变时重新过滤
  useEffect(() => {
    let filtered = logs;
    if (searchQuery) {
      if (useRegex) {
        try {
          const regex = new RegExp(searchQuery, "i");
          filtered = filtered.filter((log) => regex.test(log));
          setRegexError(null);
        } catch {
          setRegexError(t("logs.invalidRegex"));
          filtered = [];
        }
      } else {
        filtered = filtered.filter((log) =>
          log.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
    } else {
      setRegexError(null);
    }

    if (logLevel !== "all") {
      filtered = filtered.filter((log) => LOG_LEVEL_PATTERNS[logLevel].test(log));
    }

    setFilteredLogs(filtered);
    setStatistics(calculateStatistics(filtered));
  }, [logs, searchQuery, useRegex, logLevel]);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [filteredLogs]);

  function calculateStatistics(logsToAnalyze: string[]): LogStatistics {
    const total = logsToAnalyze.length;
    let debug = 0;
    let info = 0;
    let warn = 0;
    let error = 0;

    logsToAnalyze.forEach((log) => {
      // 使用统一的日志级别匹配模式
      if (LOG_LEVEL_PATTERNS.debug.test(log)) debug++;
      else if (LOG_LEVEL_PATTERNS.info.test(log)) info++;
      else if (LOG_LEVEL_PATTERNS.warn.test(log)) warn++;
      else if (LOG_LEVEL_PATTERNS.error.test(log)) error++;
    });

    return {
      total,
      debug,
      info,
      warn,
      error,
      debugPercent: total > 0 ? (debug / total) * 100 : 0,
      infoPercent: total > 0 ? (info / total) * 100 : 0,
      warnPercent: total > 0 ? (warn / total) * 100 : 0,
      errorPercent: total > 0 ? (error / total) * 100 : 0,
    };
  }

  async function loadLogs() {
    setLoading(true);
    try {
      const result = await loggerApi.getLogs(500);
      const loadedLogs = result.logs || [];
      setLogs(loadedLogs);
      setStatistics(calculateStatistics(loadedLogs));
      // 应用当前的搜索和级别过滤
      filterLogs(loadedLogs, searchQuery, logLevel);
    } catch (error) {
      toast.showError(t("logs.loadLogsFailed"));
    } finally {
      setLoading(false);
    }
  }

  function filterLogs(logsToFilter: string[], query: string, level: "all" | "debug" | "info" | "warn" | "error") {
    let filtered = logsToFilter;

    // 应用搜索过滤
    if (query.trim()) {
      if (useRegex) {
        // 使用正则表达式搜索
        try {
          const regex = new RegExp(query, "i");
          filtered = filtered.filter((log) => regex.test(log));
          setRegexError(null);
        } catch (error) {
          setRegexError(error instanceof Error ? error.message : t("logs.invalidRegex"));
          // 正则表达式无效时，返回空结果
          filtered = [];
        }
      } else {
        // 使用普通字符串搜索
        filtered = filtered.filter((log) =>
          log.toLowerCase().includes(query.toLowerCase())
        );
        setRegexError(null);
      }
    } else {
      setRegexError(null);
    }

    // 应用级别过滤
    if (level !== "all") {
      filtered = filtered.filter((log) => LOG_LEVEL_PATTERNS[level].test(log));
    }

    setFilteredLogs(filtered);
  }

  function handleSearchChange(value: string) {
    setSearchQuery(value);
    filterLogs(logs, value, logLevel);
  }

  function handleLevelChange(level: "all" | "debug" | "info" | "warn" | "error") {
    setLogLevel(level);
    filterLogs(logs, searchQuery, level);
  }

  function toggleRegexMode() {
    const newMode = !useRegex;
    setUseRegex(newMode);
    filterLogs(logs, searchQuery, logLevel);
  }

  function clearSearch() {
    setSearchQuery("");
    filterLogs(logs, "", logLevel);
  }

  async function exportLogs() {
    try {
      // 导出当前过滤后的日志
      const content = filteredLogs.join("\n");

      // 创建并下载文件
      const blob = new Blob([content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      // 生成文件名（包含时间戳和过滤信息）
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
      let filename = `logs-${timestamp}`;
      if (logLevel !== "all") {
        filename += `-${logLevel}`;
      }
      if (searchQuery) {
        filename += "-filtered";
      }
      filename += ".txt";

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.showSuccess(t("logs.logsExported", { count: filteredLogs.length }));
    } catch (error) {
      toast.showError(t("logs.exportFailed"));
    }
  }

  async function toggleStream() {
    if (streaming) {
      try {
        await loggerApi.stopStream();
        setStreaming(false);
        localStorage.setItem("logStreaming", "false");
        // 清理监听器
        if (unlistenRef.current) {
          try {
            unlistenRef.current();
          } catch (e) {
            console.error("取消监听失败:", e);
          }
          unlistenRef.current = null;
        }
        toast.showInfo(t("logs.stopMonitoring"));
      } catch (error) {
        console.error("Stop monitoring failed:", error);
        toast.showError(t("logs.stopMonitoringFailed"));
      }
    } else {
      try {
        setLoading(true);
        await loggerApi.startStream();
        setStreaming(true);
        localStorage.setItem("logStreaming", "true");

        // 监听日志更新 - 只负责添加日志
        const unlisten = await events.onLogUpdate((newLogs) => {
          setLogs((prev) => {
            const updated = [...prev, ...newLogs];
            return updated;
          });
        });

        // 使用 useRef 存储取消监听函数
        unlistenRef.current = unlisten;

        toast.showSuccess(t("logs.startMonitoring"));
      } catch (error) {
        console.error("启动监控失败:", error);
        // Tauri 错误通常是字符串
        let errorMessage = t("logs.startMonitoringFailed");
        if (typeof error === "string") {
          errorMessage = error;
        } else if (error instanceof Error) {
          errorMessage = error.message;
        } else if (error && typeof error === "object" && "message" in error) {
          errorMessage = String(error.message);
        }
        toast.showError(`${t("logs.startMonitoringFailed")}: ${errorMessage}`);
        setStreaming(false);
        localStorage.setItem("logStreaming", "false");
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <div className="flex-1 overflow-hidden flex flex-col bg-white dark:bg-dark-bg-base transition-colors duration-200">
      {/* 头部 */}
      <div className="bg-white dark:bg-dark-bg-card border-b border-gray-200 dark:border-dark-border-subtle px-6 py-4 transition-colors duration-200">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary mb-4">{t("logs.title")}</h1>

        {/* 搜索框 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-dark-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={useRegex ? t("logs.searchWithRegex") : t("logs.searchLogs")}
            className={`w-full pl-10 pr-24 py-2 bg-gray-50 dark:bg-dark-bg-sidebar border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900 dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-dark-text-muted transition-colors duration-200 ${
              regexError ? "border-red-300 dark:border-red-500/50" : "border-gray-200 dark:border-dark-border-subtle"
            }`}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <button
              onClick={toggleRegexMode}
              className={`flex items-center gap-1 px-2 py-1 rounded-md transition-colors text-xs font-medium ${
                useRegex
                  ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-900/50"
                  : "bg-gray-100 dark:bg-dark-bg-hover text-gray-600 dark:text-dark-text-secondary hover:bg-gray-200 dark:hover:bg-dark-bg-active"
              }`}
              title={t("logs.toggleSearchMode", { mode: useRegex ? t("logs.normalSearch") : t("logs.regexSearch") })}
            >
              <Regex className="w-3.5 h-3.5" />
              {useRegex ? t("logs.regexSearch") : t("logs.normalSearch")}
            </button>
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="p-1 text-gray-400 dark:text-dark-text-muted hover:text-gray-600 dark:hover:text-dark-text-primary transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* 正则表达式错误提示 */}
        {regexError && (
          <div className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
            <span>⚠️ {regexError}</span>
          </div>
        )}

        {/* 日志级别过滤和操作按钮 */}
        <div className="flex items-center gap-3 mt-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-dark-text-muted">{t("logs.level")}</span>
            <div className="flex gap-1">
              <button
                onClick={() => handleLevelChange("all")}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  logLevel === "all"
                    ? "bg-gray-800 dark:bg-dark-text-primary text-white"
                    : "bg-gray-100 dark:bg-dark-bg-hover text-gray-600 dark:text-dark-text-secondary hover:bg-gray-200 dark:hover:bg-dark-bg-active"
                }`}
              >
                {t("logs.all")}
              </button>
              <button
                onClick={() => handleLevelChange("info")}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  logLevel === "info"
                    ? "bg-blue-600 text-white"
                    : "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50"
                }`}
              >
                INFO
              </button>
              <button
                onClick={() => handleLevelChange("debug")}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  logLevel === "debug"
                    ? "bg-gray-600 text-white"
                    : "bg-gray-50 dark:bg-dark-bg-hover text-gray-600 dark:text-dark-text-secondary hover:bg-gray-100 dark:hover:bg-dark-bg-active"
                }`}
              >
                DEBUG
              </button>
              <button
                onClick={() => handleLevelChange("warn")}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  logLevel === "warn"
                    ? "bg-amber-600 text-white"
                    : "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/50"
                }`}
              >
                WARN
              </button>
              <button
                onClick={() => handleLevelChange("error")}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  logLevel === "error"
                    ? "bg-red-600 text-white"
                    : "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50"
                }`}
              >
                ERROR
              </button>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => setShowStatistics(!showStatistics)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium ${
                showStatistics
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-gray-100 dark:bg-dark-bg-hover text-gray-700 dark:text-dark-text-primary hover:bg-gray-200 dark:hover:bg-dark-bg-active"
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              {t("logs.statistics")}
            </button>
            <button
              onClick={exportLogs}
              disabled={filteredLogs.length === 0}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-dark-bg-hover hover:bg-gray-200 dark:hover:bg-dark-bg-active disabled:bg-gray-50 dark:disabled:bg-dark-bg-sidebar disabled:cursor-not-allowed rounded-lg transition-colors text-sm font-medium text-gray-700 dark:text-dark-text-primary"
              title={t("logs.export")}
            >
              <Download className="w-4 h-4" />
              {t("logs.export")}
            </button>
            <button
              onClick={toggleStream}
              disabled={loading}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium text-white ${
                streaming
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-green-600 hover:bg-green-700"
              } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {streaming ? (
                <>
                  <Square className="w-4 h-4" />
                  {t("logs.stop")}
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  {t("logs.start")}
                </>
              )}
            </button>
          </div>
        </div>

        {/* 过滤结果提示 */}
        {(searchQuery || logLevel !== "all") && (
          <div className="mt-2 text-sm text-gray-500 dark:text-dark-text-muted">
            {t("logs.findMatches", { count: filteredLogs.length, total: logs.length })}
          </div>
        )}
      </div>

      {/* 统计面板 */}
      {showStatistics && (
        <div className="bg-white dark:bg-dark-bg-card border-b border-gray-200 dark:border-dark-border-subtle px-6 py-4 transition-colors duration-200">
          <div className="max-w-6xl">
            <div className="p-4 bg-gray-50 dark:bg-dark-bg-sidebar rounded-lg border border-gray-200 dark:border-dark-border-subtle transition-colors duration-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-dark-text-primary">{t("logs.logStatistics")}</h3>
                <span className="text-xs text-gray-500 dark:text-dark-text-muted">{t("logs.totalLogsCount", { total: statistics.total })}</span>
              </div>

              <div className="space-y-3">
                {/* INFO */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-blue-600 dark:text-blue-400 font-medium">INFO</span>
                    <span className="text-gray-600 dark:text-dark-text-secondary">
                      {statistics.info} {t("dashboard.entries")} ({statistics.infoPercent.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-dark-bg-hover rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${statistics.infoPercent}%` }}
                    />
                  </div>
                </div>

                {/* DEBUG */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-600 dark:text-gray-400 font-medium">DEBUG</span>
                    <span className="text-gray-600 dark:text-dark-text-secondary">
                      {statistics.debug} {t("dashboard.entries")} ({statistics.debugPercent.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-dark-bg-hover rounded-full h-2">
                    <div
                      className="bg-gray-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${statistics.debugPercent}%` }}
                    />
                  </div>
                </div>

                {/* WARN */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-amber-600 dark:text-amber-400 font-medium">WARN</span>
                    <span className="text-gray-600 dark:text-dark-text-secondary">
                      {statistics.warn} {t("dashboard.entries")} ({statistics.warnPercent.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-dark-bg-hover rounded-full h-2">
                    <div
                      className="bg-amber-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${statistics.warnPercent}%` }}
                    />
                  </div>
                </div>

                {/* ERROR */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-red-600 dark:text-red-400 font-medium">ERROR</span>
                    <span className="text-gray-600 dark:text-dark-text-secondary">
                      {statistics.error} {t("dashboard.entries")} ({statistics.errorPercent.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-dark-bg-hover rounded-full h-2">
                    <div
                      className="bg-red-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${statistics.errorPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 日志内容 */}
      <div
        ref={logContainerRef}
        className="flex-1 overflow-y-auto bg-gray-50 dark:bg-dark-bg-sidebar p-4 font-mono text-sm scrollbar-thin transition-colors duration-200"
      >
        {loading ? (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-dark-text-muted">
            {t("config.loading")}
          </div>
        ) : filteredLogs.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title={searchQuery ? t("logs.noMatchingLogs") : t("logs.noLogs")}
            description={
              searchQuery
                ? t("logs.tryDifferentKeywords")
                : t("logs.startNanobotForLogs")
            }
          />
        ) : (
          <div className="space-y-1">
            {filteredLogs.map((log, index) => (
              <div
                key={index}
                className={`hover:bg-white dark:hover:bg-dark-bg-card px-2 py-1 rounded whitespace-pre-wrap break-words border border-transparent hover:border-gray-200 dark:hover:border-dark-border-subtle transition-colors duration-200 ${getLogLevelColor(log)}`}
              >
                {log}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 状态栏 */}
      <div className="bg-white dark:bg-dark-bg-card border-t border-gray-200 dark:border-dark-border-subtle px-4 py-2 flex items-center justify-between text-sm text-gray-500 dark:text-dark-text-muted transition-colors duration-200">
        <span>
          {searchQuery
            ? t("logs.displayLogs", { filtered: filteredLogs.length, total: logs.length })
            : t("logs.totalLogs", { total: logs.length })}
        </span>
        <span>
          {streaming ? (
            <span className="text-green-600 dark:text-green-400">● {t("logs.realtimeMonitoring")}</span>
          ) : (
            <span className="text-amber-600 dark:text-amber-400">● {t("logs.paused")}</span>
          )}
        </span>
      </div>
    </div>
  );
}
