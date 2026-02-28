/**
 * Workspace 工具函数
 */
/**
 * 格式化时间戳为相对时间
 */
export function formatTimestamp(timestamp, t, i18n) {
    if (!timestamp)
        return t("workspace.unknown");
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        if (hours === 0) {
            const minutes = Math.floor(diff / (1000 * 60));
            return minutes <= 1 ? t("workspace.justNow") : t("workspace.minutesAgo", { count: minutes });
        }
        return t("workspace.hoursAgo", { count: hours });
    }
    else if (days === 1) {
        return t("workspace.yesterday");
    }
    else if (days < 7) {
        return t("workspace.daysAgo", { count: days });
    }
    else {
        return date.toLocaleDateString(i18n.language === "en" ? "en-US" : "zh-CN");
    }
}
/**
 * 格式化文件大小
 */
export function formatSize(bytes) {
    if (bytes === 0)
        return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
/**
 * 解析 Frontmatter
 */
export function parseFrontmatter(content) {
    const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
    if (!match)
        return { body: content };
    const raw = match[1];
    const body = content.slice(match[0].length);
    const data = {};
    for (const line of raw.split("\n")) {
        const idx = line.indexOf(":");
        if (idx > 0) {
            const key = line.slice(0, idx).trim();
            const val = line.slice(idx + 1).trim();
            data[key] = val;
        }
    }
    return {
        name: data.name,
        description: data.description,
        body,
    };
}
/**
 * 描述 Cron 表达式
 */
export function describeCron(expression, t) {
    const parts = expression.trim().split(/\s+/);
    if (parts.length !== 5)
        return expression;
    const [min, hour, dom, mon, dow] = parts;
    const dowNames = {
        "0": t("workspace.cronDowSun"),
        "1": t("workspace.cronDowMon"),
        "2": t("workspace.cronDowTue"),
        "3": t("workspace.cronDowWed"),
        "4": t("workspace.cronDowThu"),
        "5": t("workspace.cronDowFri"),
        "6": t("workspace.cronDowSat"),
        "7": t("workspace.cronDowSun"),
    };
    const monNames = {
        "1": t("workspace.cronMonJan"),
        "2": t("workspace.cronMonFeb"),
        "3": t("workspace.cronMonMar"),
        "4": t("workspace.cronMonApr"),
        "5": t("workspace.cronMonMay"),
        "6": t("workspace.cronMonJun"),
        "7": t("workspace.cronMonJul"),
        "8": t("workspace.cronMonAug"),
        "9": t("workspace.cronMonSep"),
        "10": t("workspace.cronMonOct"),
        "11": t("workspace.cronMonNov"),
        "12": t("workspace.cronMonDec"),
    };
    let timePart = "";
    if (min === "*" && hour === "*") {
        timePart = t("workspace.cronDescEveryMinute");
    }
    else if (min.startsWith("*/") && hour === "*") {
        timePart = t("workspace.cronDescEveryNMin", { n: min.slice(2) });
    }
    else if (min === "0" && hour.startsWith("*/")) {
        timePart = t("workspace.cronDescEveryNHour", { n: hour.slice(2) });
    }
    else if (min === "0" && hour === "*") {
        timePart = t("workspace.cronDescEveryHourSharp");
    }
    else if (hour !== "*" && min !== "*") {
        const h = hour.padStart(2, "0");
        const m = min.padStart(2, "0");
        timePart = `${h}:${m}`;
    }
    else if (hour !== "*" && min === "*") {
        timePart = t("workspace.cronDescEveryMinOfHour", { hour });
    }
    else {
        timePart = `${min} ${hour}`;
    }
    let datePart = "";
    if (dom === "*" && mon === "*" && dow === "*") {
        datePart = t("workspace.cronDescEveryDay");
    }
    else if (dom === "*" && mon === "*" && dow === "1-5") {
        datePart = t("workspace.cronDescWeekdays");
    }
    else if (dom === "*" && mon === "*" && dow === "0,6") {
        datePart = t("workspace.cronDescWeekends");
    }
    else if (dom === "*" && mon === "*" && dow !== "*") {
        const days = dow.split(",").map((d) => dowNames[d] || d).join(", ");
        datePart = t("workspace.cronDescOnDow", { days });
    }
    else if (dom !== "*" && mon === "*" && dow === "*") {
        datePart = t("workspace.cronDescOnDom", { day: dom });
    }
    else if (dom !== "*" && mon !== "*" && dow === "*") {
        const monName = monNames[mon] || `${mon}${t("workspace.cronDescMonthSuffix")}`;
        datePart = t("workspace.cronDescOnMonDom", { month: monName, day: dom });
    }
    else {
        const segments = [];
        if (mon !== "*")
            segments.push(monNames[mon] || `${mon}${t("workspace.cronDescMonthSuffix")}`);
        if (dom !== "*")
            segments.push(`${dom}${t("workspace.cronDescDaySuffix")}`);
        if (dow !== "*") {
            const days = dow.split(",").map((d) => dowNames[d] || d).join(", ");
            segments.push(days);
        }
        datePart = segments.join(" ");
    }
    if (min === "*" && hour === "*") {
        return `${datePart}，${timePart}`;
    }
    return `${datePart} ${timePart} ${t("workspace.cronDescExecute")}`;
}
/**
 * 描述间隔时间 (毫秒)
 */
export function describeIntervalMs(ms, t) {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60)
        return t("workspace.cronEveryNSeconds", { n: seconds });
    if (seconds < 3600)
        return t("workspace.cronEveryNMinutes", { n: Math.floor(seconds / 60) });
    if (seconds < 86400)
        return t("workspace.cronEveryNHours", { n: Math.floor(seconds / 3600) });
    return t("workspace.cronEveryNDays", { n: Math.floor(seconds / 86400) });
}
/**
 * 格式化 Cron 时间戳
 */
export function formatCronTimestamp(ms) {
    if (ms === null)
        return "-";
    const date = new Date(ms);
    return date.toLocaleString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}
/**
 * 格式化 Cron 相对时间
 */
export function formatCronRelativeTime(ms, t) {
    if (ms === null)
        return "-";
    const now = Date.now();
    const diff = ms - now;
    if (diff < 0)
        return t("workspace.cronExpired");
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (days > 0)
        return t("workspace.cronDaysLater", { count: days });
    if (hours > 0)
        return t("workspace.cronHoursLater", { count: hours });
    if (minutes > 0)
        return t("workspace.cronMinutesLater", { count: minutes });
    return t("workspace.cronSoon");
}
/**
 * 描述调度
 */
export function describeSchedule(schedule, t) {
    if (!schedule)
        return "-";
    switch (schedule.kind) {
        case "cron":
            return describeCron(schedule.expr || "", t);
        case "every":
            if (schedule.everyMs) {
                return describeIntervalMs(schedule.everyMs, t);
            }
            return t("workspace.cronIntervalExecute");
        case "at":
            if (schedule.atMs) {
                return `${formatCronTimestamp(schedule.atMs)} ${t("workspace.cronExecuteOnce")}`;
            }
            return t("workspace.cronTimedExecute");
        default:
            return "-";
    }
}
