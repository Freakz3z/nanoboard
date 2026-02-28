import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { processApi } from "../lib/tauri";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  Github,
  Monitor,
  Cpu,
  FileText,
  Bot,
  Download,
  Stethoscope,
  CheckCircle,
  AlertCircle,
  XCircle,
  Sparkles,
  Settings,
  Save,
  RefreshCw,
  Folder,
  Terminal,
  Database,
  Clock,
  HardDrive,
} from "lucide-react";
import type { DiagnosticResult } from "@/types";

// 应用信息
const APP_INFO = {
  name: "nanoboard",
  version: "0.3.0",
  description: "一个极轻量化 nanobot Tauri 管理助手",
  descriptionEn: "An Ultra-lightweight nanobot Tauri Management Assistant",
  github: "https://github.com/Freakz3z/nanoboard",
  releasesApi: "https://api.github.com/repos/Freakz3z/nanoboard/releases/latest",
};

interface SystemInfoData {
  os: string;
  osVersion: string;
  arch: string;
  pythonVersion: string | null;
  nanobotVersion: string | null;
  nanobotPath: string | null;
  pythonPath: string | null;
}

type UpdateStatus = "checking" | "latest" | "available" | "error";

interface CustomPaths {
  pythonPath: string;
  nanobotPath: string;
}

interface PathItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  description?: string;
}

// 加载自定义路径配置
function loadCustomPaths(): CustomPaths {
  try {
    const stored = localStorage.getItem("nanoboard_custom_paths");
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error("Failed to load custom paths:", error);
  }
  return { pythonPath: "", nanobotPath: "" };
}

// 保存自定义路径配置
function saveCustomPaths(paths: CustomPaths) {
  try {
    localStorage.setItem("nanoboard_custom_paths", JSON.stringify(paths));
  } catch (error) {
    console.error("Failed to save custom paths:", error);
  }
}

