/**
 * 状态卡片组件
 */

import { useTranslation } from "react-i18next";
import { Activity, Zap, Clock, Info } from "lucide-react";
import type { Status, NanobotVersion } from "@/types/dashboard";

interface StatusCardsProps {
  status: Status;
  nanobotVersion: NanobotVersion | null;
}

export default function StatusCards({ status, nanobotVersion }: StatusCardsProps) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* 运行状态 */}
      <div className="p-5 bg-white dark:bg-dark-bg-card rounded-xl border border-gray-200 dark:border-dark-border-subtle transition-colors duration-200">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-5 h-5 text-blue-500" />
          <span className="text-sm text-gray-500 dark:text-dark-text-muted">{t("dashboard.systemStatus")}</span>
        </div>
        <p className={`text-2xl font-semibold ${status.running ? "text-green-600 dark:text-green-400" : "text-gray-400 dark:text-dark-text-muted"}`}>
          {status.running ? t("dashboard.active") : t("dashboard.offline")}
        </p>
      </div>

      {/* 端口 */}
      <div className="p-5 bg-white dark:bg-dark-bg-card rounded-xl border border-gray-200 dark:border-dark-border-subtle transition-colors duration-200">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-5 h-5 text-amber-500" />
          <span className="text-sm text-gray-500 dark:text-dark-text-muted">{t("dashboard.servicePort")}</span>
        </div>
        <p className="text-2xl font-semibold text-gray-900 dark:text-dark-text-primary">
          {status.port || "N/A"}
        </p>
      </div>

      {/* 运行时间 */}
      <div className="p-5 bg-white dark:bg-dark-bg-card rounded-xl border border-gray-200 dark:border-dark-border-subtle transition-colors duration-200">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-5 h-5 text-purple-500" />
          <span className="text-sm text-gray-500 dark:text-dark-text-muted">{t("dashboard.uptime")}</span>
        </div>
        <p className="text-2xl font-semibold text-gray-900 dark:text-dark-text-primary">
          {status.uptime || "--:--"}
        </p>
      </div>

      {/* 版本 */}
      <div className="p-5 bg-white dark:bg-dark-bg-card rounded-xl border border-gray-200 dark:border-dark-border-subtle transition-colors duration-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Info className="w-5 h-5 text-indigo-500" />
            <span className="text-sm text-gray-500 dark:text-dark-text-muted">{t("dashboard.version")}</span>
          </div>
          <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
            nanobotVersion?.installed
              ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
              : "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
          }`}>
            {nanobotVersion?.installed ? t("dashboard.installed") : t("dashboard.notInstalled")}
          </span>
        </div>
        <p className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary truncate" title={nanobotVersion?.version || nanobotVersion?.message || t("dashboard.detecting")}>
          {nanobotVersion?.version || nanobotVersion?.message || t("dashboard.detecting")}
        </p>
      </div>
    </div>
  );
}
