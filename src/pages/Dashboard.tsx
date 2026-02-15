import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { processApi, configApi, networkApi } from "../lib/tauri";
import { useToast } from "../contexts/ToastContext";

// 导入类型
import type {
  Status,
  SystemInfo,
  NanobotVersion,
  LogStatistics,
  NetworkData,
  DashboardConfig,
  DiagnosisResult,
} from "@/types/dashboard";

// 导入组件
import StatusCards from "@/components/dashboard/StatusCards";
import ConfigOverviewCards from "@/components/dashboard/ConfigOverviewCards";
import SystemResourceCards from "@/components/dashboard/SystemResourceCards";
import SystemInfoSection from "@/components/dashboard/SystemInfoSection";

export default function Dashboard() {
  const { t } = useTranslation();
  const toast = useToast();
  const [status, setStatus] = useState<Status>({ running: false });
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [nanobotVersion, setNanobotVersion] = useState<NanobotVersion | null>(null);
  const [nanobotPath, setNanobotPath] = useState<string | null>(null);
  const [config, setConfig] = useState<DashboardConfig | null>(null);
  const [logStatistics, setLogStatistics] = useState<LogStatistics | null>(null);
  const [networkData, setNetworkData] = useState<NetworkData[]>([]);
  const [diagnosing, setDiagnosing] = useState(false);
  const [diagnosisResult, setDiagnosisResult] = useState<DiagnosisResult | null>(null);
  const [showDiagnosis, setShowDiagnosis] = useState(false);
  const [installingWithUv, setInstallingWithUv] = useState(false);
  const [installingWithPip, setInstallingWithPip] = useState(false);

  // 使用合并 API 刷新所有状态
  async function refreshAll() {
    try {
      const data = await processApi.getDashboardData();

      // 更新各项状态
      if (data.status) {
        setStatus(data.status);
      }
      if (data.systemInfo) {
        setSystemInfo(data.systemInfo);
      }
      if (data.config && !data.config.error) {
        setConfig(data.config);
      }
      if (data.logStatistics) {
        setLogStatistics(data.logStatistics);
      }

      // 更新网络数据（带平滑处理）
      if (data.networkStats) {
        setNetworkData(prev => {
          const lastData = prev[prev.length - 1];
          const stats = data.networkStats;

          let smoothUpload = stats.upload_speed || 0;
          let smoothDownload = stats.download_speed || 0;

          if (smoothUpload === 0 && lastData && lastData.upload > 0) {
            smoothUpload = lastData.upload * 0.5;
          }
          if (smoothDownload === 0 && lastData && lastData.download > 0) {
            smoothDownload = lastData.download * 0.5;
          }

          const displayUpload = smoothUpload > 0 && smoothUpload < 0.1 ? 0.1 : smoothUpload;
          const displayDownload = smoothDownload > 0 && smoothDownload < 0.1 ? 0.1 : smoothDownload;

          return [...prev.slice(-59), {
            timestamp: Date.now(),
            upload: displayUpload,
            download: displayDownload,
          }];
        });
      }
    } catch (error) {
      console.error(t("dashboard.fetchStatusFailed"), error);
    }
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
      if (result.found && result.path) {
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
        overall: "failed",
        checks: [{
          name: t("dashboard.diagnosis"),
          status: "error",
          message: t("dashboard.diagnosisFailed") + (error as Error).message,
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
    <div className="flex-1 overflow-y-auto p-8 scrollbar-thin bg-white dark:bg-dark-bg-base transition-colors duration-200">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 状态卡片 */}
        <StatusCards status={status} nanobotVersion={nanobotVersion} />

        {/* 配置概览 */}
        <ConfigOverviewCards config={config} />

        {/* 系统资源监控 */}
        <SystemResourceCards
          systemInfo={systemInfo}
          logStatistics={logStatistics}
          networkData={networkData}
        />

        {/* 系统信息 */}
        <SystemInfoSection
          nanobotPath={nanobotPath}
          installingWithUv={installingWithUv}
          installingWithPip={installingWithPip}
          diagnosing={diagnosing}
          showDiagnosis={showDiagnosis}
          diagnosisResult={diagnosisResult}
          onDownloadWithUv={downloadWithUvAndInit}
          onDownloadWithPip={downloadWithPipAndInit}
          onRunDiagnosis={runDiagnosis}
          onCloseDiagnosis={() => setShowDiagnosis(false)}
        />
      </div>
    </div>
  );
}