export default function About() {
  const { t, i18n } = useTranslation();
  const [systemInfo, setSystemInfo] = useState<SystemInfoData | null>(null);
  const [diagnosing, setDiagnosing] = useState(false);
  const [diagnosisResult, setDiagnosticResult] = useState<DiagnosticResult | null>(null);
  const [showDiagnosis, setShowDiagnosis] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>("checking");
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [customPaths, setCustomPaths] = useState<CustomPaths>(loadCustomPaths);
  const [pathsSaved, setPathsSaved] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    loadSystemInfo();
    checkForUpdates();
  }, []);

  // 保存自定义路径
  async function handleSavePaths() {
    try {
      await processApi.setCustomPaths(
        customPaths.pythonPath || undefined,
        customPaths.nanobotPath || undefined
      );
      saveCustomPaths(customPaths);
      setPathsSaved(true);
      setIsEditing(false);
      setTimeout(() => setPathsSaved(false), 2000);
      await loadSystemInfo();
    } catch (error) {
      console.error("Failed to save custom paths:", error);
    }
  }

  // 重置为自动检测
  async function handleResetPaths() {
    try {
      await processApi.setCustomPaths(undefined, undefined);
      const resetPaths = { pythonPath: "", nanobotPath: "" };
      setCustomPaths(resetPaths);
      saveCustomPaths(resetPaths);
      await loadSystemInfo();
    } catch (error) {
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
      } else {
        setUpdateStatus("latest");
      }
    } catch (error) {
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

      if (customPathsInfo) {
        setCustomPaths({
          pythonPath: customPathsInfo.pythonPath || "",
          nanobotPath: customPathsInfo.nanobotPath || "",
        });
      }
    } catch (error) {
      console.error("Failed to load system info:", error);
    }
  }

  async function runDiagnosis() {
    setDiagnosing(true);
    try {
      const result = await processApi.diagnose();
      setDiagnosticResult(result);
      setShowDiagnosis(true);
    } catch (error) {
      setDiagnosticResult({
        overall: "failed",
        checks: [
          {
            key: "diagnosis",
            name: t("dashboard.diagnosis"),
            status: "error",
            message: t("dashboard.diagnosisFailed") + (error as Error).message,
            message_key: "failed",
            has_issue: true,
          },
        ],
      });
      setShowDiagnosis(true);
    } finally {
      setDiagnosing(false);
    }
  }

  // 路径信息数据
  const pathItems: PathItem[] = [
    {
      icon: FileText,
      label: t("dashboard.configFileLocation"),
      value: "~/.nanobot/config.json",
      description: t("about.configDesc"),
    },
    {
      icon: Folder,
      label: t("dashboard.workspaceLocation"),
      value: "~/.nanobot/workspace",
      description: t("about.workspaceDesc"),
    },
    {
      icon: Database,
      label: t("about.skillsLocation"),
      value: "~/.nanobot/workspace/skills",
      description: t("about.skillsDesc"),
    },
    {
      icon: Database,
      label: t("about.memoryLocation"),
      value: "~/.nanobot/workspace/memory",
      description: t("about.memoryDesc"),
    },
    {
      icon: Clock,
      label: t("about.cronJobsLocation"),
      value: "~/.nanobot/cron",
      description: t("about.cronDesc"),
    },
    {
      icon: HardDrive,
      label: t("dashboard.logLocation"),
      value: "~/.nanobot/logs/nanobot.log",
      description: t("about.logsDesc"),
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-8 scrollbar-thin bg-gradient-to-br from-gray-50 to-gray-100 dark:from-dark-bg-base dark:to-dark-bg-sidebar transition-colors duration-200">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* 应用信息卡片 */}
        <div className="relative overflow-hidden bg-white dark:bg-dark-bg-card rounded-2xl border border-gray-200 dark:border-dark-border-subtle shadow-lg">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-3xl" />
          <div className="relative p-8">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-3">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg">
                    <img 
                      src="/assets/logo.png" 
                      alt={APP_INFO.name}
                      className="w-10 h-10 object-contain"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        {APP_INFO.name}
                      </h1>
                      <span className="px-2.5 py-1 bg-gray-100 dark:bg-dark-bg-sidebar text-gray-600 dark:text-dark-text-muted text-xs font-medium rounded-full">
                        v{APP_INFO.version}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">
                      {i18n.language === "zh" ? APP_INFO.description : APP_INFO.descriptionEn}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {updateStatus === "available" && latestVersion && (
                    <button
                      onClick={() => openUrl(`${APP_INFO.github}/releases/latest`)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all shadow-md hover:shadow-lg"
                    >
                      <Sparkles className="w-4 h-4" />
                      {t("about.newVersionAvailable")} (v{latestVersion})
                    </button>
                  )}
                  {updateStatus === "latest" && (
                    <span className="flex items-center gap-2 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm font-medium rounded-lg">
                      <CheckCircle className="w-4 h-4" />
                      {t("about.latestVersion")}
                    </span>
                  )}
                  <button
                    onClick={() => openUrl(APP_INFO.github)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-dark-bg-sidebar hover:bg-gray-200 dark:hover:bg-dark-bg-hover text-gray-700 dark:text-dark-text-primary text-sm font-medium rounded-lg transition-colors"
                  >
                    <Github className="w-4 h-4" />
                    GitHub
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 系统信息卡片 */}
        <div className="bg-white dark:bg-dark-bg-card rounded-2xl border border-gray-200 dark:border-dark-border-subtle shadow-lg overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-dark-border-subtle">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
                  <Monitor className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">
                  {t("about.systemInfo")}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                {systemInfo && !systemInfo.nanobotVersion && (
                  <>
                    <button
                      onClick={async () => {
                        try {
                          const result = await processApi.downloadWithUv();
                          if (result.status === "success") {
                            await processApi.onboard();
                            loadSystemInfo();
                          }
                        } catch (error) {
                          console.error("Installation failed:", error);
                        }
                      }}
                      className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors shadow-md"
                    >
                      <Download className="w-4 h-4" />
                      {t("dashboard.downloadWithUv")}
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          const result = await processApi.download();
                          if (result.status === "success") {
                            await processApi.onboard();
                            loadSystemInfo();
                          }
                        } catch (error) {
                          console.error("Installation failed:", error);
                        }
                      }}
                      className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors shadow-md"
                    >
                      <Download className="w-4 h-4" />
                      {t("dashboard.downloadWithPip")}
                    </button>
                  </>
                )}
                <button
                  onClick={runDiagnosis}
                  disabled={diagnosing}
                  className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors shadow-md"
                >
                  <Stethoscope className="w-4 h-4" />
                  {diagnosing ? t("dashboard.diagnosing") : t("dashboard.diagnosis")}
                </button>
              </div>
            </div>
          </div>

          <div className="p-6">
            {/* 诊断结果 */}
            {showDiagnosis && diagnosisResult && (
              <DiagnosticResultPanel
                diagnosisResult={diagnosisResult}
                onClose={() => setShowDiagnosis(false)}
              />
            )}

            {/* 系统基本信息 */}
            {systemInfo && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <InfoCard
                  icon={Monitor}
                  label={t("about.os")}
                  value={systemInfo.osVersion ? `${systemInfo.os} ${systemInfo.osVersion}` : systemInfo.os}
                  color="blue"
                />
                <InfoCard
                  icon={Cpu}
                  label={t("about.arch")}
                  value={systemInfo.arch}
                  color="purple"
                />
                <InfoCard
                  icon={Bot}
                  label={t("about.nanobotVersion")}
                  value={systemInfo.nanobotVersion || t("dashboard.notInstalled")}
                  status={systemInfo.nanobotVersion ? "ok" : "warning"}
                  color="green"
                />
                <InfoCard
                  icon={Terminal}
                  label={t("about.pythonVersion")}
                  value={systemInfo.pythonVersion || t("dashboard.notDetected")}
                  status={systemInfo.pythonVersion ? "ok" : "warning"}
                  color="amber"
                />
              </div>
            )}

            {/* 路径信息区域 */}
            <div className="space-y-6">
              {/* 路径信息标题栏 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
                    <Settings className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">
                      {t("about.paths")}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-dark-text-muted">
                      {t("about.pathsDesc")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      handleResetPaths();
                      setIsEditing(false);
                    }}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-dark-text-secondary hover:text-gray-900 dark:hover:text-dark-text-primary hover:bg-gray-100 dark:hover:bg-dark-bg-hover rounded-lg transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    {t("about.autoDetect")}
                  </button>
                  {!isEditing ? (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-dark-bg-sidebar hover:bg-gray-200 dark:hover:bg-dark-bg-hover text-gray-700 dark:text-dark-text-primary text-sm font-medium rounded-lg transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      {t("about.editPaths")}
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setIsEditing(false);
                          setCustomPaths({ pythonPath: "", nanobotPath: "" });
                        }}
                        className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-dark-text-secondary hover:text-gray-900 dark:hover:text-dark-text-primary text-sm font-medium rounded-lg transition-colors"
                      >
                        {t("about.cancel")}
                      </button>
                      <button
                        onClick={handleSavePaths}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors shadow-md ${
                          pathsSaved
                            ? "bg-green-600 text-white"
                            : "bg-blue-600 hover:bg-blue-700 text-white"
                        }`}
                      >
                        <Save className="w-4 h-4" />
                        {pathsSaved ? t("about.saved") : t("about.savePaths")}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* 固定路径列表 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {pathItems.map((item, index) => (
                  <div
                    key={index}
                    className="group p-4 bg-gray-50 dark:bg-dark-bg-sidebar rounded-xl border border-gray-200 dark:border-dark-border-subtle hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-white dark:bg-dark-bg-card rounded-lg group-hover:scale-110 transition-transform">
                        <item.icon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-500 dark:text-dark-text-muted mb-1">
                          {item.label}
                        </p>
                        <code className="text-sm font-mono text-gray-900 dark:text-dark-text-primary break-all">
                          {item.value}
                        </code>
                        {item.description && (
                          <p className="text-xs text-gray-400 dark:text-dark-text-muted mt-1">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 自定义路径配置 */}
              {isEditing && (
                <div className="mt-6 p-6 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl border border-indigo-200 dark:border-indigo-500/30">
                  <div className="flex items-center gap-2 mb-4">
                    <Terminal className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <h4 className="text-sm font-semibold text-indigo-900 dark:text-indigo-300">
                      {t("about.customPathsConfig")}
                    </h4>
                  </div>
                  <p className="text-xs text-indigo-700 dark:text-indigo-400 mb-4">
                    {t("about.customPathsDesc")}
                  </p>
                  <div className="space-y-4">
                    {/* Python 路径 */}
                    <div>
                      <label className="block text-sm font-medium text-indigo-900 dark:text-indigo-300 mb-2">
                        {t("about.pythonPath")}
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="text"
                          value={customPaths.pythonPath}
                          onChange={(e) => setCustomPaths({ ...customPaths, pythonPath: e.target.value })}
                          placeholder={systemInfo?.pythonPath || t("about.pythonPathPlaceholder")}
                          className="flex-1 px-4 py-2.5 bg-white dark:bg-dark-bg-card border border-indigo-200 dark:border-indigo-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm text-gray-900 dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-dark-text-muted font-mono"
                        />
                        {systemInfo?.pythonPath && !customPaths.pythonPath && (
                          <span className="text-xs text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                            {t("about.detected")}: {systemInfo.pythonPath}
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Nanobot 路径 */}
                    <div>
                      <label className="block text-sm font-medium text-indigo-900 dark:text-indigo-300 mb-2">
                        {t("about.nanobotPath")}
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="text"
                          value={customPaths.nanobotPath}
                          onChange={(e) => setCustomPaths({ ...customPaths, nanobotPath: e.target.value })}
                          placeholder={systemInfo?.nanobotPath || t("about.nanobotPathPlaceholder")}
                          className="flex-1 px-4 py-2.5 bg-white dark:bg-dark-bg-card border border-indigo-200 dark:border-indigo-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm text-gray-900 dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-dark-text-muted font-mono"
                        />
                        {systemInfo?.nanobotPath && !customPaths.nanobotPath && (
                          <span className="text-xs text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                            {t("about.detected")}: {systemInfo.nanobotPath}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoCard({
  icon: Icon,
  label,
  value,
  status = "ok",
  color = "blue",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  status?: "ok" | "warning" | "error";
  color?: "blue" | "purple" | "green" | "amber";
}) {
  const colorClasses = {
    blue: {
      bg: "bg-blue-50 dark:bg-blue-900/30",
      text: "text-blue-600 dark:text-blue-400",
      border: "border-blue-200 dark:border-blue-500/30",
    },
    purple: {
      bg: "bg-purple-50 dark:bg-purple-900/30",
      text: "text-purple-600 dark:text-purple-400",
      border: "border-purple-200 dark:border-purple-500/30",
    },
    green: {
      bg: "bg-green-50 dark:bg-green-900/30",
      text: "text-green-600 dark:text-green-400",
      border: "border-green-200 dark:border-green-500/30",
    },
    amber: {
      bg: "bg-amber-50 dark:bg-amber-900/30",
      text: "text-amber-600 dark:text-amber-400",
      border: "border-amber-200 dark:border-amber-500/30",
    },
  };

  const statusIcons = {
    ok: CheckCircle,
    warning: AlertCircle,
    error: XCircle,
  };

  const StatusIcon = statusIcons[status];

  return (
    <div className={`p-4 rounded-xl border ${colorClasses[color].bg} ${colorClasses[color].border} transition-all hover:shadow-md`}>
      <div className="flex items-center justify-between mb-2">
        <Icon className={`w-5 h-5 ${colorClasses[color].text}`} />
        {status !== "ok" && <StatusIcon className={`w-4 h-4 ${colorClasses[color].text}`} />}
      </div>
      <p className="text-xs text-gray-500 dark:text-dark-text-muted mb-1">{label}</p>
      <p className={`text-sm font-medium ${value.includes("not") ? "text-gray-400 dark:text-dark-text-muted" : "text-gray-900 dark:text-dark-text-primary"}`}>
        {value}
      </p>
    </div>
  );
}

function DiagnosticResultPanel({
  diagnosisResult,
  onClose,
}: {
  diagnosisResult: DiagnosticResult;
  onClose: () => void;
}) {
  const { t } = useTranslation();

  const getCheckName = (check: DiagnosticResult["checks"][0]) => {
    const nameKey = `dashboard.diagnosisChecks.${check.key}.name`;
    const translated = t(nameKey);
    return translated === nameKey ? check.name : translated;
  };

  const getCheckMessage = (check: DiagnosticResult["checks"][0]) => {
    const msgKey = `dashboard.diagnosisChecks.${check.key}.${check.message_key}`;
    const translated = t(msgKey, { version: check.details || "", path: check.details || "", deps: check.details || "" });
    return translated === msgKey ? check.message : translated;
  };

  return (
    <div className="mb-6 p-5 rounded-xl border bg-gradient-to-br from-gray-50 to-gray-100 dark:from-dark-bg-sidebar dark:to-dark-bg-card border-gray-200 dark:border-dark-border-subtle">
      <div className="flex items-center gap-3 mb-4">
        {diagnosisResult.overall === "passed" ? (
          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
        ) : (
          <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
            <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
        )}
        <h3 className="font-semibold text-gray-900 dark:text-dark-text-primary">
          {t("dashboard.diagnosisResult")}: {diagnosisResult.overall === "passed" ? t("dashboard.passed") : t("dashboard.issuesFound")}
        </h3>
      </div>
      <div className="space-y-3">
        {diagnosisResult.checks.map((check, idx) => (
          <div key={idx} className="flex items-start gap-3 p-4 rounded-lg bg-white dark:bg-dark-bg-card border border-gray-200 dark:border-dark-border-subtle">
            <div className="mt-0.5">
              {check.status === "ok" && <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />}
              {check.status === "warning" && <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />}
              {check.status === "error" && <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-900 dark:text-dark-text-primary">{getCheckName(check)}</p>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  check.status === "ok" ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" :
                  check.status === "warning" ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400" :
                  "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                }`}>
                  {check.status === "ok" ? t("dashboard.normal") : check.status === "warning" ? t("dashboard.warning") : t("dashboard.error")}
                </span>
              </div>
              <p className="text-xs text-gray-600 dark:text-dark-text-secondary mt-2">{getCheckMessage(check)}</p>
              {check.details && (
                <p className="text-xs text-gray-500 dark:text-dark-text-muted mt-2 whitespace-pre-wrap font-mono bg-gray-50 dark:bg-dark-bg-hover p-2 rounded">
                  {check.details}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={onClose}
        className="mt-4 text-sm text-gray-600 dark:text-dark-text-secondary hover:text-gray-900 dark:hover:text-dark-text-primary transition-colors font-medium"
      >
        {t("dashboard.closeDiagnosisResult")}
      </button>
    </div>
  );
}
