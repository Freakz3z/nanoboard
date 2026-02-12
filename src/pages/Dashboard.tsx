import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { processApi, configApi, loggerApi, networkApi } from "../lib/tauri";
import NetworkMonitor from "../components/NetworkMonitor";
import { useToast } from "../contexts/ToastContext";
import {
  Activity,
  CheckCircle,
  Clock,
  FileText,
  Zap,
  Cpu,
  HardDrive,
  Database,
  Info,
  MessageSquare,
  Bot,
  Server,
  TrendingUp,
  AlertCircle,
  XCircle,
  Stethoscope,
  Download,
} from "lucide-react";

interface Status {
  running: boolean;
  port?: number;
  uptime?: string;
}

interface SystemInfo {
  cpu: {
    usage: number;
    usage_text: string;
  };
  memory: {
    total: number;
    total_text: string;
    used: number;
    used_text: string;
    available: number;
    available_text: string;
    usage_percent: number;
    usage_text: string;
  };
  swap: {
    total: number;
    total_text: string;
    used: number;
    used_text: string;
    available: number;
    available_text: string;
    usage_percent: number;
    usage_text: string;
  };
}

interface NanobotVersion {
  installed: boolean;
  version: string | null;
  message: string;
}

interface LogStatistics {
  total: number;
  debug: number;
  info: number;
  warn: number;
  error: number;
}

interface NetworkData {
  timestamp: number;
  upload: number;
  download: number;
}

interface Config {
  providers?: Record<string, any>;
  agents?: {
    defaults?: {
      model?: string;
      max_tokens?: number;
      temperature?: number;
      max_tool_iterations?: number;
    };
  };
  channels?: Record<string, any>;
}

