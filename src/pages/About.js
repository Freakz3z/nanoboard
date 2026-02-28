import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { processApi } from "../lib/tauri";
import { openUrl } from "@tauri-apps/plugin-opener";
import { Github, Monitor, Cpu, FileText, Bot, Download, Stethoscope, CheckCircle, AlertCircle, XCircle, Sparkles, Settings, Save, RefreshCw, } from "lucide-react";
// 自定义路径存储 key
const CUSTOM_PATHS_KEY = "nanoboard_custom_paths";
// 应用信息
const APP_INFO = {
    name: "nanoboard",
    version: "0.2.6",
    description: "一个极轻量化 nanobot Tauri 管理助手",
    descriptionEn: "An Ultra-lightweight nanobot Tauri Management Assistant",
    github: "https://github.com/Freakz3z/nanoboard",
    releasesApi: "https://api.github.com/repos/Freakz3z/nanoboard/releases/latest",
};
// 加载自定义路径配置
function loadCustomPaths() {
    try {
        const stored = localStorage.getItem(CUSTOM_PATHS_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    }
    catch (error) {
        console.error("Failed to load custom paths:", error);
    }
    return { pythonPath: "", nanobotPath: "" };
}
// 保存自定义路径配置
function saveCustomPaths(paths) {
    try {
        localStorage.setItem(CUSTOM_PATHS_KEY, JSON.stringify(paths));
    }
    catch (error) {
        console.error("Failed to save custom paths:", error);
    }
}
export default function About() {
    const { t } = useTranslation();
    const [systemInfo, setSystemInfo] = useState(null);
    const [diagnosing, setDiagnosing] = useState(false);
    const [diagnosisResult, setDiagnosticResult] = useState(null);
    const [showDiagnosis, setShowDiagnosis] = useState(false);
    const [updateStatus, setUpdateStatus] = useState("checking");
    const [latestVersion, setLatestVersion] = useState(null);
    const [customPaths, setCustomPaths] = useState(loadCustomPaths);
    const [pathsSaved, setPathsSaved] = useState(false);
    useEffect(() => {
        loadSystemInfo();
        checkForUpdates();
    }, []);
    // 保存自定义路径
    async function handleSavePaths() {
        try {
            // 保存到后端
            await processApi.setCustomPaths(customPaths.pythonPath || undefined, customPaths.nanobotPath || undefined);
            // 同时保存到 localStorage 作为备份
            saveCustomPaths(customPaths);
            setPathsSaved(true);
            setTimeout(() => setPathsSaved(false), 2000);
            // 重新加载系统信息以应用新路径
            loadSystemInfo();
        }
        catch (error) {
            console.error("Failed to save custom paths:", error);
        }
    }
    // 重置为自动检测
    async function handleResetPaths() {
        try {
            await processApi.setCustomPaths(undefined, undefined);
            setCustomPaths({ pythonPath: "", nanobotPath: "" });
            saveCustomPaths({ pythonPath: "", nanobotPath: "" });
            loadSystemInfo();
        }
        catch (error) {
            console.error("Failed to reset custom paths:", error);
        }
    }
    async function checkForUpdates() {
        try {
            setUpdateStatus("checking");
            const response = await fetch(APP_INFO.releasesApi, {
                headers: {
                    "Accept": "application/vnd.github.v3+json",
                },
            });
            if (!response.ok) {
                throw new Error("Failed to fetch releases");
            }
            const data = await response.json();
            const latest = data.tag_name?.replace(/^v/, "") || data.name?.replace(/^v/, "");
            if (latest && latest !== APP_INFO.version) {
                setLatestVersion(latest);
                setUpdateStatus("available");
            }
            else {
                setUpdateStatus("latest");
            }
        }
        catch (error) {
            console.error("Failed to check for updates:", error);
            setUpdateStatus("error");
        }
    }
    async function loadSystemInfo() {
        try {
            const [sysInfo, versionInfo, pathInfo, pythonPathInfo, customPathsInfo] = await Promise.all([
                processApi.getSystemInfo(),
                processApi.getVersion().catch(() => null),
                processApi.getNanobotPath().catch(() => null),
                processApi.getPythonPath().catch(() => null),
                processApi.getCustomPaths().catch(() => null),
            ]);
            setSystemInfo({
                os: sysInfo?.os || "Unknown",
                osVersion: sysInfo?.os_version || "",
                arch: sysInfo?.arch || "Unknown",
                pythonVersion: sysInfo?.python_version || null,
                nanobotVersion: versionInfo?.version || null,
                nanobotPath: pathInfo?.path || null,
                pythonPath: pythonPathInfo?.path || null,
            });
            // 如果后端有保存的自定义路径，更新本地状态
            if (customPathsInfo) {
                setCustomPaths({
                    pythonPath: customPathsInfo.pythonPath || "",
                    nanobotPath: customPathsInfo.nanobotPath || "",
                });
            }
        }
        catch (error) {
            console.error("Failed to load system info:", error);
        }
    }
    async function runDiagnosis() {
        setDiagnosing(true);
        try {
            const result = await processApi.diagnose();
            setDiagnosticResult(result);
            setShowDiagnosis(true);
        }
        catch (error) {
            setDiagnosticResult({
                overall: "failed",
                checks: [
                    {
                        key: "diagnosis",
                        name: t("dashboard.diagnosis"),
                        status: "error",
                        message: t("dashboard.diagnosisFailed") + error.message,
                        message_key: "failed",
                        has_issue: true,
                    },
                ],
            });
            setShowDiagnosis(true);
        }
        finally {
            setDiagnosing(false);
        }
    }
    return (_jsx("div", { className: "flex-1 overflow-y-auto p-8 scrollbar-thin bg-white dark:bg-dark-bg-base transition-colors duration-200", children: _jsxs("div", { className: "max-w-4xl mx-auto space-y-6", children: [_jsx("div", { className: "p-6 bg-white dark:bg-dark-bg-card rounded-xl border border-gray-200 dark:border-dark-border-subtle shadow-sm", children: _jsx("div", { className: "flex items-center gap-4", children: _jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("h2", { className: "text-xl font-bold text-gray-900 dark:text-dark-text-primary", children: APP_INFO.name }), _jsxs("span", { className: "text-sm text-gray-500 dark:text-dark-text-muted", children: ["v", APP_INFO.version] }), updateStatus === "available" && latestVersion && (_jsxs("button", { onClick: () => openUrl(`${APP_INFO.github}/releases/latest`), className: "flex items-center gap-1.5 px-2 py-0.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-medium rounded-full hover:from-purple-600 hover:to-pink-600 transition-all cursor-pointer animate-pulse", children: [_jsx(Sparkles, { className: "w-3 h-3" }), t("about.newVersionAvailable"), " (v", latestVersion, ")"] })), updateStatus === "latest" && (_jsxs("span", { className: "flex items-center gap-1.5 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded-full", children: [_jsx(CheckCircle, { className: "w-3 h-3" }), t("about.latestVersion")] })), _jsx("button", { onClick: () => openUrl(APP_INFO.github), className: "p-2 bg-gray-100 dark:bg-dark-bg-sidebar hover:bg-gray-200 dark:hover:bg-dark-bg-hover rounded-full transition-colors cursor-pointer", title: "GitHub", children: _jsx(Github, { className: "w-4 h-4 text-gray-600 dark:text-dark-text-secondary" }) })] }), _jsxs("p", { className: "text-sm text-gray-600 dark:text-dark-text-secondary mt-2", children: [APP_INFO.description, "\uFF5C", APP_INFO.descriptionEn] })] }) }) }), _jsxs("div", { className: "p-6 bg-white dark:bg-dark-bg-card rounded-xl border border-gray-200 dark:border-dark-border-subtle shadow-sm", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx("h2", { className: "text-lg font-semibold text-gray-900 dark:text-dark-text-primary", children: t("about.systemInfo") }), _jsxs("div", { className: "flex items-center gap-2", children: [systemInfo && !systemInfo.nanobotVersion && (_jsxs(_Fragment, { children: [_jsxs("button", { onClick: async () => {
                                                        try {
                                                            const result = await processApi.downloadWithUv();
                                                            if (result.status === "success") {
                                                                await processApi.onboard();
                                                                loadSystemInfo();
                                                            }
                                                        }
                                                        catch (error) {
                                                            console.error("Installation failed:", error);
                                                        }
                                                    }, className: "flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium", children: [_jsx(Download, { className: "w-4 h-4" }), t("dashboard.downloadWithUv")] }), _jsxs("button", { onClick: async () => {
                                                        try {
                                                            const result = await processApi.download();
                                                            if (result.status === "success") {
                                                                await processApi.onboard();
                                                                loadSystemInfo();
                                                            }
                                                        }
                                                        catch (error) {
                                                            console.error("Installation failed:", error);
                                                        }
                                                    }, className: "flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium", children: [_jsx(Download, { className: "w-4 h-4" }), t("dashboard.downloadWithPip")] })] })), _jsxs("button", { onClick: runDiagnosis, disabled: diagnosing, className: "flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium", children: [_jsx(Stethoscope, { className: "w-4 h-4" }), diagnosing ? t("dashboard.diagnosing") : t("dashboard.diagnosis")] })] })] }), showDiagnosis && diagnosisResult && (_jsx(DiagnosticResultPanel, { diagnosisResult: diagnosisResult, onClose: () => setShowDiagnosis(false) })), systemInfo && (_jsxs("div", { className: "space-y-3", children: [_jsx(InfoRow, { icon: Monitor, label: t("about.os"), value: systemInfo.osVersion ? `${systemInfo.os} ${systemInfo.osVersion}` : systemInfo.os }), _jsx(InfoRow, { icon: Cpu, label: t("about.arch"), value: systemInfo.arch }), _jsx(InfoRow, { icon: Bot, label: t("about.nanobotVersion"), value: systemInfo.nanobotVersion || t("dashboard.notInstalled"), status: systemInfo.nanobotVersion ? "ok" : "warning" }), _jsx(InfoRow, { icon: FileText, label: t("dashboard.nanobotLocation"), value: systemInfo.nanobotPath || t("dashboard.notInstalled"), status: systemInfo.nanobotPath ? "ok" : "warning", mono: true })] })), _jsxs("div", { className: "mt-6 pt-6 border-t border-gray-100 dark:border-dark-border-subtle", children: [_jsx("h3", { className: "text-sm font-medium text-gray-500 dark:text-dark-text-muted mb-3", children: t("about.paths") }), _jsx("div", { className: "space-y-2", children: [
                                        { label: t("dashboard.configFileLocation"), value: "~/.nanobot/config.json" },
                                        { label: t("dashboard.workspaceLocation"), value: "~/.nanobot/workspace" },
                                        { label: t("dashboard.logLocation"), value: "~/.nanobot/logs/nanobot.log" },
                                        { label: t("about.cronJobsLocation"), value: "~/.nanobot/cron/jobs.json" },
                                    ].map((item, index) => (_jsxs("div", { className: "flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-bg-sidebar rounded-lg", children: [_jsx("span", { className: "text-sm text-gray-600 dark:text-dark-text-secondary", children: item.label }), _jsx("code", { className: "text-xs font-mono text-gray-500 dark:text-dark-text-muted", children: item.value })] }, index))) })] }), _jsxs("div", { className: "mt-6 pt-6 border-t border-gray-100 dark:border-dark-border-subtle", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsxs("h3", { className: "text-sm font-medium text-gray-500 dark:text-dark-text-muted flex items-center gap-2", children: [_jsx(Settings, { className: "w-4 h-4" }), t("about.customPaths")] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("button", { onClick: handleResetPaths, className: "flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-dark-text-secondary hover:text-gray-900 dark:hover:text-dark-text-primary hover:bg-gray-100 dark:hover:bg-dark-bg-hover rounded-lg transition-colors", children: [_jsx(RefreshCw, { className: "w-4 h-4" }), t("about.autoDetect")] }), _jsxs("button", { onClick: handleSavePaths, className: `flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${pathsSaved
                                                        ? "bg-green-600 text-white"
                                                        : "bg-blue-600 text-white hover:bg-blue-700"}`, children: [_jsx(Save, { className: "w-4 h-4" }), pathsSaved ? t("about.saved") : t("about.savePaths")] })] })] }), _jsx("p", { className: "text-xs text-gray-500 dark:text-dark-text-muted mb-4", children: t("about.customPathsDesc") }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm text-gray-600 dark:text-dark-text-secondary mb-1.5", children: t("about.pythonPath") }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("input", { type: "text", value: customPaths.pythonPath, onChange: (e) => setCustomPaths({ ...customPaths, pythonPath: e.target.value }), placeholder: systemInfo?.pythonPath || t("about.pythonPathPlaceholder"), className: "flex-1 px-3 py-2 bg-gray-50 dark:bg-dark-bg-sidebar border border-gray-200 dark:border-dark-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900 dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-dark-text-muted font-mono" }), systemInfo?.pythonPath && !customPaths.pythonPath && (_jsxs("span", { className: "text-xs text-gray-400 dark:text-dark-text-muted whitespace-nowrap", children: [t("about.detected"), ": ", systemInfo.pythonPath] }))] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm text-gray-600 dark:text-dark-text-secondary mb-1.5", children: t("about.nanobotPath") }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("input", { type: "text", value: customPaths.nanobotPath, onChange: (e) => setCustomPaths({ ...customPaths, nanobotPath: e.target.value }), placeholder: systemInfo?.nanobotPath || t("about.nanobotPathPlaceholder"), className: "flex-1 px-3 py-2 bg-gray-50 dark:bg-dark-bg-sidebar border border-gray-200 dark:border-dark-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900 dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-dark-text-muted font-mono" }), systemInfo?.nanobotPath && !customPaths.nanobotPath && (_jsxs("span", { className: "text-xs text-gray-400 dark:text-dark-text-muted whitespace-nowrap", children: [t("about.detected"), ": ", systemInfo.nanobotPath] }))] })] })] })] })] })] }) }));
}
function InfoRow({ icon: Icon, label, value, status = "ok", mono = false, }) {
    const statusColors = {
        ok: "text-green-600 dark:text-green-400",
        warning: "text-amber-600 dark:text-amber-400",
        error: "text-red-600 dark:text-red-400",
    };
    const StatusIcon = {
        ok: CheckCircle,
        warning: AlertCircle,
        error: XCircle,
    }[status];
    return (_jsxs("div", { className: "flex items-center gap-3 p-3 bg-gray-50 dark:bg-dark-bg-sidebar rounded-lg", children: [_jsx("div", { className: "p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg", children: _jsx(Icon, { className: "w-4 h-4 text-blue-600 dark:text-blue-400" }) }), _jsxs("div", { className: "flex-1", children: [_jsx("p", { className: "text-xs text-gray-500 dark:text-dark-text-muted", children: label }), _jsx("p", { className: `text-sm mt-0.5 ${mono ? "font-mono text-gray-500 dark:text-dark-text-muted" : "font-medium text-gray-900 dark:text-dark-text-primary"}`, children: value })] }), _jsx(StatusIcon, { className: `w-5 h-5 ${statusColors[status]}` })] }));
}
function DiagnosticResultPanel({ diagnosisResult, onClose, }) {
    const { t } = useTranslation();
    // 获取翻译后的检查项名称
    const getCheckName = (check) => {
        const nameKey = `dashboard.diagnosisChecks.${check.key}.name`;
        const translated = t(nameKey);
        return translated === nameKey ? check.name : translated;
    };
    // 获取翻译后的消息
    const getCheckMessage = (check) => {
        const msgKey = `dashboard.diagnosisChecks.${check.key}.${check.message_key}`;
        const translated = t(msgKey, { version: check.details || "", path: check.details || "", deps: check.details || "" });
        return translated === msgKey ? check.message : translated;
    };
    return (_jsxs("div", { className: "mb-6 p-5 rounded-lg border bg-gray-50 dark:bg-dark-bg-sidebar border-gray-200 dark:border-dark-border-subtle", children: [_jsxs("div", { className: "flex items-center gap-2 mb-4", children: [diagnosisResult.overall === "passed" ? (_jsx(CheckCircle, { className: "w-5 h-5 text-green-600 dark:text-green-400" })) : (_jsx(XCircle, { className: "w-5 h-5 text-red-600 dark:text-red-400" })), _jsxs("h3", { className: "font-semibold text-gray-900 dark:text-dark-text-primary", children: [t("dashboard.diagnosisResult"), ": ", diagnosisResult.overall === "passed" ? t("dashboard.passed") : t("dashboard.issuesFound")] })] }), _jsx("div", { className: "space-y-3", children: diagnosisResult.checks.map((check, idx) => (_jsxs("div", { className: "flex items-start gap-3 p-3 rounded bg-white dark:bg-dark-bg-card border border-gray-200 dark:border-dark-border-subtle", children: [_jsxs("div", { className: "mt-0.5", children: [check.status === "ok" && _jsx(CheckCircle, { className: "w-4 h-4 text-green-600 dark:text-green-400" }), check.status === "warning" && _jsx(AlertCircle, { className: "w-4 h-4 text-amber-600 dark:text-amber-400" }), check.status === "error" && _jsx(XCircle, { className: "w-4 h-4 text-red-600 dark:text-red-400" })] }), _jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("p", { className: "text-sm font-medium text-gray-900 dark:text-dark-text-primary", children: getCheckName(check) }), _jsx("span", { className: `text-xs px-2 py-0.5 rounded-full ${check.status === "ok" ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" :
                                                check.status === "warning" ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400" :
                                                    "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"}`, children: check.status === "ok" ? t("dashboard.normal") : check.status === "warning" ? t("dashboard.warning") : t("dashboard.error") })] }), _jsx("p", { className: "text-xs text-gray-600 dark:text-dark-text-secondary mt-1", children: getCheckMessage(check) }), check.details && (_jsx("p", { className: "text-xs text-gray-500 dark:text-dark-text-muted mt-1 whitespace-pre-wrap font-mono bg-gray-50 dark:bg-dark-bg-hover p-2 rounded", children: check.details }))] })] }, idx))) }), _jsx("button", { onClick: onClose, className: "mt-4 text-sm text-gray-600 dark:text-dark-text-secondary hover:text-gray-900 dark:hover:text-dark-text-primary transition-colors", children: t("dashboard.closeDiagnosisResult") })] }));
}
