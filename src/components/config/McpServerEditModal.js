import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * MCP Server 编辑模态框组件
 */
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Plug, Trash2, Terminal, Globe } from "lucide-react";
export default function McpServerEditModal({ isOpen, serverId, server, mode, onClose, onSave, onDelete, }) {
    const { t } = useTranslation();
    const [transport, setTransport] = useState("stdio");
    const [name, setName] = useState("");
    const [command, setCommand] = useState("");
    const [args, setArgs] = useState("");
    const [url, setUrl] = useState("");
    const [env, setEnv] = useState("");
    const [headers, setHeaders] = useState("");
    const [toolTimeout, setToolTimeout] = useState(30);
    useEffect(() => {
        if (isOpen) {
            if (server) {
                setTransport(server.url ? "http" : "stdio");
                setName(serverId);
                setCommand(server.command || "");
                setArgs(server.args?.join(" ") || "");
                setUrl(server.url || "");
                setEnv(server.env
                    ? Object.entries(server.env)
                        .map(([k, v]) => `${k}=${v}`)
                        .join("\n")
                    : "");
                setHeaders(server.headers
                    ? Object.entries(server.headers)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join("\n")
                    : "");
                setToolTimeout(server.toolTimeout || 30);
            }
            else {
                setTransport("stdio");
                setName("");
                setCommand("");
                setArgs("");
                setUrl("");
                setEnv("");
                setHeaders("");
                setToolTimeout(30);
            }
        }
    }, [isOpen, server, serverId]);
    if (!isOpen)
        return null;
    const handleSave = () => {
        const serverName = name.trim();
        if (!serverName)
            return;
        const newServer = {};
        if (transport === "stdio") {
            if (command.trim()) {
                newServer.command = command.trim();
            }
            if (args.trim()) {
                newServer.args = args.trim().split(/\s+/).filter(Boolean);
            }
            if (env.trim()) {
                const envVars = {};
                env.split("\n").forEach((line) => {
                    const [key, ...valueParts] = line.split("=");
                    if (key && valueParts.length > 0) {
                        envVars[key.trim()] = valueParts.join("=").trim();
                    }
                });
                if (Object.keys(envVars).length > 0) {
                    newServer.env = envVars;
                }
            }
        }
        else {
            if (url.trim()) {
                newServer.url = url.trim();
            }
            if (headers.trim()) {
                const headersObj = {};
                headers.split("\n").forEach((line) => {
                    const colonIndex = line.indexOf(":");
                    if (colonIndex > 0) {
                        const key = line.slice(0, colonIndex).trim();
                        const value = line.slice(colonIndex + 1).trim();
                        if (key && value) {
                            headersObj[key] = value;
                        }
                    }
                });
                if (Object.keys(headersObj).length > 0) {
                    newServer.headers = headersObj;
                }
            }
        }
        // 添加 toolTimeout（如果不是默认值 30 秒）
        if (toolTimeout && toolTimeout !== 30) {
            newServer.toolTimeout = toolTimeout;
        }
        onSave(serverName, newServer);
        onClose();
    };
    return (_jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50", children: _jsxs("div", { className: "bg-white dark:bg-dark-bg-card rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col transition-colors duration-200", onClick: (e) => e.stopPropagation(), children: [_jsxs("div", { className: "p-6 border-b border-gray-200 dark:border-dark-border-subtle", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/30", children: _jsx(Plug, { className: "w-6 h-6 text-emerald-600 dark:text-emerald-400" }) }), _jsx("div", { children: _jsx("h3", { className: "text-lg font-semibold text-gray-900 dark:text-dark-text-primary", children: mode === "add"
                                            ? t("mcp.addServer")
                                            : t("mcp.editServer", { name: serverId }) }) })] }), _jsxs("div", { className: "flex gap-2 mt-4", children: [_jsxs("button", { onClick: () => setTransport("stdio"), className: `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${transport === "stdio"
                                        ? "bg-blue-600 text-white"
                                        : "bg-gray-100 dark:bg-dark-bg-hover text-gray-700 dark:text-dark-text-primary hover:bg-gray-200 dark:hover:bg-dark-bg-active"}`, children: [_jsx(Terminal, { className: "w-4 h-4" }), t("mcp.stdio")] }), _jsxs("button", { onClick: () => setTransport("http"), className: `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${transport === "http"
                                        ? "bg-blue-600 text-white"
                                        : "bg-gray-100 dark:bg-dark-bg-hover text-gray-700 dark:text-dark-text-primary hover:bg-gray-200 dark:hover:bg-dark-bg-active"}`, children: [_jsx(Globe, { className: "w-4 h-4" }), t("mcp.http")] })] })] }), _jsx("div", { className: "flex-1 overflow-y-auto p-6", children: _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm text-gray-600 dark:text-dark-text-secondary mb-1", children: t("mcp.serverName") }), _jsx("input", { type: "text", value: name, onChange: (e) => setName(e.target.value), placeholder: t("mcp.serverNamePlaceholder"), disabled: mode === "edit", className: "w-full px-3 py-2 bg-gray-50 dark:bg-dark-bg-sidebar border border-gray-200 dark:border-dark-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900 dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-dark-text-muted disabled:opacity-50" })] }), transport === "stdio" ? (_jsxs(_Fragment, { children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm text-gray-600 dark:text-dark-text-secondary mb-1", children: t("mcp.command") }), _jsx("input", { type: "text", value: command, onChange: (e) => setCommand(e.target.value), placeholder: "npx", className: "w-full px-3 py-2 bg-gray-50 dark:bg-dark-bg-sidebar border border-gray-200 dark:border-dark-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900 dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-dark-text-muted" }), _jsx("p", { className: "text-xs text-gray-400 dark:text-dark-text-muted mt-1", children: t("mcp.commandDesc") })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm text-gray-600 dark:text-dark-text-secondary mb-1", children: t("mcp.args") }), _jsx("input", { type: "text", value: args, onChange: (e) => setArgs(e.target.value), placeholder: "-y @modelcontextprotocol/server-filesystem /path/to/dir", className: "w-full px-3 py-2 bg-gray-50 dark:bg-dark-bg-sidebar border border-gray-200 dark:border-dark-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900 dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-dark-text-muted" }), _jsx("p", { className: "text-xs text-gray-400 dark:text-dark-text-muted mt-1", children: t("mcp.argsDesc") })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm text-gray-600 dark:text-dark-text-secondary mb-1", children: t("mcp.env") }), _jsx("textarea", { value: env, onChange: (e) => setEnv(e.target.value), placeholder: "NODE_ENV=production\nAPI_KEY=xxx", rows: 3, className: "w-full px-3 py-2 bg-gray-50 dark:bg-dark-bg-sidebar border border-gray-200 dark:border-dark-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900 dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-dark-text-muted resize-none" }), _jsx("p", { className: "text-xs text-gray-400 dark:text-dark-text-muted mt-1", children: t("mcp.envDesc") })] })] })) : (_jsxs(_Fragment, { children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm text-gray-600 dark:text-dark-text-secondary mb-1", children: t("mcp.url") }), _jsx("input", { type: "text", value: url, onChange: (e) => setUrl(e.target.value), placeholder: "https://mcp.example.com/sse", className: "w-full px-3 py-2 bg-gray-50 dark:bg-dark-bg-sidebar border border-gray-200 dark:border-dark-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900 dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-dark-text-muted" }), _jsx("p", { className: "text-xs text-gray-400 dark:text-dark-text-muted mt-1", children: t("mcp.urlDesc") })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm text-gray-600 dark:text-dark-text-secondary mb-1", children: t("mcp.headers") }), _jsx("textarea", { value: headers, onChange: (e) => setHeaders(e.target.value), placeholder: "Authorization: Bearer xxx\nX-API-Key: yyy", rows: 3, className: "w-full px-3 py-2 bg-gray-50 dark:bg-dark-bg-sidebar border border-gray-200 dark:border-dark-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900 dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-dark-text-muted resize-none" }), _jsx("p", { className: "text-xs text-gray-400 dark:text-dark-text-muted mt-1", children: t("mcp.headersDesc") })] })] })), _jsxs("div", { children: [_jsx("label", { className: "block text-sm text-gray-600 dark:text-dark-text-secondary mb-1", children: t("mcp.toolTimeout") }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("input", { type: "number", min: "1", max: "600", value: toolTimeout, onChange: (e) => setToolTimeout(parseInt(e.target.value) || 30), className: "w-full px-3 py-2 bg-gray-50 dark:bg-dark-bg-sidebar border border-gray-200 dark:border-dark-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900 dark:text-dark-text-primary" }), _jsx("span", { className: "text-sm text-gray-500 dark:text-dark-text-muted whitespace-nowrap", children: t("config.seconds") })] }), _jsx("p", { className: "text-xs text-gray-400 dark:text-dark-text-muted mt-1", children: t("mcp.toolTimeoutDesc") })] })] }) }), _jsxs("div", { className: "p-6 border-t border-gray-200 dark:border-dark-border-subtle flex items-center justify-between gap-3", children: [_jsx("div", { children: mode === "edit" && onDelete && (_jsxs("button", { onClick: () => {
                                    onDelete(serverId);
                                    onClose();
                                }, className: "flex items-center gap-1 px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors text-sm font-medium", children: [_jsx(Trash2, { className: "w-4 h-4" }), t("mcp.deleteServer")] })) }), _jsxs("div", { className: "flex gap-3", children: [_jsx("button", { onClick: onClose, className: "px-4 py-2 bg-gray-100 dark:bg-dark-bg-hover hover:bg-gray-200 dark:hover:bg-dark-bg-active text-gray-700 dark:text-dark-text-primary rounded-lg transition-colors text-sm font-medium", children: t("config.cancel") }), _jsx("button", { onClick: handleSave, disabled: !name.trim() || (transport === "stdio" && !command.trim()) || (transport === "http" && !url.trim()), className: "px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm font-medium", children: mode === "add" ? t("mcp.add") : t("config.save") })] })] })] }) }));
}
