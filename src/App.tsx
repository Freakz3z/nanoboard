import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { listen } from "@tauri-apps/api/event";
import { ToastProvider } from "./contexts/ToastContext";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import { processApi } from "./lib/tauri";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import ConfigEditor from "./pages/ConfigEditor";
import Logs from "./pages/Logs";
import Workspace from "./pages/Workspace";
import CronJobs from "./pages/CronJobs";
import Sessions from "./pages/Sessions";
import About from "./pages/About";
import { ContextMenu } from "./components/ContextMenu";
import ErrorBoundary from "./components/ErrorBoundary";

function AppContent() {
  const navigate = useNavigate();
  const { toggleTheme } = useTheme();

  useEffect(() => {
    const unlisteners: Array<() => void> = [];

    // 监听菜单导航事件
    const unlistenNavigate = listen<string>("menu-navigate", (event) => {
      navigate(event.payload);
    });
    unlisteners.push(() => unlistenNavigate.then(fn => fn()));

    // 监听主题切换事件
    const unlistenTheme = listen("menu-toggle-theme", () => {
      toggleTheme();
    });
    unlisteners.push(() => unlistenTheme.then(fn => fn()));

    // 监听启动 Nanobot 事件
    const unlistenStart = listen("menu-start-nanobot", async () => {
      try {
        await processApi.start();
      } catch (error) {
        console.error("Failed to start nanobot:", error);
      }
    });
    unlisteners.push(() => unlistenStart.then(fn => fn()));

    // 监听停止 Nanobot 事件
    const unlistenStop = listen("menu-stop-nanobot", async () => {
      try {
        await processApi.stop();
      } catch (error) {
        console.error("Failed to stop nanobot:", error);
      }
    });
    unlisteners.push(() => unlistenStop.then(fn => fn()));

    // 监听诊断事件
    const unlistenDiagnostics = listen("menu-diagnostics", () => {
      navigate("/");
    });
    unlisteners.push(() => unlistenDiagnostics.then(fn => fn()));

    // 监听关于事件
    const unlistenAbout = listen("menu-about", () => {
      navigate("/about");
    });
    unlisteners.push(() => unlistenAbout.then(fn => fn()));

    return () => {
      unlisteners.forEach(fn => fn());
    };
  }, [navigate, toggleTheme]);

  return (
    <Layout>
      <ContextMenu>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/config" element={<ConfigEditor />} />
          <Route path="/logs" element={<Logs />} />
          <Route path="/workspace" element={<Workspace />} />
          <Route path="/sessions" element={<Sessions />} />
          <Route path="/cron" element={<CronJobs />} />
          <Route path="/about" element={<About />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ContextMenu>
    </Layout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ThemeProvider>
          <ToastProvider>
            <AppContent />
          </ToastProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
