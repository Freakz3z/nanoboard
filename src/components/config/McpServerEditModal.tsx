/**
 * MCP Server 编辑模态框组件
 */

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Plug, Trash2, Terminal, Globe } from "lucide-react";
import type { McpServer } from "@/config/types";

interface McpServerEditModalProps {
  isOpen: boolean;
  serverId: string;
  server: McpServer | null;
  mode: "add" | "edit";
  onClose: () => void;
  onSave: (id: string, server: McpServer) => void;
  onDelete?: (id: string) => void;
}

export default function McpServerEditModal({
  isOpen,
  serverId,
  server,
  mode,
  onClose,
  onSave,
  onDelete,
}: McpServerEditModalProps) {
  const { t } = useTranslation();
  const [transport, setTransport] = useState<"stdio" | "http">("stdio");
  const [name, setName] = useState("");
  const [command, setCommand] = useState("");
  const [args, setArgs] = useState("");
  const [url, setUrl] = useState("");
  const [env, setEnv] = useState("");
  const [headers, setHeaders] = useState("");
  const [toolTimeout, setToolTimeout] = useState<number>(30);

  useEffect(() => {
    if (isOpen) {
      if (server) {
        setTransport(server.url ? "http" : "stdio");
        setName(serverId);
        setCommand(server.command || "");
        setArgs(server.args?.join(" ") || "");
        setUrl(server.url || "");
        setEnv(
          server.env
            ? Object.entries(server.env)
                .map(([k, v]) => `${k}=${v}`)
                .join("\n")
            : ""
        );
        setHeaders(
          server.headers
            ? Object.entries(server.headers)
                .map(([k, v]) => `${k}: ${v}`)
                .join("\n")
            : ""
        );
        setToolTimeout(server.toolTimeout || 30);
      } else {
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

  if (!isOpen) return null;

  const handleSave = () => {
    const serverName = name.trim();
    if (!serverName) return;

    const newServer: McpServer = {};

    if (transport === "stdio") {
      if (command.trim()) {
        newServer.command = command.trim();
      }
      if (args.trim()) {
        newServer.args = args.trim().split(/\s+/).filter(Boolean);
      }
      if (env.trim()) {
        const envVars: Record<string, string> = {};
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
    } else {
      if (url.trim()) {
        newServer.url = url.trim();
      }
      if (headers.trim()) {
        const headersObj: Record<string, string> = {};
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div
        className="bg-white dark:bg-dark-bg-card rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col transition-colors duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="p-6 border-b border-gray-200 dark:border-dark-border-subtle">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/30">
              <Plug className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">
                {mode === "add"
                  ? t("mcp.addServer")
                  : t("mcp.editServer", { name: serverId })}
              </h3>
            </div>
          </div>

          {/* 传输模式切换 */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setTransport("stdio")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                transport === "stdio"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-dark-bg-hover text-gray-700 dark:text-dark-text-primary hover:bg-gray-200 dark:hover:bg-dark-bg-active"
              }`}
            >
              <Terminal className="w-4 h-4" />
              {t("mcp.stdio")}
            </button>
            <button
              onClick={() => setTransport("http")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                transport === "http"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-dark-bg-hover text-gray-700 dark:text-dark-text-primary hover:bg-gray-200 dark:hover:bg-dark-bg-active"
              }`}
            >
              <Globe className="w-4 h-4" />
              {t("mcp.http")}
            </button>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {/* 服务器名称 */}
            <div>
              <label className="block text-sm text-gray-600 dark:text-dark-text-secondary mb-1">
                {t("mcp.serverName")}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("mcp.serverNamePlaceholder")}
                disabled={mode === "edit"}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-dark-bg-sidebar border border-gray-200 dark:border-dark-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900 dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-dark-text-muted disabled:opacity-50"
              />
            </div>

            {transport === "stdio" ? (
              <>
                {/* Command */}
                <div>
                  <label className="block text-sm text-gray-600 dark:text-dark-text-secondary mb-1">
                    {t("mcp.command")}
                  </label>
                  <input
                    type="text"
                    value={command}
                    onChange={(e) => setCommand(e.target.value)}
                    placeholder="npx"
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-dark-bg-sidebar border border-gray-200 dark:border-dark-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900 dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-dark-text-muted"
                  />
                  <p className="text-xs text-gray-400 dark:text-dark-text-muted mt-1">
                    {t("mcp.commandDesc")}
                  </p>
                </div>

                {/* Args */}
                <div>
                  <label className="block text-sm text-gray-600 dark:text-dark-text-secondary mb-1">
                    {t("mcp.args")}
                  </label>
                  <input
                    type="text"
                    value={args}
                    onChange={(e) => setArgs(e.target.value)}
                    placeholder="-y @modelcontextprotocol/server-filesystem /path/to/dir"
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-dark-bg-sidebar border border-gray-200 dark:border-dark-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900 dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-dark-text-muted"
                  />
                  <p className="text-xs text-gray-400 dark:text-dark-text-muted mt-1">
                    {t("mcp.argsDesc")}
                  </p>
                </div>

                {/* Env */}
                <div>
                  <label className="block text-sm text-gray-600 dark:text-dark-text-secondary mb-1">
                    {t("mcp.env")}
                  </label>
                  <textarea
                    value={env}
                    onChange={(e) => setEnv(e.target.value)}
                    placeholder="NODE_ENV=production&#10;API_KEY=xxx"
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-dark-bg-sidebar border border-gray-200 dark:border-dark-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900 dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-dark-text-muted resize-none"
                  />
                  <p className="text-xs text-gray-400 dark:text-dark-text-muted mt-1">
                    {t("mcp.envDesc")}
                  </p>
                </div>
              </>
            ) : (
              <>
                {/* URL */}
                <div>
                  <label className="block text-sm text-gray-600 dark:text-dark-text-secondary mb-1">
                    {t("mcp.url")}
                  </label>
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://mcp.example.com/sse"
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-dark-bg-sidebar border border-gray-200 dark:border-dark-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900 dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-dark-text-muted"
                  />
                  <p className="text-xs text-gray-400 dark:text-dark-text-muted mt-1">
                    {t("mcp.urlDesc")}
                  </p>
                </div>

                {/* Headers (HTTP Auth) */}
                <div>
                  <label className="block text-sm text-gray-600 dark:text-dark-text-secondary mb-1">
                    {t("mcp.headers")}
                  </label>
                  <textarea
                    value={headers}
                    onChange={(e) => setHeaders(e.target.value)}
                    placeholder="Authorization: Bearer xxx&#10;X-API-Key: yyy"
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-dark-bg-sidebar border border-gray-200 dark:border-dark-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900 dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-dark-text-muted resize-none"
                  />
                  <p className="text-xs text-gray-400 dark:text-dark-text-muted mt-1">
                    {t("mcp.headersDesc")}
                  </p>
                </div>
              </>
            )}

            {/* Tool Timeout - 通用配置 */}
            <div>
              <label className="block text-sm text-gray-600 dark:text-dark-text-secondary mb-1">
                {t("mcp.toolTimeout")}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="600"
                  value={toolTimeout}
                  onChange={(e) => setToolTimeout(parseInt(e.target.value) || 30)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-dark-bg-sidebar border border-gray-200 dark:border-dark-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900 dark:text-dark-text-primary"
                />
                <span className="text-sm text-gray-500 dark:text-dark-text-muted whitespace-nowrap">
                  {t("config.seconds")}
                </span>
              </div>
              <p className="text-xs text-gray-400 dark:text-dark-text-muted mt-1">
                {t("mcp.toolTimeoutDesc")}
              </p>
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="p-6 border-t border-gray-200 dark:border-dark-border-subtle flex items-center justify-between gap-3">
          {/* 左侧：删除按钮 */}
          <div>
            {mode === "edit" && onDelete && (
              <button
                onClick={() => {
                  onDelete(serverId);
                  onClose();
                }}
                className="flex items-center gap-1 px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors text-sm font-medium"
              >
                <Trash2 className="w-4 h-4" />
                {t("mcp.deleteServer")}
              </button>
            )}
          </div>
          {/* 右侧：取消和保存按钮 */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 dark:bg-dark-bg-hover hover:bg-gray-200 dark:hover:bg-dark-bg-active text-gray-700 dark:text-dark-text-primary rounded-lg transition-colors text-sm font-medium"
            >
              {t("config.cancel")}
            </button>
            <button
              onClick={handleSave}
              disabled={!name.trim() || (transport === "stdio" && !command.trim()) || (transport === "http" && !url.trim())}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm font-medium"
            >
              {mode === "add" ? t("mcp.add") : t("config.save")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
