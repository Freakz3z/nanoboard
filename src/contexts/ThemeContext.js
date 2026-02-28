import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useState, useEffect } from "react";
import { themeApi } from "../lib/tauri";
const ThemeContext = createContext(undefined);
const THEME_STORAGE_KEY = "nanoboard_theme";
export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error("useTheme must be used within ThemeProvider");
    }
    return context;
}
export function ThemeProvider({ children }) {
    const [theme, setThemeState] = useState(() => {
        // 从 localStorage 读取主题偏好（这是唯一真实来源）
        const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
        return (savedTheme === "dark" ? "dark" : "light");
    });
    // 当主题改变时，更新HTML class、localStorage并同步到后端
    useEffect(() => {
        const root = document.documentElement;
        if (theme === "dark") {
            root.classList.add("dark");
        }
        else {
            root.classList.remove("dark");
        }
        // 保存到 localStorage
        localStorage.setItem(THEME_STORAGE_KEY, theme);
        // 同步到后端（但不覆盖本地值）
        themeApi.setTheme(theme).catch(error => {
            console.error("Failed to sync theme to backend:", error);
        });
    }, [theme]);
    const toggleTheme = async () => {
        try {
            const newTheme = await themeApi.toggleTheme();
            if (newTheme) {
                setThemeState(newTheme);
            }
        }
        catch (error) {
            console.error("Failed to toggle theme:", error);
        }
    };
    return (_jsx(ThemeContext.Provider, { value: { theme, toggleTheme }, children: children }));
}
