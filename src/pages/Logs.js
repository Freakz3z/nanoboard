import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { loggerApi, events } from "../lib/tauri";
import { useToast } from "../contexts/ToastContext";
import { Play, Square, Search, X, Inbox, Download, BarChart3, Regex } from "lucide-react";
import EmptyState from "../components/EmptyState";
import { Virtuoso } from "react-virtuoso";
import { LogItem } from "../components/logs";
const LOG_LEVEL_PATTERNS = {
    debug: /\|\s*DEBUG\s*\|/i,
    info: /\|\s*INFO\s*\|/i,
    warn: /\|\s*WARNING\s*\|/i,
    error: /\|\s*ERROR\s*\|/i,
};
function getLogLevelColor(log) {
    if (LOG_LEVEL_PATTERNS.debug.test(log))
        return "text-gray-500 dark:text-gray-400";
    else if (LOG_LEVEL_PATTERNS.info.test(log))
        return "text-blue-600 dark:text-blue-400";
    else if (LOG_LEVEL_PATTERNS.warn.test(log))
        return "text-amber-600 dark:text-amber-400";
    else if (LOG_LEVEL_PATTERNS.error.test(log))
        return "text-red-600 dark:text-red-400";
    return "text-gray-700 dark:text-dark-text-secondary";
}
export default function Logs() {
    const { t } = useTranslation();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [streaming, setStreaming] = useState(() => localStorage.getItem("logStreaming") === "true");
    const [searchQuery, setSearchQuery] = useState("");
    const [useRegex, setUseRegex] = useState(false);
    const [regexError, setRegexError] = useState(null);
    const [logLevel, setLogLevel] = useState("all");
    const [showStatistics, setShowStatistics] = useState(false);
    const [_stats, _setStats] = useState({
        total: 0, debug: 0, info: 0, warn: 0, error: 0,
        debugPercent: 0, infoPercent: 0, warnPercent: 0, errorPercent: 0,
    });
    const unlistenRef = useRef(null);
    const toast = useToast();
    useEffect(() => {
        loadLogs();
        const shouldAutoStart = localStorage.getItem("autoStartLogMonitor");
        if (shouldAutoStart === "true") {
            localStorage.removeItem("autoStartLogMonitor");
            setTimeout(() => toggleStream(), 500);
        }
        else {
            syncStreamState();
        }
        return () => {
            if (unlistenRef.current) {
                try {
                    unlistenRef.current();
                }
                catch (e) {
                    console.error("取消监听失败:", e);
                }
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
                    }
                    catch {
                        localStorage.setItem("logStreaming", "false");
                        setStreaming(false);
                    }
                }, 100);
            }
            else if (!wasStreaming && isBackendRunning) {
                setTimeout(async () => {
                    try {
                        const unlisten = await events.onLogUpdate((newLogs) => setLogs((prev) => [...prev, ...newLogs]));
                        unlistenRef.current = unlisten;
                        setStreaming(true);
                        localStorage.setItem("logStreaming", "true");
                    }
                    catch {
                        console.error("设置监听失败");
                    }
                }, 100);
            }
            else if (wasStreaming && isBackendRunning) {
                setTimeout(async () => {
                    try {
                        const unlisten = await events.onLogUpdate((newLogs) => setLogs((prev) => [...prev, ...newLogs]));
                        unlistenRef.current = unlisten;
                        setStreaming(true);
                    }
                    catch {
                        setStreaming(false);
                        localStorage.setItem("logStreaming", "false");
                    }
                }, 100);
            }
        }
        catch {
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
                }
                catch (error) {
                    setRegexError(error instanceof Error ? error.message : t("logs.invalidRegex"));
                    return [];
                }
            }
            else {
                const query = searchQuery.toLowerCase();
                filtered = filtered.filter((log) => log.toLowerCase().includes(query));
            }
        }
        else {
            setRegexError(null);
        }
        if (logLevel !== "all") {
            filtered = filtered.filter((log) => LOG_LEVEL_PATTERNS[logLevel].test(log));
        }
        return filtered;
    }, [logs, searchQuery, useRegex, logLevel, t]);
    const statistics = useMemo(() => calculateStatistics(filteredLogs), [filteredLogs]);
    function calculateStatistics(logsToAnalyze) {
        const total = logsToAnalyze.length;
        let debug = 0, info = 0, warn = 0, error = 0;
        logsToAnalyze.forEach((log) => {
            if (LOG_LEVEL_PATTERNS.debug.test(log))
                debug++;
            else if (LOG_LEVEL_PATTERNS.info.test(log))
                info++;
            else if (LOG_LEVEL_PATTERNS.warn.test(log))
                warn++;
            else if (LOG_LEVEL_PATTERNS.error.test(log))
                error++;
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
        }
        catch {
            toast.showError(t("logs.loadLogsFailed"));
        }
        finally {
            setLoading(false);
        }
    }
    function handleSearchChange(value) { setSearchQuery(value); }
    function handleLevelChange(level) { setLogLevel(level); }
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
            if (logLevel !== "all")
                filename += `-${logLevel}`;
            if (searchQuery)
                filename += "-filtered";
            filename += ".txt";
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast.showSuccess(t("logs.logsExported", { count: filteredLogs.length }));
        }
        catch {
            toast.showError(t("logs.exportFailed"));
        }
    }
    async function toggleStream() {
        if (streaming) {
            try {
                await loggerApi.stopStream();
                setStreaming(false);
                localStorage.setItem("logStreaming", "false");
                if (unlistenRef.current) {
                    try {
                        unlistenRef.current();
                    }
                    catch (e) {
                        console.error("取消监听失败:", e);
                    }
                    unlistenRef.current = null;
                }
                toast.showInfo(t("logs.stopMonitoring"));
            }
            catch {
                toast.showError(t("logs.stopMonitoringFailed"));
            }
        }
        else {
            try {
                setLoading(true);
                await loggerApi.startStream();
                setStreaming(true);
                localStorage.setItem("logStreaming", "true");
                const unlisten = await events.onLogUpdate((newLogs) => {
                    setLogs((prev) => [...prev, ...newLogs]);
                });
                unlistenRef.current = unlisten;
                toast.showSuccess(t("logs.startMonitoring"));
            }
            catch (error) {
                let errorMessage = t("logs.startMonitoringFailed");
                if (typeof error === "string")
                    errorMessage = error;
                else if (error instanceof Error)
                    errorMessage = error.message;
                else if (error && typeof error === "object" && "message" in error)
                    errorMessage = String(error.message);
                toast.showError(`${t("logs.startMonitoringFailed")}: ${errorMessage}`);
                setStreaming(false);
                localStorage.setItem("logStreaming", "false");
            }
            finally {
                setLoading(false);
            }
        }
    }
    return (_jsxs("div", { className: "flex-1 overflow-hidden flex flex-col bg-white dark:bg-dark-bg-base transition-colors duration-200", children: [_jsxs("div", { className: "bg-white dark:bg-dark-bg-card border-b border-gray-200 dark:border-dark-border-subtle px-6 py-4 transition-colors duration-200", children: [_jsx("h1", { className: "text-xl font-semibold text-gray-900 dark:text-dark-text-primary mb-4", children: t("logs.title") }), _jsxs("div", { className: "relative", children: [_jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-dark-text-muted" }), _jsx("input", { type: "text", value: searchQuery, onChange: (e) => handleSearchChange(e.target.value), placeholder: useRegex ? t("logs.searchWithRegex") : t("logs.searchLogs"), className: `w-full pl-10 pr-24 py-2 bg-gray-50 dark:bg-dark-bg-sidebar border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900 dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-dark-text-muted transition-colors duration-200 ${regexError ? "border-red-300 dark:border-red-500/50" : "border-gray-200 dark:border-dark-border-subtle"}` }), _jsxs("div", { className: "absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1", children: [_jsxs("button", { onClick: toggleRegexMode, className: `flex items-center gap-1 px-2 py-1 rounded-md transition-colors text-xs font-medium ${useRegex
                                            ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-900/50"
                                            : "bg-gray-100 dark:bg-dark-bg-hover text-gray-600 dark:text-dark-text-secondary hover:bg-gray-200 dark:hover:bg-dark-bg-active"}`, title: t("logs.toggleSearchMode", { mode: useRegex ? t("logs.normalSearch") : t("logs.regexSearch") }), children: [_jsx(Regex, { className: "w-3.5 h-3.5" }), useRegex ? t("logs.regexSearch") : t("logs.normalSearch")] }), searchQuery && (_jsx("button", { onClick: clearSearch, className: "p-1 text-gray-400 dark:text-dark-text-muted hover:text-gray-600 dark:hover:text-dark-text-primary transition-colors", children: _jsx(X, { className: "w-4 h-4" }) }))] })] }), regexError && (_jsx("div", { className: "mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-2", children: _jsxs("span", { children: ["\u26A0\uFE0F ", regexError] }) })), _jsxs("div", { className: "flex items-center gap-3 mt-3 flex-wrap", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-sm text-gray-500 dark:text-dark-text-muted", children: t("logs.level") }), _jsxs("div", { className: "flex gap-1", children: [_jsx("button", { onClick: () => handleLevelChange("all"), className: `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${logLevel === "all" ? "bg-gray-800 dark:bg-dark-text-primary text-white"
                                                    : "bg-gray-100 dark:bg-dark-bg-hover text-gray-600 dark:text-dark-text-secondary hover:bg-gray-200 dark:hover:bg-dark-bg-active"}`, children: t("logs.all") }), _jsx("button", { onClick: () => handleLevelChange("info"), className: `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${logLevel === "info" ? "bg-blue-600 text-white"
                                                    : "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50"}`, children: "INFO" }), _jsx("button", { onClick: () => handleLevelChange("debug"), className: `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${logLevel === "debug" ? "bg-gray-600 text-white"
                                                    : "bg-gray-50 dark:bg-dark-bg-hover text-gray-600 dark:text-dark-text-secondary hover:bg-gray-100 dark:hover:bg-dark-bg-active"}`, children: "DEBUG" }), _jsx("button", { onClick: () => handleLevelChange("warn"), className: `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${logLevel === "warn" ? "bg-amber-600 text-white"
                                                    : "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/50"}`, children: "WARN" }), _jsx("button", { onClick: () => handleLevelChange("error"), className: `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${logLevel === "error" ? "bg-red-600 text-white"
                                                    : "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50"}`, children: "ERROR" })] })] }), _jsxs("div", { className: "flex items-center gap-2 ml-auto", children: [_jsxs("button", { onClick: () => setShowStatistics(!showStatistics), className: `flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium ${showStatistics ? "bg-blue-600 text-white hover:bg-blue-700"
                                            : "bg-gray-100 dark:bg-dark-bg-hover text-gray-700 dark:text-dark-text-primary hover:bg-gray-200 dark:hover:bg-dark-bg-active"}`, children: [_jsx(BarChart3, { className: "w-4 h-4" }), t("logs.statistics")] }), _jsxs("button", { onClick: exportLogs, disabled: filteredLogs.length === 0, className: "flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-dark-bg-hover hover:bg-gray-200 dark:hover:bg-dark-bg-active disabled:bg-gray-50 dark:disabled:bg-dark-bg-sidebar disabled:cursor-not-allowed rounded-lg transition-colors text-sm font-medium text-gray-700 dark:text-dark-text-primary", title: t("logs.export"), children: [_jsx(Download, { className: "w-4 h-4" }), t("logs.export")] }), _jsx("button", { onClick: toggleStream, disabled: loading, className: `flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium text-white ${streaming ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"} ${loading ? "opacity-50 cursor-not-allowed" : ""}`, children: streaming ? (_jsxs(_Fragment, { children: [_jsx(Square, { className: "w-4 h-4" }), t("logs.stop")] })) : (_jsxs(_Fragment, { children: [_jsx(Play, { className: "w-4 h-4" }), t("logs.start")] })) })] })] }), (searchQuery || logLevel !== "all") && (_jsx("div", { className: "mt-2 text-sm text-gray-500 dark:text-dark-text-muted", children: t("logs.findMatches", { count: filteredLogs.length, total: logs.length }) }))] }), showStatistics && (_jsx("div", { className: "bg-white dark:bg-dark-bg-card border-b border-gray-200 dark:border-dark-border-subtle px-6 py-4 transition-colors duration-200", children: _jsx("div", { className: "max-w-6xl", children: _jsxs("div", { className: "p-4 bg-gray-50 dark:bg-dark-bg-sidebar rounded-lg border border-gray-200 dark:border-dark-border-subtle transition-colors duration-200", children: [_jsxs("div", { className: "flex items-center justify-between mb-3", children: [_jsx("h3", { className: "text-sm font-semibold text-gray-900 dark:text-dark-text-primary", children: t("logs.logStatistics") }), _jsx("span", { className: "text-xs text-gray-500 dark:text-dark-text-muted", children: t("logs.totalLogsCount", { total: statistics.total }) })] }), _jsx("div", { className: "space-y-3", children: ["info", "debug", "warn", "error"].map((level) => {
                                    const colors = {
                                        info: "bg-blue-600 text-blue-600",
                                        debug: "bg-gray-600 text-gray-600",
                                        warn: "bg-amber-600 text-amber-600",
                                        error: "bg-red-600 text-red-600",
                                    };
                                    const count = statistics[level];
                                    const percent = statistics[`${level}Percent`];
                                    return (_jsxs("div", { children: [_jsxs("div", { className: "flex items-center justify-between text-xs mb-1", children: [_jsx("span", { className: `${colors[level].split(" ")[1]} dark:${colors[level].split(" ")[1]} font-medium`, children: level.toUpperCase() }), _jsxs("span", { className: "text-gray-600 dark:text-dark-text-secondary", children: [count, " ", t("dashboard.entries"), " (", percent.toFixed(1), "%)"] })] }), _jsx("div", { className: "w-full bg-gray-200 dark:bg-dark-bg-hover rounded-full h-2", children: _jsx("div", { className: `${colors[level].split(" ")[0]} h-2 rounded-full transition-all duration-300`, style: { width: `${percent}%` } }) })] }, level));
                                }) })] }) }) })), loading ? (_jsx("div", { className: "flex-1 flex items-center justify-center bg-gray-50 dark:bg-dark-bg-sidebar text-gray-500 dark:text-dark-text-muted", children: t("config.loading") })) : filteredLogs.length === 0 ? (_jsx(EmptyState, { icon: Inbox, title: searchQuery ? t("logs.noMatchingLogs") : t("logs.noLogs"), description: searchQuery ? t("logs.tryDifferentKeywords") : t("logs.startNanobotForLogs") })) : (_jsx("div", { className: "flex-1 overflow-hidden", children: _jsx(Virtuoso, { style: { height: '100%' }, data: filteredLogs, itemContent: (_index, log) => _jsx(LogItem, { log: log }), followOutput: "smooth" }) })), _jsxs("div", { className: "bg-white dark:bg-dark-bg-card border-t border-gray-200 dark:border-dark-border-subtle px-4 py-2 flex items-center justify-between text-sm text-gray-500 dark:text-dark-text-muted transition-colors duration-200", children: [_jsx("span", { children: searchQuery ? t("logs.displayLogs", { filtered: filteredLogs.length, total: logs.length }) : t("logs.totalLogs", { total: logs.length }) }), _jsx("span", { children: streaming ? (_jsxs("span", { className: "text-green-600 dark:text-green-400", children: ["\u25CF ", t("logs.realtimeMonitoring")] })) : (_jsxs("span", { className: "text-amber-600 dark:text-amber-400", children: ["\u25CF ", t("logs.paused")] })) })] })] }));
}
