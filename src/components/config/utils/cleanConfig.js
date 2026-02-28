import { AVAILABLE_PROVIDERS } from "@/config/providers";
const VALID_CHANNELS = [
    "telegram",
    "discord",
    "whatsapp",
    "mochat",
    "feishu",
    "dingtalk",
    "slack",
    "qq",
    "matrix",
    "email",
];
const CHANNEL_TOP_LEVEL_KEYS = ["sendProgress", "sendToolHints"];
/**
 * 清理配置，移除仅用于 UI 的辅助字段，确保符合 nanobot 官方格式
 */
export function cleanConfigForSave(config, mcpServersConfig) {
    const cleaned = {
        ...config,
    };
    // 清理 providers
    if (config.providers) {
        cleaned.providers = {};
        for (const [key, provider] of Object.entries(config.providers)) {
            const { default_model, models, name, ...rest } = provider;
            const cleanProvider = {};
            for (const [k, v] of Object.entries(rest)) {
                if (v !== null && v !== undefined) {
                    cleanProvider[k] = v;
                }
            }
            // 自动填充默认 apiBase
            const providerInfo = AVAILABLE_PROVIDERS.find((p) => p.id === key);
            const defaultApiBase = providerInfo?.apiBase;
            if (cleanProvider.apiKey && !cleanProvider.apiBase && defaultApiBase) {
                cleanProvider.apiBase = defaultApiBase;
            }
            // 只保存有实际配置的 provider
            if (cleanProvider.apiKey) {
                cleaned.providers[key] = cleanProvider;
            }
        }
    }
    // 清理 channels
    if (config.channels) {
        cleaned.channels = {};
        // 处理顶层配置字段
        for (const topLevelKey of CHANNEL_TOP_LEVEL_KEYS) {
            if (config.channels[topLevelKey] !== undefined) {
                cleaned.channels[topLevelKey] = config.channels[topLevelKey];
            }
        }
        // 处理各个 channel 配置
        for (const [key, channel] of Object.entries(config.channels)) {
            if (CHANNEL_TOP_LEVEL_KEYS.includes(key)) {
                continue;
            }
            if (!VALID_CHANNELS.includes(key)) {
                console.warn(`[cleanConfigForSave] Skipping invalid channel key: ${key}`);
                continue;
            }
            const cleanedChannel = {};
            for (const [k, v] of Object.entries(channel)) {
                if (v !== null && v !== undefined) {
                    cleanedChannel[k] = v;
                }
            }
            // 转换 allowFrom 字符串为列表
            if (cleanedChannel.allowFrom !== undefined) {
                if (typeof cleanedChannel.allowFrom === "string") {
                    if (cleanedChannel.allowFrom.trim() === "") {
                        cleanedChannel.allowFrom = [];
                    }
                    else {
                        cleanedChannel.allowFrom = cleanedChannel.allowFrom
                            .split(",")
                            .map((s) => s.trim())
                            .filter((s) => s.length > 0);
                    }
                }
                else if (Array.isArray(cleanedChannel.allowFrom)) {
                    cleanedChannel.allowFrom = cleanedChannel.allowFrom.filter((s) => s.trim().length > 0);
                }
            }
            cleaned.channels[key] = cleanedChannel;
        }
    }
    // 清理 tools.mcpServers - 只保存启用的服务器
    const enabledServers = {};
    for (const [serverId, server] of Object.entries(mcpServersConfig)) {
        if (!server.disabled) {
            const { disabled, type, ...serverWithoutUiFields } = server;
            const cleanServer = {};
            for (const [k, v] of Object.entries(serverWithoutUiFields)) {
                if (v !== null && v !== undefined) {
                    cleanServer[k] = v;
                }
            }
            if (Object.keys(cleanServer).length > 0) {
                enabledServers[serverId] = cleanServer;
            }
        }
    }
    cleaned.tools = {
        ...config.tools,
        mcpServers: enabledServers,
    };
    // 清理 tools 中的 null 值
    if (cleaned.tools) {
        const cleanTools = {};
        for (const [k, v] of Object.entries(cleaned.tools)) {
            if (v !== null && v !== undefined) {
                cleanTools[k] = v;
            }
        }
        cleaned.tools = cleanTools;
    }
    return cleaned;
}