export default function Dashboard() {
  const { t } = useTranslation();
  const toast = useToast();
  const [status, setStatus] = useState<Status>({ running: false });
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [nanobotVersion, setNanobotVersion] = useState<NanobotVersion | null>(null);
  const [nanobotPath, setNanobotPath] = useState<string | null>(null);
  const [config, setConfig] = useState<Config | null>(null);
  const [logStatistics, setLogStatistics] = useState<LogStatistics | null>(null);
  const [networkData, setNetworkData] = useState<NetworkData[]>([]);
  const [diagnosing, setDiagnosing] = useState(false);
  const [diagnosisResult, setDiagnosisResult] = useState<any>(null);
  const [showDiagnosis, setShowDiagnosis] = useState(false);
  const [installingWithUv, setInstallingWithUv] = useState(false);
  const [installingWithPip, setInstallingWithPip] = useState(false);

  // 刷新所有状态的函数
  async function refreshAll() {
    await Promise.all([
      loadStatus(),
      loadSystemInfo(),
      loadConfig(),
      loadLogStatistics(),
    ]);
  }

  useEffect(() => {
    // 初始加载
    refreshAll();
    loadNanobotVersion();
    loadNanobotPath();

    // 初始化网络监控
    networkApi.initMonitor().catch(console.error);

    // 初始化网络数据（60秒历史）
    const initialData: NetworkData[] = [];
    const now = Date.now();
    for (let i = 60; i >= 0; i--) {
      initialData.push({
        timestamp: now - i * 1000,
        upload: 0,
        download: 0,
      });
    }
    setNetworkData(initialData);

    // 定时刷新（每1秒）
    const interval = setInterval(() => {
      refreshAll();
      updateNetworkData();
    }, 1000);

    // 页面可见性变化时立即刷新
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refreshAll();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 页面获得焦点时也刷新
    const handleFocus = () => {
      refreshAll();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  async function loadStatus() {
    try {
      const result = await processApi.getStatus();
      setStatus(result);
    } catch (error) {
      console.error(t("dashboard.fetchStatusFailed"), error);
    }
  }

  async function loadSystemInfo() {
    try {
      const result = await processApi.getSystemInfo();
      setSystemInfo(result);
    } catch (error) {
      console.error(t("dashboard.fetchSystemInfoFailed"), error);
    }
  }

  async function loadNanobotVersion() {
    try {
      const result = await processApi.getVersion();
      setNanobotVersion(result);
    } catch (error) {
      console.error(t("dashboard.fetchVersionFailed"), error);
    }
  }

  async function loadNanobotPath() {
    try {
      const result = await processApi.getNanobotPath();
      if (result.found) {
        setNanobotPath(result.path);
      }
    } catch (error) {
      console.error(t("dashboard.fetchNanobotPathFailed"), error);
    }
  }

  async function loadConfig() {
    try {
      const result = await configApi.load();
      if (!result.error) {
        setConfig(result);
      }
    } catch (error) {
      console.error(t("dashboard.fetchConfigFailed"), error);
    }
  }

  async function loadLogStatistics() {
    try {
      const result = await loggerApi.getStatistics();
      setLogStatistics(result);
    } catch (error) {
      console.error(t("dashboard.fetchLogStatsFailed"), error);
    }
  }

  // 更新网络数据（从后端获取真实统计）
  async function updateNetworkData() {
    try {
      const stats = await networkApi.getStats();
      setNetworkData(prev => {
        const lastData = prev[prev.length - 1];

        // 平滑处理：如果当前值为0但上一次有值，则逐渐衰减而不是突变为0
        let smoothUpload = stats.upload_speed || 0;
        let smoothDownload = stats.download_speed || 0;

        // 如果上传速度为0但上次有值，进行衰减处理（保留上次值的50%）
        if (smoothUpload === 0 && lastData && lastData.upload > 0) {
          smoothUpload = lastData.upload * 0.5;
        }
        // 如果下载速度为0但上次有值，进行衰减处理
        if (smoothDownload === 0 && lastData && lastData.download > 0) {
          smoothDownload = lastData.download * 0.5;
        }

        // 最小显示值为 0.1 B/s，避免完全显示为0
        const displayUpload = smoothUpload > 0 && smoothUpload < 0.1 ? 0.1 : smoothUpload;
        const displayDownload = smoothDownload > 0 && smoothDownload < 0.1 ? 0.1 : smoothDownload;

        const newData = [...prev.slice(-59), {
          timestamp: Date.now(),
          upload: displayUpload,
          download: displayDownload,
        }];
        return newData;
      });
    } catch (error) {
      console.error(t("dashboard.fetchNetworkStatsFailed"), error);
    }
  }

  // 运行环境诊断
  async function runDiagnosis() {
    setDiagnosing(true);
    try {
      const result = await processApi.diagnose();
      setDiagnosisResult(result);
      setShowDiagnosis(true);
    } catch (error) {
      console.error(t("dashboard.diagnosisFailed"), error);
      setDiagnosisResult({
        overall: "error",
        checks: [{
          name: t("dashboard.diagnosis"),
          status: "error",
          message: t("dashboard.diagnosisFailed") + (error as Error).message,
          details: null,
        }]
      });
      setShowDiagnosis(true);
    } finally {
      setDiagnosing(false);
    }
  }

  // 使用 uv 下载并初始化 nanobot
  async function downloadWithUvAndInit() {
    setInstallingWithUv(true);
    try {
      // 1. 使用 uv 下载安装
      toast.showInfo(t("dashboard.installingWithUvDesc"));
      const downloadResult = await processApi.downloadWithUv();
      if (downloadResult.status !== "success") {
        toast.showError(t("dashboard.installFailed") + downloadResult.message);
        return;
      }
      toast.showSuccess(t("dashboard.installSuccessWithUv"));

      // 2. 初始化
      toast.showInfo(t("dashboard.initializingNanobot"));
      const onboardResult = await processApi.onboard();
      if (onboardResult.status === "success") {
        toast.showSuccess(t("dashboard.nanobotInitialized"));
      } else {
        toast.showError(t("dashboard.initializeFailed") + onboardResult.message);
      }

      // 3. 刷新状态
      await loadNanobotVersion();
      await loadNanobotPath();
      await loadConfig();
    } catch (error) {
      console.error(t("dashboard.operationFailed"), error);
      toast.showError(t("dashboard.operationFailedToast") + (error as Error).message);
    } finally {
      setInstallingWithUv(false);
    }
  }

  // 使用 pip 下载并初始化 nanobot
  async function downloadWithPipAndInit() {
    setInstallingWithPip(true);
    try {
      // 1. 使用 pip 下载安装
      toast.showInfo(t("dashboard.installingWithPipDesc"));
      const downloadResult = await processApi.download();
      if (downloadResult.status !== "success") {
        toast.showError(t("dashboard.installFailed") + downloadResult.message);
        return;
      }
      toast.showSuccess(t("dashboard.installSuccessWithPip"));

      // 2. 初始化
      toast.showInfo(t("dashboard.initializingNanobot"));
      const onboardResult = await processApi.onboard();
      if (onboardResult.status === "success") {
        toast.showSuccess(t("dashboard.nanobotInitialized"));
      } else {
        toast.showError(t("dashboard.initializeFailed") + onboardResult.message);
      }

      // 3. 刷新状态
      await loadNanobotVersion();
      await loadNanobotPath();
      await loadConfig();
    } catch (error) {
      console.error(t("dashboard.operationFailed"), error);
      toast.showError(t("dashboard.operationFailedToast") + (error as Error).message);
    } finally {
      setInstallingWithPip(false);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-8 scrollbar-thin">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 状态卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* 运行状态卡片 */}
          <div className="p-5 bg-white rounded-lg border border-gray-200 card-hover">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Activity className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mb-1">{t("dashboard.systemStatus")}</p>
            <p className="text-2xl font-semibold text-gray-900">
              {status.running ? t("dashboard.active") : t("dashboard.offline")}
            </p>
          </div>

          {/* 端口卡片 */}
          <div className="p-5 bg-white rounded-lg border border-gray-200 card-hover">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-indigo-50 rounded-lg">
                <Zap className="w-5 h-5 text-indigo-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mb-1">{t("dashboard.servicePort")}</p>
            <p className="text-2xl font-semibold text-gray-900">
              {status.port || "N/A"}
            </p>
          </div>

          {/* 运行时间卡片 */}
          <div className="p-5 bg-white rounded-lg border border-gray-200 card-hover">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-purple-50 rounded-lg">
                <Clock className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mb-1">{t("dashboard.uptime")}</p>
            <p className="text-2xl font-semibold text-gray-900">
              {status.uptime || "--:--"}
            </p>
          </div>

          {/* 版本信息卡片 */}
          <div className="p-5 bg-white rounded-lg border border-gray-200 card-hover">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-amber-50 rounded-lg">
                <Info className="w-5 h-5 text-amber-600" />
              </div>
              <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                nanobotVersion?.installed
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-700"
              }`}>
                {nanobotVersion?.installed ? t("dashboard.installed") : t("dashboard.notInstalled")}
              </span>
            </div>
            <p className="text-xs text-gray-500 mb-1">{t("dashboard.version")}</p>
            <p className="text-lg font-semibold text-gray-900 truncate" title={nanobotVersion?.version || nanobotVersion?.message || t("dashboard.detecting")}>
              {nanobotVersion?.version || nanobotVersion?.message || t("dashboard.detecting")}
            </p>
          </div>
        </div>

        {/* 配置概览 */}
        {config && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* LLM 配置 */}
            <div className="p-5 bg-white rounded-lg border border-gray-200 card-hover">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Server className="w-5 h-5 text-blue-600" />
                </div>
              </div>
              <p className="text-xs text-gray-500 mb-3">{t("dashboard.llmProvider")}</p>
              {(() => {
                const configuredProviders = config.providers
                  ? Object.entries(config.providers).filter(
                      ([_, p]) => p && p.apiKey && String(p.apiKey).trim() !== ""
                    )
                  : [];
                return configuredProviders.length > 0 ? (
                  <div className="space-y-2">
                    {configuredProviders.slice(0, 4).map(([providerKey]) => (
                      <div key={providerKey} className="flex items-center justify-between">
                        <span className="text-xs text-gray-600">{providerKey}</span>
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                          {t("dashboard.configured")}
                        </span>
                      </div>
                    ))}
                    {configuredProviders.length > 4 && (
                      <p className="text-xs text-gray-500">
                        {t("dashboard.totalProviders", { count: configuredProviders.length })}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">{t("dashboard.noConfiguration")}</p>
                );
              })()}
            </div>

            {/* Agent 配置 */}
            <div className="p-5 bg-white rounded-lg border border-gray-200 card-hover">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-indigo-50 rounded-lg">
                  <Bot className="w-5 h-5 text-indigo-600" />
                </div>
              </div>
              <p className="text-xs text-gray-500 mb-3">{t("dashboard.agentConfig")}</p>
              {config.agents?.defaults ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{t("dashboard.model")}</span>
                    <span className="text-xs font-medium text-gray-700 truncate max-w-[120px]" title={config.agents.defaults.model}>
                      {config.agents.defaults.model || '-'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{t("dashboard.maxTokens")}</span>
                    <span className="text-xs font-medium text-gray-700">
                      {config.agents.defaults.max_tokens || '-'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{t("dashboard.maxToolIterations")}</span>
                    <span className="text-xs font-medium text-gray-700">
                      {config.agents.defaults.max_tool_iterations || '-'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{t("dashboard.temperature")}</span>
                    <span className="text-xs font-medium text-gray-700">
                      {config.agents.defaults.temperature || '-'}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-500">{t("dashboard.noConfiguration")}</p>
              )}
            </div>

            {/* 消息渠道 */}
            <div className="p-5 bg-white rounded-lg border border-gray-200 card-hover">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <MessageSquare className="w-5 h-5 text-purple-600" />
                </div>
              </div>
              <p className="text-xs text-gray-500 mb-3">{t("dashboard.messageChannels")}</p>
              {config.channels && Object.keys(config.channels).length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(config.channels)
                    .filter(([_, channel]: [string, any]) => channel?.enabled)
                    .slice(0, 3)
                    .map(([channelKey]) => (
                      <div key={channelKey} className="flex items-center justify-between">
                        <span className="text-xs text-gray-600 capitalize">{channelKey}</span>
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                          {t("config.enabled")}
                        </span>
                      </div>
                    ))}
                  {Object.values(config.channels).filter((c: any) => c?.enabled).length === 0 && (
                    <p className="text-xs text-gray-500">{t("dashboard.noEnabledChannels")}</p>
                  )}
                  {Object.values(config.channels).filter((c: any) => c?.enabled).length > 3 && (
                    <p className="text-xs text-gray-500">
                      {t("dashboard.totalChannels", { count: Object.values(config.channels).filter((c: any) => c?.enabled).length })}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-500">{t("dashboard.noConfiguration")}</p>
              )}
            </div>
          </div>
        )}

        {/* 系统资源监控 */}
        {systemInfo && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 性能监控 */}
            <div className="p-5 bg-white rounded-lg border border-gray-200 card-hover">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-indigo-50 rounded-lg">
                  <Activity className="w-5 h-5 text-indigo-600" />
                </div>
                <span className="text-xs font-medium text-gray-500">{t("dashboard.performanceMonitoring")}</span>
              </div>
              <div className="space-y-3">
                {/* CPU */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-blue-600" />
                      <span className="text-xs text-gray-600">{t("dashboard.cpu")}</span>
                    </div>
                    <span className="text-xs font-medium text-gray-700">{systemInfo.cpu.usage_text}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(systemInfo.cpu.usage, 100)}%` }}
                    />
                  </div>
                </div>
                {/* 内存 */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <HardDrive className="w-3.5 h-3.5 text-green-600" />
                      <span className="text-xs text-gray-600">{t("dashboard.memory")}</span>
                    </div>
                    <span className="text-xs font-medium text-gray-700">{systemInfo.memory.usage_text}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-green-600 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(systemInfo.memory.usage_percent, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {systemInfo.memory.used_text} / {systemInfo.memory.total_text}
                  </p>
                </div>
                {/* 交换空间 */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-purple-600" />
                      <span className="text-xs text-gray-600">{t("dashboard.swap")}</span>
                    </div>
                    <span className="text-xs font-medium text-gray-700">{systemInfo.swap.usage_text}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-purple-600 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(systemInfo.swap.usage_percent, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {systemInfo.swap.used_text} / {systemInfo.swap.total_text}
                  </p>
                </div>
              </div>
            </div>

            {/* 网络监控折线图 */}
            <div className="bg-white rounded-lg border border-gray-200 card-hover overflow-hidden">
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-cyan-50 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-cyan-600" />
                  </div>
                  <span className="text-xs font-medium text-gray-500">{t("dashboard.networkMonitoring")}</span>
                </div>
                <NetworkMonitor data={networkData} />
              </div>
            </div>

            {/* 日志监控 */}
            {logStatistics && (
              <div className="p-5 bg-white rounded-lg border border-gray-200 card-hover">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <FileText className="w-5 h-5 text-purple-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    {logStatistics.total} {t("dashboard.entries")}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-3">{t("dashboard.logStatistics")}</p>
                <div className="space-y-2">
                  {/* DEBUG */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-600">DEBUG</span>
                      <span className="text-gray-700 font-medium">
                        {logStatistics.debug} ({logStatistics.total > 0 ? ((logStatistics.debug / logStatistics.total) * 100).toFixed(1) : '0'}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-gray-600 h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${logStatistics.total > 0 ? (logStatistics.debug / logStatistics.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  {/* INFO */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-blue-600">INFO</span>
                      <span className="text-gray-700 font-medium">
                        {logStatistics.info} ({logStatistics.total > 0 ? ((logStatistics.info / logStatistics.total) * 100).toFixed(1) : '0'}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${logStatistics.total > 0 ? (logStatistics.info / logStatistics.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  {/* WARN */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-amber-600">WARN</span>
                      <span className="text-gray-700 font-medium">
                        {logStatistics.warn} ({logStatistics.total > 0 ? ((logStatistics.warn / logStatistics.total) * 100).toFixed(1) : '0'}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-amber-600 h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${logStatistics.total > 0 ? (logStatistics.warn / logStatistics.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  {/* ERROR */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-red-600">ERROR</span>
                      <span className="text-gray-700 font-medium">
                        {logStatistics.error} ({logStatistics.total > 0 ? ((logStatistics.error / logStatistics.total) * 100).toFixed(1) : '0'}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-red-600 h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${logStatistics.total > 0 ? (logStatistics.error / logStatistics.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 系统信息 */}
        <div className="p-6 bg-white rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2 text-gray-900">
              <Zap className="w-5 h-5 text-indigo-600" />
              {t("dashboard.systemInfo")}
            </h2>
            <div className="flex flex-wrap gap-2">
              {/* uv 下载按钮 */}
              <button
                onClick={downloadWithUvAndInit}
                disabled={installingWithUv || installingWithPip || diagnosing}
                className="flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                <Download className="w-4 h-4" />
                {installingWithUv ? t("dashboard.installingWithUv") : t("dashboard.downloadWithUv")}
              </button>

              {/* pip 下载按钮 */}
              <button
                onClick={downloadWithPipAndInit}
                disabled={installingWithUv || installingWithPip || diagnosing}
                className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                <Download className="w-4 h-4" />
                {installingWithPip ? t("dashboard.installingWithPip") : t("dashboard.downloadWithPip")}
              </button>

              {/* 环境诊断按钮 */}
              <button
                onClick={runDiagnosis}
                disabled={installingWithUv || installingWithPip || diagnosing}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                <Stethoscope className="w-4 h-4" />
                {diagnosing ? t("dashboard.diagnosing") : t("dashboard.diagnosis")}
              </button>
            </div>
          </div>

          {/* 诊断结果 */}
          {showDiagnosis && diagnosisResult && (
            <div className="mb-6 p-5 rounded-lg border bg-gray-50">
              <div className="flex items-center gap-2 mb-4">
                {diagnosisResult.overall === "passed" ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
                <h3 className="font-semibold text-gray-900">
                  {t("dashboard.diagnosisResult")}: {diagnosisResult.overall === "passed" ? t("dashboard.passed") : t("dashboard.issuesFound")}
                </h3>
              </div>
              <div className="space-y-3">
                {diagnosisResult.checks.map((check: any, idx: number) => (
                  <div key={idx} className="flex items-start gap-3 p-3 rounded bg-white border border-gray-200">
                    <div className="mt-0.5">
                      {check.status === "ok" && <CheckCircle className="w-4 h-4 text-green-600" />}
                      {check.status === "warning" && <AlertCircle className="w-4 h-4 text-amber-600" />}
                      {check.status === "error" && <XCircle className="w-4 h-4 text-red-600" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">{check.name}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          check.status === "ok" ? "bg-green-100 text-green-700" :
                          check.status === "warning" ? "bg-amber-100 text-amber-700" :
                          "bg-red-100 text-red-700"
                        }`}>
                          {check.status === "ok" ? t("dashboard.normal") : check.status === "warning" ? t("dashboard.warning") : t("dashboard.error")}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">{check.message}</p>
                      {check.details && (
                        <p className="text-xs text-gray-500 mt-1 whitespace-pre-wrap font-mono bg-gray-50 p-2 rounded">
                          {check.details}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setShowDiagnosis(false)}
                className="mt-4 text-sm text-gray-600 hover:text-gray-900"
              >
                {t("dashboard.closeDiagnosisResult")}
              </button>
            </div>
          )}

          <div className="space-y-3">
            {[
              { icon: FileText, label: t("dashboard.configFileLocation"), value: "~/.nanobot/config.json" },
              { icon: FileText, label: t("dashboard.workspaceLocation"), value: "~/.nanobot/workspace" },
              { icon: FileText, label: t("dashboard.logLocation"), value: "~/.nanobot/logs/nanobot.log" },
              { icon: Bot, label: t("dashboard.nanobotLocation"), value: nanobotPath || t("dashboard.notInstalled") },
            ].map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-4 p-4 rounded-lg bg-gray-50 border border-gray-100"
              >
                <div className="p-2 bg-blue-50 rounded-lg">
                  <item.icon className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500">{item.label}</p>
                  <p className="text-sm font-mono text-gray-700 mt-0.5">{item.value}</p>
                </div>
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
