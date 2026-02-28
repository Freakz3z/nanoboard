import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LayoutDashboard, Settings, ScrollText, Play, Square, RefreshCw, Languages, Moon, Sun, ChevronLeft, ChevronRight, FolderTree, Info, Puzzle, } from "lucide-react";
import { processApi } from "../lib/tauri";
import { useToast } from "../contexts/ToastContext";
import { useTheme } from "../contexts/ThemeContext";
export default function Layout({ children }) {
    const { t, i18n } = useTranslation();
    const { theme, toggleTheme } = useTheme();
    const [status, setStatus] = useState({ running: false });
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
        { path: "/logs", label: t("nav.logs"), icon: ScrollText },
        { path: "/workspace", label: t("nav.workspace"), icon: FolderTree },
        { path: "/skills", label: t("nav.skills"), icon: Puzzle },
        { path: "/config", label: t("nav.config"), icon: Settings },
        { path: "/about", label: t("nav.about"), icon: Info },
    ];
    useEffect(() => {
        loadStatus();
        // 定时刷新状态（每2秒）
        const interval = setInterval(loadStatus, 2000);
        // 页面可见性变化时处理轮询
        const handleVisibilityChange = () => {
            if (!document.hidden) {
                // 页面重新可见时，立即刷新状态
                loadStatus();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);
    async function loadStatus() {
        try {
            const result = await processApi.getStatus();
            setStatus(result);
        }
        catch (error) {
            console.error("获取状态失败:", error);
        }
    }
    async function handleToggle() {
        if (status.running) {
            await handleStop();
        }
        else {
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
            }
            else if (result.status === "already_running") {
                await loadStatus();
                localStorage.setItem("autoStartLogMonitor", "true");
                toast.showInfo(t("layout.nanobotAlreadyRunning"));
            }
            else if (result.status === "failed") {
                await loadStatus();
                toast.showError(result.message || t("layout.nanobotStartFailed"));
            }
        }
        catch (error) {
            toast.showError(t("layout.nanobotStartFailed"));
        }
        finally {
            setLoading(false);
        }
    }
    async function handleStop() {
        setLoading(true);
        try {
            await processApi.stop();
            await loadStatus();
            toast.showSuccess(t("layout.nanobotStopSuccess"));
        }
        catch (error) {
            toast.showError(t("layout.nanobotStopFailed"));
        }
        finally {
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
            }
            else if (result.status === "failed") {
                await loadStatus();
                toast.showError(result.message || t("layout.nanobotRestartFailed"));
            }
        }
        catch (error) {
            toast.showError(t("layout.nanobotRestartFailed"));
            await loadStatus();
        }
        finally {
            setLoading(false);
        }
    }
    return (_jsx("div", { className: "flex flex-col h-screen bg-white dark:bg-dark-bg-base text-gray-900 dark:text-dark-text-primary transition-colors duration-200", children: _jsxs("div", { className: "flex-1 flex overflow-hidden", children: [_jsxs("aside", { className: `${collapsed ? "w-16" : "w-56"} bg-gray-50 dark:bg-dark-bg-sidebar border-r border-gray-200 dark:border-dark-border-default flex flex-col transition-all duration-300 ease-in-out`, children: [_jsx("div", { className: `border-b border-gray-200 dark:border-dark-border-subtle ${collapsed ? "p-3" : "p-6"}`, children: _jsxs("div", { className: `flex flex-col items-center ${collapsed ? "gap-0" : "gap-3"}`, children: [_jsx("div", { className: `${collapsed ? "p-2" : "p-3"} bg-gradient-to-br from-gray-50 to-gray-100 ${collapsed ? "rounded-xl" : "rounded-2xl"} shadow-sm transition-all duration-200`, children: _jsx("img", { src: "/assets/logo.png", alt: t("layout.logoAlt"), className: `${collapsed ? "w-9 h-9" : "w-12 h-12"} rounded-lg object-contain transition-all duration-200` }) }), !collapsed && (_jsxs(_Fragment, { children: [_jsx("h1", { className: "text-lg font-semibold text-gray-900 dark:text-dark-text-primary", children: t("app.name") }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("button", { onClick: () => {
                                                            const newLang = i18n.language === 'zh-CN' ? 'en-US' : 'zh-CN';
                                                            i18n.changeLanguage(newLang);
                                                        }, className: "flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-dark-bg-hover dark:hover:bg-dark-bg-active text-gray-600 dark:text-dark-text-primary transition-all text-xs font-medium", title: t("language.switch"), children: [_jsx(Languages, { className: "w-3 h-3" }), _jsx("span", { children: i18n.language === 'zh-CN' ? '中文' : 'EN' })] }), _jsxs("button", { onClick: toggleTheme, className: "flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-dark-bg-hover dark:hover:bg-dark-bg-active text-gray-600 dark:text-dark-text-primary transition-all text-xs font-medium", title: theme === 'dark' ? t("language.lightMode") : t("language.darkMode"), children: [theme === 'dark' ? _jsx(Sun, { className: "w-3 h-3" }) : _jsx(Moon, { className: "w-3 h-3" }), _jsx("span", { children: i18n.language === 'zh-CN' ? (theme === 'dark' ? '浅色' : '深色') : (theme === 'dark' ? 'Light' : 'Dark') })] })] })] })), collapsed && (_jsxs("div", { className: "flex flex-col items-center gap-2 mt-2", children: [_jsx("button", { onClick: () => {
                                                    const newLang = i18n.language === 'zh-CN' ? 'en-US' : 'zh-CN';
                                                    i18n.changeLanguage(newLang);
                                                }, className: "p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-dark-bg-hover dark:hover:bg-dark-bg-active text-gray-600 dark:text-dark-text-primary transition-all", title: t("language.switch"), children: _jsx(Languages, { className: "w-4 h-4" }) }), _jsx("button", { onClick: toggleTheme, className: "p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-dark-bg-hover dark:hover:bg-dark-bg-active text-gray-600 dark:text-dark-text-primary transition-all", title: theme === 'dark' ? t("language.lightMode") : t("language.darkMode"), children: theme === 'dark' ? _jsx(Sun, { className: "w-4 h-4" }) : _jsx(Moon, { className: "w-4 h-4" }) })] }))] }) }), _jsx("nav", { className: `flex-1 ${collapsed ? "p-2" : "p-4"} space-y-1`, children: navItems.map((item) => (_jsxs(NavLink, { to: item.path, title: collapsed ? item.label : undefined, className: ({ isActive }) => `group flex items-center ${collapsed ? "justify-center" : "gap-3"} px-3 py-2 rounded-lg transition-colors ${isActive
                                    ? "bg-blue-50 dark:bg-dark-bg-active text-blue-600 dark:text-dark-text-primary font-medium"
                                    : "text-gray-600 hover:bg-gray-100 dark:hover:bg-dark-bg-hover dark:text-dark-text-primary"}`, children: [_jsx(item.icon, { className: "w-5 h-5 flex-shrink-0" }), !collapsed && _jsx("span", { children: item.label })] }, item.path))) }), _jsxs("div", { className: `${collapsed ? "p-2" : "p-4"} border-t border-gray-200 dark:border-dark-border-subtle space-y-2`, children: [_jsxs("button", { onClick: handleToggle, disabled: loading, title: collapsed ? (status.running ? t("layout.stop") : t("layout.start")) : undefined, className: `w-full flex items-center ${collapsed ? "justify-center" : "justify-center gap-2"} px-3 py-2.5 rounded-lg transition-all font-medium text-sm ${status.running
                                        ? "bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 dark:text-red-200"
                                        : "bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/40 dark:text-green-200"} disabled:opacity-50 disabled:cursor-not-allowed`, children: [loading ? (_jsx(RefreshCw, { className: "w-4 h-4 animate-spin" })) : status.running ? (_jsx(Square, { className: "w-4 h-4" })) : (_jsx(Play, { className: "w-4 h-4" })), !collapsed && _jsx("span", { children: status.running ? t("layout.stop") : t("layout.start") })] }), _jsxs("button", { onClick: handleRestart, disabled: loading || !status.running, title: collapsed ? t("layout.restart") : undefined, className: `w-full flex items-center ${collapsed ? "justify-center" : "justify-center gap-2"} px-3 py-2.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-900/20 dark:hover:bg-amber-900/40 dark:text-amber-200 transition-all font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed`, children: [_jsx(RefreshCw, { className: `w-4 h-4 ${loading ? 'animate-spin' : ''}` }), !collapsed && _jsx("span", { children: t("layout.restart") })] })] }), _jsx("div", { className: `${collapsed ? "p-2" : "p-4"} border-t border-gray-200 dark:border-dark-border-subtle`, children: _jsx("button", { onClick: toggleCollapsed, className: "w-full flex items-center justify-center p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-dark-bg-hover dark:text-dark-text-secondary transition-colors", title: collapsed ? t("layout.expandSidebar") : t("layout.collapseSidebar"), children: collapsed ? (_jsx(ChevronRight, { className: "w-5 h-5" })) : (_jsxs(_Fragment, { children: [_jsx(ChevronLeft, { className: "w-5 h-5" }), _jsx("span", { className: "ml-1 text-xs", children: t("layout.collapse") })] })) }) })] }), _jsx("main", { className: "flex-1 flex flex-col overflow-hidden bg-white dark:bg-dark-bg-base transition-colors duration-200", children: children })] }) }));
}
