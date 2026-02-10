import { useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { terminalApi, events } from "../lib/tauri";
import { useToast } from "../contexts/ToastContext";
import { RotateCcw } from "lucide-react";

interface TerminalEvent {
  session: string;
  data: string;
  type: string;
}

export default function TerminalPage() {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const sessionIdRef = useRef<string>("main");
  const unlistenRef = useRef<(() => void) | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentShell, setCurrentShell] = useState<string>("");
  const toast = useToast();

  useEffect(() => {
    // 初始化终端
    initTerminal();

    // 组件卸载时清理
    return () => {
      cleanup();
    };
  }, []);

  // 监听窗口大小变化
  useEffect(() => {
    const handleResize = () => {
      fitAddonRef.current?.fit();
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  async function initTerminal() {
    if (!terminalRef.current) return;

    // 创建 xterm.js 实例
    const terminal = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: "#1a1b26",
        foreground: "#c0caf5",
        cursor: "#c0caf5",
        black: "#15161e",
        red: "#f7768e",
        green: "#9ece6a",
        yellow: "#e0af68",
        blue: "#7aa2f7",
        magenta: "#bb9af7",
        cyan: "#7dcfff",
        white: "#a9b1d6",
        brightBlack: "#414868",
        brightRed: "#f7768e",
        brightGreen: "#9ece6a",
        brightYellow: "#e0af68",
        brightBlue: "#7aa2f7",
        brightMagenta: "#bb9af7",
        brightCyan: "#7dcfff",
        brightWhite: "#c0caf5",
      },
      allowTransparency: true,
      rightClickSelectsWord: true,
    });

    // 添加 fit 插件
    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);

    // 打开终端
    terminal.open(terminalRef.current);
    fitAddon.fit();

    // 保存引用
    xtermRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // 欢迎信息
    terminal.writeln("\r\n\x1b[1;34m欢迎使用 Nanobot 交互式终端\x1b[0m");
    terminal.writeln("\x1b[33m正在启动 shell 会话...\x1b[0m\r\n");

    // 启动后端会话
    await startSession();

    // 监听用户输入
    terminal.onData(async (data: string) => {
      await handleUserInput(data);
    });
  }

  async function startSession() {
    const sessionId = sessionIdRef.current;

    try {
      // 确定要使用的 shell（让后端自动检测）
      const platform = navigator.platform;
      let shell: string | undefined;

      if (platform.includes("Win") || platform.includes("Windows")) {
        shell = "cmd.exe";
      } else if (platform.includes("Mac") || platform.includes("Darwin")) {
        shell = "/bin/zsh";
      } else {
        shell = "/bin/bash";
      }
      setCurrentShell(shell);

      // 调试信息
      console.log("启动终端会话:", { sessionId, shell, platform });

      // 启动会话
      const result = await terminalApi.startSession(sessionId, shell);

      console.log("会话启动成功:", result);

      // 监听终端输出
      const unlisten = await events.onTerminalOutput((event: TerminalEvent) => {
        if (event.session === sessionId) {
          handleTerminalOutput(event.data, event.type);
        }
      });

      unlistenRef.current = unlisten;

      // 立即设置为已连接
      setIsConnected(true);
      console.log("终端已就绪，可以输入");
    } catch (error) {
      console.error("启动终端失败:", error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      xtermRef.current?.writeln(`\x1b[31m启动会话失败: ${errorMsg}\x1b[0m\r\n`);

      // 尝试显示更多错误细节
      if (error && typeof error === 'object') {
        xtermRef.current?.writeln(`\x1b[31m错误详情: ${JSON.stringify(error)}\x1b[0m\r\n`);
      }

      toast.showError(`启动终端失败: ${errorMsg}`);
    }
  }

  function handleTerminalOutput(data: string, type: string) {
    const terminal = xtermRef.current;
    if (!terminal) return;

    // 处理不同类型的输出
    switch (type) {
      case "stdout":
      case "stderr":
        // PTY 已经正确处理了换行符，直接写入
        terminal.write(data);
        break;
      case "error":
        terminal.write("\r\n\x1b[31m" + data + "\x1b[0m\r\n");
        break;
      case "exit":
        terminal.write("\r\n\x1b[33m" + data + "\x1b[0m\r\n");
        setIsConnected(false);
        break;
    }
  }

  async function handleUserInput(data: string) {
    console.log("收到输入:", data, "isConnected:", isConnected, "code:", data.charCodeAt(0));

    // 移除 isConnected 检查，直接尝试发送
    // 如果后端会话不存在，会返回错误
    try {
      await terminalApi.sendInput(sessionIdRef.current, data);
      console.log("输入已发送");
    } catch (error) {
      console.error("发送输入失败:", error);
      // 只在真正错误时显示，避免干扰用户
      if (isConnected) {
        xtermRef.current?.writeln(
          "\r\n\x1b[31m发送输入失败: " + (error as Error).message + "\x1b[0m"
        );
      }
    }
  }

  async function handleRestart() {
    cleanup();
    const terminal = xtermRef.current;
    if (terminal) {
      terminal.reset();
      terminal.clear();
      terminal.writeln("\r\n\x1b[1;34m正在重启终端...\x1b[0m\r\n");
      await startSession();
    }
  }

  function cleanup() {
    // 停止会话
    if (sessionIdRef.current && isConnected) {
      terminalApi.stopSession(sessionIdRef.current).catch((err) => {
        console.error("停止会话失败:", err);
      });
    }

    // 取消事件监听
    if (unlistenRef.current) {
      unlistenRef.current();
      unlistenRef.current = null;
    }

    setIsConnected(false);
  }

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* 头部 */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">交互式终端</h1>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-50 border border-gray-200">
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
                }`}
              />
              <span className="text-gray-700">
                {isConnected ? "已连接" : "未连接"}
              </span>
              <span className="text-gray-300">|</span>
              <span className="text-gray-600">{currentShell}</span>
            </div>

            <button
              onClick={handleRestart}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium text-gray-700"
              title="重启终端"
            >
              <RotateCcw className="w-4 h-4" />
              重启
            </button>
          </div>
        </div>
      </div>

      {/* 终端容器 */}
      <div
        ref={terminalRef}
        className="flex-1 bg-[#1a1b26] p-2 overflow-hidden"
        style={{ minHeight: "400px" }}
      />
    </div>
  );
}
