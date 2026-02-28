import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createContext, useContext, useState, useCallback } from "react";
import ToastItem from "../components/Toast";
const ToastContext = createContext(undefined);
export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error("useToast must be used within ToastProvider");
    }
    return context;
}
export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const removeToast = useCallback((id) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);
    const showToast = useCallback((message, type = "info", duration = 3000) => {
        // 使用时间戳 + 随机字符串生成更可靠的唯一 ID
        const id = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
        const newToast = { id, type, message, duration };
        setToasts((prev) => [...prev, newToast]);
    }, []);
    const showSuccess = useCallback((message, duration) => {
        showToast(message, "success", duration);
    }, [showToast]);
    const showError = useCallback((message, duration) => {
        showToast(message, "error", duration);
    }, [showToast]);
    const showWarning = useCallback((message, duration) => {
        showToast(message, "warning", duration);
    }, [showToast]);
    const showInfo = useCallback((message, duration) => {
        showToast(message, "info", duration);
    }, [showToast]);
    return (_jsxs(ToastContext.Provider, { value: { showToast, showSuccess, showError, showWarning, showInfo }, children: [children, _jsx("div", { className: "fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none", children: toasts.map((toast) => (_jsx("div", { className: "pointer-events-auto", children: _jsx(ToastItem, { toast: toast, onClose: removeToast }) }, toast.id))) })] }));
}
