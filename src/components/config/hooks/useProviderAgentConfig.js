import { useCallback } from "react";
import { AVAILABLE_PROVIDERS } from "@/config/providers";
const PROVIDER_AGENT_CONFIGS_KEY = "nanoboard_provider_agent_configs";
/**
 * Provider Agent 配置管理 Hook
 */
export function useProviderAgentConfig() {
    // 获取所有 Provider 的独立配置
    const getProviderAgentConfigs = useCallback(() => {
        try {
            const saved = localStorage.getItem(PROVIDER_AGENT_CONFIGS_KEY);
            if (saved) {
                return JSON.parse(saved);
            }
        }
        catch (e) {
            console.error("Failed to load provider agent configs:", e);
        }
        return {};
    }, []);
    // 保存所有 Provider 的独立配置
    const saveProviderAgentConfigs = useCallback((configs) => {
        try {
            localStorage.setItem(PROVIDER_AGENT_CONFIGS_KEY, JSON.stringify(configs));
        }
        catch (e) {
            console.error("Failed to save provider agent configs:", e);
        }
    }, []);
    // 获取指定 Provider 的 Agent 配置
    const getProviderAgentConfig = useCallback((providerId) => {
        const configs = getProviderAgentConfigs();
        const providerConfig = configs[providerId];
        if (providerConfig) {
            return providerConfig;
        }
        // 返回推荐的默认配置
        const providerInfo = AVAILABLE_PROVIDERS.find((p) => p.id === providerId);
        return {
            model: providerInfo?.defaultModel || "",
            max_tokens: 8192,
            max_tool_iterations: 20,
            memory_window: 50,
            temperature: 0.7,
            workspace: "~/.nanobot/workspace",
        };
    }, [getProviderAgentConfigs]);
    // 更新 Provider 的独立 Agent 配置
    const updateProviderAgentConfig = useCallback((providerId, field, value) => {
        const configs = getProviderAgentConfigs();
        const currentConfig = (configs[providerId] || {});
        configs[providerId] = {
            ...currentConfig,
            [field]: value,
        };
        saveProviderAgentConfigs(configs);
    }, [getProviderAgentConfigs, saveProviderAgentConfigs]);
    // 构建应用的配置对象
    const buildAgentDefaults = useCallback((providerId, providerAgentConfig) => {
        const providerInfo = AVAILABLE_PROVIDERS.find((p) => p.id === providerId);
        const config = providerAgentConfig || getProviderAgentConfig(providerId);
        return {
            provider: providerId,
            model: config.model || providerInfo?.defaultModel || "",
            maxTokens: config.max_tokens || 8192,
            maxToolIterations: config.max_tool_iterations ?? 20,
            memoryWindow: config.memory_window ?? 50,
            temperature: config.temperature ?? 0.7,
            workspace: config.workspace || "~/.nanobot/workspace",
        };
    }, [getProviderAgentConfig]);
    return {
        getProviderAgentConfigs,
        saveProviderAgentConfigs,
        getProviderAgentConfig,
        updateProviderAgentConfig,
        buildAgentDefaults,
    };
}
