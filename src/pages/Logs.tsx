import { useEffect, useState, useRef } from "react";
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

export default function Logs() {
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

            // 保存取消监听函数
            (window as any).__logUnlisten = unlisten;
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
      const unlisten = (window as any).__logUnlisten;
      if (unlisten) {
        unlisten().catch((e: unknown) => console.error("取消监听失败:", e));
        (window as any).__logUnlisten = null;
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
          setRegexError("无效的正则表达式");
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
      const levelPatterns = {
        debug: /\|\s*DEBUG\s*\|/i,
        info: /\|\s*INFO\s*\|/i,
        warn: /\|\s*WARNING\s*\|/i,
        error: /\|\s*ERROR\s*\|/i,
      };
      filtered = filtered.filter((log) => levelPatterns[logLevel].test(log));
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
      // 匹配格式: "YYYY-MM-DD HH:MM:SS.mmm | INFO     | module:function:line - message"
      // 或者其他包含日志级别的格式
      if (/\|\s*DEBUG\s*\|/i.test(log)) debug++;
      else if (/\|\s*INFO\s*\|/i.test(log)) info++;
      else if (/\|\s*WARNING\s*\|/i.test(log) || /\|\s*WARN\s*\|/i.test(log)) warn++;
      else if (/\|\s*ERROR\s*\|/i.test(log)) error++;
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
      toast.showError("加载日志失败");
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
          setRegexError(error instanceof Error ? error.message : "无效的正则表达式");
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
      const levelPatterns = {
        debug: /\|\s*DEBUG\s*\|/i,
        info: /\|\s*INFO\s*\|/i,
        warn: /\|\s*WARNING\s*\|/i,
        error: /\|\s*ERROR\s*\|/i,
      };
      filtered = filtered.filter((log) => levelPatterns[level].test(log));
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

      toast.showSuccess(`已导出 ${filteredLogs.length} 条日志`);
    } catch (error) {
      toast.showError("导出日志失败");
    }
  }

  async function toggleStream() {
    if (streaming) {
      try {
        await loggerApi.stopStream();
        setStreaming(false);
        localStorage.setItem("logStreaming", "false");
        // 清理监听器
        const unlisten = (window as any).__logUnlisten;
        if (unlisten) {
          try {
            await unlisten();
          } catch (e) {
            console.error("取消监听失败:", e);
          }
          (window as any).__logUnlisten = null;
        }
        toast.showInfo("日志监控已停止");
      } catch (error) {
        console.error("停止监控失败:", error);
        toast.showError("停止监控失败");
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

        // 保存取消监听函数
        (window as any).__logUnlisten = unlisten;

        toast.showSuccess("日志监控已启动");
      } catch (error) {
        console.error("启动监控失败:", error);
        // Tauri 错误通常是字符串
        let errorMessage = "启动监控失败";
        if (typeof error === "string") {
          errorMessage = error;
        } else if (error instanceof Error) {
          errorMessage = error.message;
        } else if (error && typeof error === "object" && "message" in error) {
          errorMessage = String(error.message);
        }
        toast.showError(`启动监控失败: ${errorMessage}`);
        setStreaming(false);
        localStorage.setItem("logStreaming", "false");
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* 头部 */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-900 mb-4">日志监控</h1>

        {/* 搜索框 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={useRegex ? "使用正则表达式搜索..." : "搜索日志内容..."}
            className={`w-full pl-10 pr-24 py-2 bg-gray-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${
              regexError ? "border-red-300" : "border-gray-200"
            }`}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <button
              onClick={toggleRegexMode}
              className={`flex items-center gap-1 px-2 py-1 rounded-md transition-colors text-xs font-medium ${
                useRegex
                  ? "bg-purple-100 text-purple-700 hover:bg-purple-200"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
              title={useRegex ? "切换到普通搜索" : "切换到正则表达式搜索"}
            >
              <Regex className="w-3.5 h-3.5" />
              {useRegex ? "正则" : "普通"}
            </button>
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* 正则表达式错误提示 */}
        {regexError && (
          <div className="mt-2 text-sm text-red-600 flex items-center gap-2">
            <span>⚠️ {regexError}</span>
          </div>
        )}

        {/* 日志级别过滤和操作按钮 */}
        <div className="flex items-center gap-3 mt-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">级别:</span>
            <div className="flex gap-1">
              <button
                onClick={() => handleLevelChange("all")}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  logLevel === "all"
                    ? "bg-gray-800 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                全部
              </button>
              <button
                onClick={() => handleLevelChange("info")}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  logLevel === "info"
                    ? "bg-blue-600 text-white"
                    : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                }`}
              >
                INFO
              </button>
              <button
                onClick={() => handleLevelChange("debug")}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  logLevel === "debug"
                    ? "bg-gray-600 text-white"
                    : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                }`}
              >
                DEBUG
              </button>
              <button
                onClick={() => handleLevelChange("warn")}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  logLevel === "warn"
                    ? "bg-amber-600 text-white"
                    : "bg-amber-50 text-amber-600 hover:bg-amber-100"
                }`}
              >
                WARN
              </button>
              <button
                onClick={() => handleLevelChange("error")}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  logLevel === "error"
                    ? "bg-red-600 text-white"
                    : "bg-red-50 text-red-600 hover:bg-red-100"
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
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              统计
            </button>
            <button
              onClick={exportLogs}
              disabled={filteredLogs.length === 0}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:cursor-not-allowed rounded-lg transition-colors text-sm font-medium text-gray-700"
              title="导出日志"
            >
              <Download className="w-4 h-4" />
              导出
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
                  停止
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  开始
                </>
              )}
            </button>
          </div>
        </div>

        {/* 过滤结果提示 */}
        {(searchQuery || logLevel !== "all") && (
          <div className="mt-2 text-sm text-gray-500">
            找到 {filteredLogs.length} 条匹配的日志（共 {logs.length} 条）
          </div>
        )}
      </div>

      {/* 统计面板 */}
      {showStatistics && (
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="max-w-6xl">
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900">日志统计</h3>
                <span className="text-xs text-gray-500">共 {statistics.total} 条日志</span>
              </div>

              <div className="space-y-3">
                {/* INFO */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-blue-600 font-medium">INFO</span>
                    <span className="text-gray-600">
                      {statistics.info} 条 ({statistics.infoPercent.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${statistics.infoPercent}%` }}
                    />
                  </div>
                </div>

                {/* DEBUG */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-600 font-medium">DEBUG</span>
                    <span className="text-gray-600">
                      {statistics.debug} 条 ({statistics.debugPercent.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gray-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${statistics.debugPercent}%` }}
                    />
                  </div>
                </div>

                {/* WARN */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-amber-600 font-medium">WARN</span>
                    <span className="text-gray-600">
                      {statistics.warn} 条 ({statistics.warnPercent.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-amber-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${statistics.warnPercent}%` }}
                    />
                  </div>
                </div>

                {/* ERROR */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-red-600 font-medium">ERROR</span>
                    <span className="text-gray-600">
                      {statistics.error} 条 ({statistics.errorPercent.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
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
        className="flex-1 overflow-y-auto bg-gray-50 p-4 font-mono text-sm scrollbar-thin"
      >
        {loading ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            加载中...
          </div>
        ) : filteredLogs.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title={searchQuery ? "没有匹配的日志" : "暂无日志"}
            description={
              searchQuery
                ? "尝试使用不同的关键词搜索"
                : "启动 nanobot 后，日志将在这里显示"
            }
          />
        ) : (
          <div className="space-y-1">
            {filteredLogs.map((log, index) => (
              <div
                key={index}
                className="hover:bg-white px-2 py-1 rounded text-gray-700 whitespace-pre-wrap break-words border border-transparent hover:border-gray-200"
              >
                {log}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 状态栏 */}
      <div className="bg-white border-t border-gray-200 px-4 py-2 flex items-center justify-between text-sm text-gray-500">
        <span>
          {searchQuery
            ? `显示 ${filteredLogs.length} / ${logs.length} 行日志`
            : `${logs.length} 行日志`}
        </span>
        <span>
          {streaming ? (
            <span className="text-green-600">● 实时监控中</span>
          ) : (
            <span className="text-amber-600">● 已暂停</span>
          )}
        </span>
      </div>
    </div>
  );
}
