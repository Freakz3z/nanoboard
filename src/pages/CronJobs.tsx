import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { cronApi } from "../lib/tauri";
import { useToast } from "../contexts/ToastContext";
import {
  Clock,
  Plus,
  Trash2,
  RefreshCw,
  Timer,
  CalendarClock,
  MessageSquare,
  X,
  Play,
  Power,
  PowerOff,
  Send,
  Pencil,
  AlertTriangle,
} from "lucide-react";
import EmptyState from "../components/EmptyState";
import ConfirmDialog from "../components/ConfirmDialog";
import type { CronJob } from "../types";

interface AddJobForm {
  name: string;
  message: string;
  scheduleType: "cron" | "every" | "at";
  cronMinute: string;
  cronHour: string;
  cronDom: string;
  cronMonth: string;
  cronDow: string;
  everySeconds: string;
  atTime: string;
}

export default function CronJobs() {
  const { t } = useTranslation();
  const toast = useToast();

  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingJob, setEditingJob] = useState<CronJob | null>(null);
  const [form, setForm] = useState<AddJobForm>({
    name: "",
    message: "",
    scheduleType: "cron",
    cronMinute: "0",
    cronHour: "9",
    cronDom: "*",
    cronMonth: "*",
    cronDow: "*",
    everySeconds: "3600",
    atTime: "",
  });
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: "", message: "", onConfirm: () => {} });

  useEffect(() => {
    loadJobs();
  }, []);

  async function loadJobs() {
    setIsLoading(true);
    try {
      const result = await cronApi.list();
      if (result.success) {
        setJobs(result.jobs || []);
      } else {
        toast.showError(result.message || t("cron.loadFailed"));
      }
    } catch (error) {
      toast.showError(t("cron.loadFailed"));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAddJob() {
    if (!form.name.trim()) {
      toast.showError(t("cron.nameRequired"));
      return;
    }
    if (!form.message.trim()) {
      toast.showError(t("cron.messageRequired"));
      return;
    }

    const scheduleValue =
      form.scheduleType === "cron"
        ? getCronExpression()
        : form.scheduleType === "at"
        ? form.atTime
        : form.everySeconds;

    if (!scheduleValue.trim()) {
      toast.showError(t("cron.scheduleRequired"));
      return;
    }

    setIsSubmitting(true);
    try {
      // 编辑模式：先删除旧任务
      if (editingJob) {
        const removeResult = await cronApi.remove(editingJob.id);
        if (!removeResult.success) {
          toast.showError(removeResult.message || t("cron.removeFailed"));
          setIsSubmitting(false);
          return;
        }
      }

      const result = await cronApi.add(
        form.name.trim(),
        form.message.trim(),
        form.scheduleType,
        scheduleValue.trim(),
      );
      if (result.success) {
        toast.showSuccess(editingJob ? t("cron.editSuccess") : t("cron.addSuccess"));
        setShowAddDialog(false);
        resetForm();
        await loadJobs();
      } else {
        toast.showError(result.message || t("cron.addFailed"));
      }
    } catch (error) {
      toast.showError(t("cron.addFailed"));
    } finally {
      setIsSubmitting(false);
    }
  }

  function confirmRemoveJob(job: CronJob) {
    setConfirmDialog({
      isOpen: true,
      title: t("cron.removeJob"),
      message: t("cron.removeConfirm", { name: job.name || job.id }),
      onConfirm: async () => {
        try {
          const result = await cronApi.remove(job.id);
          if (result.success) {
            toast.showSuccess(t("cron.removeSuccess"));
            await loadJobs();
          } else {
            toast.showError(result.message || t("cron.removeFailed"));
          }
        } catch (error) {
          toast.showError(t("cron.removeFailed"));
        } finally {
          setConfirmDialog({ isOpen: false, title: "", message: "", onConfirm: () => {} });
        }
      },
    });
  }

  async function toggleJobEnabled(job: CronJob) {
    const isEnabled = job.status === "enabled" || job.status === "active";
    try {
      const result = await cronApi.enable(job.id, isEnabled);
      if (result.success) {
        toast.showSuccess(isEnabled ? t("cron.disableSuccess") : t("cron.enableSuccess"));
        await loadJobs();
      } else {
        toast.showError(result.message || t("cron.toggleFailed"));
      }
    } catch (error) {
      toast.showError(t("cron.toggleFailed"));
    }
  }

  async function handleRunJob(job: CronJob) {
    try {
      const result = await cronApi.run(job.id);
      if (result.success) {
        toast.showSuccess(t("cron.runSuccess"));
      } else {
        toast.showError(result.message || t("cron.runFailed"));
      }
    } catch (error) {
      toast.showError(t("cron.runFailed"));
    }
  }

  function resetForm() {
    setForm({
      name: "",
      message: "",
      scheduleType: "cron",
      cronMinute: "0",
      cronHour: "9",
      cronDom: "*",
      cronMonth: "*",
      cronDow: "*",
      everySeconds: "3600",
      atTime: "",
    });
    setEditingJob(null);
  }

  function openEditDialog(job: CronJob) {
    const schedule = job.schedule || "";
    let scheduleType: "cron" | "every" | "at" = "cron";
    let cronMinute = "0", cronHour = "9", cronDom = "*", cronMonth = "*", cronDow = "*";
    let everySeconds = "3600";
    let atTime = "";

    if (schedule.startsWith("every ")) {
      scheduleType = "every";
      // "every 30s" → extract seconds
      const match = schedule.match(/every\s+(\d+)/);
      if (match) everySeconds = match[1];
    } else if (schedule.includes("*")) {
      scheduleType = "cron";
      const parts = schedule.trim().split(/\s+/);
      if (parts.length === 5) {
        [cronMinute, cronHour, cronDom, cronMonth, cronDow] = parts;
      }
    } else {
      // Could be an "at" schedule or other format
      scheduleType = "at";
      atTime = schedule;
    }

    setEditingJob(job);
    setForm({
      name: job.name || "",
      message: job.message || "",
      scheduleType,
      cronMinute,
      cronHour,
      cronDom,
      cronMonth,
      cronDow,
      everySeconds,
      atTime,
    });
    setShowAddDialog(true);
  }

  function getCronExpression(): string {
    return `${form.cronMinute} ${form.cronHour} ${form.cronDom} ${form.cronMonth} ${form.cronDow}`;
  }

  function describeCron(expression: string): string {
    const parts = expression.trim().split(/\s+/);
    if (parts.length !== 5) return expression;

    const [min, hour, dom, mon, dow] = parts;

    const dowNames: Record<string, string> = {
      "0": t("cron.dow.sun"),
      "1": t("cron.dow.mon"),
      "2": t("cron.dow.tue"),
      "3": t("cron.dow.wed"),
      "4": t("cron.dow.thu"),
      "5": t("cron.dow.fri"),
      "6": t("cron.dow.sat"),
      "7": t("cron.dow.sun"),
    };

    const monNames: Record<string, string> = {
      "1": t("cron.mon.jan"), "2": t("cron.mon.feb"), "3": t("cron.mon.mar"),
      "4": t("cron.mon.apr"), "5": t("cron.mon.may"), "6": t("cron.mon.jun"),
      "7": t("cron.mon.jul"), "8": t("cron.mon.aug"), "9": t("cron.mon.sep"),
      "10": t("cron.mon.oct"), "11": t("cron.mon.nov"), "12": t("cron.mon.dec"),
    };

    // Build time part
    let timePart = "";
    if (min === "*" && hour === "*") {
      timePart = t("cron.desc.everyMinute");
    } else if (min.startsWith("*/") && hour === "*") {
      timePart = t("cron.desc.everyNMin", { n: min.slice(2) });
    } else if (min === "0" && hour.startsWith("*/")) {
      timePart = t("cron.desc.everyNHour", { n: hour.slice(2) });
    } else if (min === "0" && hour === "*") {
      timePart = t("cron.desc.everyHourSharp");
    } else if (hour !== "*" && min !== "*") {
      const h = hour.padStart(2, "0");
      const m = min.padStart(2, "0");
      timePart = `${h}:${m}`;
    } else if (hour !== "*" && min === "*") {
      timePart = t("cron.desc.everyMinOfHour", { hour });
    } else {
      timePart = `${min} ${hour}`;
    }

    // Build date part
    let datePart = "";
    if (dom === "*" && mon === "*" && dow === "*") {
      datePart = t("cron.desc.everyDay");
    } else if (dom === "*" && mon === "*" && dow === "1-5") {
      datePart = t("cron.desc.weekdays");
    } else if (dom === "*" && mon === "*" && dow === "0,6") {
      datePart = t("cron.desc.weekends");
    } else if (dom === "*" && mon === "*" && dow !== "*") {
      // Specific weekdays
      const days = dow.split(",").map(d => dowNames[d] || d).join(", ");
      datePart = t("cron.desc.onDow", { days });
    } else if (dom !== "*" && mon === "*" && dow === "*") {
      datePart = t("cron.desc.onDom", { day: dom });
    } else if (dom !== "*" && mon !== "*" && dow === "*") {
      const monName = monNames[mon] || `${mon}${t("cron.desc.monthSuffix")}`;
      datePart = t("cron.desc.onMonDom", { month: monName, day: dom });
    } else {
      // Fallback for complex combinations
      const segments: string[] = [];
      if (mon !== "*") segments.push(monNames[mon] || `${mon}${t("cron.desc.monthSuffix")}`);
      if (dom !== "*") segments.push(`${dom}${t("cron.desc.daySuffix")}`);
      if (dow !== "*") {
        const days = dow.split(",").map(d => dowNames[d] || d).join(", ");
        segments.push(days);
      }
      datePart = segments.join(" ");
    }

    // Combine
    if (min === "*" && hour === "*") {
      return `${datePart}，${timePart}`;
    }
    return `${datePart} ${timePart} ${t("cron.desc.execute")}`;
  }

  function describeInterval(schedule: string): string {
    // Parse formats: "every 30s", "every 3600s", "30", "3600", "every 5m", "every 2h"
    let s: number;
    const everyMatch = schedule.match(/every\s+(\d+)\s*(s|m|h|d)?/i);
    if (everyMatch) {
      const val = parseInt(everyMatch[1], 10);
      const unit = (everyMatch[2] || "s").toLowerCase();
      s = unit === "m" ? val * 60 : unit === "h" ? val * 3600 : unit === "d" ? val * 86400 : val;
    } else {
      s = parseInt(schedule, 10);
    }
    if (isNaN(s)) return schedule;
    if (s < 60) return t("cron.descriptions.everyNSeconds", { n: s });
    if (s < 3600) return t("cron.descriptions.everyNMinutes", { n: Math.floor(s / 60) });
    if (s < 86400) return t("cron.descriptions.everyNHours", { n: Math.floor(s / 3600) });
    return t("cron.descriptions.everyNDays", { n: Math.floor(s / 86400) });
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-dark-bg-base transition-colors duration-200">
      {/* 页面头部 */}
      <div className="border-b border-gray-200 dark:border-dark-border-subtle bg-white dark:bg-dark-bg-card flex-shrink-0 transition-colors duration-200">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary">
              {t("cron.title")}
            </h1>
            <span className="text-sm text-gray-500 dark:text-dark-text-muted">
              {jobs.length > 0 && t("cron.jobCount", { count: jobs.length })}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadJobs}
              className="flex items-center gap-2 px-3 py-2 text-gray-700 dark:text-dark-text-primary hover:bg-gray-100 dark:hover:bg-dark-bg-hover rounded-lg transition-colors text-sm"
              title={t("cron.refresh")}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={() => setShowAddDialog(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              {t("cron.addJob")}
            </button>
          </div>
        </div>
      </div>

      {/* 任务列表 */}
      <div className="flex-1 min-h-0 overflow-y-auto p-6 scrollbar-thin">
        {/* 重启提示 */}
        <div className="max-w-4xl mx-auto mb-4">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400 flex-shrink-0" />
            <p className="text-sm text-amber-700 dark:text-amber-300">
              {t("cron.restartHint")}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : jobs.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title={t("cron.noJobs")}
            description={t("cron.noJobsDesc")}
          />
        ) : (
          <div className="max-w-4xl mx-auto space-y-3">
            {jobs.map((job, idx) => {
              const isEnabled = job.status === "enabled" || job.status === "active";
              const isCronExpr = job.schedule.includes("*");
              const scheduleDesc = isCronExpr
                ? describeCron(job.schedule)
                : describeInterval(job.schedule);

              return (
                <div
                  key={job.id || idx}
                  className={`group relative bg-white dark:bg-dark-bg-card rounded-xl border overflow-hidden transition-all hover:shadow-md ${
                    isEnabled
                      ? "border-gray-200 dark:border-dark-border-subtle hover:border-blue-200 dark:hover:border-blue-500/40"
                      : "border-gray-200/70 dark:border-dark-border-subtle/50 opacity-75 hover:opacity-100"
                  }`}
                >
                  {/* 左侧状态指示条 */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${
                    isEnabled
                      ? "bg-green-500 dark:bg-green-400"
                      : "bg-gray-300 dark:bg-gray-600"
                  }`} />

                  <div className="pl-5 pr-4 py-4">
                    {/* 上部：名称 + 状态 + 调度 */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-dark-text-primary truncate text-[15px]">
                          {job.name || job.id}
                        </h3>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium flex-shrink-0 ${
                          isEnabled
                            ? "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 ring-1 ring-green-200/60 dark:ring-green-500/30"
                            : "bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 ring-1 ring-gray-200/60 dark:ring-gray-600/30"
                        }`}>
                          {isEnabled ? t("cron.enabled") : t("cron.disabled")}
                        </span>
                      </div>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                        <button
                          onClick={() => toggleJobEnabled(job)}
                          className={`p-1.5 rounded-md transition-colors ${
                            isEnabled
                              ? "text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30"
                              : "text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-bg-hover"
                          }`}
                          title={isEnabled ? t("cron.disable") : t("cron.enable")}
                        >
                          {isEnabled ? <Power className="w-3.5 h-3.5" /> : <PowerOff className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => handleRunJob(job)}
                          className="p-1.5 text-blue-500 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md transition-colors"
                          title={t("cron.runJob")}
                        >
                          <Play className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openEditDialog(job)}
                          className="p-1.5 text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-md transition-colors"
                          title={t("cron.editJob")}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => confirmRemoveJob(job)}
                          className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors"
                          title={t("cron.removeJob")}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* 调度信息 - 突出显示 */}
                    <div className="flex items-center gap-2 mb-2.5">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50/80 dark:bg-blue-900/15 rounded-md">
                        <Timer className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                        <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                          {scheduleDesc}
                        </span>
                      </div>
                      {isCronExpr && (
                        <code className="text-[11px] text-gray-400 dark:text-dark-text-muted font-mono">
                          {job.schedule}
                        </code>
                      )}
                    </div>

                    {/* 消息内容 */}
                    {job.message && (
                      <div className="flex items-start gap-2 mb-2.5">
                        <MessageSquare className="w-3.5 h-3.5 text-gray-400 dark:text-dark-text-muted flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-gray-600 dark:text-dark-text-secondary break-words line-clamp-2 leading-relaxed">
                          {job.message}
                        </p>
                      </div>
                    )}

                    {/* 底部元信息 */}
                    <div className="flex items-center gap-3 text-[11px] text-gray-400 dark:text-dark-text-muted">
                      <span className="font-mono">{job.id}</span>
                      {job.next_run && (
                        <>
                          <span className="text-gray-300 dark:text-gray-600">|</span>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{t("cron.nextRun")}: {job.next_run}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 添加任务对话框 */}
      {showAddDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-dark-bg-card rounded-xl shadow-xl max-w-lg w-full p-6 mx-4 transition-colors duration-200">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${editingJob ? "bg-amber-50 dark:bg-amber-900/30" : "bg-blue-50 dark:bg-blue-900/30"}`}>
                  {editingJob ? (
                    <Pencil className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  ) : (
                    <Plus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  )}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">
                  {editingJob ? t("cron.editJob") : t("cron.addJob")}
                </h3>
              </div>
              <button
                onClick={() => { setShowAddDialog(false); resetForm(); }}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-dark-bg-hover rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-dark-text-muted" />
              </button>
            </div>

            <div className="space-y-4">
              {/* 任务名称 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                  {t("cron.jobName")}
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder={t("cron.jobNamePlaceholder")}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-dark-bg-sidebar border border-gray-200 dark:border-dark-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900 dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-dark-text-muted"
                  autoFocus
                />
              </div>

              {/* 消息内容 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                  {t("cron.messageLabel")}
                </label>
                <textarea
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder={t("cron.messagePlaceholder")}
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-dark-bg-sidebar border border-gray-200 dark:border-dark-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none text-gray-900 dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-dark-text-muted"
                />
              </div>

              {/* 调度类型 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
                  {t("cron.scheduleType")}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setForm({ ...form, scheduleType: "cron" })}
                    className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${
                      form.scheduleType === "cron"
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400"
                        : "border-gray-200 dark:border-dark-border-subtle text-gray-600 dark:text-dark-text-muted hover:border-gray-300"
                    }`}
                  >
                    <CalendarClock className="w-4 h-4" />
                    Cron
                  </button>
                  <button
                    onClick={() => setForm({ ...form, scheduleType: "every" })}
                    className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${
                      form.scheduleType === "every"
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400"
                        : "border-gray-200 dark:border-dark-border-subtle text-gray-600 dark:text-dark-text-muted hover:border-gray-300"
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    {t("cron.interval")}
                  </button>
                  <button
                    onClick={() => setForm({ ...form, scheduleType: "at" })}
                    className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${
                      form.scheduleType === "at"
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400"
                        : "border-gray-200 dark:border-dark-border-subtle text-gray-600 dark:text-dark-text-muted hover:border-gray-300"
                    }`}
                  >
                    <Timer className="w-4 h-4" />
                    {t("cron.runOnce")}
                  </button>
                </div>
              </div>

              {/* Cron 表达式 / 间隔秒数 / 定时执行 */}
              {form.scheduleType === "cron" ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
                    {t("cron.cronExpression")}
                  </label>
                  {/* 五字段输入 */}
                  <div className="grid grid-cols-5 gap-2">
                    {([
                      { key: "cronMinute" as const, label: t("cron.field.minute"), placeholder: "0", hint: "0-59, *, */n" },
                      { key: "cronHour" as const, label: t("cron.field.hour"), placeholder: "9", hint: "0-23, *, */n" },
                      { key: "cronDom" as const, label: t("cron.field.dom"), placeholder: "*", hint: "1-31, *" },
                      { key: "cronMonth" as const, label: t("cron.field.month"), placeholder: "*", hint: "1-12, *" },
                      { key: "cronDow" as const, label: t("cron.field.dow"), placeholder: "*", hint: "0-7, 1-5" },
                    ]).map((field) => (
                      <div key={field.key} className="flex flex-col">
                        <span className="text-xs font-medium text-gray-500 dark:text-dark-text-muted mb-1 text-center">
                          {field.label}
                        </span>
                        <input
                          type="text"
                          value={form[field.key]}
                          onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                          placeholder={field.placeholder}
                          className="w-full px-2 py-2 bg-gray-50 dark:bg-dark-bg-sidebar border border-gray-200 dark:border-dark-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-mono text-center text-gray-900 dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-dark-text-muted"
                        />
                        <span className="text-[10px] text-gray-400 dark:text-dark-text-muted mt-0.5 text-center">
                          {field.hint}
                        </span>
                      </div>
                    ))}
                  </div>
                  {/* 人性化描述 */}
                  <div className="mt-3 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CalendarClock className="w-4 h-4 text-blue-500 dark:text-blue-400 flex-shrink-0" />
                      <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                        {describeCron(getCronExpression())}
                      </span>
                    </div>
                    <p className="text-xs text-blue-500 dark:text-blue-400/70 mt-1 ml-6 font-mono">
                      {getCronExpression()}
                    </p>
                  </div>
                </div>
              ) : form.scheduleType === "every" ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                    {t("cron.intervalSeconds")}
                  </label>
                  <input
                    type="number"
                    value={form.everySeconds}
                    onChange={(e) => setForm({ ...form, everySeconds: e.target.value })}
                    placeholder="3600"
                    min={1}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-dark-bg-sidebar border border-gray-200 dark:border-dark-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900 dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-dark-text-muted"
                  />
                  <div className="mt-3 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-500 dark:text-blue-400 flex-shrink-0" />
                      <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                        {describeInterval(form.everySeconds)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                    {t("cron.atTime")}
                  </label>
                  <input
                    type="datetime-local"
                    value={form.atTime}
                    onChange={(e) => setForm({ ...form, atTime: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-dark-bg-sidebar border border-gray-200 dark:border-dark-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900 dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-dark-text-muted"
                  />
                  <div className="mt-3 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Timer className="w-4 h-4 text-blue-500 dark:text-blue-400 flex-shrink-0" />
                      <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                        {form.atTime ? t("cron.runOnceAt", { time: form.atTime.replace("T", " ") }) : t("cron.selectTime")}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* 投递提示 */}
              <div className="px-3 py-2.5 bg-gray-50 dark:bg-dark-bg-sidebar border border-gray-200 dark:border-dark-border-subtle rounded-lg">
                <div className="flex items-start gap-2">
                  <Send className="w-4 h-4 text-gray-400 dark:text-dark-text-muted flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-gray-500 dark:text-dark-text-muted leading-relaxed">
                    {t("cron.deliverHint")}
                  </p>
                </div>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => { setShowAddDialog(false); resetForm(); }}
                className="px-4 py-2 bg-gray-100 dark:bg-dark-bg-hover hover:bg-gray-200 dark:hover:bg-dark-bg-active text-gray-700 dark:text-dark-text-primary rounded-lg transition-colors text-sm font-medium"
              >
                {t("cron.cancel")}
              </button>
              <button
                onClick={handleAddJob}
                disabled={isSubmitting}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors text-sm font-medium"
              >
                {isSubmitting
                  ? (editingJob ? t("cron.saving") : t("cron.adding"))
                  : (editingJob ? t("cron.save") : t("cron.confirm"))}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 确认对话框 */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type="warning"
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ isOpen: false, title: "", message: "", onConfirm: () => {} })}
      />
    </div>
  );
}
