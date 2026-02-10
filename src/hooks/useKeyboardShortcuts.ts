import { useEffect } from "react";

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  handler: () => void;
  description: string;
}

export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[],
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = shortcut.ctrlKey === undefined || event.ctrlKey === shortcut.ctrlKey;
        const shiftMatch = shortcut.shiftKey === undefined || event.shiftKey === shortcut.shiftKey;
        const altMatch = shortcut.altKey === undefined || event.altKey === shortcut.altKey;
        const metaMatch = shortcut.metaKey === undefined || event.metaKey === shortcut.metaKey;

        if (keyMatch && ctrlMatch && shiftMatch && altMatch && metaMatch) {
          event.preventDefault();
          shortcut.handler();
          break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts, enabled]);
}

export const SHORTCUTS = {
  SAVE: { key: "s", ctrlKey: true, description: "保存" },
  REFRESH: { key: "r", ctrlKey: true, description: "刷新" },
  SEARCH: { key: "k", ctrlKey: true, description: "搜索" },
  NEW_TAB: { key: "t", ctrlKey: true, description: "新建标签" },
  CLOSE_TAB: { key: "w", ctrlKey: true, description: "关闭标签" },
  DASHBOARD: { key: "1", altKey: true, description: "仪表盘" },
  CONFIG: { key: "2", altKey: true, description: "配置" },
  LOGS: { key: "3", altKey: true, description: "日志" },
  SESSIONS: { key: "4", altKey: true, description: "会话" },
};
