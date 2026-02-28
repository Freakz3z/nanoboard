/**
 * ClawHub Skills API 类型定义
 * 基于 https://github.com/openclaw/clawhub/blob/master/docs/http-api.md
 */
// ClawHub API 基础 URL
export const CLAWHUB_API_BASE = "https://clawhub.ai";
// 排序选项配置
export const SKILL_SORT_OPTIONS = [
    { value: "trending", labelKey: "skills.sortTrending" },
    { value: "installsCurrent", labelKey: "skills.sortInstalls" },
    { value: "downloads", labelKey: "skills.sortDownloads" },
    { value: "stars", labelKey: "skills.sortStars" },
    { value: "updated", labelKey: "skills.sortUpdated" },
];
