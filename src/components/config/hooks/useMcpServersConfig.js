import { useCallback } from "react";
const MCP_SERVERS_STORAGE_KEY = "nanoboard_mcp_servers";
/**
 * MCP Server 配置管理 Hook
 */
export function useMcpServersConfig() {
    // 加载 MCP 服务器配置
    const loadMcpServersConfig = useCallback(() => {
        try {
            const saved = localStorage.getItem(MCP_SERVERS_STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                return parsed;
            }
        }
        catch (error) {
            console.error("Failed to load MCP servers config:", error);
        }
        return {};
    }, []);
    // 保存 MCP 服务器配置
    const saveMcpServersConfig = useCallback((data) => {
        try {
            localStorage.setItem(MCP_SERVERS_STORAGE_KEY, JSON.stringify(data));
        }
        catch (error) {
            console.error("Failed to save MCP servers config:", error);
        }
    }, []);
    // 合并 config.json 和 localStorage 的 MCP 配置
    const mergeMcpConfig = useCallback((savedConfig, configMcpServers) => {
        const merged = {};
        // 先添加 localStorage 中保存的服务器
        for (const [serverId, server] of Object.entries(savedConfig)) {
            merged[serverId] = {
                ...server,
                disabled: server.disabled === true,
            };
        }
        // 再添加 config.json 中的服务器（标记为启用）
        for (const [serverId, server] of Object.entries(configMcpServers)) {
            if (!merged[serverId]) {
                merged[serverId] = { ...server, disabled: false };
            }
        }
        return merged;
    }, []);
    return {
        loadMcpServersConfig,
        saveMcpServersConfig,
        mergeMcpConfig,
    };
}
