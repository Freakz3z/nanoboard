/**
 * 系统资源监控卡片组件
 */

import { useTranslation } from "react-i18next";
import { Activity, Cpu, HardDrive, Database, TrendingUp, FileText } from "lucide-react";
import NetworkMonitor from "@/components/NetworkMonitor";
import type { SystemInfo, LogStatistics, NetworkData } from "@/types/dashboard";

interface SystemResourceCardsProps {
  systemInfo: SystemInfo | null;
  logStatistics: LogStatistics | null;
  networkData: NetworkData[];
}

export default function SystemResourceCards({ systemInfo, logStatistics, networkData }: SystemResourceCardsProps) {
  const { t } = useTranslation();

  if (!systemInfo) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* 性能监控 */}
      <div className="p-5 bg-white dark:bg-dark-bg-card rounded-xl border border-gray-200 dark:border-dark-border-subtle transition-colors duration-200">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-indigo-500" />
          <span className="text-base font-medium text-gray-700 dark:text-dark-text-primary">{t("dashboard.performanceMonitoring")}</span>
        </div>
        <div className="space-y-4">
          {/* CPU */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-blue-500" />
                <span className="text-sm text-gray-600 dark:text-dark-text-secondary">{t("dashboard.cpu")}</span>
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-dark-text-primary">{systemInfo.cpu.usage_text}</span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-dark-bg-hover rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(systemInfo.cpu.usage, 100)}%` }}
              />
            </div>
          </div>
          {/* 内存 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-green-500" />
                <span className="text-sm text-gray-600 dark:text-dark-text-secondary">{t("dashboard.memory")}</span>
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-dark-text-primary">{systemInfo.memory.usage_text}</span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-dark-bg-hover rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(systemInfo.memory.usage_percent, 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 dark:text-dark-text-muted mt-1">
              {systemInfo.memory.used_text} / {systemInfo.memory.total_text}
            </p>
          </div>
          {/* 交换空间 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-purple-500" />
                <span className="text-sm text-gray-600 dark:text-dark-text-secondary">{t("dashboard.swap")}</span>
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-dark-text-primary">{systemInfo.swap.usage_text}</span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-dark-bg-hover rounded-full h-2">
              <div
                className="bg-purple-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(systemInfo.swap.usage_percent, 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 dark:text-dark-text-muted mt-1">
              {systemInfo.swap.used_text} / {systemInfo.swap.total_text}
            </p>
          </div>
        </div>
      </div>

      {/* 网络监控折线图 */}
      <div className="bg-white dark:bg-dark-bg-card rounded-xl border border-gray-200 dark:border-dark-border-subtle overflow-hidden transition-colors duration-200">
        <div className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-cyan-500" />
            <span className="text-base font-medium text-gray-700 dark:text-dark-text-primary">{t("dashboard.networkMonitoring")}</span>
          </div>
          <NetworkMonitor data={networkData} />
        </div>
      </div>

      {/* 日志监控 */}
      {logStatistics && (
        <div className="p-5 bg-white dark:bg-dark-bg-card rounded-xl border border-gray-200 dark:border-dark-border-subtle transition-colors duration-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-500" />
              <span className="text-base font-medium text-gray-700 dark:text-dark-text-primary">{t("dashboard.logStatistics")}</span>
            </div>
            <span className="text-sm text-gray-500 dark:text-dark-text-muted">
              {logStatistics.total} {t("dashboard.entries")}
            </span>
          </div>
          <div className="space-y-3">
            {/* DEBUG */}
            <LogProgressBar
              label="DEBUG"
              count={logStatistics.debug}
              total={logStatistics.total}
              colorClass="bg-gray-500"
              labelColorClass="text-gray-500"
            />
            {/* INFO */}
            <LogProgressBar
              label="INFO"
              count={logStatistics.info}
              total={logStatistics.total}
              colorClass="bg-blue-500"
              labelColorClass="text-blue-500"
            />
            {/* WARN */}
            <LogProgressBar
              label="WARN"
              count={logStatistics.warn}
              total={logStatistics.total}
              colorClass="bg-amber-500"
              labelColorClass="text-amber-500"
            />
            {/* ERROR */}
            <LogProgressBar
              label="ERROR"
              count={logStatistics.error}
              total={logStatistics.total}
              colorClass="bg-red-500"
              labelColorClass="text-red-500"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function LogProgressBar({
  label,
  count,
  total,
  colorClass,
  labelColorClass,
}: {
  label: string;
  count: number;
  total: number;
  colorClass: string;
  labelColorClass: string;
}) {
  const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : "0";

  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className={labelColorClass}>{label}</span>
        <span className="text-gray-600 dark:text-dark-text-secondary font-medium">
          {count} ({percentage}%)
        </span>
      </div>
      <div className="w-full bg-gray-100 dark:bg-dark-bg-hover rounded-full h-1.5">
        <div
          className={`${colorClass} h-1.5 rounded-full transition-all duration-500`}
          style={{ width: `${total > 0 ? (count / total) * 100 : 0}%` }}
        />
      </div>
    </div>
  );
}
