import { useEffect, useState } from "react";
import { processApi, configApi } from "../lib/tauri";
import { useToast } from "../contexts/ToastContext";
import {
  Play,
  Square,
  Activity,
  CheckCircle,
  Clock,
  FileText,
  Download,
  Rocket,
  Zap,
  Cpu,
  HardDrive,
  Info,
  RefreshCw,
  MessageSquare,
  Bot,
  Server,
} from "lucide-react";

interface Status {
  running: boolean;
  port?: number;
  uptime?: string;
}

interface SystemInfo {
  cpu: {
    usage: number;
    usage_text: string;
  };
  memory: {
    total: number;
    total_text: string;
    used: number;
    used_text: string;
    available: number;
    available_text: string;
    usage_percent: number;
    usage_text: string;
  };
}

interface NanobotVersion {
  installed: boolean;
  version: string | null;
  message: string;
}

interface Config {
  providers?: Record<string, any>;
  agents?: {
    defaults?: {
      model?: string;
      max_tokens?: number;
      temperature?: number;
    };
  };
  channels?: Record<string, any>;
}

export default function Dashboard() {
  const [status, setStatus] = useState<Status>({ running: false });
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [nanobotVersion, setNanobotVersion] = useState<NanobotVersion | null>(null);
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  // 刷新所有状态的函数
  async function refreshAll() {
    await Promise.all([
      loadStatus(),
      loadSystemInfo(),
      loadConfig(),
    ]);
  }

  useEffect(() => {
    // 初始加载
    refreshAll();
    loadNanobotVersion();

    // 定时刷新（每1秒）
    const interval = setInterval(() => {
      refreshAll();
    }, 1000);

    // 页面可见性变化时立即刷新
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refreshAll();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 页面获得焦点时也刷新
    const handleFocus = () => {
      refreshAll();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  async function loadStatus() {
    try {
      const result = await processApi.getStatus();
      setStatus(result);
    } catch (error) {
      console.error("获取状态失败:", error);
    }
  }

  async function loadSystemInfo() {
    try {
      const result = await processApi.getSystemInfo();
      setSystemInfo(result);
    } catch (error) {
      console.error("获取系统信息失败:", error);
    }
  }

  async function loadNanobotVersion() {
    try {
      const result = await processApi.getVersion();
      setNanobotVersion(result);
    } catch (error) {
      console.error("获取版本信息失败:", error);
    }
  }

  async function loadConfig() {
    try {
      const result = await configApi.load();
      if (!result.error) {
        setConfig(result);
      }
    } catch (error) {
      console.error("获取配置失败:", error);
    }
  }

  async function handleStart() {
    setLoading(true);
    try {
      // 先检查配置
      const configCheck = await processApi.checkConfig();
      if (!configCheck.valid) {
        toast.showWarning(configCheck.message || "配置检查失败");
        // 如果是缺少 API key，提示用户去配置页面
        if (configCheck.issue === "api_key_missing") {
          toast.showInfo("请在配置编辑器中添加 API key");
        }
        setLoading(false);
        return;
      }

      const result = await processApi.start(18790);
      if (result.status === "started") {
        await refreshAll();
        localStorage.setItem("autoStartLogMonitor", "true");
        toast.showSuccess("nanobot 启动成功");
      } else if (result.status === "already_running") {
        await refreshAll();
        localStorage.setItem("autoStartLogMonitor", "true");
        toast.showInfo("nanobot 已经在运行中");
      } else if (result.status === "failed") {
        // 显示详细的失败信息
        await refreshAll();
        toast.showError(result.message || "nanobot 启动失败");
      }
    } catch (error) {
      toast.showError("启动失败，请检查配置");
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload() {
    setLoading(true);
    try {
      const result = await processApi.download();
      if (result.success) {
        toast.showSuccess("nanobot 下载成功");
      } else {
        toast.showWarning("下载完成，请检查是否成功");
      }
    } catch (error) {
      toast.showError("下载失败，请确保已安装 pip");
    } finally {
      setLoading(false);
    }
  }

  async function handleOnboard() {
    setLoading(true);
    try {
      const result = await processApi.onboard();
      if (result.success) {
        toast.showSuccess("nanobot 初始化成功");
      } else {
        toast.showWarning("初始化完成，请检查是否成功");
      }
    } catch (error) {
      toast.showError("初始化失败，请先下载 nanobot");
    } finally {
      setLoading(false);
    }
  }

  async function handleStop() {
    setLoading(true);
    try {
      await processApi.stop();
      await loadStatus();
      toast.showSuccess("nanobot 已停止");
    } catch (error) {
      toast.showError("停止失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleRestart() {
    if (!status.running) {
      toast.showInfo("nanobot 未运行，无法重启");
      return;
    }

    setLoading(true);
    try {
      // 先停止
      await processApi.stop();
      toast.showInfo("正在重启 nanobot...");

      // 等待 2 秒确保进程完全停止
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 重新启动
      const result = await processApi.start(18790);
      if (result.status === "started") {
        await refreshAll();
        toast.showSuccess("nanobot 重启成功");
      } else if (result.status === "failed") {
        await refreshAll();
        toast.showError(result.message || "nanobot 重启失败");
      }
    } catch (error) {
      toast.showError("重启失败");
      // 尝试恢复状态
      await loadStatus();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-8 scrollbar-thin">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 状态卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* 运行状态卡片 */}
          <div className="p-5 bg-white rounded-lg border border-gray-200 card-hover">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Activity className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mb-1">系统状态</p>
            <p className="text-2xl font-semibold text-gray-900">
              {status.running ? "活跃" : "离线"}
            </p>
          </div>

          {/* 端口卡片 */}
          <div className="p-5 bg-white rounded-lg border border-gray-200 card-hover">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-indigo-50 rounded-lg">
                <Zap className="w-5 h-5 text-indigo-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mb-1">服务端口</p>
            <p className="text-2xl font-semibold text-gray-900">
              {status.port || "N/A"}
            </p>
          </div>

          {/* 运行时间卡片 */}
          <div className="p-5 bg-white rounded-lg border border-gray-200 card-hover">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-purple-50 rounded-lg">
                <Clock className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mb-1">运行时长</p>
            <p className="text-2xl font-semibold text-gray-900">
              {status.uptime || "--:--"}
            </p>
          </div>

          {/* 版本信息卡片 */}
          <div className="p-5 bg-white rounded-lg border border-gray-200 card-hover">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-amber-50 rounded-lg">
                <Info className="w-5 h-5 text-amber-600" />
              </div>
              <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                nanobotVersion?.installed
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-700"
              }`}>
                {nanobotVersion?.installed ? "已安装" : "未安装"}
              </span>
            </div>
            <p className="text-xs text-gray-500 mb-1">nanobot 版本</p>
            <p className="text-lg font-semibold text-gray-900 truncate" title={nanobotVersion?.version || nanobotVersion?.message || "检测中..."}>
              {nanobotVersion?.version || nanobotVersion?.message || "检测中..."}
            </p>
          </div>
        </div>

        {/* 当前配置概览 */}
        {config && (
          <div className="p-6 bg-white rounded-lg border border-gray-200">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900">
              <Server className="w-5 h-5 text-blue-600" />
              当前配置概览
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* LLM 配置 */}
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 bg-blue-50 rounded-lg">
                    <Server className="w-4 h-4 text-blue-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900">LLM Provider</h3>
                </div>
                {config.providers && Object.keys(config.providers).length > 0 ? (
                  <div className="space-y-2">
                    {Object.keys(config.providers).slice(0, 3).map((providerKey) => (
                      <div key={providerKey} className="flex items-center justify-between">
                        <span className="text-xs text-gray-600">{providerKey}</span>
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                          已配置
                        </span>
                      </div>
                    ))}
                    {Object.keys(config.providers).length > 3 && (
                      <p className="text-xs text-gray-500">
                        共 {Object.keys(config.providers).length} 个 Provider
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">暂无配置</p>
                )}
              </div>

              {/* Agent 配置 */}
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 bg-indigo-50 rounded-lg">
                    <Bot className="w-4 h-4 text-indigo-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900">Agent 配置</h3>
                </div>
                {config.agents?.defaults ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">模型</span>
                      <span className="text-xs font-medium text-gray-700 truncate max-w-[120px]" title={config.agents.defaults.model}>
                        {config.agents.defaults.model || '-'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">最大 Token</span>
                      <span className="text-xs font-medium text-gray-700">
                        {config.agents.defaults.max_tokens || '-'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">温度</span>
                      <span className="text-xs font-medium text-gray-700">
                        {config.agents.defaults.temperature || '-'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">暂无配置</p>
                )}
              </div>

              {/* 消息渠道 */}
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 bg-purple-50 rounded-lg">
                    <MessageSquare className="w-4 h-4 text-purple-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900">消息渠道</h3>
                </div>
                {config.channels && Object.keys(config.channels).length > 0 ? (
                  <div className="space-y-2">
                    {Object.entries(config.channels)
                      .filter(([_, channel]: [string, any]) => channel?.enabled)
                      .slice(0, 3)
                      .map(([channelKey]) => (
                        <div key={channelKey} className="flex items-center justify-between">
                          <span className="text-xs text-gray-600 capitalize">{channelKey}</span>
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                            已启用
                          </span>
                        </div>
                      ))}
                    {Object.values(config.channels).filter((c: any) => c?.enabled).length === 0 && (
                      <p className="text-xs text-gray-500">暂无启用渠道</p>
                    )}
                    {Object.values(config.channels).filter((c: any) => c?.enabled).length > 3 && (
                      <p className="text-xs text-gray-500">
                        共 {Object.values(config.channels).filter((c: any) => c?.enabled).length} 个渠道
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">暂无配置</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 系统资源监控 */}
        {systemInfo && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* CPU 使用率 */}
            <div className="p-5 bg-white rounded-lg border border-gray-200 card-hover">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Cpu className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {systemInfo.cpu.usage_text}
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-2">CPU 使用率</p>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(systemInfo.cpu.usage, 100)}%` }}
                />
              </div>
            </div>

            {/* 内存使用率 */}
            <div className="p-5 bg-white rounded-lg border border-gray-200 card-hover">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-green-50 rounded-lg">
                  <HardDrive className="w-5 h-5 text-green-600" />
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {systemInfo.memory.usage_text}
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-2">
                {systemInfo.memory.used_text} / {systemInfo.memory.total_text}
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(systemInfo.memory.usage_percent, 100)}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* 快速操作 */}
        <div className="p-6 bg-white rounded-lg border border-gray-200">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900">
            <Rocket className="w-5 h-5 text-blue-600" />
            快速操作
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* 下载 nanobot - 只在未安装时显示 */}
            {nanobotVersion !== null && !nanobotVersion.installed && (
              <div className="group relative overflow-hidden rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <button
                  onClick={handleDownload}
                  disabled={loading}
                  className="relative w-full text-left p-4 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                      <Download className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">下载 nanobot</p>
                      <p className="text-xs text-gray-500 mt-1">通过 pip 安装最新版本</p>
                    </div>
                  </div>
                </button>
              </div>
            )}

            {/* 初始化 nanobot - 只在未安装时显示 */}
            {nanobotVersion !== null && !nanobotVersion.installed && (
              <div className="group relative overflow-hidden rounded-lg border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <button
                  onClick={handleOnboard}
                  disabled={loading}
                  className="relative w-full text-left p-4 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-indigo-50 rounded-lg group-hover:bg-indigo-100 transition-colors">
                      <Rocket className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">初始化配置</p>
                      <p className="text-xs text-gray-500 mt-1">下载后运行，创建配置文件</p>
                    </div>
                  </div>
                </button>
              </div>
            )}

            {/* 启动/停止 nanobot - 合并按钮 */}
            <div className={`group relative overflow-hidden rounded-lg border transition-all ${
              status.running
                ? "border-red-200 hover:border-red-300 hover:shadow-md"
                : "border-green-200 hover:border-green-300 hover:shadow-md"
            }`}>
              <div className={`absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity ${
                status.running ? "from-red-50 to-transparent" : "from-green-50 to-transparent"
              }`}></div>
              <button
                onClick={status.running ? handleStop : handleStart}
                disabled={loading}
                className="relative w-full text-left p-4 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg transition-colors ${
                    status.running
                      ? "bg-red-50 group-hover:bg-red-100"
                      : "bg-green-50 group-hover:bg-green-100"
                  }`}>
                    {status.running ? (
                      <Square className="w-5 h-5 text-red-600" />
                    ) : (
                      <Play className="w-5 h-5 text-green-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {status.running ? "停止 nanobot" : "启动 nanobot"}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {status.running
                        ? `停止服务 (端口 ${status.port || 18790})`
                        : "启动 nanobot gateway 服务"
                      }
                    </p>
                  </div>
                  <div className={`ml-4 px-3 py-1 rounded-full text-xs font-medium ${
                    status.running
                      ? "bg-red-100 text-red-700"
                      : "bg-green-100 text-green-700"
                  }`}>
                    {status.running ? "运行中" : "已停止"}
                  </div>
                </div>
              </button>
            </div>

            {/* 重启 nanobot */}
            <div className="group relative overflow-hidden rounded-lg border border-gray-200 hover:border-amber-300 hover:shadow-md transition-all">
              <div className="absolute inset-0 bg-gradient-to-r from-amber-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <button
                onClick={handleRestart}
                disabled={loading || !status.running}
                className="relative w-full text-left p-4 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-amber-50 rounded-lg group-hover:bg-amber-100 transition-colors">
                    <RefreshCw className={`w-5 h-5 text-amber-600 ${loading ? 'animate-spin' : ''}`} />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">重启 nanobot</p>
                    <p className="text-xs text-gray-500 mt-1">停止并重新启动服务</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* 系统信息 */}
        <div className="p-6 bg-white rounded-lg border border-gray-200">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900">
            <Zap className="w-5 h-5 text-indigo-600" />
            系统信息
          </h2>
          <div className="space-y-3">
            {[
              { icon: FileText, label: "配置文件位置", value: "~/.nanobot/config.json" },
              { icon: FileText, label: "工作区位置", value: "~/.nanobot/workspace" },
              { icon: FileText, label: "日志位置", value: "~/.nanobot/logs/nanobot.log" },
            ].map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-4 p-4 rounded-lg bg-gray-50 border border-gray-100"
              >
                <div className="p-2 bg-blue-50 rounded-lg">
                  <item.icon className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500">{item.label}</p>
                  <p className="text-sm font-mono text-gray-700 mt-0.5">{item.value}</p>
                </div>
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
