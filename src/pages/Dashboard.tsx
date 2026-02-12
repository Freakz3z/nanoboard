import { useEffect, useState } from "react";
import { processApi, configApi, loggerApi, networkApi } from "../lib/tauri";
import NetworkMonitor from "../components/NetworkMonitor";
import {
  Activity,
  CheckCircle,
  Clock,
  FileText,
  Zap,
  Cpu,
  HardDrive,
  Database,
  Info,
  MessageSquare,
  Bot,
  Server,
  TrendingUp,
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
  disk: {
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

interface LogStatistics {
  total: number;
  debug: number;
  info: number;
  warn: number;
  error: number;
}

interface NetworkData {
  timestamp: number;
  upload: number;
  download: number;
}

interface Config {
  providers?: Record<string, any>;
  agents?: {
    defaults?: {
      model?: string;
      max_tokens?: number;
      temperature?: number;
      max_tool_iterations?: number;
    };
  };
  channels?: Record<string, any>;
}

export default function Dashboard() {
  const [status, setStatus] = useState<Status>({ running: false });
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [nanobotVersion, setNanobotVersion] = useState<NanobotVersion | null>(null);
  const [nanobotPath, setNanobotPath] = useState<string | null>(null);
  const [config, setConfig] = useState<Config | null>(null);
  const [logStatistics, setLogStatistics] = useState<LogStatistics | null>(null);
  const [networkData, setNetworkData] = useState<NetworkData[]>([]);

  // 刷新所有状态的函数
  async function refreshAll() {
    await Promise.all([
      loadStatus(),
      loadSystemInfo(),
      loadConfig(),
      loadLogStatistics(),
    ]);
  }

  useEffect(() => {
    // 初始加载
    refreshAll();
    loadNanobotVersion();
    loadNanobotPath();

    // 初始化网络监控
    networkApi.initMonitor().catch(console.error);

    // 初始化网络数据（60秒历史）
    const initialData: NetworkData[] = [];
    const now = Date.now();
    for (let i = 60; i >= 0; i--) {
      initialData.push({
        timestamp: now - i * 1000,
        upload: 0,
        download: 0,
      });
    }
    setNetworkData(initialData);

    // 定时刷新（每1秒）
    const interval = setInterval(() => {
      refreshAll();
      updateNetworkData();
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

  async function loadNanobotPath() {
    try {
      const result = await processApi.getNanobotPath();
      if (result.found) {
        setNanobotPath(result.path);
      }
    } catch (error) {
      console.error("获取 nanobot 路径失败:", error);
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

  async function loadLogStatistics() {
    try {
      const result = await loggerApi.getStatistics();
      setLogStatistics(result);
    } catch (error) {
      console.error("获取日志统计失败:", error);
    }
  }

  // 更新网络数据（从后端获取真实统计）
  async function updateNetworkData() {
    try {
      const stats = await networkApi.getStats();
      setNetworkData(prev => {
        const newData = [...prev.slice(-59), {
          timestamp: Date.now(),
          upload: stats.upload_speed || 0,
          download: stats.download_speed || 0,
        }];
        return newData;
      });
    } catch (error) {
      console.error("获取网络统计失败:", error);
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

        {/* 配置概览 */}
        {config && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* LLM 配置 */}
            <div className="p-5 bg-white rounded-lg border border-gray-200 card-hover">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Server className="w-5 h-5 text-blue-600" />
                </div>
              </div>
              <p className="text-xs text-gray-500 mb-3">LLM Provider</p>
              {config.providers && Object.keys(config.providers).length > 0 ? (
                <div className="space-y-2">
                  {Object.keys(config.providers).slice(0, 4).map((providerKey) => (
                    <div key={providerKey} className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">{providerKey}</span>
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                        已配置
                      </span>
                    </div>
                  ))}
                  {Object.keys(config.providers).length > 4 && (
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
            <div className="p-5 bg-white rounded-lg border border-gray-200 card-hover">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-indigo-50 rounded-lg">
                  <Bot className="w-5 h-5 text-indigo-600" />
                </div>
              </div>
              <p className="text-xs text-gray-500 mb-3">Agent 配置</p>
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
                    <span className="text-xs text-gray-500">最大工具迭代次数</span>
                    <span className="text-xs font-medium text-gray-700">
                      {config.agents.defaults.max_tool_iterations || '-'}
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
            <div className="p-5 bg-white rounded-lg border border-gray-200 card-hover">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <MessageSquare className="w-5 h-5 text-purple-600" />
                </div>
              </div>
              <p className="text-xs text-gray-500 mb-3">消息渠道</p>
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
        )}

        {/* 系统资源监控 */}
        {systemInfo && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 性能监控 */}
            <div className="p-5 bg-white rounded-lg border border-gray-200 card-hover">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-indigo-50 rounded-lg">
                  <Activity className="w-5 h-5 text-indigo-600" />
                </div>
                <span className="text-xs font-medium text-gray-500">性能监控</span>
              </div>
              <div className="space-y-3">
                {/* CPU */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-blue-600" />
                      <span className="text-xs text-gray-600">CPU</span>
                    </div>
                    <span className="text-xs font-medium text-gray-700">{systemInfo.cpu.usage_text}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(systemInfo.cpu.usage, 100)}%` }}
                    />
                  </div>
                </div>
                {/* 内存 */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <HardDrive className="w-3.5 h-3.5 text-green-600" />
                      <span className="text-xs text-gray-600">内存</span>
                    </div>
                    <span className="text-xs font-medium text-gray-700">{systemInfo.memory.usage_text}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-green-600 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(systemInfo.memory.usage_percent, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {systemInfo.memory.used_text} / {systemInfo.memory.total_text}
                  </p>
                </div>
                {/* 磁盘 */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-purple-600" />
                      <span className="text-xs text-gray-600">磁盘</span>
                    </div>
                    <span className="text-xs font-medium text-gray-700">{systemInfo.disk.usage_text}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-purple-600 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(systemInfo.disk.usage_percent, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {systemInfo.disk.used_text} / {systemInfo.disk.total_text}
                  </p>
                </div>
              </div>
            </div>

            {/* 网络监控折线图 */}
            <div className="bg-white rounded-lg border border-gray-200 card-hover overflow-hidden">
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-cyan-50 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-cyan-600" />
                  </div>
                  <span className="text-xs font-medium text-gray-500">网络监控</span>
                </div>
                <NetworkMonitor data={networkData} />
              </div>
            </div>

            {/* 日志监控 */}
            {logStatistics && (
              <div className="p-5 bg-white rounded-lg border border-gray-200 card-hover">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <FileText className="w-5 h-5 text-purple-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    {logStatistics.total} 条
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-3">日志统计</p>
                <div className="space-y-2">
                  {/* DEBUG */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-600">DEBUG</span>
                      <span className="text-gray-700 font-medium">
                        {logStatistics.debug} ({logStatistics.total > 0 ? ((logStatistics.debug / logStatistics.total) * 100).toFixed(1) : '0'}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-gray-600 h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${logStatistics.total > 0 ? (logStatistics.debug / logStatistics.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  {/* INFO */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-blue-600">INFO</span>
                      <span className="text-gray-700 font-medium">
                        {logStatistics.info} ({logStatistics.total > 0 ? ((logStatistics.info / logStatistics.total) * 100).toFixed(1) : '0'}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${logStatistics.total > 0 ? (logStatistics.info / logStatistics.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  {/* WARN */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-amber-600">WARN</span>
                      <span className="text-gray-700 font-medium">
                        {logStatistics.warn} ({logStatistics.total > 0 ? ((logStatistics.warn / logStatistics.total) * 100).toFixed(1) : '0'}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-amber-600 h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${logStatistics.total > 0 ? (logStatistics.warn / logStatistics.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  {/* ERROR */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-red-600">ERROR</span>
                      <span className="text-gray-700 font-medium">
                        {logStatistics.error} ({logStatistics.total > 0 ? ((logStatistics.error / logStatistics.total) * 100).toFixed(1) : '0'}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-red-600 h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${logStatistics.total > 0 ? (logStatistics.error / logStatistics.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

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
              { icon: Bot, label: "nanobot 位置", value: nanobotPath || "未安装" },
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
