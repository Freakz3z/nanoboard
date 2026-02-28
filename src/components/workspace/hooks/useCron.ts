import { useCallback } from "react";
import type { CronJob } from "@/types";

/**
 * Cron 表单数据类型
 */
export interface CronFormData {
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
  tz: string;
}

/**
 * Cron schedule 类型
 */
export interface CronSchedule {
  type: "interval" | "cron" | "once";
  value: string;
}

/**
 * Cron 表单数据类型
 */
export interface CronFormData {
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
  tz: string;
}

/**
 * Cron 相关 Hook
 */
export function useCron() {
  /**
   * 重置 Cron 表单
   */
  const resetCronForm = useCallback((): CronFormData => {
    return {
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
      tz: "",
    };
  }, []);

  /**
   * 获取 Cron 表达式
   */
  const getCronExpression = useCallback((form: CronFormData): string => {
    return `${form.cronMinute} ${form.cronHour} ${form.cronDom} ${form.cronMonth} ${form.cronDow}`;
  }, []);

  /**
   * 打开编辑 Cron 对话框
   */
  const openEditCronDialog = useCallback((job: CronJob): CronFormData => {
    const schedule = job.schedule;
    let scheduleType: "cron" | "every" | "at" = "cron";
    let cronMinute = "0",
      cronHour = "9",
      cronDom = "*",
      cronMonth = "*",
      cronDow = "*";
    let everySeconds = "3600";
    let atTime = "";

    if (schedule?.kind === "every") {
      scheduleType = "every";
      if (schedule.everyMs) {
        everySeconds = String(Math.floor(schedule.everyMs / 1000));
      }
    } else if (schedule?.kind === "cron" && schedule.expr) {
      scheduleType = "cron";
      const parts = schedule.expr.trim().split(/\s+/);
      if (parts.length === 5) {
        [cronMinute, cronHour, cronDom, cronMonth, cronDow] = parts;
      }
    } else if (schedule?.kind === "at" && schedule.atMs) {
      scheduleType = "at";
      const date = new Date(schedule.atMs);
      atTime = date.toISOString().slice(0, 16);
    }

    return {
      name: job.name || "",
      message: job.payload?.message || "",
      scheduleType,
      cronMinute,
      cronHour,
      cronDom,
      cronMonth,
      cronDow,
      everySeconds,
      atTime,
      tz: job.schedule?.tz || "",
    };
  }, []);

  return {
    resetCronForm,
    getCronExpression,
    openEditCronDialog,
  };
}
