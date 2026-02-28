/**
 * 格式化工具函数
 */
/**
 * 格式化时间戳为本地日期时间字符串
 */
export function formatTimestamp(timestamp, language = "zh") {
    return new Date(timestamp * 1000).toLocaleString(language === "en" ? "en-US" : "zh-CN");
}
/**
 * 格式化文件大小
 */
export function formatSize(bytes) {
    if (bytes < 1024)
        return `${bytes} B`;
    if (bytes < 1024 * 1024)
        return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
/**
 * 格式化相对时间
 */
export function formatRelativeTime(timestamp, language = "zh") {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        if (hours === 0) {
            const minutes = Math.floor(diff / (1000 * 60));
            if (language === "en") {
                return minutes <= 1 ? "Just now" : `${minutes} minutes ago`;
            }
            return minutes <= 1 ? "刚刚" : `${minutes} 分钟前`;
        }
        return language === "en" ? `${hours} hours ago` : `${hours} 小时前`;
    }
    else if (days === 1) {
        return language === "en" ? "Yesterday" : "昨天";
    }
    else if (days < 7) {
        return language === "en" ? `${days} days ago` : `${days} 天前`;
    }
    else {
        return date.toLocaleDateString(language === "en" ? "en-US" : "zh-CN");
    }
}
/**
 * 格式化日期时间（用于模板创建时间等）
 */
export function formatDateTime(date, language = "zh") {
    const d = typeof date === "number" ? new Date(date) : date;
    return d.toLocaleString(language === "en" ? "en-US" : "zh-CN");
}
