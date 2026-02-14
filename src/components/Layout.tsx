import { ReactNode, useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  Settings,
  FileText,
  ScrollText,
  Play,
  Square,
  RefreshCw,
  Languages,
  Moon,
  Sun,
  Wrench,
  Brain,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
} from "lucide-react";
import { processApi } from "../lib/tauri";
import { useToast } from "../contexts/ToastContext";
import { useTheme } from "../contexts/ThemeContext";

interface LayoutProps {
  children: ReactNode;
}

interface Status {
  running: boolean;
  port?: number;
  uptime?: string;
}

export default function Layout({ children }: LayoutProps) {
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const [status, setStatus] = useState<Status>({ running: false });
  const [loading, setLoading] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebarCollapsed");
    return saved === "true";
  });
  const toast = useToast();

  const toggleCollapsed = () => {
    const newValue = !collapsed;
    setCollapsed(newValue);
    localStorage.setItem("sidebarCollapsed", String(newValue));
  };

  const navItems = [
    { path: "/", label: t("nav.dashboard"), icon: LayoutDashboard },
    { path: "/sessions", label: t("nav.chatSessions"), icon: MessageSquare },
    { path: "/logs", label: t("nav.logs"), icon: ScrollText },
    { path: "/files", label: t("nav.files"), icon: FileText },
    { path: "/skills", label: t("nav.skills"), icon: Wrench },
    { path: "/memory", label: t("nav.memory"), icon: Brain },
    { path: "/cron", label: t("nav.cron"), icon: CalendarClock },
    { path: "/config", label: t("nav.config"), icon: Settings },
  ];

  useEffect(() => {
    loadStatus();
    // 定时刷新状态（每2秒）
    const interval = setInterval(loadStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  async function loadStatus() {
    try {
      const result = await processApi.getStatus();
      setStatus(result);
    } catch (error) {
      console.error("获取状态失败:", error);
    }
  }

  async function handleToggle() {
    if (status.running) {
      await handleStop();
    } else {
      await handleStart();
    }
  }

  async function handleStart() {
    setLoading(true);
    try {
      const configCheck = await processApi.checkConfig();
      if (!configCheck.valid) {
        toast.showWarning(configCheck.message || t("toast.configCheckFailed"));
        if (configCheck.issue === "api_key_missing") {
          toast.showInfo(t("toast.addApiKey"));
        }
        setLoading(false);
        return;
      }

      const result = await processApi.start(18790);
      if (result.status === "started") {
        await loadStatus();
        localStorage.setItem("autoStartLogMonitor", "true");
        toast.showSuccess(t("layout.nanobotStartSuccess"));
      } else if (result.status === "already_running") {
        await loadStatus();
        localStorage.setItem("autoStartLogMonitor", "true");
        toast.showInfo(t("layout.nanobotAlreadyRunning"));
      } else if (result.status === "failed") {
        await loadStatus();
        toast.showError(result.message || t("layout.nanobotStartFailed"));
      }
    } catch (error) {
      toast.showError(t("layout.nanobotStartFailed"));
    } finally {
      setLoading(false);
    }
  }

  async function handleStop() {
    setLoading(true);
    try {
      await processApi.stop();
      await loadStatus();
      toast.showSuccess(t("layout.nanobotStopSuccess"));
    } catch (error) {
      toast.showError(t("layout.nanobotStopFailed"));
    } finally {
      setLoading(false);
    }
  }

  async function handleRestart() {
    if (!status.running) {
      toast.showInfo(t("layout.nanobotNotRunning"));
      return;
    }

    setLoading(true);
    try {
      await processApi.stop();
      toast.showInfo(t("layout.restarting"));
      await new Promise(resolve => setTimeout(resolve, 2000));

      const result = await processApi.start(18790);
      if (result.status === "started") {
        await loadStatus();
        toast.showSuccess(t("layout.nanobotRestartSuccess"));
      } else if (result.status === "failed") {
        await loadStatus();
        toast.showError(result.message || t("layout.nanobotRestartFailed"));
      }
    } catch (error) {
      toast.showError(t("layout.nanobotRestartFailed"));
      await loadStatus();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-dark-bg-base text-gray-900 dark:text-dark-text-primary transition-colors duration-200">
      {/* 主体内容 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 侧边栏 */}
        <aside
          className={`${collapsed ? "w-16" : "w-56"} bg-gray-50 dark:bg-dark-bg-sidebar border-r border-gray-200 dark:border-dark-border-default flex flex-col transition-all duration-300 ease-in-out`}
        >
          {/* Logo 区域 */}
          <div className={`border-b border-gray-200 dark:border-dark-border-subtle ${collapsed ? "p-3" : "p-6"}`}>
            <div className={`flex flex-col items-center ${collapsed ? "gap-0" : "gap-3"}`}>
              {/* Logo 统一浅灰色背景 */}
              <div className={`${collapsed ? "p-2" : "p-3"} bg-gradient-to-br from-gray-50 to-gray-100 ${collapsed ? "rounded-xl" : "rounded-2xl"} shadow-sm transition-all duration-200`}>
                <img
                  src="/assets/logo.png"
                  alt={t("layout.logoAlt")}
                  className={`${collapsed ? "w-9 h-9" : "w-12 h-12"} rounded-lg object-contain transition-all duration-200`}
                />
              </div>
              {!collapsed && (
                <>
                  <h1 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">
                    {t("app.name")}
                  </h1>
                  {/* 语言和主题切换 */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const newLang = i18n.language === 'zh-CN' ? 'en-US' : 'zh-CN';
                        i18n.changeLanguage(newLang);
                      }}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-dark-bg-hover dark:hover:bg-dark-bg-active text-gray-600 dark:text-dark-text-primary transition-all text-xs font-medium"
                      title={t("language.switch")}
                    >
                      <Languages className="w-3 h-3" />
                      <span>{i18n.language === 'zh-CN' ? '中文' : 'EN'}</span>
                    </button>
                    <button
                      onClick={toggleTheme}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-dark-bg-hover dark:hover:bg-dark-bg-active text-gray-600 dark:text-dark-text-primary transition-all text-xs font-medium"
                      title={theme === 'dark' ? t("language.lightMode") : t("language.darkMode")}
                    >
                      {theme === 'dark' ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
                      <span>{i18n.language === 'zh-CN' ? (theme === 'dark' ? '浅色' : '深色') : (theme === 'dark' ? 'Light' : 'Dark')}</span>
                    </button>
                  </div>
                </>
              )}
              {collapsed && (
                <div className="flex flex-col items-center gap-2 mt-2">
                  <button
                    onClick={() => {
                      const newLang = i18n.language === 'zh-CN' ? 'en-US' : 'zh-CN';
                      i18n.changeLanguage(newLang);
                    }}
                    className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-dark-bg-hover dark:hover:bg-dark-bg-active text-gray-600 dark:text-dark-text-primary transition-all"
                    title={t("language.switch")}
                  >
                    <Languages className="w-4 h-4" />
                  </button>
                  <button
                    onClick={toggleTheme}
                    className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-dark-bg-hover dark:hover:bg-dark-bg-active text-gray-600 dark:text-dark-text-primary transition-all"
                    title={theme === 'dark' ? t("language.lightMode") : t("language.darkMode")}
                  >
                    {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 导航菜单 */}
          <nav className={`flex-1 ${collapsed ? "p-2" : "p-4"} space-y-1`}>
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `group flex items-center ${collapsed ? "justify-center" : "gap-3"} px-3 py-2 rounded-lg transition-colors ${
                    isActive
                      ? "bg-blue-50 dark:bg-dark-bg-active text-blue-600 dark:text-dark-text-primary font-medium"
                      : "text-gray-600 hover:bg-gray-100 dark:hover:bg-dark-bg-hover dark:text-dark-text-primary"
                  }`
                }
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            ))}
          </nav>

          {/* 控制按钮 */}
          <div className={`${collapsed ? "p-2" : "p-4"} border-t border-gray-200 dark:border-dark-border-subtle space-y-2`}>
            <button
              onClick={handleToggle}
              disabled={loading}
              title={collapsed ? (status.running ? t("layout.stop") : t("layout.start")) : undefined}
              className={`w-full flex items-center ${collapsed ? "justify-center" : "justify-center gap-2"} px-3 py-2.5 rounded-lg transition-all font-medium text-sm ${
                status.running
                  ? "bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 dark:text-red-200"
                  : "bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/40 dark:text-green-200"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : status.running ? (
                <Square className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              {!collapsed && <span>{status.running ? t("layout.stop") : t("layout.start")}</span>}
            </button>

            <button
              onClick={handleRestart}
              disabled={loading || !status.running}
              title={collapsed ? t("layout.restart") : undefined}
              className={`w-full flex items-center ${collapsed ? "justify-center" : "justify-center gap-2"} px-3 py-2.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-900/20 dark:hover:bg-amber-900/40 dark:text-amber-200 transition-all font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {!collapsed && <span>{t("layout.restart")}</span>}
            </button>
          </div>

          {/* 折叠/展开按钮 */}
          <div className={`${collapsed ? "p-2" : "p-4"} border-t border-gray-200 dark:border-dark-border-subtle`}>
            <button
              onClick={toggleCollapsed}
              className="w-full flex items-center justify-center p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-dark-bg-hover dark:text-dark-text-secondary transition-colors"
              title={collapsed ? t("layout.expandSidebar") : t("layout.collapseSidebar")}
            >
              {collapsed ? (
                <ChevronRight className="w-5 h-5" />
              ) : (
                <>
                  <ChevronLeft className="w-5 h-5" />
                  <span className="ml-1 text-xs">{t("layout.collapse")}</span>
                </>
              )}
            </button>
          </div>
        </aside>

        {/* 主内容区 */}
        <main className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-dark-bg-base transition-colors duration-200">
          {children}
        </main>
      </div>
    </div>
  );
}
