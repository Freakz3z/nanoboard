import { useEffect, useState, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { loggerApi, events } from "../lib/tauri";
import { useToast } from "../contexts/ToastContext";
import { Play, Square, Search, X, Inbox, Download, BarChart3, Regex } from "lucide-react";
import EmptyState from "../components/EmptyState";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";
import { LogItem } from "../components/logs";

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

const LOG_LEVEL_PATTERNS = {
  debug: /\|\s*DEBUG\s*\|/i,
  info: /\|\s*INFO\s*\|/i,
  warn: /\|\s*WARNING\s*\|/i,
  error: /\|\s*ERROR\s*\|/i,
} as const;

function getLogLevelColor(log: string): string {
  if (LOG_LEVEL_PATTERNS.debug.test(log)) return "text-gray-500 dark:text-gray-400";
  else if (LOG_LEVEL_PATTERNS.info.test(log)) return "text-blue-600 dark:text-blue-400";
  else if (LOG_LEVEL_PATTERNS.warn.test(log)) return "text-amber-600 dark:text-amber-400";
  else if (LOG_LEVEL_PATTERNS.error.test(log)) return "text-red-600 dark:text-red-400";
  return "text-gray-700 dark:text-dark-text-secondary";
}

export default function Logs() {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(() => localStorage.getItem("logStreaming") === "true");
  const [searchQuery, setSearchQuery] = useState("");
  const [useRegex, setUseRegex] = useState(false);
  const [regexError, setRegexError] = useState<string | null>(null);
  const [logLevel, setLogLevel] = useState<"all" | "debug" | "info" | "warn" | "error">("all");
  const [showStatistics, setShowStatistics] = useState(false);
  const [_stats, _setStats] = useState<LogStatistics>({
    total: 0, debug: 0, info: 0, warn: 0, error: 0,
    debugPercent: 0, infoPercent: 0, warnPercent: 0, errorPercent: 0,
  });
  const unlistenRef = useRef<(() => void) | null>(null);
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const toast = useToast();

  useEffect(() => {
    loadLogs();
    const shouldAutoStart = localStorage.getItem("autoStartLogMonitor");
    if (shouldAutoStart === "true") {
      localStorage.removeItem("autoStartLogMonitor");
      setTimeout(() => toggleStream(), 500);
    } else {
      syncStreamState();
    }
    return () => {
      if (unlistenRef.current) {
        try { unlistenRef.current(); } catch (e: unknown) { console.error("取消监听失败:", e); }
        unlistenRef.current = null;
      }
    };
  }, []);

  async function syncStreamState() {
    try {
      const isBackendRunning = await loggerApi.isStreamRunning();
      const wasStreaming = localStorage.getItem("logStreaming") === "true";

      if (wasStreaming && !isBackendRunning) {
        setTimeout(async () => {
          try {
            await loggerApi.startStream();
            const unlisten = await events.onLogUpdate((newLogs) => setLogs((prev) => [...prev, ...newLogs]));
            unlistenRef.current = unlisten;
            setStreaming(true);
          } catch {
            localStorage.setItem("logStreaming", "false");
            setStreaming(false);
          }
        }, 100);
      } else if (!wasStreaming && isBackendRunning) {
        setTimeout(async () => {
          try {
            const unlisten = await events.onLogUpdate((newLogs) => setLogs((prev) => [...prev, ...newLogs]));
            unlistenRef.current = unlisten;
            setStreaming(true);
            localStorage.setItem("logStreaming", "true");
          } catch { console.error("设置监听失败"); }
        }, 100);
      } else if (wasStreaming && isBackendRunning) {
        setTimeout(async () => {
          try {
            const unlisten = await events.onLogUpdate((newLogs) => setLogs((prev) => [...prev, ...newLogs]));
            unlistenRef.current = unlisten;
            setStreaming(true);
          } catch {
            setStreaming(false);
            localStorage.setItem("logStreaming", "false");
          }
        }, 100);
      }
    } catch {
      setStreaming(false);
      localStorage.setItem("logStreaming", "false");
    }
  }

  const filteredLogs = useMemo(() => {
    let filtered = logs;
    
    if (searchQuery.trim()) {
      if (useRegex) {
        try {
          const regex = new RegExp(searchQuery, "i");
          filtered = filtered.filter((log) => regex.test(log));
          setRegexError(null);
        } catch (error) {
          setRegexError(error instanceof Error ? error.message : t("logs.invalidRegex"));
          return [];
        }
      } else {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter((log) => log.toLowerCase().includes(query));
      }
    } else {
      setRegexError(null);
    }

    if (logLevel !== "all") {
      filtered = filtered.filter((log) => LOG_LEVEL_PATTERNS[logLevel].test(log));
    }

    return filtered;
  }, [logs, searchQuery, useRegex, logLevel, t]);

  const statistics = useMemo(() => calculateStatistics(filteredLogs), [filteredLogs]);

  function calculateStatistics(logsToAnalyze: string[]): LogStatistics {
    const total = logsToAnalyze.length;
    let debug = 0, info = 0, warn = 0, error = 0;

    logsToAnalyze.forEach((log) => {
      if (LOG_LEVEL_PATTERNS.debug.test(log)) debug++;
      else if (LOG_LEVEL_PATTERNS.info.test(log)) info++;
      else if (LOG_LEVEL_PATTERNS.warn.test(log)) warn++;
      else if (LOG_LEVEL_PATTERNS.error.test(log)) error++;
    });

    return {
      total, debug, info, warn, error,
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
      setLogs(result.logs || []);
    } catch { toast.showError(t("logs.loadLogsFailed")); }
    finally { setLoading(false); }
  }

  function handleSearchChange(value: string) { setSearchQuery(value); }
  function handleLevelChange(level: "all" | "debug" | "info" | "warn" | "error") { setLogLevel(level); }
  function toggleRegexMode() { setUseRegex(prev => !prev); }
  function clearSearch() { setSearchQuery(""); }

  async function exportLogs() {
    try {
      const content = filteredLogs.join("\n");
      const blob = new Blob([content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
      let filename = `logs-${timestamp}`;
      if (logLevel !== "all") filename += `-${logLevel}`;
      if (searchQuery) filename += "-filtered";
      filename += ".txt";

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.showSuccess(t("logs.logsExported", { count: filteredLogs.length }));
    } catch { toast.showError(t("logs.exportFailed")); }
  }

  async function toggleStream() {
    if (streaming) {
      try {
        await loggerApi.stopStream();
        setStreaming(false);
        localStorage.setItem("logStreaming", "false");
        if (unlistenRef.current) {
          try { unlistenRef.current(); } catch (e) { console.error("取消监听失败:", e); }
          unlistenRef.current = null;
        }
        toast.showInfo(t("logs.stopMonitoring"));
      } catch { toast.showError(t("logs.stopMonitoringFailed")); }
    } else {
      try {
        setLoading(true);
        await loggerApi.startStream();
        setStreaming(true);
        localStorage.setItem("logStreaming", "true");

        const unlisten = await events.onLogUpdate((newLogs) => {
          setLogs((prev) => [...prev, ...newLogs]);
        });

        unlistenRef.current = unlisten;
        
        // 开始监控时滚动到底部
        setTimeout(() => {
          virtuosoRef.current?.scrollToIndex({
            index: logs.length - 1,
            align: 'end',
            behavior: 'smooth'
          });
        }, 100);
        
        toast.showSuccess(t("logs.startMonitoring"));
      } catch (error) {
        let errorMessage = t("logs.startMonitoringFailed");
        if (typeof error === "string") errorMessage = error;
        else if (error instanceof Error) errorMessage = error.message;
        else if (error && typeof error === "object" && "message" in error) errorMessage = String(error.message);
        toast.showError(`${t("logs.startMonitoringFailed")}: ${errorMessage}`);
        setStreaming(false);
        localStorage.setItem("logStreaming", "false");
      } finally { setLoading(false); }
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
              <button onClick={clearSearch} className="p-1 text-gray-400 dark:text-dark-text-muted hover:text-gray-600 dark:hover:text-dark-text-primary transition-colors">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

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
              <button onClick={() => handleLevelChange("all")}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  logLevel === "all" ? "bg-gray-800 dark:bg-dark-text-primary text-white"
                  : "bg-gray-100 dark:bg-dark-bg-hover text-gray-600 dark:text-dark-text-secondary hover:bg-gray-200 dark:hover:bg-dark-bg-active"
                }`}>
                {t("logs.all")}
              </button>
              <button onClick={() => handleLevelChange("info")}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  logLevel === "info" ? "bg-blue-600 text-white"
                  : "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50"
                }`}>
                INFO
              </button>
              <button onClick={() => handleLevelChange("debug")}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  logLevel === "debug" ? "bg-gray-600 text-white"
                  : "bg-gray-50 dark:bg-dark-bg-hover text-gray-600 dark:text-dark-text-secondary hover:bg-gray-100 dark:hover:bg-dark-bg-active"
                }`}>
                DEBUG
              </button>
              <button onClick={() => handleLevelChange("warn")}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  logLevel === "warn" ? "bg-amber-600 text-white"
                  : "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/50"
                }`}>
                WARN
              </button>
              <button onClick={() => handleLevelChange("error")}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  logLevel === "error" ? "bg-red-600 text-white"
                  : "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50"
                }`}>
                ERROR
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button onClick={() => setShowStatistics(!showStatistics)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium ${
                showStatistics ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-gray-100 dark:bg-dark-bg-hover text-gray-700 dark:text-dark-text-primary hover:bg-gray-200 dark:hover:bg-dark-bg-active"
              }`}>
              <BarChart3 className="w-4 h-4" />
              {t("logs.statistics")}
            </button>
            <button onClick={exportLogs} disabled={filteredLogs.length === 0}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-dark-bg-hover hover:bg-gray-200 dark:hover:bg-dark-bg-active disabled:bg-gray-50 dark:disabled:bg-dark-bg-sidebar disabled:cursor-not-allowed rounded-lg transition-colors text-sm font-medium text-gray-700 dark:text-dark-text-primary"
              title={t("logs.export")}>
              <Download className="w-4 h-4" />
              {t("logs.export")}
            </button>
            <button onClick={toggleStream} disabled={loading}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium text-white ${
                streaming ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"
              } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}>
              {streaming ? (<><Square className="w-4 h-4" />{t("logs.stop")}</>) : (<><Play className="w-4 h-4" />{t("logs.start")}</>)}
            </button>
          </div>
        </div>

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
                {(["info", "debug", "warn", "error"] as const).map((level) => {
                  const colors: Record<string, string> = {
                    info: "bg-blue-600 text-blue-600",
                    debug: "bg-gray-600 text-gray-600",
                    warn: "bg-amber-600 text-amber-600",
                    error: "bg-red-600 text-red-600",
                  };
                  const count = statistics[level];
                  const percent = statistics[`${level}Percent` as keyof LogStatistics] as number;
                  return (
                    <div key={level}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className={`${colors[level].split(" ")[1]} dark:${colors[level].split(" ")[1]} font-medium`}>{level.toUpperCase()}</span>
                        <span className="text-gray-600 dark:text-dark-text-secondary">{count} {t("dashboard.entries")} ({percent.toFixed(1)}%)</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-dark-bg-hover rounded-full h-2">
                        <div className={`${colors[level].split(" ")[0]} h-2 rounded-full transition-all duration-300`} style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 日志内容 - 使用虚拟滚动和 LogItem 组件 */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-dark-bg-sidebar text-gray-500 dark:text-dark-text-muted">
          {t("config.loading")}
        </div>
      ) : filteredLogs.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={searchQuery ? t("logs.noMatchingLogs") : t("logs.noLogs")}
          description={searchQuery ? t("logs.tryDifferentKeywords") : t("logs.startNanobotForLogs")}
        />
      ) : (
        <div className="flex-1 overflow-hidden">
          <Virtuoso
            ref={virtuosoRef}
            style={{ height: '100%' }}
            data={filteredLogs}
            itemContent={(_index, log) => <LogItem log={log} />}
            followOutput={streaming ? 'smooth' : false}
          />
        </div>
      )}

      {/* 状态栏 */}
      <div className="bg-white dark:bg-dark-bg-card border-t border-gray-200 dark:border-dark-border-subtle px-4 py-2 flex items-center justify-between text-sm text-gray-500 dark:text-dark-text-muted transition-colors duration-200">
        <span>{searchQuery ? t("logs.displayLogs", { filtered: filteredLogs.length, total: logs.length }) : t("logs.totalLogs", { total: logs.length })}</span>
        <span>{streaming ? (<span className="text-green-600 dark:text-green-400">● {t("logs.realtimeMonitoring")}</span>) : (<span className="text-amber-600 dark:text-amber-400">● {t("logs.paused")}</span>)}</span>
      </div>
    </div>
  );
}
